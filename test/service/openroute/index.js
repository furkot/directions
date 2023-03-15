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
    result.segments[0].should.have.property('path').with.length(42);
    result.segments[0].should.have.property('instructions', 'Head south on K 7931');
    result.segments.reduce(function (len, seg) { return len + seg.path.length - 1; }, 0).should.equal(7964);
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
    result.should.have.property('segments').with.length(7);
    result.segments[0].should.not.have.property('mode');
    result.segments[0].should.have.property('path').with.length(14);
    result.segments[1].should.not.have.property('mode');
    result.segments[1].should.have.property('path').with.length(2);
    result.segments[2].should.not.have.property('mode');
    result.segments[2].should.have.property('path').with.length(4);
    result.segments[3].should.have.property('mode', 6);
    result.segments[3].should.have.property('path').with.length(2);
    result.segments[4].should.not.have.property('mode');
    result.segments[4].should.have.property('path').with.length(17);
    result.segments[5].should.not.have.property('mode');
    result.segments[5].should.have.property('path').with.length(3);
    result.segments[6].should.not.have.property('mode');
    result.segments[6].should.have.property('path').with.length(2);
    result.should.have.property('provider', 'openroute');
  });

  it('too long roundabout route', async function () {

    response = require('./fixtures/roundabout-too-long');

    const query = {
      ...model.directionsQuery,
      points: response.metadata.query.coordinates,
      turnbyturn: true,
      path: model.pathType.full,
    };
    const result = await directions(query);
    should.not.exist(result);
  });

  it('rough surface', async function () {

    response = require('./fixtures/rough');

    const query = {
      ...model.directionsQuery,
      points: response.metadata.query.coordinates,
      turnbyturn: true,
      path: model.pathType.full
    };
    const result = await directions(query);
    should.exist(result);
    result.should.have.property('routes').with.length(1);
    result.routes[0].should.have.property('rough').eql(true);
    result.should.have.property('segments').with.length(7);
    result.segments[0].should.have.property('rough', true);
    result.segments[0].should.have.property('path').with.length(159);
    result.segments[1].should.not.have.property('rough');
    result.segments[1].should.have.property('path').with.length(99);
    result.segments[2].should.have.property('rough', true);
    result.segments[2].should.have.property('path').with.length(7);
    result.segments[3].should.have.property('rough', true);
    result.segments[3].should.have.property('path').with.length(40);
    result.segments[4].should.have.property('rough', true);
    result.segments[4].should.have.property('path').with.length(232);
    result.segments[5].should.not.have.property('rough');
    result.segments[5].should.have.property('path').with.length(140);
    result.segments[6].should.not.have.property('rough');
    result.segments[6].should.have.property('path').with.length(2);
    result.should.have.property('provider', 'openroute');
  });

  it('toll roads', async function () {

    response = require('./fixtures/tolls');

    const query = {
      ...model.directionsQuery,
      points: response.metadata.query.coordinates,
      turnbyturn: true,
      path: model.pathType.full,
    };
    const result = await directions(query);
    should.exist(result);
    result.should.have.property('routes').with.length(1);
    result.routes[0].should.have.property('tolls').eql(true);
    result.should.have.property('segments').with.length(15);
    result.segments[0].should.not.have.property('tolls');
    result.segments[0].should.have.property('path').with.length(13);
    result.segments[1].should.not.have.property('tolls');
    result.segments[1].should.have.property('path').with.length(15);
    result.segments[2].should.not.have.property('tolls');
    result.segments[2].should.have.property('path').with.length(18);
    result.segments[3].should.not.have.property('tolls');
    result.segments[3].should.have.property('path').with.length(2);
    result.segments[4].should.have.property('tolls', true);
    result.segments[4].should.have.property('path').with.length(4);
    result.segments[5].should.have.property('tolls', true);
    result.segments[5].should.have.property('path').with.length(61);
    result.segments[6].should.have.property('tolls', true);
    result.segments[6].should.have.property('path').with.length(58);
    result.segments[7].should.have.property('tolls', true);
    result.segments[7].should.have.property('path').with.length(33);
    result.segments[8].should.have.property('tolls', true);
    result.segments[8].should.have.property('path').with.length(26);
    result.segments[9].should.have.property('tolls', true);
    result.segments[9].should.have.property('path').with.length(10);
    result.segments[10].should.not.have.property('tolls');
    result.segments[10].should.have.property('path').with.length(19);
    result.segments[11].should.not.have.property('tolls');
    result.segments[11].should.have.property('path').with.length(38);
    result.segments[12].should.not.have.property('tolls');
    result.segments[12].should.have.property('path').with.length(11);
    result.segments[13].should.not.have.property('tolls');
    result.segments[13].should.have.property('path').with.length(33);
    result.segments[14].should.not.have.property('tolls');
    result.segments[14].should.have.property('path').with.length(2);
    result.should.have.property('provider', 'openroute');
  });
});
