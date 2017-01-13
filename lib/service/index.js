var _defaults = require('lodash.defaults');
var fetchagent = require('fetchagent');
var pathType = require("../model").pathType;
var series = require('run-series');
var status = require('./status');
var util = require('./util');
var debug = require('debug')('furkot:directions:service');

module.exports = init;

var limiters = {};

function eachOfSeries(items, task, fn) {
  var tasks = items.map(function(item, i) {
    return task.bind(null, item, i);
  });
  return series(tasks, fn);
}

function request(url, req, fn) {
  return fetchagent
  .get(url)
  .query(req)
  .set('accept', 'application/json')
  .end(fn);
}

function initUrl(url) {
  if (typeof url === 'function') {
    return url;
  }
  return function () {
    return url;
  };
}

function init(options) {
  var limiter, holdRequests, simplify, outstanding = {};

  function abort(queryId) {
    debug('abort', queryId);
    if (!outstanding[queryId]) {
      return;
    }
    if (outstanding[queryId].subquery) {
      return options.abort(outstanding[queryId].subquery);
    }
    if (outstanding[queryId]) {
      // cancel later request if scheduled
      if (outstanding[queryId].laterTimeoutId) {
        clearTimeout(outstanding[queryId].laterTimeoutId);
      }
      // cancel request in progress
      if (outstanding[queryId].reqInProgress) {
        outstanding[queryId].reqInProgress.abort();
      }
      outstanding[queryId].callback('aborted');
    }
  }

  function directions(queryId, query, result, fn) {
    var legs;

    function queryDirections(query, idx, callback) {
      var req;

      function requestLater() {
        outstanding[queryId].laterTimeoutId = setTimeout(function () {
          if (outstanding[queryId]) {
            delete outstanding[queryId].laterTimeoutId;
          }
          queryDirections(query, idx, callback);
        }, options.penaltyTimeout);
      }

      if (!outstanding[queryId]) {
        // query has been aborted
        return;
      }
      outstanding[queryId].callback = callback;

      if (options.skip(options, query, legs.result[idx])) {
        return callback();
      }

      if (holdRequests) {
        return callback();
      }

      query.path = query.path || pathType.none;
      req = options.prepareRequest(query);
      if (!req) {
        return callback();
      }

      limiter.trigger(function () {
        if (!outstanding[queryId]) {
          // query has been aborted
          return;
        }
        outstanding[queryId].reqInProgress = options.request(options.url(query), req, function (err, response) {
          var st, res;
          if (!outstanding[queryId]) {
            // query has been aborted
            return;
          }
          delete outstanding[queryId].reqInProgress;
          if (err) {
            return callback(err);
          }
          st = options.status(response);
          if (st === undefined) {
            // shouldn't happen (bug or unexpected response format)
            // treat it as no route
            st = status.empty;
          }
          if (st === status.failure) {
            // don't ever ask again
            holdRequests = true;
            return callback();
          }
          if (st === status.error) {
            // try again later
            limiter.penalty();
            return requestLater();
          }
          if (st === status.empty && query.points.length > 2) {
            query = [query];
            query.maxPoints = 2;
            
            outstanding[queryId].subquery = queryId + 's';
            return directions(outstanding[queryId].subquery, query,
                new Array(1), function (err, stop, id, query, result) {
              if (!err) {
                Array.prototype.splice.apply(legs.query, [idx, 1].concat(query));
                Array.prototype.splice.apply(legs.result, [idx, 1].concat(result));
              }
              callback(err);
            });
          }

          res = options.processResponse(response, query);
          if (res) {
            if (!res.pathReady && res.routes && res.segments) {
              simplify(query.path, query.span, res.routes, res.segments);
            }
            if (!query.turnbyturn) {
              delete res.segments;
            }
            legs.result[idx] = res;
          }
          callback();
        });
      });
    }

    
    legs = util.splitPoints(query, result, options.maxPoints);
    if (legs.error || !legs.query.length) {
      return fn(undefined, true);
    }

    outstanding[queryId] = {};

    eachOfSeries(legs.query, queryDirections, function (err) {
      if (outstanding[queryId]) {
        delete outstanding[queryId];
        fn(err, false, queryId, legs.query, legs.result);
      }
    });
  }

  options = _defaults(options, {
    interval: 340,
    penaltyInterval: 2000,
    request: request,
    abort: abort
  });
  options.url = initUrl(options.url);
  limiters[options.name] = limiters[options.name] || require('./limiter')(options.interval, options.penaltyInterval);
  limiter = limiters[options.name];
  simplify = require('./simplify')(options);
  directions.abort = options.abort;
  return directions;
}
