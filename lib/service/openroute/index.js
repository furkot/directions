const { pathType } = require("../../model");
const status = require('../status');
const util = require('../util');

module.exports = init;

const profile = {
  '-1': 'driving-car',
  0: 'driving-car',
  1: 'cycling-regular',
  2: 'foot-hiking',
  5: 'driving-hgv'
};
const profileRestrictions = {
  5: {
    hazmat: true
  }
};

function extractStep(result, { distance, duration, instruction, way_points }) {
  const { directions: { segments }, path } = result;
  segments.push({
    duration: Math.round(duration || 0),
    distance: Math.round(distance || 0),
    path: path && path.slice(way_points[0], way_points[1]),
    instructions: instruction
  });
  return result;
}

function extractDirections(result, { distance, duration, steps }, i) {
  const  { directions: { routes, segments }, path, waypoints } = result;
  const route = {
    duration: Math.round(duration || 0),
    distance: Math.round(distance || 0),
    path: path && path.slice(waypoints[i], waypoints[i + 1])
  };
  if (!(route.duration || route.distance || (route.path && route.path.length > 1))) {
    route.path = [];
  }
  if (segments) {
    route.segmentIndex = segments.length;
  }
  routes.push(route);
  if (segments && steps) {
    steps.reduce(extractStep, result);
    if (segments.length === 1) {
      const seg = segments[0];
      if (!(seg.duration || seg.distance || (seg.path && seg.path.length > 1))) {
        seg.path = [];
      }
    }
    if (segments.length && route.path.length) {
      util.last(segments).path.push(util.last(route.path));
    }
  }
  return result;
}

function getStatus(st, response) {
  if (!st && response && response.routes && response.routes.length) {
    return status.success;
  }
  return status.empty;
}

function vehicleSize(query, restrictions) {
  const { mode, vehicle } = query;
  if (!(vehicle && mode === 5)) {
    return restrictions;
  }
  restrictions = Object.assign({}, restrictions, vehicle);
  if (restrictions.axle_load !== undefined) {
    restrictions.axleload = restrictions.axle_load;
    delete restrictions.axle_load;
  }
  return restrictions;
}

function init(options) {

  function prepareUrl(query) {
    return [
      options.openroute_url,
      profile[query.mode] || profile[0],
      'json'
    ].join('/');
  }

  function prepareRequest(query) {
    const req = {
      coordinates: query.points
    };
    if (!query.turnbyturn && query.path !== pathType.smooth && query.path !== pathType.coarse) {
      req.instructions = false;
    }
    const restrictions = vehicleSize(query, profileRestrictions[query.mode]);
    if (restrictions) {
      req.options = {
        profile_params: {
          restrictions
        }
      };
    }
    if ((profile[query.mode] || profile[0]) === 'driving-car') {
      if (query.avoidHighways) {
        req.options = req.options || {
            avoid_features: ['highways']
        };
      }
      if (query.avoidTolls) {
        req.options = req.options || {};
        req.options.avoid_features = req.options.avoid_features || [];
        req.options.avoid_features.push('tollways');
      }
    }

    return req;
  }

  function processResponse(response, query) {

    if (!(response && response.routes && response.routes.length)) {
      // let it cascade to the next service
      return;
    }

    const directions = {
      query: query,
      provider: options.name
    };
    const paths = response.routes[0].segments;
    const geometry = response.routes[0].geometry;
    if (paths) {
      directions.routes = [];
      if (query.turnbyturn || query.path === pathType.smooth || query.path === pathType.coarse) {
        directions.segments = [];
      }
      const fullPath = query.path === pathType.full;
      paths.reduce(extractDirections, {
        directions: directions,
        path: util.decode(geometry),
        waypoints: response.routes[0].way_points
      });
      if (fullPath) {
        // path is already prepared - no need to do it again from segments
        directions.pathReady = true;
      }
    }
    return directions;
  }

  options = util.defaults(options, {
    maxPoints: 10, // unknown maximum
    post: true,
    authorization: options.openroute_key,
    url: prepareUrl,
    status: getStatus,
    prepareRequest,
    processResponse
  });
  return require('..')(options);
}
