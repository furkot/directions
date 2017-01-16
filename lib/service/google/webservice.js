var _defaults = require('lodash.defaults');
var partition = require('../partition');
var pathType = require("../../model").pathType;
var status = require('../status');
var util = require('../util');
var debug = require('debug')('furkot:directions:googlews');

module.exports = init;

var travelModes = {
  '-1': 'driving',
  0: 'driving',
  1: 'bicycling',
  2: 'walking',
  3: 'other'
};
var unitSystems = {
  km: 'metric',
  m: 'imperial'
};
var gmStatus = util.split2object(
  'OK-NOT_FOUND-ZERO_RESULTS-MAX_WAYPOINTS_EXCEEDED-INVALID_REQUEST-OVER_QUERY_LIMIT-REQUEST_DENIED-UNKNOWN_ERROR');

function toCoordinates(pt) {
  return [pt[1], pt[0]].join(',');
}

function extractSegment(directions, step) {
  directions.segments.push({
      duration: step.duration.value,
      distance: step.distance.value,
      path: step.polyline && util.decode(step.polyline.points),
      instructions: step.html_instructions
  });
  return directions;
}

function extractDirections(directions, leg) {
  directions.routes.push({
    duration: leg.duration.value,
    distance: leg.distance.value
  });
  directions.places.push(leg.end_address);
  if (leg.steps) {
    util.last(directions.routes).segmentIndex = directions.segments.length;
    leg.steps.reduce(extractSegment, directions);
  }
  return directions;
}

function getStatus(err, response) {
  var st;
  if (!response) {
    return;
  }
  st = response.status;
  if (st === gmStatus.OVER_QUERY_LIMIT && response.error_message && response.error_message.indexOf('daily') > -1) {
    // stop asking
    debug('failure', st);
    return status.failure;
  }
  if (st === gmStatus.OVER_QUERY_LIMIT || st === gmStatus.UNKNOWN_ERROR) {
    debug('error', st);
    return status.error;
  }
  if (st === gmStatus.ZERO_RESULTS) {
    return status.empty;
  }
  return status.success;
}

function init(options) {

  function getUrl() {
    return options.google_url + '/maps/api/directions/json';
  }

  function prepareRequest(query) {
    var req = {
      mode: travelModes[query.mode] || travelModes[0],
      origin: toCoordinates(query.points[0]),
      destination: toCoordinates(util.last(query.points)),
      avoid: util.join([query.avoidHighways && 'highways', query.avoidTolls && 'tolls'], '|') || undefined,
      units: unitSystems[query.units] || unitSystems.m,
      departure_time: Date.parse(query.begin) / 1000
    };
    if (query.points.length > 2) {
      req.waypoints = query.points.slice(1, query.points.length - 1).map(toCoordinates).join('|');
    }
    if (options.google_key) {
      req.key = options.google_key;
    }
    if (req.quotaUser) {
      req.quotaUser = options.google_qu;
    }
    if (req.origin && req.destination) {
      return req;
    }
  }

  function processResponse(response, query) {
    var directions, route, rtLeg;

    directions = {
      query: query,
      provider: options.name
    };
    if (response && response.status === gmStatus.OK && response.routes && response.routes[0]) {
      directions.places = [];
      route = response.routes[0];
      directions.name = route.summary;
      rtLeg = route.legs && route.legs[0];
      if (rtLeg) {
        directions.places.push(rtLeg.start_address);
        directions.routes = directions.routes || [];
        directions.segments = directions.segments || [];
        route.legs.reduce(extractDirections, directions);
        if (query.points.length === 2 && directions.routes.length === 1 && !(query.alternate || query.seasonal)) {
          // the web service was invoked because the map directions returned zero results - sign of seasonal road closure 
          directions.routes[0].seasonal = true;
        }
        if (route.overview_polyline && route.overview_polyline.points && query.path === pathType.coarse) {
          directions.pathReady = true;
          partition(util.decode(route.overview_polyline.points), directions.routes, directions.segments);
        }
      }
    }
    return directions;
  }

  options = _defaults(options || {}, {
    //Google says no more than 10 request per second,
    //but if we get below 500 millis we get `over the limit` issues
    interval: 340,
    penaltyInterval: 2000,
    maxPoints: 10, // Google waypoint limit is 8 plus origin and destination
    url: getUrl,
    status: getStatus,
    prepareRequest: prepareRequest,
    processResponse: processResponse
  });
  return require('..')(options);
}
