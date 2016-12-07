var _defaults = require('lodash.defaults');
var status = require('../status');
var util = require('../util');

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

function distanceSquare(p1, p2) {
  return Math.pow((p1[0] - p2[0]), 2) + Math.pow((p1[1] - p2[1]), 2);
}

function pointOnLine(point, p1, p2) {
  var d = distanceSquare(p1, p2), t, pol;
  if (!d) {
      pol = p1;
  }
  else {
      t = ((point[0] - p1[0]) * (p2[0] - p1[0]) + (point[1] - p1[1]) * (p2[1] - p1[1])) / d;
      if (t < 0) {
          pol = p1;
      }
      else if (t > 1) {
          pol = p2;
      }
      else {
          pol = [p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1])];
      }
  }
  return pol;
}

function minDistance(res, p, i, path) {
  var dist = distanceSquare(res.point, p);
  if (dist < res.dist || (dist < res.minDistance && res.pol)) {
      res.dist = dist;
      res.idx = i;
      res.p = p;
      res.pol = undefined;
  }
  if (i > 0) {
      p = pointOnLine(res.point, path[i - 1], p);
      dist = distanceSquare(res.point, p);
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
      point: point,
      minDistance: 0.5
    });
    if (result.idx !== undefined) {
      return result;
    }
  }
}

function processResponse(response, query) {
  var directions, route, rtLeg;

  directions = {
    query: query
  };
  response = response && response.body;
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
      if (route.overview_polyline && route.overview_polyline.points) {
        directions.routes[0].path = util.decode(route.overview_polyline.points);
        directions.routes.reduce(function (prev, next) {
          var point = findPointOnPath(directions.segments[next.segmentIndex].path[0], prev.path);
          if (point) {
              next.path = prev.path.slice(point.idx + 1);
              prev.path = prev.path.slice(0, point.idx + 1);
          }
        });
      }
    }
  }
  return directions;
}

function getStatus(response) {
  var st;
  response = response && response.body;
  if (!response) {
    return;
  }
  st = response.status;
  if (st === gmStatus.OVER_QUERY_LIMIT && response.error_message && response.error_message.indexOf('daily') > -1) {
    // stop asking
    return status.failure;
  }
  if (st === gmStatus.OVER_QUERY_LIMIT || st === gmStatus.UNKNOWN_ERROR) {
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
    var req;
    if (!(query.points && query.points.length > 1)) {
        return;
    }

    req = {
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
  return require('../index')(options);
}
