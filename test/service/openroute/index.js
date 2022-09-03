const should = require('should');
const model = require('../../../lib/model');
const openroute = require('../../../lib/service/openroute');

let response;
const directions = openroute({
  name: 'openroute',
  skip() { },
  interval: 1,
  request() { return { response }; }
}).operation;

describe('openroute directions', function () {

  it('turn-by-turn', async function () {

    response = require('./fixtures/turnbyturn');

    const query = {
      ...model.directionsQuery,
      points: [
        [51.131, 12.414],
        [48.224, 3.867]
      ],
      turnbyturn: true,
      path: model.pathType.full
    };
    const result = await directions(query);
    should.exist(result);
    result.should.have.property('query');
    result.query.should.deepEqual(query);
    result.should.not.have.property('name');
    result.should.not.have.property('places');
    result.should.have.property('routes').with.length(1);
    result.routes[0].should.have.property('duration', 29696);
    result.routes[0].should.have.property('distance', 881238);
    result.routes[0].should.have.property('path').with.length(7964);
    result.routes[0].should.have.property('segmentIndex', 0);
    result.should.have.property('segments').with.length(83);
    result.segments[0].should.have.property('duration', 94);
    result.segments[0].should.have.property('distance', 2226);
    result.segments[0].should.have.property('path').with.length(41);
    result.segments[0].should.have.property('instructions', 'Head south on K 7931');
    result.segments.reduce(function (len, seg) { return len + seg.path.length; }, 0).should.equal(7964);
    result.should.have.property('provider', 'openroute');
  });

  it('empty', async function () {

    response = require('./fixtures/empty');

    const query = {
      ...model.directionsQuery,
      points: [
        [-107.04742870308806, 40.10879725627518],
        [-107.04732141473033, 40.10881161617999]
      ],
      turnbyturn: true,
      path: model.pathType.smooth
    };
    const result = await directions(query);
    should.exist(result);
    result.should.have.property('query');
    result.query.should.deepEqual(query);
    result.should.not.have.property('name');
    result.should.not.have.property('places');
    result.should.have.property('routes').with.length(1);
    result.routes[0].should.have.property('duration', 0);
    result.routes[0].should.have.property('distance', 0);
    result.routes[0].should.have.property('path').with.length(0);
    result.routes[0].should.have.property('segmentIndex', 0);
    result.should.have.property('segments').with.length(1);
    result.segments[0].should.have.property('duration', 0);
    result.segments[0].should.have.property('distance', 0);
    result.segments[0].should.have.property('path').with.length(0);
    result.segments[0].should.have.property('instructions', 'Head east');
    result.segments.reduce(function (len, seg) { return len + seg.path.length; }, 0).should.equal(0);
    result.should.have.property('provider', 'openroute');
  });

  it('ferry', async function () {

    response = require('./fixtures/ferry');

    const query = {
      ...model.directionsQuery,
      points: [
        [18.934332752037932, 54.33484550254147],
        [18.946177387050938, 54.33389466800375]
      ],
      turnbyturn: true,
      path: model.pathType.full
    };
    const result = await directions(query);
    should.exist(result);
    result.should.have.property('query');
    result.query.should.deepEqual(query);
    result.should.have.property('routes').with.length(1);
    result.routes[0].should.have.property('ferry').eql(true);
    result.should.have.property('segments').with.length(5);
    result.segments[0].should.not.have.property('mode');
    result.segments[1].should.not.have.property('mode');
    result.segments[2].should.have.property('mode', 6);
    result.segments[3].should.not.have.property('mode');
    result.segments[4].should.not.have.property('mode');
    result.should.have.property('provider', 'openroute');
  });
});
