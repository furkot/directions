const { pathType } = require("../../model");
const status = require('../status');
const util = require('../util');

module.exports = init;

const units = {
  km: 'k',
  m: 'm'
};
const routeType = {
  '-1': 'shortest',
  0: 'shortest',
  1: 'bicycle',
  2: 'pedestrian'
};
const tolerance = {
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

function extractSegment(result, { distance, index, narrative, time }) {
  const { directions: { segments }, maneuverIndexes: indexes, path, unitMultiplier } = result;
  segments.push({
      duration: time,
      distance: Math.round((distance || 0) * unitMultiplier),
      path: indexes && path && path.slice(indexes[index], indexes[index + 1]),
      instructions: narrative
  });
  return result;
}

function extractDirections(result, leg) {
  const { directions: { routes, segments }, legIndexes: indexes, path } = result;
  const route = {
    duration: leg.time || 0,
    distance: Math.round((leg.distance || 0) * result.unitMultiplier)
  };
  if (indexes && path && result.fullPath) {
    route.path = path.slice(indexes[leg.index], indexes[leg.index + 1]);
  }
  if (leg.hasSeasonalClosure) {
    route.seasonal = true;
  }
  if (segments) {
    route.segmentIndex = segments.length;
  }
  routes.push(route);
  if (segments && leg.maneuvers) {
    leg.maneuvers.reduce(extractSegment, result);
  }
  return result;
}

function getStatus(err, response) {
  if (!response) {
    return;
  }
  const { info, route } = response;
  const st = info && info.statuscode;
  if (st === 403 || st === 500) {
    // assume its because we exceeded the limit
    return status.failure;
  }
  if (st === 402 || st > 600) {
    // cannot find route
    return status.empty;
  }
  if (st === 0) {
    if (route) {
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
    const req = {
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

    if (response && response.info) {
      const { statuscode: st } = response.info;
      if (st === 402 || st > 600) {
        // let it cascade to the next service
        return;
      }
    }

    const route = response && response.route;
    if (!(route && route.legs && route.legs.length)) {
      // shouldn't happen
      return;
    }
    const directions = {
        query,
        provider: getProvider(query)
      };
    if (route.name) {
      directions.name = route.name;
    }
    directions.routes = [];
    if (query.turnbyturn || query.path === pathType.smooth || query.path === pathType.coarse) {
      directions.segments = [];
    }
    const fullPath = query.path === pathType.full;
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
    return directions;
  }

  options = util.defaults(options, {
    // MapQuest allows 50 but we code it in URL and may run into URL length limit of approx 2000
    maxPoints: 30,
    url: getUrl,
    status: getStatus,
    prepareRequest,
    processResponse
  });
  return require('..')(options);
}
