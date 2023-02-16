// https://github.com/valhalla/valhalla-docs

const LatLon = require('geodesy/latlon-spherical');
const { pathType, travelMode } = require("../../model");
const status = require('../status');
const util = require('../util');

module.exports = init;

const units = {
  km: 'kilometers',
  m: 'miles'
};
const costing = {
  1: 'bicycle',
  2: 'pedestrian',
  5: 'truck'
};
const defaultCosting = 'auto';
const costingOptions = {
  5: {
    // default restriction for trucks/RVs
    hazmat: true
  }
};
const minSpeed = 15 * 1000 / 3600; // bump speed when it is absurdly low
const turnDistance = 100; // don't adjust speed of turns
const maxRoundabout = 12 * 60 * 60; // 12 hours maximum for route that is 10 times longer than direct distance

const maneuver = {
  ferryEnter: 28,
  ferryExit: 29
};

function prepareWaypoint(p) {
  // waypoint format is { lat, lon, type } where type is either 'break' (default) or 'through'
  return {
    lon: p[0],
    lat: p[1],
    type: 'break'
  };
}

function extractSegment(result, {
  type,
  begin_shape_index,
  end_shape_index,
  instruction,
  length,
  time,
  rough,
  travel_mode
}) {
  const { directions: { segments, routes }, unitMultiplier, path } = result;
  const distance = Math.round((length || 0) * unitMultiplier);
  let duration = time;
  // for some reason Valhalla calculates absurdly low speed on some dirt roads
  if (rough && duration && travel_mode === 'drive' && distance > turnDistance && distance / duration < minSpeed) {
    duration = Math.round(distance / minSpeed);
  }
  result.legDuration += duration;
  const seg = {
    duration,
    distance,
    path: path && path.slice(begin_shape_index, end_shape_index),
    instructions: instruction
  };
  if (type === maneuver.ferryExit || result.ferry) {
    if (result.ferry) {
      delete result.ferry;
    } else if (segments.length) {
      // route started on the ferry
      util.last(segments).mode = travelMode.ferry;
      util.last(routes).ferry = true;
    }
  } else if (type === maneuver.ferryEnter) {
    seg.mode = travelMode.ferry;
    result.ferry = util.last(routes).ferry = true;
  }
  segments.push(seg);
  return result;
}

function extractDirections(result, leg) {
  const { directions } = result;
  result.path = util.decode(leg.shape, { factor: 1e6 });
  const route = {
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
    result.legDuration = 0;
    leg.maneuvers.reduce(extractSegment, result);
    route.duration = result.legDuration;
    if (directions.segments.length) {
      util.last(directions.segments).path.push(util.last(result.path));
    }
  }
  return result;
}

function toLatLon(p) {
  return new LatLon(p.lat, p.lon);
}

function directDistance(locations, units) {
  units = units === 'miles' ? util.metersInMile : util.metersInKm;
  return locations.reduce((result, next) => {
    next = toLatLon(next);
    result.dist += result.ll.distanceTo(next);
    result.ll = next;
    return result;
  }, {
    dist: 0,
    ll: toLatLon(locations[0])
  }).dist / units;
}

function getStatus(err, response) {
  let st = response && response.status_code;
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
      const { length, time } = response.trip.summary;
      const distance = directDistance(response.trip.locations, response.trip.units);
      // make sure points are not too far from roads
      if (length > 0.9 * distance &&
          (length < 10 * distance || time < maxRoundabout)) {
        return status.success;
      }
    }
    delete response.trip.legs;
    return status.empty;
  }
}

function vehicleSize(query, options) {
  const { mode, vehicle } = query;
  if (!(vehicle && mode === travelMode.rv)) {
    return;
  }
  Object.assign(options, vehicle);
}

function init(options) {

  function prepareRequest(query) {
    let req = {
      locations: query.points.map(prepareWaypoint),
      costing: costing[query.mode] || defaultCosting,
      costing_options: {},
      directions_options: {
        units: units[query.units] || units.m
      }
    };
    req.costing_options[req.costing] = Object.assign({}, costingOptions[query.mode]);
    if (query.avoidTolls) {
      req.costing_options[req.costing].toll_booth_penalty = 1000.0;
      req.costing_options[req.costing].use_tolls = 0;
    } else {
      req.costing_options[req.costing].use_tolls = 1;
    }
    if (query.avoidHighways) {
      req.costing_options[req.costing].use_highways = 0;
    } else {
      req.costing_options[req.costing].use_highways = 1.1;
    }
    if (query.avoidFerry) {
      req.costing_options[req.costing].use_ferry = 0;
    } else {
      req.costing_options[req.costing].use_ferry = 1;
    }
    vehicleSize(query, req.costing_options[req.costing]);

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
    const trip = response && response.trip;
    if (trip && trip.legs && trip.legs.length) {
      const directions = {
        query,
        provider: options.name,
        routes: []
      };
      if (query.turnbyturn || query.path === pathType.smooth || query.path === pathType.coarse) {
        directions.segments = [];
      }
      const fullPath = query.path === pathType.full;
      trip.legs.reduce(extractDirections, {
        directions,
        unitMultiplier: query.units !== 'km' ? util.metersInMile : util.metersInKm,
        fullPath
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
    prepareRequest,
    processResponse
  });
  return require('..')(options);
}
