const fetchagent = require('fetchagent');
const pathType = require("../model").pathType;
const series = require('run-series');
const status = require('./status');
const util = require('./util');
const debug = require('debug')('furkot:directions:service');

module.exports = init;

const limiters = {};

const ERROR = 'input error';

function eachOfSeries(items, task, fn) {
  const tasks = items.map(function(item, i) {
    return task.bind(null, item, i);
  });
  return series(tasks, fn);
}

function request(url, req, fn) {
  const options = this;
  let fa = fetchagent;
  if (options.post) {
    fa = fa.post(url).send(req);
  }
  else {
    fa = fa.get(url).query(req);
  }
  if (options.authorization) {
    fa.set('authorization', options.authorization);
  }
  return fa
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
  let limiter;
  let holdRequests;
  let simplify;
  const outstanding = {};

  function abort(queryId) {
    debug('abort', queryId);
    if (!outstanding[queryId]) {
      return;
    }
    // cancel later request if scheduled
    if (outstanding[queryId].laterTimeoutId) {
      clearTimeout(outstanding[queryId].laterTimeoutId);
    }
    // cancel request in progress
    if (outstanding[queryId].reqInProgress) {
      outstanding[queryId].reqInProgress.abort();
    }
    outstanding[queryId].callback(ERROR);
  }

  function directions(queryId, queryArray, result, fn) {

    function spliceResults(idx, segments, segResult) {
      Array.prototype.splice.apply(queryArray, [idx + queryArray.delta, 1].concat(segments));
      Array.prototype.splice.apply(result, [idx + queryArray.delta, 1].concat(segResult));
      queryArray.delta += segments.length - 1;
    }

    function queryDirections(query, idx, callback) {
      let req;
      let segments;

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
        segments[0].stats = query.stats;
        delete query.stats;
        return directions(queryId, segments,
            new Array(segments.length), function (err, stop, id, query, result) {
          if (query && result) {
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
      if (req === true) {
        req = undefined;
      }

      limiter.trigger(function () {
        if (!outstanding[queryId]) {
          // query has been aborted
          limiter.skip(); // immediately process the next request in the queue
          return;
        }
        query.stats = query.stats || [];
        query.stats.push(options.name);
        outstanding[queryId].reqInProgress = options.request(options.url(query), req, function (err, response) {
          let st;
          let res;
          if (!outstanding[queryId]) {
            // query has been aborted
            return;
          }
          delete outstanding[queryId].reqInProgress;
          st = options.status(err, response);
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

            return directions(queryId, query,
                new Array(1), function (err, stop, id, query, result) {
              if (query && result) {
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

    outstanding[queryId] = outstanding[queryId] || {
      stack: 0,
      hits: 0
    };
    outstanding[queryId].stack += 1;
    outstanding[queryId].callback = function (err) {
      fn(err, true, queryId, queryArray, result);
    };
    queryArray.delta = 0;

    eachOfSeries(queryArray, queryDirections, function (err) {
      if (outstanding[queryId]) {
        outstanding[queryId].stack -= 1;
        if (!outstanding[queryId].stack) {
          delete outstanding[queryId];
        }
        if (err === ERROR) {
          return fn(outstanding[queryId] ? err : undefined, true, queryId, queryArray, result);
        }
        fn(err, false, queryId, queryArray, result);
      }
    });
  }

  options = util.defaults(options, {
    interval: 340,
    penaltyInterval: 2000,
    limiter: limiters[options.name],
    request,
    abort
  });
  options.url = initUrl(options.url);
  limiters[options.name] = options.limiter || require('limiter-component')(options.interval, options.penaltyInterval);
  limiter = limiters[options.name];
  simplify = require('./simplify')(options);
  directions.abort = options.abort;
  return directions;
}
