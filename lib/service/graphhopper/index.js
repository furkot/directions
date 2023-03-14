// https://docs.graphhopper.com/#tag/Routing-API
// https://github.com/boldtrn/kurviger-api-documentation

const { pathType, travelMode } = require("../../model");
const status = require('../status');
const tagRoute = require('../tag-route');
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
  true: 'curvature',
  1: 'curvature',
  2: 'curvaturefastest'
};

const ferryTypes = {
  ferry: true
};

function extractSegment(result, { distance, interval, text, time }) {
  const { directions: { segments }, path } = result;
  const [from, to] = interval;
  segments.push({
    duration: Math.round((time || 0) / 1000),
    distance: Math.round(distance || 0),
    path: path?.slice(from, to + 1),
    instructions: text
  });
  return result;
}

function setFerryMode(seg) {
  seg.mode = travelMode.ferry;
}

function extractDirections(result, { details, distance, instructions, points, time }) {
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
    const ferry = tagRoute(details?.road_environment, {
      segments,
      types: ferryTypes,
      updateSegment: setFerryMode
    });
    if (ferry?.foundType) {
      route.ferry = true;
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

function vehicleSize(query, options) {
  const { mode, vehicle } = query;
  if (!(vehicle && mode === travelMode.rv)) {
    return;
  }
  const { hazmat } = vehicle;
  if (hazmat) {
    options.push({
      if: 'hazmat == NO',
      multiply_by: '0.0'
    });
  }
  ['height', 'width', 'length', 'weight', 'axle_load'].forEach(p => {
    if (vehicle[p]) {
      options.push({
        if: `max_${p} < ${vehicle[p]}`,
        multiply_by: '0.0'
      });
    }
  });
}

function init(options) {

  function prepareUrl(url) {
    return `${url}?key=${options.graphhopper_key}`;
  }

  function prepareRequest(query) {
    const { avoidHighways, avoidTolls, avoidUnpaved, curvy, mode, path, points, turnbyturn } = query;
    if (options.parameters.max_curvy_distance && curvy && mode === -1 && points.length === 2 &&
      util.distance(points[0], points[1]) > options.parameters.max_curvy_distance) {
      return;
    }
    let req = {
      vehicle: vehicle[mode] || vehicle[0],
      points,
      details: ['road_environment']
    };
    if (!turnbyturn && path !== pathType.smooth && path !== pathType.coarse) {
      req.instructions = false;
    }
    if (curvy && mode === -1) {
      req.vehicle = 'motorcycle.kurviger.de';
      req.weighting = weighting[curvy];
      if (options.parameters.app_type) {
        req['app.type'] = options.parameters.app_type;
      }
      if (avoidHighways) {
        req.avoid_motorways = true;
      }
      if (avoidTolls) {
        req.avoid_toll_roads = true;
      }
      if (avoidUnpaved) {
        req.avoid_unpaved_roads = true;
      }
    }
    else {
      req['ch.disable'] = true;
      req.custom_model = {
        priority: [{
          if: 'road_class == MOTORWAY',
          multiply_by: avoidHighways ? '0.1' : '1.0'
        }, {
          if: 'toll == ALL',
          multiply_by: avoidTolls ? '0.1' : '1.0'
        }]
      };
      vehicleSize(query, req.custom_model.priority);
    }

    return req;
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
        directions,
        fullPath
      });
      if (fullPath) {
        // path is already prepared - no need to do it again from segments
        directions.pathReady = true;
      }
    }
    return directions;
  }

  options = util.defaults(options, {
    maxPoints: options.graphhopper_max_points || 5, // max 5 points for free and 30-150 for paid plan
    post: true,
    url: prepareUrl.bind(undefined, options.graphhopper_url),
    status: getStatus,
    prepareRequest,
    processResponse
  });
  options.parameters = options.graphhopper_parameters || {};
  return require('..')(options);
}
