const _cloneDeep = require('lodash.clonedeep');
const should = require('should');
const model = require('../../../lib/model');

let response;
const directions = require('../../../lib/service/valhalla')({
  name: 'valhalla',
  skip() {},
  request(url, req, fn) {
    fn(undefined, response);
  }
});

describe('valhalla directions', function () {

  it('test', function (done) {
    let query;
    const result = [];

    response = require('./fixtures/response');

    query = _cloneDeep(model.directionsQuery);
    query[0].points = [
      [response.trip.locations[0].lon, response.trip.locations[0].lat],
      [response.trip.locations[1].lon, response.trip.locations[1].lat]
    ];
    query[0].units = 'km';
    query[0].path = model.pathType.full;
    directions(1, query, result, function (err, value, id, query, result) {
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
      result[0].should.have.property('provider', 'valhalla');
      done();
    });
  });

  it('turn-by-turn', function (done) {
    let query;
    const result = [];

    response = require('./fixtures/turnbyturn');

    query = _cloneDeep(model.directionsQuery);
    query[0].points = [
      [response.trip.locations[0].lon, response.trip.locations[0].lat],
      [response.trip.locations[1].lon, response.trip.locations[1].lat]
    ];
    query[0].turnbyturn = true;
    query[0].path = model.pathType.full;
    directions(2, query, result, function (err, value, id, query, result) {
      should.not.exist(err);
      value.should.equal(false);
      should.exist(result);
      result.should.have.length(1);
      result[0].should.have.property('query');
      result[0].query.should.deepEqual(query[0]);
      result[0].should.not.have.property('name');
      result[0].should.not.have.property('places');
      result[0].should.have.property('routes').with.length(1);
      result[0].routes[0].should.have.property('duration', 2293);
      result[0].routes[0].should.have.property('distance', 44761);
      result[0].routes[0].should.have.property('path').with.length(511);
      result[0].routes[0].should.have.property('segmentIndex', 0);
      result[0].should.have.property('segments').with.length(7);
      result[0].segments[0].should.have.property('duration', 30);
      result[0].segments[0].should.have.property('distance', 254);
      result[0].segments[0].should.have.property('path').with.length(2);
      result[0].segments[0].should.have.property('instructions', 'Drive south.');
      result[0].segments.reduce(function (len, seg) { return len + seg.path.length; }, 0).should.equal(511);
      result[0].should.have.property('provider', 'valhalla');
      done();
    });
  });

  it('empty', function (done) {
    let query;
    const result = [];

    response = require('./fixtures/empty');

    query = _cloneDeep(model.directionsQuery);
    query[0].points = [
      [response.trip.locations[0].lon, response.trip.locations[0].lat],
      [response.trip.locations[1].lon, response.trip.locations[1].lat]
    ];
    query[0].turnbyturn = true;
    query[0].path = model.pathType.full;
    directions(2, query, result, function (err, value, id, query, result) {
      should.not.exist(err);
      value.should.equal(false);
      should.exist(result);
      result.should.have.length(0);
      done();
    });
  });

  it('ferry', function (done) {
    let query;
    const result = [];

    response = require('./fixtures/ferry');

    query = _cloneDeep(model.directionsQuery);
    query[0].points = [
      [response.trip.locations[0].lon, response.trip.locations[0].lat],
      [response.trip.locations[1].lon, response.trip.locations[1].lat]
    ];
    query[0].turnbyturn = true;
    query[0].path = model.pathType.full;
    directions(2, query, result, function (err, value, id, query, result) {
      should.not.exist(err);
      value.should.equal(false);
      should.exist(result);
      result.should.have.length(1);
      result[0].should.have.property('routes').with.length(1);
      result[0].routes[0].should.have.property('ferry').eql(true);
      result[0].should.have.property('segments').with.length(4);
      result[0].segments[0].should.not.have.property('mode');
      result[0].segments[1].should.have.property('mode', 6);
      result[0].segments[2].should.not.have.property('mode');
      result[0].segments[3].should.not.have.property('mode');
      result[0].should.have.property('provider', 'valhalla');
      done();
    });
  });

  it('only ferry end', function (done) {
    let query;
    const result = [];

    response = require('./fixtures/end-ferry');

    query = _cloneDeep(model.directionsQuery);
    query[0].points = [
      [response.trip.locations[0].lon, response.trip.locations[0].lat],
      [response.trip.locations[1].lon, response.trip.locations[1].lat]
    ];
    query[0].turnbyturn = true;
    query[0].path = model.pathType.full;
    directions(2, query, result, function (err, value, id, query, result) {
      should.not.exist(err);
      value.should.equal(false);
      should.exist(result);
      result.should.have.length(1);
      result[0].should.have.property('routes').with.length(1);
      result[0].routes[0].should.have.property('ferry').eql(true);
      result[0].should.have.property('segments').with.length(3);
      result[0].segments[0].should.have.property('mode', 6);
      result[0].segments[1].should.not.have.property('mode');
      result[0].segments[2].should.not.have.property('mode');
      result[0].should.have.property('provider', 'valhalla');
      done();
    });
  });
});
