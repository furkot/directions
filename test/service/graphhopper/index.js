const should = require('should');
const { directionsQuery, pathType } = require('../../../lib/model');
const graphhopper = require('../../../lib/service/graphhopper');


describe('graphhopper directions', function () {
  let response;

  const directions = graphhopper({
    name: 'graphhopper',
    skip() { },
    interval: 1,
    request() { return { response }; }
  }).operation;

  it('test', async function () {
    response = require('./fixtures/response');

    const query = {
      ...directionsQuery,
      points: [
        [51.131, 12.414],
        [48.224, 3.867]
      ],
      units: 'km',
      path: pathType.full
    };
    const result = await directions(query);
    should.exist(result);
    result.should.have.property('query');
    result.query.should.deepEqual(query);
    result.should.not.have.property('name');
    result.should.not.have.property('places');
    result.should.have.property('routes').with.length(1);
    result.routes[0].should.have.property('duration', 29740);
    result.routes[0].should.have.property('distance', 885618);
    result.routes[0].should.have.property('path').with.length(7853);
    result.routes[0].should.not.have.property('segmentIndex');
    result.should.not.have.property('segments');
    result.should.have.property('provider', 'graphhopper');
  });

  it('turn-by-turn', async function () {

    response = require('./fixtures/turnbyturn');

    const query = {
      ...directionsQuery,
      points: [
        [51.131, 12.414],
        [48.224, 3.867]
      ],
      units: 'km',
      turnbyturn: true,
      path: pathType.full
    };

    const result = await directions(query);
    should.exist(result);
    result.should.have.property('query');
    result.query.should.deepEqual(query);
    result.should.not.have.property('name');
    result.should.not.have.property('places');
    result.should.have.property('routes').with.length(1);
    result.routes[0].should.have.property('duration', 29740);
    result.routes[0].should.have.property('distance', 885618);
    result.routes[0].should.have.property('path').with.length(5749);
    result.routes[0].should.have.property('segmentIndex', 0);
    result.should.have.property('segments').with.length(151);
    result.segments[0].should.have.property('duration', 183);
    result.segments[0].should.have.property('distance', 508);
    result.segments[0].should.have.property('path').with.length(12);
    result.segments[0].should.have.property('instructions', 'Continue');
    result.segments.reduce(function (len, seg) { return len + seg.path.length; }, 0).should.equal(5749);
    result.should.have.property('provider', 'graphhopper');
  });
});
