const { pathType } = require("../../model");
const status = require('../status');
const util = require('../util');

module.exports = init;

const vehicle = {
  '-1': 'car',
  0: 'car',
  1: 'bike',
  2: 'foot',
  5: 'truck'
};

const weighting = {
  true: 'curvature'
};

function prepareWaypoint(qs, p) {
  // waypoint format is lat,lon
  qs.push('point=' + encodeURIComponent(p[1] + ',' + p[0]));
  return qs;
}

function extractSegment(result, { distance, interval, text, time }) {
  const { directions: { segments }, path } = result;
  segments.push({
      duration: Math.round((time || 0) / 1000),
      distance: Math.round(distance || 0),
      path: path && path.slice(interval[0], interval[1]),
      instructions: text
  });
  return result;
}

function extractDirections(result, { distance, instructions, points, time }) {
  const { directions: { routes, segments }, fullPath } = result;
  result.path = util.decode(points);
  const route = {
    duration: Math.round((time || 0) / 1000),
    distance: Math.round(distance || 0)
  };
  if (fullPath) {
    route.path = result.path;
  }
  if (segments) {
    route.segmentIndex = segments.length;
  }
  routes.push(route);
  if (segments && instructions) {
    instructions.reduce(extractSegment, result);
    if (segments.length) {
      util.last(segments).path.push(util.last(result.path));
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

  function prepareUrl(url, { avoidHighways, avoidTolls, mode, path, points, turnbyturn, curvy }) {
    let req = {
      vehicle: vehicle[mode] || vehicle[0],
      key: options.graphhopper_key
    };
    if (curvy && mode === -1) {
      req.vehicle = 'motorcycle.kurviger.de';
      req.weighting = weighting[curvy];
    }
    if (!turnbyturn && path !== pathType.smooth && path !== pathType.coarse) {
      req.instructions = false;
    }
    if (options.parameters.flexible) {
      if (avoidTolls) {
        req['ch.disable'] = true;
        req.avoid = ['toll'];
      }
      if (avoidHighways) {
        req['ch.disable'] = true;
        req.avoid = req.avoid || [];
        req.avoid.push('motorway');
      }
    }

    req = points.reduce(prepareWaypoint, Object.keys(req).map(function (name) {
      return name + '=' + encodeURIComponent(req[name]);
    }));

    return url + '?' + req.join('&');
  }

  function prepareRequest() {
    return true;
  }

  function processResponse(response, query) {

    if (response && response.status >= 400) {
      // let it cascade to the next service
      return;
    }

    const directions = {
      query,
      provider: options.name
    };
    const paths = response && response.paths;
    if (paths) {
      directions.routes = [];
      if (query.turnbyturn || query.path === pathType.smooth || query.path === pathType.coarse) {
        directions.segments = [];
      }
      const fullPath = query.path === pathType.full;
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
    prepareRequest,
    processResponse
  });
  options.parameters = options.graphhopper_parameters || {};
  return require('..')(options);
}
