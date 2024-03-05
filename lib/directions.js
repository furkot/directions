const travelMode = require('./model').travelMode;
const { defaults: defaults, withTimeout } = require('./service/util');
const prepareQuery = require('./profile');

module.exports = furkotDirections;

function skip(options, query) {
  // if service is disabled
  return !options.enable(query);
}

// query cascades through services until one produces a result
// 'skip' function for a service is used to determine whether
// it should be skipped or applied to a given request
const services = {
  graphhopper: {
    service: require('./service/graphhopper'),
    skip
  },
  mapquest: {
    service: require('./service/mapquest'),
    skip
  },
  openroute: {
    service: require('./service/openroute'),
    skip
  },
  valhalla: {
    service: require('./service/valhalla'),
    skip
  },
  osrm: {
    service: require('./service/osrm'),
    skip(options, query) {
      // or asking for walking or biking directions (OSRM doesn't do it well)
      return skip(options, query) || (query.mode !== travelMode.car && query.mode !== travelMode.motorcycle);
    }
  }
};

// default timeout to complete operation
const defaultTimeout = 20 * 1000;

function furkotDirections(options) {

  options = {
    timeout: defaultTimeout,
    order: ['osrm', 'mapquest', 'valhalla', 'graphhopper', 'openroute'],
    ...options
  };
  if (!options.services) {
    options.services = options.order.map(name => {
      const service = services[options[name] || name];
      if (!service) {
        return;
      }
      const enable = options[`${name}_enable`];
      if (!enable) {
        return;
      }
      // object representing actual parameters for a service
      const serviceOptions = {
        name,
        limiter: options[`${name}_limiter`],
        enable,
        skip: service.skip
      };
      if (options[name]) {
        Object.keys(options).reduce(mapOptions, {
          options,
          name,
          optName: options[name],
          serviceOptions
        });
      }
      // we are adding options that has not been copied to serviceOptions yet
      return service.service(defaults(serviceOptions, options));
    }).filter(Boolean);
  }

  directions.options = options;
  return directions;

  /**
   * Asynchronous directions service
   * @param query directions query object
   */
  function directions(query, { signal } = {}) {
    if (query?.points?.length > 1) {
      return requestDirections(prepareQuery(query), options.timeout);
    }

    async function requestDirections(query, timeout) {
      const stats = [];
      for (const service of options.services) {
        if (service.skip(service, query)) {
          continue;
        }
        stats.push(service.name);
        const startTime = Date.now();
        const result = await withTimeout(service.operation(query), Math.floor(timeout / 2), signal);
        if (signal?.aborted) {
          break;
        }
        if (result?.query) {
          result.stats = stats;
          result.provider = service.name;
          return result;
        }
        timeout -= Date.now() - startTime;
        if (timeout <= 0) {
          break;
        }
        if (query.points.length > 2) {
          return requestDirections({
            ...query,
            points: query.points.slice(0, 2)
          }, timeout);
        }
      }
      return {
        query: {
          ...query,
          points: query.points.slice(0, 2)
        },
        stats,
        routes: [{}]
      };
    }
  }
}

function mapOptions(result, opt) {
  if (opt.startsWith(result.name)) {
    result.serviceOptions[opt.replace(result.name, result.optName)] = result.options[opt];
  }
  return result;
}
