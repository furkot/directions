var pathType = require("../../model").pathType;
var status = require('../status');
var util = require('../util');

module.exports = init;

var vehicle = {
  '-1': 'car',
  0: 'car',
  1: 'bike',
  2: 'foot'
};

function prepareWaypoint(qs, p) {
  // waypoint format is lat,lon
  qs.push('point=' + encodeURIComponent(p[1] + ',' + p[0]));
  return qs;
}

function extractSegment(result, instruction) {
  var segments = result.directions.segments, path = result.path;
  segments.push({
      duration: Math.round((instruction.time || 0) / 1000),
      distance: Math.round(instruction.distance || 0),
      path: path && path.slice(instruction.interval[0], instruction.interval[1]),
      instructions: instruction.text
  });
  return result;
}

function extractDirections(result, path) {
  var directions = result.directions, route;
  result.path = util.decode(path.points);
  route = {
    duration: Math.round((path.time || 0) / 1000),
    distance: Math.round(path.distance || 0)
  };
  if (result.fullPath) {
    route.path = result.path;
  }
  if (directions.segments) {
    route.segmentIndex = directions.segments.length;
  }
  directions.routes.push(route);
  if (directions.segments && path.instructions) {
    path.instructions.reduce(extractSegment, result);
    if (directions.segments.length) {
      util.last(directions.segments).path.push(util.last(result.path));
    }
  }
  return result;
}

function getStatus(st, response) {
  st = st && st.status;
  if (!(st || response)) {
    return;
  }
  response = response || {};
  response.status = response.status || st;
  // 401 Unauthorized, 429 Too Many Requests
  if (st === 401 || st === 429) {
    // we exceeded the limit
    return status.failure;
  }
  if (st === 400 && response.message) {
    return status.empty;
  }
  if (!st) {
    return status.success;
  }
}

function init(options) {

  function prepareUrl(url, query) {
    var req = {
      vehicle: vehicle[query.mode] || vehicle[0],
      key: options.graphhopper_key
    };
    if (!query.turnbyturn && query.path !== pathType.smooth && query.path !== pathType.coarse) {
      req.instructions = false;
    }
    if (options.parameters.flexible) {
      if (query.avoidTolls) {
        req['ch.disable'] = true;
        req.avoid = ['toll'];
      }
      if (query.avoidHighways) {
        req['ch.disable'] = true;
        req.avoid = req.avoid || [];
        req.avoid.push('motorway');
      }
    }

    req = query.points.reduce(prepareWaypoint, Object.keys(req).map(function (name) {
      return name + '=' + encodeURIComponent(req[name]);
    }));

    return url + '?' + req.join('&');
  }

  function prepareRequest() {
    return true;
  }

  function processResponse(response, query) {
    var directions, paths, fullPath;

    if (response && response.status >= 400) {
      // let it cascade to the next service
      return;
    }

    directions = {
      query: query,
      provider: options.name
    };
    paths = response && response.paths;
    if (paths) {
      directions.routes = [];
      if (query.turnbyturn || query.path === pathType.smooth || query.path === pathType.coarse) {
        directions.segments = [];
      }
      fullPath = query.path === pathType.full;
      paths.reduce(extractDirections, {
        directions: directions,
        fullPath: fullPath
      });
      if (fullPath) {
        // path is already prepared - no need to do it again from segments
        directions.pathReady = true;
      }
    }
    return directions;
  }

  options = util.defaults(options, {
    maxPoints: 5, // max 5 points for free and 30-150 for paid plan
    url: prepareUrl.bind(undefined, options.graphhopper_url),
    status: getStatus,
    prepareRequest: prepareRequest,
    processResponse: processResponse
  });
  options.parameters = options.graphhopper_parameters || {};
  return require('..')(options);
}
