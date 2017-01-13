var _defaults = require('lodash.defaults');
var fetchagent = require('fetchagent');
var pathType = require("../model").pathType;
var series = require('run-series');
var status = require('./status');
var util = require('./util');
var debug = require('debug')('furkot:directions:service');

module.exports = init;

var limiters = {};

var ERROR = 'input error';

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
    if (outstanding[queryId].query) {
      return options.abort(outstanding[queryId].query);
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

  function directions(queryId, queryArray, result, fn) {

    function spliceResults(idx, segments, segResult) {
      Array.prototype.splice.apply(queryArray, [idx + queryArray.delta, 1].concat(segments));
      Array.prototype.splice.apply(result, [idx + queryArray.delta, 1].concat(segResult));
      queryArray.delta += segments.length - 1;
    }

    function queryDirections(query, idx, callback) {
      var req, segments;

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

      if (options.skip(options, query, result[idx + queryArray.delta])) {
        return callback();
      }

      if (holdRequests) {
        return callback();
      }

      segments = util.splitPoints(query, queryArray.maxPoints || options.maxPoints);
      if (!segments) {
        return callback(ERROR);
      }

      if (segments !== query) {
        outstanding[queryId].query = queryId + 'q';
        return directions(outstanding[queryId].query, segments,
            new Array(segments.length), function (err, stop, id, query, result) {
          if (!err) {
            spliceResults(idx, query, result);
          }
          callback(err);
        });
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
                spliceResults(idx, query, result);
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
            result[idx + queryArray.delta] = res;
          }
          callback();
        });
      });
    }

    outstanding[queryId] = {};
    queryArray.delta = 0;

    eachOfSeries(queryArray, queryDirections, function (err) {
      if (outstanding[queryId]) {
        delete outstanding[queryId];
        if (err === ERROR) {
          return fn(undefined, true);
        }
        fn(err, false, queryId, queryArray, result);
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
