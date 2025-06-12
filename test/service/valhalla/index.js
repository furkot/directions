const { describe, it } = require('node:test');
const should = require('should');
const { directionsQuery, pathType } = require('../../../lib/model');
const valhalla = require('../../../lib/service/valhalla');

describe('valhalla directions', async () => {
  let response;
  const directions = valhalla({
    name: 'valhalla',
    interval: 1,
    skip() {},
    request() {
      return { response };
    }
  }).operation;

  await it('test', async () => {
    response = require('./fixtures/response');

    const query = {
      ...directionsQuery,
      points: [
        [response.trip.locations[0].lon, response.trip.locations[0].lat],
        [response.trip.locations[1].lon, response.trip.locations[1].lat]
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
    result.routes[0].should.have.property('duration', 2300);
    result.routes[0].should.have.property('distance', 44760);
    result.routes[0].should.have.property('path').with.length(511);
    result.routes[0].should.not.have.property('segmentIndex');
    result.should.not.have.property('segments');
    result.should.have.property('provider', 'valhalla');
  });

  await it('turn-by-turn', async () => {
    response = require('./fixtures/turnbyturn');

    const query = {
      ...directionsQuery,
      points: [
        [response.trip.locations[0].lon, response.trip.locations[0].lat],
        [response.trip.locations[1].lon, response.trip.locations[1].lat]
      ],
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
    result.routes[0].should.have.property('duration', 2293);
    result.routes[0].should.have.property('distance', 44761);
    result.routes[0].should.have.property('path').with.length(511);
    result.routes[0].should.have.property('segmentIndex', 0);
    result.routes[0].should.have.property('rough').eql(true);
    result.should.have.property('segments').with.length(7);
    result.segments[0].should.have.property('duration', 30);
    result.segments[0].should.have.property('distance', 254);
    result.segments[0].should.have.property('path').with.length(2);
    result.segments[0].should.have.property('instructions', 'Drive south.');
    result.segments[4].should.have.property('rough', true);
    result.segments.reduce((len, seg) => len + seg.path.length, 0).should.equal(511);
    result.should.have.property('provider', 'valhalla');
  });

  await it('empty', async () => {
    response = require('./fixtures/empty');

    const query = {
      ...directionsQuery,
      points: [
        [response.trip.locations[0].lon, response.trip.locations[0].lat],
        [response.trip.locations[1].lon, response.trip.locations[1].lat]
      ],
      turnbyturn: true,
      path: pathType.full
    };
    const result = await directions(query);
    should.not.exist(result);
  });

  await it('ferry', async () => {
    response = require('./fixtures/ferry');

    const query = {
      ...directionsQuery,
      points: [
        [response.trip.locations[0].lon, response.trip.locations[0].lat],
        [response.trip.locations[1].lon, response.trip.locations[1].lat]
      ],
      turnbyturn: true,
      path: pathType.full
    };
    const result = await directions(query);
    should.exist(result);
    result.should.have.property('routes').with.length(1);
    result.routes[0].should.have.property('ferry').eql(true);
    result.routes[0].should.not.have.property('rough');
    result.should.have.property('segments').with.length(4);
    result.segments[0].should.not.have.property('mode');
    result.segments[1].should.have.property('mode', 6);
    result.segments[2].should.not.have.property('mode');
    result.segments[3].should.not.have.property('mode');
    result.should.have.property('provider', 'valhalla');
  });

  await it('only ferry end', async () => {
    response = require('./fixtures/end-ferry');

    const query = {
      ...directionsQuery,
      points: [
        [response.trip.locations[0].lon, response.trip.locations[0].lat],
        [response.trip.locations[1].lon, response.trip.locations[1].lat]
      ],
      turnbyturn: true,
      path: pathType.full
    };
    const result = await directions(query);
    should.exist(result);
    result.should.have.property('routes').with.length(1);
    result.routes[0].should.have.property('ferry').eql(true);
    result.should.have.property('segments').with.length(3);
    result.segments[0].should.have.property('mode', 6);
    result.segments[1].should.not.have.property('mode');
    result.segments[2].should.not.have.property('mode');
    result.should.have.property('provider', 'valhalla');
  });

  await it('no ferry end', async () => {
    response = require('./fixtures/no-end-ferry');

    const query = {
      ...directionsQuery,
      points: [
        [response.trip.locations[0].lon, response.trip.locations[0].lat],
        [response.trip.locations[1].lon, response.trip.locations[1].lat]
      ],
      turnbyturn: true,
      path: pathType.full
    };
    const result = await directions(query);
    should.exist(result);
    result.should.have.property('routes').with.length(1);
    result.routes[0].should.have.property('ferry').eql(true);
    result.should.have.property('segments').with.length(8);
    result.segments[0].should.not.have.property('mode');
    result.segments[1].should.not.have.property('mode');
    result.segments[2].should.not.have.property('mode');
    result.segments[3].should.not.have.property('mode');
    result.segments[4].should.not.have.property('mode');
    result.segments[5].should.have.property('mode', 6);
    result.segments[6].should.not.have.property('mode');
    result.segments[7].should.not.have.property('mode');
    result.should.have.property('provider', 'valhalla');
  });

  await it('too long roundabout route', async () => {
    response = require('./fixtures/roundabout-too-long');

    const query = {
      ...directionsQuery,
      points: [
        [response.trip.locations[0].lon, response.trip.locations[0].lat],
        [response.trip.locations[1].lon, response.trip.locations[1].lat]
      ],
      turnbyturn: true,
      path: pathType.full
    };
    const result = await directions(query);
    should.not.exist(result);
  });

  await it('acceptable roundabout route', async () => {
    response = require('./fixtures/roundabout');

    const query = {
      ...directionsQuery,
      points: [
        [response.trip.locations[0].lon, response.trip.locations[0].lat],
        [response.trip.locations[1].lon, response.trip.locations[1].lat]
      ],
      turnbyturn: true,
      path: pathType.full
    };
    const result = await directions(query);
    should.exist(result);
  });

  await it('toll road', async () => {
    response = require('./fixtures/has-toll');

    const query = {
      ...directionsQuery,
      points: [
        [response.trip.locations[0].lon, response.trip.locations[0].lat],
        [response.trip.locations[1].lon, response.trip.locations[1].lat]
      ],
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
    result.routes[0].should.have.property('tolls').eql(true);
    result.should.have.property('segments').with.length(10);
    result.segments[0].should.not.have.property('tolls', true);
    result.segments[1].should.not.have.property('tolls', true);
    result.segments[2].should.not.have.property('tolls', true);
    result.segments[3].should.have.property('tolls', true);
    result.segments[4].should.have.property('tolls', true);
    result.segments[5].should.have.property('tolls', true);
    result.segments[6].should.not.have.property('tolls', true);
    result.segments[7].should.not.have.property('tolls', true);
    result.segments[8].should.not.have.property('tolls', true);
    result.segments[9].should.not.have.property('tolls', true);
  });
});
