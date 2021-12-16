// path simplification constants
var pathType = {
  none: 'none', // don't include the path in route (default)
  coarse: 'coarse', // include heavily simplified path
  smooth: 'smooth', // include path that is somewhat simplified
  full: 'full' // don't simplify the route path at all
};

// travel mode constants
var travelMode = {
  motorcycle: -1,
  car: 0,
  bicycle: 1,
  walk: 2,
  other: 3,
  ferry: 6
};

// template for directions query object
var directionsQuery = [{ // array of legs each for consecutive series of points
  mode: travelMode.car, // numeric value of travel mode
  avoidHighways: false, // true to avoid highways
  avoidTolls: false, // true to avoid toll roads
  units: 'm', // m - miles, km - kilometers
  points: [[0, 0]], // array of consecutive series of points; each point is [lon, lat]
  isInChina: false, // points are in China (some services need this information)
  begin: '', // date/time for the begin of route as 'YYYY-MM-DDThh:mm'
  turnbyturn: false, // provide detailed turn-by-turn instructions (segments in directionsResult)
  seasonal: false, // include roads that are seasonally closed
  path: pathType.none, // the degree of route path simplification
  span: 0, // distance in meters for more detailed path simplification
  alternate: false, // return alternatives to the default route
  stats: [] // set on output - list of providers that requests have been sent to to obtain directions
}];

// template for directions results object
var directionsResult = [{ // array of directions legs, one for each consecutive series of points
  query: directionsQuery, // query parameters
  places: [], // addresses or place names corresponding to points (if directions service performs reverse geocoding)
  name: '', // human-readable name of directions (if available)
  routes: [{ // routes; one for each point with a successor in the query.points
    duration: 0, // route duration in seconds
    distance: 0, // route distance in meters
    path: [], // simplified series of interim points; each point is [lon, lat]
    seasonal: false, // indicates a road that is seasonally closed
    segmentIndex: 0 // index of the turn-by-turn directions segment
  }],
  segments: [{ // turn-by-turn directions
    duration: 0, // segment duration in seconds
    distance: 0, // segment distance in meters
    path: [], // series of interim points; each point is [lon, lat]
    instructions: '' // textual instructions for this segment
  }],
  provider: '' // identifies service providing the directions
}];

module.exports = {
  directionsQuery: directionsQuery,
  directionsResult: directionsResult,
  pathType: pathType,
  travelMode: travelMode
};
