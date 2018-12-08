var strategy = require('run-waterfall-until');
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
var services = {
  graphhopper: {
    service: require('./service/graphhopper'),
    skip: skip
  },
  mapquest: {
    service: require('./service/mapquest'),
    skip: skip
  },
  openroute: {
    service: require('./service/openroute'),
    skip: skip
  },
  valhalla: {
    service: require('./service/valhalla'),
    skip: skip
  },
  osrm: {
    service: require('./service/osrm'),
    skip: function (options, query, result) {
      // or asking for walking or biking directions (OSRM doesn't do it well)
      return skip(options, query, result) || (query.mode !== travelMode.car && query.mode !== travelMode.motorcycle);
    }
  }
};

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
    if (!query) {
      return fn();
    }

    id += 1;

    var result = new Array(query.length);
    if (!query.length) {
      return fn(query, result);
    }

    var queryId = id;
    var timeoutId = setTimeout(function () {
      timeoutId = undefined;
      // cancel outstanding requests
      options.services.forEach(function (service) {
        service.abort(queryId);
      });
    }, options.timeout);

    strategy(options.services, queryId, query, result, function (err, queryId, query, result) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }
      if (err) {
        return fn();
      }
      // if no results, mark first as empty
      if (result.length > 0 && !result.some(function (r) {
        return r;
      })) {
        result[0] = {
          query: query[0],
          routes: [{
            distance: 0,
            duration: 0
          }]
        };
      }
      fn(query, result);
    });
  }

  options = util.defaults(options, {
    timeout: defaultTimeout,
    order: ['osrm', 'mapquest', 'valhalla', 'graphhopper', 'openroute']
  });
  if (!options.services) {
    options.services = options.order.reduce(function (result, name) {
      var service = services[options[name] || name], defaults;
      if (service && options[(name + '_enable')]) {
        defaults = {
          name: name,
          limiter: options[(name + '_limiter')],
          enable: options[(name + '_enable')],
          skip: service.skip
        };
        if (options[name]) {
          Object.keys(options).reduce(mapOptions, {
            options: options,
            name: name,
            optName: options[name],
            defaults: defaults
          });
        }
        result.push(service.service(util.defaults(defaults, options)));
      }
      return result;
    }, []);
  }

  directions.options = options;
  return directions;
}

function mapOptions(result, opt) {
  if (opt.startsWith(result.name)) {
    result.defaults[opt.replace(result.name, result.optName)] = result.options[opt];
  }
  return result;
}
