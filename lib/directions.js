var _ = require('lodash');
var strategy = require('./strategy');

module.exports = furkotDirections;

var services = [{
  service: require('./service/google'),
  check: function (query, result) {
    // some other service already calculated directions
    // or asking for alternate routes
    return !(result || query.alternate);
  }
}, {
  service: require('./service/mapquest'),
  check: function (query, result) {
    // some other service already calculated directions
    // or asking for default routes
    return !result && query.alternate;
  }
}];

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
      return service.service(_.defaults({
        check: service.check
      }, options));
    });
  }

  return directions;
}
