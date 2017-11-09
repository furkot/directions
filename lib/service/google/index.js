var eviltransform = require('eviltransform');
var partition = require('../partition');
var pathType = require("../../model").pathType;
var status = require('../status');
var util = require('../util');
var debug = require('debug')('furkot:directions:google');

module.exports = init;

var gmService, travelModes, unitSystems, gmStatus, gmComputeDistanceBetween;

/* global window, google */

function initService() {
  var gmTravelMode, gmUnitSystem;

  if (!gmService && window && window.google && window.google.maps) {
    gmService = new google.maps.DirectionsService();
    gmTravelMode = google.maps.DirectionsTravelMode;
    travelModes = {
      '-1': gmTravelMode.DRIVING,
      0: gmTravelMode.DRIVING,
      1: gmTravelMode.BICYCLING,
      2: gmTravelMode.WALKING,
      3: 'OTHER'
    };
    gmUnitSystem = google.maps.UnitSystem;
    unitSystems = {
      km: gmUnitSystem.METRIC,
      m: gmUnitSystem.IMPERIAL
    };
    gmStatus = google.maps.DirectionsStatus;
    gmComputeDistanceBetween = google.maps.geometry.spherical.computeDistanceBetween;
  }
  return gmService;
}

function toLatLng(point, isInChina) {
  if (point && point[0] !== undefined && point[1] !== undefined) {
    if (isInChina) {
      point = eviltransform.wgs2gcj(point[1], point[0]);
      return new google.maps.LatLng(point.lat, point.lng);
    }
    return new google.maps.LatLng(point[1], point[0]);
  }
}

function fromLatLng(latlng) {
  var isInChina = this.isInChina;
  if (!latlng) {
    return;
  }
  if (isInChina) {
    latlng = eviltransform.gcj2wgs(latlng.lat(), latlng.lng());
    return [latlng.lng, latlng.lat];
  }
  return [latlng.lng(), latlng.lat()];
}

function prepareWaypoint(point) {
  var isInChina = this.isInChina;
  return {
      location: toLatLng(point, isInChina)
  };
}

function extractSegment(directions, step) {
  var segments = directions.segments;
  if (!step.instructions) {
      step.instructions = step.html_instructions;
  }
  segments.push({
      duration: step.duration.value,
      distance: step.distance.value,
      path: step.path && step.path.map(fromLatLng, directions.query),
      instructions: step.instructions
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

function request(url, req, fn) {
  gmService.route(req, function (response, status) {
    fn(status, response);
  });
}

function getStatus(st, response) {
  if (!(response || st)) {
    return;
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

function prepareRequest(query) {
  var req;
  if (!initService()) {
    return;
  }
  req = {
    origin: toLatLng(query.points[0], query.isInChina),
    destination: toLatLng(util.last(query.points), query.isInChina),
    travelMode: travelModes[query.mode] || travelModes[0],
    unitSystem: unitSystems[query.units] || unitSystems.m,
    avoidHighways: Boolean(query.avoidHighways),
    avoidTolls: Boolean(query.avoidTolls)
  };
  if (query.points.length > 2) {
    req.waypoints = query.points.slice(1, query.points.length - 1).map(prepareWaypoint, query);
  }
  if (req.origin && req.destination) {
      return req;
  }
}

function init(options) {

  function processResponse(response, query) {
    var directions, route, rtLeg;

    if ((!response || response.status === gmStatus.ZERO_RESULTS) && (util.isFuture(query.begin) || query.seasonal)) {
      // let it cascade to the next service
      return;
    }
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
        if (route.overview_path && query.path === pathType.coarse) {
          directions.pathReady = true;
          partition(route.overview_path.map(fromLatLng, query), directions.routes, directions.segments);
        }
      }
    }
    return directions;
  }

  options = util.defaults(options, {
    //Google says no more than 10 request per second,
    //but if we get below 500 millis we get `over the limit` issues
    interval: 340,
    penaltyInterval: 2000,
    maxPoints: 25, // Google waypoint limit is 23 plus origin and destination
    request: request,
    status: getStatus,
    prepareRequest: prepareRequest,
    processResponse: processResponse
  });
  return require('..')(options);
}
