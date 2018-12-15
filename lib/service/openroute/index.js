var pathType = require("../../model").pathType;
var status = require('../status');
var util = require('../util');

module.exports = init;

var profile = {
  '-1': 'driving-car',
  0: 'driving-car',
  1: 'cycling-regular',
  2: 'foot-hiking'
};

function prepareWaypoint(p) {
  // waypoint format is lon,lat
  return p[0] + ',' + p[1];
}

function extractStep(result, step) {
  var segments = result.directions.segments, path = result.path;
  segments.push({
      duration: Math.round(step.duration || 0),
      distance: Math.round(step.distance || 0),
      path: path && path.slice(step.way_points[0], step.way_points[1]),
      instructions: step.instruction
  });
  return result;
}

function extractDirections(result, path, i) {
  var directions = result.directions, route;
  route = {
    duration: Math.round(path.duration || 0),
    distance: Math.round(path.distance || 0),
    path: result.path && result.path.slice(result.waypoints[i], result.waypoints[i + 1])
  };
  if (directions.segments) {
    route.segmentIndex = directions.segments.length;
  }
  directions.routes.push(route);
  if (directions.segments && path.steps) {
    path.steps.reduce(extractStep, result);
    if (directions.segments.length) {
      util.last(directions.segments).path.push(util.last(route.path));
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
    var req = {
      api_key: options.openroute_key,
      profile: profile[query.mode] || profile[0],
      coordinates: query.points.map(prepareWaypoint).join('|')
    };
    if (!query.turnbyturn && query.path !== pathType.smooth && query.path !== pathType.coarse) {
      req.instructions = false;
    }
    if (req.profile === 'driving-car') {
      if (query.avoidHighways) {
        req.options = {
            avoid_features: ['highways']
        };
      }
      if (query.avoidTolls) {
        req.options = req.optrions || {};
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
    var directions, paths, geometry, fullPath;

    if (!(response && response.routes && response.routes.length)) {
      // let it cascade to the next service
      return;
    }

    directions = {
      query: query,
      provider: options.name
    };
    paths = response.routes[0].segments;
    geometry = response.routes[0].geometry;
    if (paths) {
      directions.routes = [];
      if (query.turnbyturn || query.path === pathType.smooth || query.path === pathType.coarse) {
        directions.segments = [];
      }
      fullPath = query.path === pathType.full;
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
    prepareRequest: prepareRequest,
    processResponse: processResponse
  });
  return require('..')(options);
}
