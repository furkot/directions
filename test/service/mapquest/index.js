var _cloneDeep = require('lodash.clonedeep');
var should = require('should');
var model = require('../../../lib/model');

var response;
var directions = require('../../../lib/service/mapquest')({
  name: 'mapquest',
  skip: function () {},
  request: function (url, req, fn) {
    fn(undefined, response);
  }
});

describe('mapquest directions', function () {

  it('test', function (done) {
    var query, result = [];

    response = require('./fixtures/turnbyturn');

    query = _cloneDeep(model.directionsQuery);
    query[0].points = [
      [response.route.locations[0].latLng.lng, response.route.locations[0].latLng.lat],
      [response.route.locations[1].latLng.lng, response.route.locations[1].latLng.lat]
    ];
    query[0].alternate = true;
    query[0].turnbyturn = true;
    query[0].path = model.pathType.full;
    query[0].units = 'km';
    directions(query, result, function (err, value, query, result) {
      should.not.exist(err);
      value.should.equal(false);
      should.exist(result);
      result.should.have.length(1);
      result[0].should.have.property('query');
      result[0].query.should.deepEqual(query[0]);
      result[0].should.have.property('name', 'US-54 W');
      result[0].should.not.have.property('places');
      result[0].should.have.property('routes').with.length(1);
      result[0].routes[0].should.have.property('duration', 1939);
      result[0].routes[0].should.have.property('distance', 41603);
      result[0].routes[0].should.have.property('path').with.length(40);
      result[0].routes[0].should.have.property('segmentIndex', 0);
      result[0].should.have.property('segments').with.length(7);
      result[0].segments[0].should.have.property('duration', 86);
      result[0].segments[0].should.have.property('distance', 906);
      result[0].segments[0].should.have.property('path').with.length(3);
      result[0].segments[0].should.have.property('instructions',
        'Start out going south on Quay Road V toward US Highway 54/US-54 W/US-54 E.');
      result[0].should.have.property('provider', 'mapquest');
      done();
    });
  });
});

describe('open mapquest directions', function () {

  it('test', function (done) {
    var query, result = [];

    response = require('./fixtures/response');

    query = _cloneDeep(model.directionsQuery);
    query[0].points = [
      [response.route.locations[0].latLng.lng, response.route.locations[0].latLng.lat],
      [response.route.locations[1].latLng.lng, response.route.locations[1].latLng.lat]
    ];
    query[0].path = model.pathType.smooth;
    directions(query, result, function (err, value, query, result) {
      should.not.exist(err);
      value.should.equal(false);
      should.exist(result);
      result.should.have.length(1);
      result[0].should.have.property('query');
      result[0].query.should.deepEqual(query[0]);
      result[0].should.have.property('name', 'US-54 W');
      result[0].should.not.have.property('places');
      result[0].should.have.property('routes').with.length(1);
      result[0].routes[0].should.have.property('duration', 1939);
      result[0].routes[0].should.have.property('distance', 41603);
      result[0].routes[0].should.have.property('path').with.length(40);
      result[0].routes[0].should.have.property('segmentIndex', 0);
      result[0].should.not.have.property('segments');
      result[0].should.have.property('provider', 'openmapquest');
      done();
    });
  });
});
