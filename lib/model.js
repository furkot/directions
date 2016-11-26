// template for directions query object
var directionsQuery = [{ // array of legs each for consequtive series of points
  mode: 0, // numeric value of travel mode: -1 - motocycle, 0 - car, 1 - bicycle, 2 - walk, 3 - other
  avoidHighways: false, // true to avoid highways
  avoidTolls: false, // true to avoid toll roads
  units: 'm', // m - miles, km - kilometers
  points: [[0, 0]], // array of consecutive series of points; each point is [lon, lat]
  begin: '', // date/time for the begin of route as 'YYYY-MM-DDThh:mm'
  alternate: false // return alternatives to the default route
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
    segmentIndex: 0 // index of the turn-by-turn directions segment
  }],
  segments: [{ // turn-by-turn directions
    duration: 0, // segment duration in seconds
    distance: 0, // segment distance in meters
    path: [], // series of interim points; each point is [lon, lat]
    instructions: [''] // textual instructions for this segment
  }]
}];

module.exports = {
  directionsQuery: directionsQuery,
  directionsResult: directionsResult
};
