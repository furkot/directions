var _cloneDeep = require('lodash.clonedeep');
var should = require('should');
var model = require('../../../lib/model');

var response;
var directions = require('../../../lib/service/mapzen')({
  name: 'mapzen',
  skip: function () {},
  request: function (url, req, fn) {
    fn(undefined, {
      body: response
    });
  }
});

describe('mapzen directions', function () {

  it('test', function (done) {
    var query, result = [];

    response = require('./fixtures/response');

    query = _cloneDeep(model.directionsQuery);
    query[0].points = [
      [response.trip.locations[0].lon, response.trip.locations[0].lat],
      [response.trip.locations[1].lon, response.trip.locations[1].lat]
    ];
    query[0].units = 'km';
    directions(query, result, function (err, value, query, result) {
      should.not.exist(err);
      value.should.equal(false);
      should.exist(result);
      result.should.have.length(1);
      result[0].should.have.property('query');
      result[0].query.should.deepEqual(query[0]);
      result[0].should.not.have.property('name');
      result[0].should.not.have.property('places');
      result[0].should.have.property('routes').with.length(1);
      result[0].routes[0].should.have.property('duration', 2300);
      result[0].routes[0].should.have.property('distance', 44760);
      result[0].routes[0].should.have.property('path').with.length(511);
      result[0].routes[0].should.not.have.property('segmentIndex');
      result[0].should.not.have.property('segments');
      result[0].should.have.property('provider', 'mapzen');
      done();
    });
  });

  it('turn-by-turn', function (done) {
    var query, result = [];

    response = require('./fixtures/turnbyturn');

    query = _cloneDeep(model.directionsQuery);
    query[0].points = [
      [response.trip.locations[0].lon, response.trip.locations[0].lat],
      [response.trip.locations[1].lon, response.trip.locations[1].lat]
    ];
    query[0].turnbyturn = true;
    directions(query, result, function (err, value, query, result) {
      should.not.exist(err);
      value.should.equal(false);
      should.exist(result);
      result.should.have.length(1);
      result[0].should.have.property('query');
      result[0].query.should.deepEqual(query[0]);
      result[0].should.not.have.property('name');
      result[0].should.not.have.property('places');
      result[0].should.have.property('routes').with.length(1);
      result[0].routes[0].should.have.property('duration', 2300);
      result[0].routes[0].should.have.property('distance', 44761);
      result[0].routes[0].should.have.property('path').with.length(511);
      result[0].routes[0].should.have.property('segmentIndex', 0);
      result[0].should.have.property('segments').with.length(7);
      result[0].segments[0].should.have.property('duration', 30);
      result[0].segments[0].should.have.property('distance', 254);
      result[0].segments[0].should.have.property('path').with.length(2);
      result[0].segments[0].should.have.property('instructions', 'Drive south.');
      result[0].should.have.property('provider', 'mapzen');
      done();
    });
  });
});