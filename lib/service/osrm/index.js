var _defaults = require('lodash.defaults');
var decode = require('code42day-google-polyline').decode;

var status = require('../status');


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

function convertRoute(route) {
  return route.legs.map(function(leg) {
    var r = {
      duration: leg.duration,
      distance: leg.distance,
      segments: leg.steps.map(convertStep)
    };

    r.path = r.segments
      .map(function(s) { return s.path; })
      .reduce(function(p1, p2) {
        return p1.concat(p2.slice(1));
      });

    return r;
  });
}

function processResponse(response, query) {
  var directions,

  body = response.body;

  directions = {
    query: query,
    provider: 'osrm',
    places: body.waypoints.map(convertPlace),
    routes: convertRoute(body.routes[0])
  };

  if (query.turnbyturn) {
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

  return directions;
}

// reponse codes: http://project-osrm.org/docs/v5.5.2/api/#responses
function getStatus(response) {
  var
    body = response && response.body,
    code = body && body.code;

  switch(code) {
    case 'Ok': return status.success;
    case 'NoRoute': return status.empty;
    default: return status.error;
  }
}

function prepareRequest(query) {
  return {
    alternatives: query.alternate,
    steps: true, // allwasy asj for steps since legs do not have overview
    overview: false // we'll get this from steps
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
  options = _defaults(options || {}, {
    maxPoints: 20, // max 20 points for automobile and 50 for bicycle and pedestrian
    url: prepareUrl.bind(null, options.osrm_url || 'https://router.project-osrm.org'),
    status: getStatus,
    prepareRequest: prepareRequest,
    processResponse: processResponse
  });
  return require('..')(options);
}
