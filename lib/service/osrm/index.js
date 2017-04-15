var _defaults = require('lodash.defaults');
var decode = require('@pirxpilot/google-polyline').decode;
var pathType = require("../../model").pathType;
var status = require('../status');

var code2status = {
  Ok: status.success,
  NoRoute: status.empty,
  NoSegment: status.empty
};
var RADIUS = 1000; // search radius for nearby roads

module.exports = init;

function convertPlace(wpt) {
  return wpt.name;
}

function convertStep(step) {
  return {
    duration: step.duration,
    distance: step.distance,
    path: decode(step.geometry),
    instructions: step.maneuver.type + ' ' + step.maneuver.modifier
  };
}

function convertPath(path, seg) {
  return path.concat(seg.path.slice(1));
}

function convertLeg(leg) {
  var r = {
    duration: leg.duration,
    distance: leg.distance,
    segments: leg.steps.map(convertStep)
  };

  r.path = r.segments.reduce(convertPath, []);

  return r;
}

function convertRoute(route) {
  return route.legs.map(convertLeg);
}

// response codes: http://project-osrm.org/docs/v5.5.2/api/#responses
function getStatus(err, response) {
  var code = response && response.code;
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

var profile = {
  '-1': 'driving', // same as car
  0: 'car',
  1: 'bicycle',
  2: 'foot'
};

function prepareUrl(baseUrl, query) {

  function coords2string(c) {
    return c[0].toFixed(5) + ',' + c[1].toFixed(5);
  }


  var path = query.points
    .map(coords2string)
    .join(';');

  return [
    baseUrl,
    'route/v1',
    profile[query.mode],
    path
  ].join('/');
}

function init(options) {

  function processResponse(response, query) {
    var directions;

    directions = {
      query: query,
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
          directions.routes.forEach(function(route) {
            route.segmentIndex = directions.segments.length;
            directions.segments = directions.segments.concat(route.segments);
            delete route.segments;
          });
        } else {
          // delete segments
          directions.routes.forEach(function(route) {
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

  options = _defaults(options || {}, {
    maxPoints: 20, // max 20 points for automobile and 50 for bicycle and pedestrian
    url: prepareUrl.bind(null, options.osrm_url || 'https://router.project-osrm.org'),
    status: getStatus,
    prepareRequest: prepareRequest,
    processResponse: processResponse
  });
  return require('..')(options);
}
