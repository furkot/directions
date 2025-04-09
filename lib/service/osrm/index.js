const { pathType } = require('../../model');
const status = require('../status');
const util = require('../util');

const code2status = {
  Ok: status.success,
  NoRoute: status.empty,
  NoSegment: status.empty
};
const RADIUS = 1000; // search radius for nearby roads

module.exports = init;

function convertPlace(wpt) {
  return wpt.name;
}

function convertStep(step) {
  return {
    duration: step.duration,
    distance: step.distance,
    path: util.decode(step.geometry),
    instructions: step.maneuver.type + ' ' + step.maneuver.modifier
  };
}

function convertPath(path, seg) {
  return path.concat(seg.path.slice(1));
}

function convertLeg({ distance, duration, steps }) {
  const r = {
    duration,
    distance,
    segments: steps.map(convertStep)
  };

  r.path = r.segments.reduce(convertPath, []);

  return r;
}

function convertRoute({ legs }) {
  return legs.map(convertLeg);
}

// response codes: http://project-osrm.org/docs/v5.5.2/api/#responses
function getStatus(err, response) {
  const code = response && response.code;
  if (!response) {
    return;
  }
  return code2status[code] || status.error;
}

function point2radius() {
  return RADIUS;
}

function prepareRequest(query) {
  return {
    alternatives: Boolean(query.alternate),
    steps: true, // always ask for steps since legs do not have overview
    overview: false, // we'll get this from steps
    radiuses: query.points.map(point2radius).join(';')
  };
}

const profile = {
  '-1': 'driving', // same as car
  0: 'car',
  1: 'bicycle',
  2: 'foot',
  5: 'driving'
};

function prepareUrl(baseUrl, query) {
  function coords2string(c) {
    return c[0].toFixed(5) + ',' + c[1].toFixed(5);
  }

  const path = query.points.map(coords2string).join(';');

  return [baseUrl, 'route/v1', profile[query.mode], path].join('/');
}

function init(options) {
  function processResponse(response, query) {
    const directions = {
      query,
      provider: options.name
    };

    if (response) {
      if (response.waypoints) {
        directions.places = response.waypoints.map(convertPlace);
      }

      if (response.routes) {
        directions.routes = convertRoute(response.routes[0]);

        if (query.turnbyturn || query.path === pathType.smooth || query.path === pathType.coarse) {
          directions.segments = [];
          // copy segments from route to its own table
          directions.routes.forEach(function (route) {
            route.segmentIndex = directions.segments.length;
            directions.segments = directions.segments.concat(route.segments);
            delete route.segments;
          });
        } else {
          // delete segments
          directions.routes.forEach(function (route) {
            delete route.segments;
          });
        }

        if (query.path === pathType.full) {
          // path is already prepared - no need to do it again from segments
          directions.pathReady = true;
        }
      }
    }
    return directions;
  }

  options = util.defaults(options, {
    maxPoints: 20, // max 20 points for automobile and 50 for bicycle and pedestrian
    url: prepareUrl.bind(null, options.osrm_url || 'https://router.project-osrm.org'),
    status: getStatus,
    prepareRequest,
    processResponse
  });
  return require('..')(options);
}
