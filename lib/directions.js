var _defaults = require('lodash.defaults');
var strategy = require('./strategy');

module.exports = furkotDirections;

var services = [{
  service: require('./service/google'),
  check: function (query, result) {
    // some other service already calculated directions
    // or asking for alternate routes
    // or is in the future
    return !(result || query.alternate || isFuture(query));
  }
}, {
  service: require('./service/google/webservice'),
  check: function (query, result) {
    // some other service already calculated directions
    // or is in the past
    return !result && isFuture(query);
  }
}, {
  service: require('./service/mapquest'),
  check: function (query, result) {
    // some other service already calculated directions
    // or asking for default routes
    return !result && query.alternate;
  }
}];

function isFuture(query) {
  var time = query.begin && Date.parse(query.begin);
  return time && time >= Date.now();
}

function furkotDirections(options) {

  /**
   * Asynchronous directions service
   * @param query directions query object
   * @param fn function called with directions
   */
  function directions(query, fn) {
    var result;
    if (!query) {
      return fn();
    }
    result = new Array(query.length);
    if (!query.length) {
      return fn(query, result);
    }
    strategy(options.services, query, result, function (err, query, result) {
      if (err) {
        return fn();
      }
      fn(query, result);
    });
  }

  options = options || {};
  if (!options.services) {
    options.services = services.map(function (service) {
      return service.service(_defaults({
        check: service.check
      }, options));
    });
  }

  return directions;
}
