var _defaults = require('lodash.defaults');
var status = require('../status');
var util = require('../util');

module.exports = init;

var units = {
  km: 'km',
  m: 'mi'
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
    lat: p[1]
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
  result.path = leg.shape && util.decode(leg.shape, 1e6);
  route = {
    duration: (leg.summary && leg.summary.time) || 0,
    distance: Math.round(((leg.summary && leg.summary.length) || 0) * result.unitMultiplier),
    path: result.path
  };
  if (directions.segments) {
    route.segmentIndex = directions.segments.length;
  }
  directions.routes.push(route);
  if (directions.query.turnbyturn && leg.maneuvers) {
    leg.maneuvers.reduce(extractSegment, result);
  }
  return result;
}

function getStatus(response) {
  var st = response && response.status;
  response = response && response.body;
  if (!response) {
    return;
  }
  // 403 Forbidden, 429 Too Many Requests
  if (st === 403 || st === 429) {
    // we exceeded the limit
    return status.failure;
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
        unit: units[query.units] || units.m
      }
    };
    if (query.avoidTolls) {
      req.costing_options = req.costing_options || {};
      req.costing_options[req.costing] = {
        toll_booth_penalty: 1000.0
      };
    }
    if (query.begin) {
      req.date_time = {
        type: 1,
        value: query.begin
      };
    }

    return {
      json: JSON.stringify(req),
      api_key: options.mapzen_key
    };
  }

  function processResponse(response, query) {
    var directions, trip;

    directions = {
      query: query,
      provider: options.name
    };
    trip = response && response.body && response.body.trip;
    if (trip && trip.legs) {
      directions.routes = directions.routes || [];
      if (query.turnbyturn) {
        directions.segments = directions.segments || [];
      }
      trip.legs.reduce(extractDirections, {
        directions: directions,
        unitMultiplier: query.units === 'km' ? util.metersInKm : util.metersInMile
      });
    }
    return directions;
  }

  options = _defaults(options || {}, {
    // Mapzen says 2 request per second: https://mapzen.com/documentation/overview/#mapzen-turn-by-turn
    // but if we get below 560 millis it starts returning 429 (Too Many Requests)
    interval: 560,
    maxPoints: 20, // max 20 points for automobile and 50 for bicycle and pedestrian
    url: options.mapzen_url,
    status: getStatus,
    prepareRequest: prepareRequest,
    processResponse: processResponse
  });
  return require('../index')(options);
}