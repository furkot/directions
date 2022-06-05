const _cloneDeep = require('lodash.clonedeep');
const should = require('should');
const model = require('../../../lib/model');

let response;
const directions = require('../../../lib/service/graphhopper')({
  name: 'graphhopper',
  skip() {},
  request(url, req, fn) {
    fn(undefined, response);
  }
});

describe('graphhopper directions', function () {

  it('test', function (done) {
    let query;
    const result = [];

    response = require('./fixtures/response');

    query = _cloneDeep(model.directionsQuery);
    query[0].points = [
      [51.131, 12.414],
      [48.224, 3.867]
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
      result[0].routes[0].should.have.property('duration', 29740);
      result[0].routes[0].should.have.property('distance', 885618);
      result[0].routes[0].should.have.property('path').with.length(7853);
      result[0].routes[0].should.not.have.property('segmentIndex');
      result[0].should.not.have.property('segments');
      result[0].should.have.property('provider', 'graphhopper');
      done();
    });
  });

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
      result[0].routes[0].should.have.property('duration', 29740);
      result[0].routes[0].should.have.property('distance', 885618);
      result[0].routes[0].should.have.property('path').with.length(5749);
      result[0].routes[0].should.have.property('segmentIndex', 0);
      result[0].should.have.property('segments').with.length(151);
      result[0].segments[0].should.have.property('duration', 183);
      result[0].segments[0].should.have.property('distance', 508);
      result[0].segments[0].should.have.property('path').with.length(12);
      result[0].segments[0].should.have.property('instructions', 'Continue');
      result[0].segments.reduce(function (len, seg) { return len + seg.path.length; }, 0).should.equal(5749);
      result[0].should.have.property('provider', 'graphhopper');
      done();
    });
  });
});
