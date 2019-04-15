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

function prepareWaypoint(p) {
  // waypoint format is lon,lat
  return p[0] + ',' + p[1];
}

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
  if (segments) {
    route.segmentIndex = segments.length;
  }
  routes.push(route);
  if (segments && steps) {
    steps.reduce(extractStep, result);
    if (segments.length) {
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

function init(options) {

  function prepareRequest(query) {
    const req = {
      api_key: options.openroute_key,
      profile: profile[query.mode] || profile[0],
      coordinates: query.points.map(prepareWaypoint).join('|')
    };
    if (!query.turnbyturn && query.path !== pathType.smooth && query.path !== pathType.coarse) {
      req.instructions = false;
    }
    const restrictions = profileRestrictions[query.mode];
    if (restrictions) {
      req.options = {
        profile_params: {
          restrictions
        }
      };
    }
    if (req.profile === 'driving-car') {
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
    if (req.options) {
      if (req.options.avoid_features) {
        req.options.avoid_features = req.options.avoid_features.join('|');
      }
      req.options = JSON.stringify(req.options);
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
    url: options.openroute_url,
    status: getStatus,
    prepareRequest,
    processResponse
  });
  return require('..')(options);
}
