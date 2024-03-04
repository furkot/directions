// https://openrouteservice.org/dev/#/api-docs/directions

const LatLon = require('geodesy/latlon-spherical');
const { pathType, travelMode } = require("../../model");
const status = require('../status');
const tagRoute = require('../tag-route');
const util = require('../util');

module.exports = init;

const profile = {
  '-1': 'driving-car',
  0: 'driving-car',
  1: 'cycling-regular',
  2: 'foot-hiking',
  5: 'driving-hgv'
};
const profileRestrictions = {
  5: {
    hazmat: true
  }
};
const avoidFeatures = {
  avoidHighways: 'highways',
  avoidTolls: 'tollways',
  avoidFerry: 'ferries'
};
const ferryTypes = {
  '9': true
};
const roughTypes = {
  '2': true, // Unpaved
  '8': true, // Compacted Gravel
  '9': true, // Fine Gravel
  '10': true, // Gravel
  '11': true, // Dirt
  '12': true, // Ground
  '15': true, // Sand
  '17': true, // Grass
  '18': true // Grass Paver
};
const tollTypes = {
  '1': true
};
const maxRoundabout = 12 * 60 * 60; // 12 hours maximum for route that is 10 times longer than direct distance


function extractStep(result, { distance, duration, instruction, way_points }) {
  const { directions: { segments }, path } = result;
  const seg = {
    duration: Math.round(duration || 0),
    distance: Math.round(distance || 0),
    path: path?.slice(way_points[0], way_points[1] + 1),
    instructions: instruction
  };
  segments.push(seg);
  return result;
}

function setFerryMode(seg) {
  seg.mode = travelMode.ferry;
}

function setRough(seg) {
  seg.rough = true;
}

function setTolls(seg) {
  seg.tolls = true;
}

function extractDirections(result, { distance, duration, steps }, i) {
  const { directions: { routes, segments }, path, surface, waypoints, waytypes, tollways } = result;
  const route = {
    duration: Math.round(duration || 0),
    distance: Math.round(distance || 0),
    path: path?.slice(waypoints[i], waypoints[i + 1] + 1)
  };
  if (!(route.duration || route.distance || (route.path?.length > 1))) {
    route.path = [];
  }
  if (segments) {
    route.segmentIndex = segments.length;
  }
  routes.push(route);
  if (segments && steps) {
    steps.reduce(extractStep, result);
    if (segments.length === 1) {
      const seg = segments[0];
      if (!(seg.duration || seg.distance || (seg.path?.length > 1))) {
        seg.path = [];
      }
    }
    if (segments.length && route.path.length) {
      util.last(segments).path.push(util.last(route.path));
    }
    const ferry = tagRoute(waytypes, {
      segments,
      types: ferryTypes,
      updateSegment: setFerryMode
    });
    if (ferry?.foundType) {
      route.ferry = true;
    }
    const rough = tagRoute(surface, {
      segments,
      types: roughTypes,
      updateSegment: setRough
    });
    if (rough?.foundType) {
      route.rough = true;
    }
    const tolls = tagRoute(tollways, {
      segments,
      types: tollTypes,
      updateSegment: setTolls
    });
    if (tolls?.foundType) {
      route.tolls = true;
    }
  }
  return result;
}

function toLatLon(p) {
  return new LatLon(p[1], p[0]);
}

function directDistance(locations) {
  return locations.reduce((result, next) => {
    next = toLatLon(next);
    result.dist += result.ll.distanceTo(next);
    result.ll = next;
    return result;
  }, {
    dist: 0,
    ll: toLatLon(locations[0])
  }).dist;
}

function getStatus(st, response) {
  if (!st && response?.routes?.length) {
    const { distance, duration } = response.routes.reduce((result, { summary}) => {
      result.distance += summary.distance;
      result.duration += summary.duration;
      return result;
    }, { distance: 0, duration: 0 });
    const coordinates = response.metadata?.query?.coordinates;
    const direct = coordinates ? directDistance(coordinates) : distance;
    if (distance < 5 * direct || duration < maxRoundabout) {
      return status.success;
    }
    delete response.routes;
  }
  return status.empty;
}

function vehicleSize(query, restrictions) {
  const { mode, vehicle } = query;
  if (!(vehicle && mode === travelMode.rv)) {
    return restrictions;
  }
  restrictions = Object.assign({}, restrictions, vehicle);
  if (restrictions.axle_load !== undefined) {
    restrictions.axleload = restrictions.axle_load;
    delete restrictions.axle_load;
  }
  return restrictions;
}

function init(options) {

  function prepareUrl(query) {
    return [
      options.openroute_url,
      profile[query.mode] || profile[0],
      'json'
    ].join('/');
  }

  function avoidFeature(result, flag) {
    const { query, req } = result;
    if (query[flag]) {
      req.options = req.options || {};
      req.options.avoid_features = req.options.avoid_features || [];
      req.options.avoid_features.push(avoidFeatures[flag]);
    }
    return result;
  }

  function prepareRequest(query) {
    const req = {
      coordinates: query.points,
      extra_info: ['surface', 'tollways']
    };
    if (!query.turnbyturn && query.path !== pathType.smooth && query.path !== pathType.coarse) {
      req.instructions = false;
    } else {
      req.extra_info.push('waytype');
    }
    const restrictions = vehicleSize(query, profileRestrictions[query.mode]);
    if (restrictions) {
      req.options = {
        profile_params: {
          restrictions
        }
      };
      if (query.mode === travelMode.rv) {
        req.options.vehicle_type = 'hgv';
      }
    }
    const param = { query, req };
    if ((profile[query.mode] || profile[0]) === 'driving-car') {
      ['avoidHighways', 'avoidTolls'].reduce(avoidFeature, param);
    }
    avoidFeature(param, 'avoidFerry');

    return req;
  }

  function processResponse(response, query) {

    if (!response?.routes?.length) {
      // let it cascade to the next service
      return;
    }

    const directions = {
      query,
      provider: options.name
    };
    const paths = response.routes[0].segments;
    const geometry = response.routes[0].geometry;
    if (paths) {
      directions.routes = [];
      if (query.turnbyturn || query.path === pathType.smooth || query.path === pathType.coarse) {
        directions.segments = [];
      }
      const fullPath = query.path === pathType.full;
      const { extras, way_points: waypoints } = response.routes[0];
      paths.reduce(extractDirections, {
        directions,
        path: util.decode(geometry),
        surface: extras?.surface?.values,
        tollways: extras?.tollways?.values,
        waypoints,
        waytypes: extras?.waytypes?.values
      });
      if (fullPath) {
        // path is already prepared - no need to do it again from segments
        directions.pathReady = true;
      }
    }
    return directions;
  }

  options = util.defaults(options, {
    maxPoints: 10, // unknown maximum
    post: true,
    authorization: options.openroute_key,
    url: prepareUrl,
    status: getStatus,
    prepareRequest,
    processResponse
  });
  return require('..')(options);
}
