var _defaults = require('lodash.defaults');
var fetchagent = require('fetchagent');
var pathType = require("../model").pathType;
var series = require('run-series');
var simplify = require('./simplify')();
var status = require('./status');
var util = require('./util');

module.exports = init;

// default timeout to complete operation
var defaultTimeout = 20 * 1000;

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

function abort(req) {
  req.abort();
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
  var limiter, holdRequests;

  function directions(query, result, fn) {
    var legs, timeoutId, laterTimeoutId, reqInProgress, startTime = Date.now();

    function queryDirections(query, idx, callback) {
      var req;

      function requestLater() {
        laterTimeoutId = setTimeout(function () {
          laterTimeoutId = undefined;
          queryDirections(query, idx, callback);
        }, options.penaltyTimeout);
      }

      if (!timeoutId) {
        return callback();
      }
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
        reqInProgress = options.request(options.url(query), req, function (err, response) {
          var st, res;
          reqInProgress = undefined;
          if (!timeoutId) {
            //abort has not been effective
            return callback();
          }
          if (err) {
            return callback(err);
          }
          st = options.status(response);
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
            return directions(query, new Array(1), function (err, stop, query, result) {
              if (!err) {
                Array.prototype.splice.apply(legs.query, [idx, 1].concat(query));
                Array.prototype.splice.apply(legs.result, [idx, 1].concat(result));
              }
              callback(err);
            });
          }

          res = options.processResponse(response, query);
          if (!res.pathReady && res.routes && res.segments) {
            simplify(query.path, query.span, res.routes, res.segments);
          }
          if (!query.turnbyturn) {
            delete res.segments;
          }
          legs.result[idx] = res;
          callback();
        });
      });
    }

    legs = util.splitPoints(query, result, options.maxPoints);
    if (legs.error || !legs.query.length) {
      return fn(undefined, true);
    }

    query.timeout = query.timeout || options.timeout;
    timeoutId = setTimeout(function () {
      // cancel later request if schedule
      if (laterTimeoutId) {
        clearTimeout(laterTimeoutId);
        laterTimeoutId = undefined;
      }
      // cancel imminent request if scheduled
      limiter.cancel();
      // cancel request in progress
      if (reqInProgress) {
        options.abort(reqInProgress);
        reqInProgress = undefined;
      }
      timeoutId = undefined;
      fn(undefined, true, query, result);
    }, query.timeout);

    eachOfSeries(legs.query, queryDirections, function (err) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        legs.query.timeout = query.timeout - Date.now() + startTime;
        timeoutId = undefined;
        fn(err, legs.query.timeout <= 0, legs.query, legs.result);
      }
    });
  }

  options = _defaults(options, {
    interval: 340,
    penaltyInterval: 2000,
    request: request,
    abort: abort,
    timeout: defaultTimeout
  });
  options.url = initUrl(options.url);
  limiter = require('./limiter')(options.interval, options.penaltyInterval);
  return directions;
}
