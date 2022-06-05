const _cloneDeep = require('lodash.clonedeep');
const should = require('should');
const model = require('../../../lib/model');

let response;
const directions = require('../../../lib/service/openroute')({
  name: 'openroute',
  skip() {},
  request(url, req, fn) {
    fn(undefined, response);
  }
});

describe('openroute directions', function () {

  it('turn-by-turn', function (done) {
    let query;
    const result = [];

    response = require('./fixtures/turnbyturn');

    query = _cloneDeep(model.directionsQuery);
    query[0].points = [
      [51.131, 12.414],
      [48.224, 3.867]
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
      result[0].routes[0].should.have.property('duration', 29696);
      result[0].routes[0].should.have.property('distance', 881238);
      result[0].routes[0].should.have.property('path').with.length(7964);
      result[0].routes[0].should.have.property('segmentIndex', 0);
      result[0].should.have.property('segments').with.length(83);
      result[0].segments[0].should.have.property('duration', 94);
      result[0].segments[0].should.have.property('distance', 2226);
      result[0].segments[0].should.have.property('path').with.length(41);
      result[0].segments[0].should.have.property('instructions', 'Head south on K 7931');
      result[0].segments.reduce(function (len, seg) { return len + seg.path.length; }, 0).should.equal(7964);
      result[0].should.have.property('provider', 'openroute');
      done();
    });
  });

  it('empty', function (done) {
    let query;
    const result = [];

    response = require('./fixtures/empty');

    query = _cloneDeep(model.directionsQuery);
    query[0].points = [
      [-107.04742870308806, 40.10879725627518],
      [-107.04732141473033,40.10881161617999]
    ];
    query[0].turnbyturn = true;
    query[0].path = model.pathType.smooth;
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
      result[0].routes[0].should.have.property('duration', 0);
      result[0].routes[0].should.have.property('distance', 0);
      result[0].routes[0].should.have.property('path').with.length(0);
      result[0].routes[0].should.have.property('segmentIndex', 0);
      result[0].should.have.property('segments').with.length(1);
      result[0].segments[0].should.have.property('duration', 0);
      result[0].segments[0].should.have.property('distance', 0);
      result[0].segments[0].should.have.property('path').with.length(0);
      result[0].segments[0].should.have.property('instructions', 'Head east');
      result[0].segments.reduce(function (len, seg) { return len + seg.path.length; }, 0).should.equal(0);
      result[0].should.have.property('provider', 'openroute');
      done();
    });
  });

  it('ferry', function (done) {
    let query;
    const result = [];

    response = require('./fixtures/ferry');

    query = _cloneDeep(model.directionsQuery);
    query[0].points = [
      [18.934332752037932, 54.33484550254147],
      [18.946177387050938, 54.33389466800375]
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
      result[0].should.have.property('routes').with.length(1);
      result[0].routes[0].should.have.property('ferry').eql(true);
      result[0].should.have.property('segments').with.length(5);
      result[0].segments[0].should.not.have.property('mode');
      result[0].segments[1].should.not.have.property('mode');
      result[0].segments[2].should.have.property('mode', 6);
      result[0].segments[3].should.not.have.property('mode');
      result[0].segments[4].should.not.have.property('mode');
      result[0].should.have.property('provider', 'openroute');
      done();
    });
  });
});
