var _ = require('lodash');
var status = require('../status');
var util = require('../util');

module.exports = init;

var metersInKm = 1000;
var service = {
  openmapquest: 'https://open.mapquestapi.com/directions/v2/',
  mapquest: 'https://www.mapquestapi.com/directions/v2/'
};
var units = {
  km: 'k',
  m: 'm'
};
var routeType = {
  '-1': 'shortest',
  0: 'shortest',
  1: 'pedestrian',
  2: 'bicycle'
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

function getPlace(location) {
  return util.join([
    location.street,
    location.adminArea5,
    location.adminArea4,
    location.adminArea3,
    location.adminArea1
  ], ', ') || undefined;
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
      distance: (maneuver.distance || 0) * metersInKm,
      path: indexes && path && path.slice(indexes[maneuver.index], indexes[maneuver.index + 1]),
      instructions: maneuver.narrative
  });
  return result;
}

function extractDirections(result, leg) {
  var directions = result.directions, indexes = result.legIndexes, path = result.path;
  directions.routes.push({
    duration: leg.time || 0,
    distance: (leg.distance || 0) * metersInKm,
    path: indexes && path && path.slice(indexes[leg.index], indexes[leg.index + 1]),
    segmentIndex: directions.segments.length
  });
  if (leg.maneuvers) {
    leg.maneuvers.reduce(extractSegment, result);
  }
  return result;
}

function processResponse(response, query) {
  var directions, route;

  directions = {
    query: query
  };
  route = response && response.body && response.body.route;
  if (route) {
    if (route.name) {
      directions.name = route.name;
    }
    if (route.locations) {
      directions.places = route.locations.map(getPlace);
    }
    if (route.legs) {
      directions.routes = directions.routes || [];
      directions.segments = directions.segments || [];
      route.legs.reduce(extractDirections, {
        directions: directions,
        units: query.units || 'm',
        maneuverIndexes: route.shape && route.shape.maneuverIndexes,
        legIndexes: route.shape && route.shape.legIndexes,
        path: route.shape && route.shape.shapePoints.reduce(addPoint, [])
      });
    }
  }
  return directions;
}

function getUrl(query) {
  return (query.alternate ? service.mapquest : service.openmapquest) +
    (query.alternate && query.points.length <= 2 ? 'alternateroutes' : 'route');
}

function getStatus(response) {
  var st;
  response = response && response.body;
  if (!response) {
    return;
  }
  st = response.info && response.info.statuscode;
  if (st === 403 || st === 500) {
    // assume its because we exceeded the limit
    return status.failure;
  }
  if (status === 0) {
    if (response.route) {
      return status.success;
    }
    return status.empty;
  }
}

function init(options) {

  function prepareRequest(query) {
    var req;

    if (!(query.points && query.points.length > 1)) {
      return;
    }
    req = {
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
    if (query.begin && query.service === 'mapquest') {
      req.timeType = 2;
      req.dateType = 0;
      req.isoLocal = query.begin;
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

  options = _.defaults(options || {}, {
    // MapQuest allows 50 but we code it in URL and may run into URL length limit of approx 2000
    maxPoints: 30,
    url: getUrl,
    status: getStatus,
    prepareRequest: prepareRequest,
    processResponse: processResponse
  });
  return require('../index')(options);
}
