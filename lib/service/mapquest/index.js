var _defaults = require('lodash.defaults');
var pathType = require("../../model").pathType;
var status = require('../status');
var util = require('../util');

module.exports = init;

var units = {
  km: 'k',
  m: 'm'
};
var routeType = {
  '-1': 'shortest',
  0: 'shortest',
  1: 'bicycle',
  2: 'pedestrian'
};
var tolerance = {
  '-1': 20,
  0: 20,
  1: 10,
  2: 2
};

function prepareWaypoint(p) {
  return {
    latLng: {
      lng: p[0],
      lat: p[1]
    }
  };
}

function addPoint(result, p, i, points) {
  if (i % 2 === 0) {
      result.push([ points[i + 1], p ]);
  }
  return result;
}

function extractSegment(result, maneuver) {
  var segments = result.directions.segments, indexes = result.maneuverIndexes, path = result.path;
  segments.push({
      duration: maneuver.time,
      distance: Math.round((maneuver.distance || 0) * result.unitMultiplier),
      path: indexes && path && path.slice(indexes[maneuver.index], indexes[maneuver.index + 1]),
      instructions: maneuver.narrative
  });
  return result;
}

function extractDirections(result, leg) {
  var directions = result.directions, indexes = result.legIndexes, path = result.path, route;
  route = {
    duration: leg.time || 0,
    distance: Math.round((leg.distance || 0) * result.unitMultiplier)
  };
  if (indexes && path && result.fullPath) {
    route.path = path.slice(indexes[leg.index], indexes[leg.index + 1]);
  }
  if (leg.hasSeasonalClosure) {
    route.seasonal = true;
  }
  if (directions.segments) {
    route.segmentIndex = directions.segments.length;
  }
  directions.routes.push(route);
  if (directions.segments && leg.maneuvers) {
    leg.maneuvers.reduce(extractSegment, result);
  }
  return result;
}

function getStatus(response) {
  var st;
  if (!response) {
    return;
  }
  st = response.info && response.info.statuscode;
  if (st === 403 || st === 500) {
    // assume its because we exceeded the limit
    return status.failure;
  }
  if (st === 0) {
    if (response.route) {
      return status.success;
    }
    return status.empty;
  }
}

function init(options) {

  function getProvider(query) {
    if (query.alternate) {
      return options.name;
    }
    return 'open' + options.name;
  }

  function getUrl(query) {
    return options[getProvider(query) + '_url'] + '/directions/v2/' +
      (query.alternate && query.points.length <= 2 ? 'alternateroutes' : 'route');
  }

  function prepareRequest(query) {
    var req = {
      unit: units[query.units] || units.m,
      manmaps: false,
      destinationManeuverDisplay: false,
      doReverseGeocode: false,
      routeType: routeType[query.mode] || routeType[0],
      generalize: tolerance[query.mode]
    };
    if (query.avoidHighways) {
      req.avoids = [ 'Limited Access' ];
    }
    if (query.avoidTolls) {
      req.avoids = req.avoids || [];
      req.avoids.push('Toll Road');
    }
    if (query.begin) {
      req.timeType = 2;
      req.dateType = 0;
      req.isoLocal = query.begin;
    }
    else if (!query.seasonal) {
      req.disallows = [ 'Approximate Seasonal Closure' ];
    }
    if (!query.turnbyturn) {
      req.narrativeType = 'none';
    }

    return {
      json: JSON.stringify({
        options: req,
        locations: query.points.map(prepareWaypoint)
      }),
      inFormat: 'json',
      outFormat: 'json',
      key: options.mapquest_key
    };
  }

  function processResponse(response, query) {
    var directions, route, fullPath;

    directions = {
      query: query,
      provider: getProvider(query)
    };
    route = response && response.route;
    if (route) {
      if (route.name) {
        directions.name = route.name;
      }
      if (route.legs) {
        directions.routes = [];
        if (query.turnbyturn || query.path === pathType.smooth || query.path === pathType.coarse) {
          directions.segments = [];
        }
        fullPath = query.path === pathType.full;
        route.legs.reduce(extractDirections, {
          directions: directions,
          unitMultiplier: query.units === 'km' ? util.metersInKm : util.metersInMile,
          maneuverIndexes: route.shape && route.shape.maneuverIndexes,
          legIndexes: route.shape && route.shape.legIndexes,
          path: route.shape && route.shape.shapePoints.reduce(addPoint, []),
          fullPath: fullPath
        });
        if (fullPath) {
          // path is already prepared - no need to do it again from segments
          directions.pathReady = true;
        }
      }
    }
    return directions;
  }

  options = _defaults(options || {}, {
    // MapQuest allows 50 but we code it in URL and may run into URL length limit of approx 2000
    maxPoints: 30,
    url: getUrl,
    status: getStatus,
    prepareRequest: prepareRequest,
    processResponse: processResponse
  });
  return require('..')(options);
}
