var _defaults = require('lodash.defaults');
var status = require('../status');
var util = require('../util');

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

function toLatLng(point) {
  if (point && point[0] !== undefined && point[1] !== undefined) {
      return new google.maps.LatLng(point[1], point[0]);
  }
}

function fromLatLng(latlng) {
  return latlng && [latlng.lng(), latlng.lat()];
}

function prepareWaypoint(point) {
  return {
      location: toLatLng(point)
  };
}

function prepareRequest(query) {
  var req;
  if (!(query.points && query.points.length > 1)) {
      return;
  }
  req = {
    origin: toLatLng(query.points[0]),
    destination: toLatLng(util.last(query.points)),
    travelMode: travelModes[query.mode] || travelModes[0],
    unitSystem: unitSystems[query.units] || unitSystems.m,
    avoidHighways: Boolean(query.avoidHighways),
    avoidTolls: Boolean(query.avoidTolls)
  };
  if (query.points.length > 2) {
    req.waypoints = query.points.slice(1, query.points.length - 1).map(prepareWaypoint);
  }
  if (req.origin && req.destination) {
      return req;
  }
}

function extractSegment(directions, step) {
  var segments = directions.segments;
  if (!step.instructions) {
      step.instructions = step.html_instructions;
  }
  segments.push({
      duration: step.duration.value,
      distance: step.distance.value,
      path: step.path && step.path.map(fromLatLng),
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

function distanceSquare(p1, p2) {
  return Math.pow((p1.lng() - p2.lng()), 2) + Math.pow((p1.lat() - p2.lat()), 2);
}

function pointOnLine(point, p1, p2) {
  var d = distanceSquare(p1, p2), t, pol;
  if (!d) {
      pol = p1;
  }
  else {
      t = ((point.lng() - p1.lng()) * (p2.lng() - p1.lng()) + (point.lat() - p1.lat()) * (p2.lat() - p1.lat())) / d;
      if (t < 0) {
          pol = p1;
      }
      else if (t > 1) {
          pol = p2;
      }
      else {
          pol = new google.maps.LatLng(p1.lat() + t * (p2.lat() - p1.lat()),
                  p1.lng() + t * (p2.lng() - p1.lng()));
      }
  }
  return pol;
}

function minDistance(res, p, i, path) {
  var dist = gmComputeDistanceBetween(res.point, p);
  if (dist < res.dist || (dist < res.minDistance && res.pol)) {
      res.dist = dist;
      res.idx = i;
      res.p = p;
      res.pol = undefined;
  }
  if (i > 0) {
      p = pointOnLine(res.point, path[i - 1], p);
      dist = gmComputeDistanceBetween(res.point, p);
      if (dist < res.dist && (res.dist >= res.minDistance || res.pol)) {
          res.dist = dist;
          res.idx = i - 1;
          res.p = p;
          res.pol = true;
      }
  }
  return res;
}

function findPointOnPath(point, path) {
  var result;
  if (point && path) {
    result = path.reduce(minDistance, {
      dist: Number.MAX_VALUE,
      point: toLatLng(point),
      minDistance: 0.5
    });
    if (result.idx !== undefined) {
      return result;
    }
  }
}

function processResponse(response, query) {
  var directions, route, rtLeg;

  if (response && response.status === gmStatus.ZERO_RESULTS && util.isFuture(query.begin)) {
    // let it cascade to Google Directions Web Service
    return;
  }
  directions = {
    query: query
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
      if (route.overview_path) {
        directions.routes[0].path = route.overview_path;
        directions.routes.reduce(function (prev, next) {
          var point = findPointOnPath(directions.segments[next.segmentIndex].path[0], prev.path);
          if (point) {
              next.path = prev.path.slice(point.idx + 1);
              prev.path = prev.path.slice(0, point.idx + 1).map(fromLatLng);
          }
        });
        util.last(directions.routes).path = util.last(directions.routes).path.map(fromLatLng);
      }
    }
  }
  return directions;
}

function request(url, req, fn) {
  gmService.route(req, function (response) {
    fn(undefined, response);
  });
}

function getStatus(response) {
  var st;
  if (!response) {
    return;
  }
  st = response.status;
  if (st === gmStatus.OVER_QUERY_LIMIT || st === gmStatus.UNKNOWN_ERROR) {
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
  if (!(query.points && query.points.length > 1)) {
    return;
  }
  req = {
    origin: toLatLng(query.points[0]),
    destination: toLatLng(util.last(query.points)),
    travelMode: travelModes[query.mode] || travelModes[0],
    unitSystem: unitSystems[query.units] || unitSystems.m,
    avoidHighways: Boolean(query.avoidHighways),
    avoidTolls: Boolean(query.avoidTolls)
  };
  if (query.points.length > 2) {
    req.waypoints = query.points.slice(1, query.points.length - 1).map(prepareWaypoint);
  }
  if (req.origin && req.destination) {
      return req;
  }
}

function init(options) {

  options = _defaults(options || {}, {
    //Google says no more than 10 request per second,
    //but if we get below 500 millis we get `over the limit` issues
    interval: 340,
    penaltyInterval: 2000,
    maxPoints: 10, // Google waypoint limit is 8 plus origin and destination
    request: request,
    status: getStatus,
    prepareRequest: prepareRequest,
    processResponse: processResponse
  });
  return require('../index')(options);
}
