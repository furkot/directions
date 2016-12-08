var _defaults = require('lodash.defaults');
var pathType = require("../model").pathType;
var series = require('run-series');
var superagent = require('superagent');
var status = require('./status');
var util = require('./util');

module.exports = init;


function eachOfSeries(items, task, fn) {
  var tasks = items.map(function(item, i) {
    return task.bind(null, item, i);
  });
  return series(tasks, fn);
}

function request(url, req, fn) {
  superagent
  .get(url)
  .query(req)
  .accept('application/json')
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
  var limiter, holdRequests;

  function directions(query, result, fn) {
    var legs;

    function queryDirections(query, idx, callback) {
      var req;

      function requestLater() {
        setTimeout(function () {
          queryDirections(query, callback);
        }, options.penaltyTimeout);
      }

      if (options.skip(query, legs.result[idx])) {
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
        options.request(options.url(query), req, function (err, response) {
          var st;
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

          legs.result[idx] = options.processResponse(response, query);
          callback();
        });
      });
    }

    legs = util.splitPoints(query, result, options.maxPoints);
    eachOfSeries(legs.query, queryDirections, function (err) {
      fn(err, false, legs.query, legs.result);
    });
  }

  options = _defaults(options, {
    interval: 340,
    penaltyInterval: 2000,
    request: request
  });
  options.url = initUrl(options.url);
  limiter = require('./limiter')(options.interval, options.penaltyInterval);
  return directions;
}
