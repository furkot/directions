// https://github.com/valhalla/valhalla-docs

var pathType = require("../../model").pathType;
var status = require('../status');
var util = require('../util');

module.exports = init;

var units = {
  km: 'kilometers',
  m: 'miles'
};
var costing = {
  '-1': 'auto',
  0: 'auto',
  1: 'bicycle',
  2: 'pedestrian'
};

function prepareWaypoint(p) {
  // waypoint format is { lat, lon, type } where type is either 'break' (default) or 'through'
  return {
    lon: p[0],
    lat: p[1],
    type: 'break'
  };
}

function extractSegment(result, maneuver) {
  var segments = result.directions.segments, path = result.path;
  segments.push({
      duration: maneuver.time,
      distance: Math.round((maneuver.length || 0) * result.unitMultiplier),
      path: path && path.slice(maneuver.begin_shape_index, maneuver.end_shape_index),
      instructions: maneuver.instruction
  });
  return result;
}

function extractDirections(result, leg) {
  var directions = result.directions, route;
  result.path = util.decode(leg.shape, { factor: 1e6 });
  route = {
    duration: (leg.summary && leg.summary.time) || 0,
    distance: Math.round(((leg.summary && leg.summary.length) || 0) * result.unitMultiplier)
  };
  if (result.fullPath) {
    route.path = result.path;
  }
  if (directions.segments) {
    route.segmentIndex = directions.segments.length;
  }
  directions.routes.push(route);
  if (directions.segments && leg.maneuvers) {
    leg.maneuvers.reduce(extractSegment, result);
    if (directions.segments.length) {
      util.last(directions.segments).path.push(util.last(result.path));
    }
  }
  return result;
}

function getStatus(err, response) {
  var st = response && response.status_code;
  if (!response) {
    return;
  }
  // 403 Forbidden, 429 Too Many Requests
  if (st === 403 || st === 429) {
    // we exceeded the limit
    return status.failure;
  }
  if (st === 400) {
    // no route
    return status.empty;
  }
  st = response.trip && response.trip.status;
  if (st === 0) {
    if (response.trip.legs && response.trip.legs.length) {
      return status.success;
    }
    return status.empty;
  }
}

function init(options) {

  function prepareRequest(query) {
    var req = {
      locations: query.points.map(prepareWaypoint),
      costing: costing[query.mode] || costing[0],
      directions_options: {
        units: units[query.units] || units.m
      }
    };
    req.costing_options = req.costing_options || {};
    req.costing_options[req.costing] = {};
    if (query.avoidTolls) {
      req.costing_options[req.costing].toll_booth_penalty = 1000.0;
      req.costing_options[req.costing].use_tolls = 0;
    }
    else {
      req.costing_options[req.costing].use_tolls = 1;
    }
    if (query.avoidHighways) {
      req.costing_options[req.costing].use_highways = 0;
    }
    else {
      req.costing_options[req.costing].use_highways = 1;
    }
    if (query.begin) {
      req.date_time = {
        type: 1,
        value: query.begin
      };
    }

    req = {
      json: JSON.stringify(req)
    };
    if (options.valhalla_key) {
      req.api_key = options.valhalla_key;
    }
    return req;
  }

  function processResponse(response, query) {
    var directions, trip, fullPath;

    trip = response && response.trip;
    if (trip && trip.legs && trip.legs.length) {
      directions = {
        query: query,
        provider: options.name,
        routes: []
      };
      if (query.turnbyturn || query.path === pathType.smooth || query.path === pathType.coarse) {
        directions.segments = [];
      }
      fullPath = query.path === pathType.full;
      trip.legs.reduce(extractDirections, {
        directions: directions,
        unitMultiplier: query.units !== 'km' ? util.metersInMile : util.metersInKm,
        fullPath: fullPath
      });
      if (fullPath) {
        // path is already prepared - no need to do it again from segments
        directions.pathReady = true;
      }
      return directions;
    }
  }

  options = util.defaults(options, {
    // Mapzen says 2 request per second: https://mapzen.com/documentation/overview/#mapzen-turn-by-turn
    // but if we get below 560 millis it starts returning 429 (Too Many Requests)
    interval: 560,
    // max 20 points for automobile and 50 for bicycle and pedestrian
    maxPoints: options.valhalla_max_points || 2,
    url: options.valhalla_url,
    body: true,
    status: getStatus,
    prepareRequest: prepareRequest,
    processResponse: processResponse
  });
  return require('..')(options);
}
