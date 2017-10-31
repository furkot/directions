var _defaults = require('lodash.defaults');
var strategy = require('./strategy');
var travelMode = require('./model').travelMode;
var util = require('./service/util');

module.exports = furkotDirections;

function skip(options, query, result) {
  // some other service already calculated directions
  // or service is disabled
  return result || !options.enable(query, result);
}

// query cascades through services until one produces a result
// 'skip' function for a service is used to determine whether
// it should be skipped or applied to a given request
var services = [{
  name: 'osrm',
  service: require('./service/osrm'),
  skip: function (options, query, result) {
    // or asking for walking or biking directions (OSRM doesn't do it well)
    return skip(options, query, result) || (query.mode !== travelMode.car && query.mode !== travelMode.motorcycle);
  }
}, {
  name: 'mapquest',
  service: require('./service/mapquest'),
  skip: skip
}, {
  name: 'google',
  service: require('./service/google'),
  skip: skip
}, {
  name: 'googlews',
  service: require('./service/google/webservice'),
  skip: function (options, query, result) {
    // or query is in the past
    return skip(options, query, result) || !util.isFuture(query.begin);
  }
}, {
  name: 'mapzen',
  service: require('./service/mapzen'),
  skip: skip
}];

// default timeout to complete operation
var defaultTimeout = 20 * 1000;

var id = 0;

function furkotDirections(options) {

  /**
   * Asynchronous directions service
   * @param query directions query object
   * @param fn function called with directions
   */
  function directions(query, fn) {
    var result, timeoutId, queryId;
    if (!query) {
      return fn();
    }

    id += 1;
    queryId = id;
    timeoutId = setTimeout(function () {
      timeoutId = undefined;
      // cancel outstanding requests
      options.services.forEach(function (service) {
        service.abort(queryId);
      });
    }, options.timeout);

    result = new Array(query.length);
    if (!query.length) {
      return fn(query, result);
    }
    strategy(options.services, queryId, query, result, function (err, queryId, query, result) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }
      if (err) {
        return fn();
      }
      fn(query, result);
    });
  }

  options = options || {};
  options = _defaults(options, {
    timeout: defaultTimeout
  });
  if (!options.services) {
    options.services = services.reduce(function (result, service) {
      if (options[(service.name + '_enable')]) {
        result.push(service.service(_defaults({
          name: service.name,
          limiter: options[(service.name + '_limiter')],
          enable: options[(service.name + '_enable')],
          skip: service.skip
        }, options)));
      }
      return result;
    }, []);
  }

  return directions;
}
