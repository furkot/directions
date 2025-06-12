const { describe, it } = require('node:test');
const assert = require('node:assert');
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
    assert.ok(result);
    assert.ok(result.query);
    assert.deepStrictEqual(result.query, query);
    assert.strictEqual(Object.hasOwn(result, 'name'), false);
    assert.strictEqual(Object.hasOwn(result, 'places'), false);
    assert.strictEqual(result.routes.length, 1);
    assert.strictEqual(result.routes[0].duration, 2300);
    assert.strictEqual(result.routes[0].distance, 44760);
    assert.strictEqual(result.routes[0].path.length, 511);
    assert.strictEqual(Object.hasOwn(result.routes[0], 'segmentIndex'), false);
    assert.strictEqual(Object.hasOwn(result, 'segments'), false);
    assert.strictEqual(result.provider, 'valhalla');
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
    assert.ok(result);
    assert.ok(result.query);
    assert.deepStrictEqual(result.query, query);
    assert.strictEqual(Object.hasOwn(result, 'name'), false);
    assert.strictEqual(Object.hasOwn(result, 'places'), false);
    assert.strictEqual(result.routes.length, 1);
    assert.strictEqual(result.routes[0].duration, 2293);
    assert.strictEqual(result.routes[0].distance, 44761);
    assert.strictEqual(result.routes[0].path.length, 511);
    assert.strictEqual(result.routes[0].segmentIndex, 0);
    assert.strictEqual(result.routes[0].rough, true);
    assert.strictEqual(result.segments.length, 7);
    assert.strictEqual(result.segments[0].duration, 30);
    assert.strictEqual(result.segments[0].distance, 254);
    assert.strictEqual(result.segments[0].path.length, 2);
    assert.strictEqual(result.segments[0].instructions, 'Drive south.');
    assert.strictEqual(result.segments[4].rough, true);
    assert.strictEqual(
      result.segments.reduce((len, seg) => len + seg.path.length, 0),
      511
    );
    assert.strictEqual(result.provider, 'valhalla');
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
    assert.strictEqual(result, undefined);
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
    assert.ok(result);
    assert.strictEqual(result.routes.length, 1);
    assert.strictEqual(result.routes[0].ferry, true);
    assert.strictEqual(Object.hasOwn(result.routes[0], 'rough'), false);
    assert.strictEqual(result.segments.length, 4);
    assert.strictEqual(Object.hasOwn(result.segments[0], 'mode'), false);
    assert.strictEqual(result.segments[1].mode, 6);
    assert.strictEqual(Object.hasOwn(result.segments[2], 'mode'), false);
    assert.strictEqual(Object.hasOwn(result.segments[3], 'mode'), false);
    assert.strictEqual(result.provider, 'valhalla');
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
    assert.ok(result);
    assert.strictEqual(result.routes.length, 1);
    assert.strictEqual(result.routes[0].ferry, true);
    assert.strictEqual(result.segments.length, 3);
    assert.strictEqual(result.segments[0].mode, 6);
    assert.strictEqual(Object.hasOwn(result.segments[1], 'mode'), false);
    assert.strictEqual(Object.hasOwn(result.segments[2], 'mode'), false);
    assert.strictEqual(result.provider, 'valhalla');
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
    assert.ok(result);
    assert.strictEqual(result.routes.length, 1);
    assert.strictEqual(result.routes[0].ferry, true);
    assert.strictEqual(result.segments.length, 8);
    assert.strictEqual(Object.hasOwn(result.segments[0], 'mode'), false);
    assert.strictEqual(Object.hasOwn(result.segments[1], 'mode'), false);
    assert.strictEqual(Object.hasOwn(result.segments[2], 'mode'), false);
    assert.strictEqual(Object.hasOwn(result.segments[3], 'mode'), false);
    assert.strictEqual(Object.hasOwn(result.segments[4], 'mode'), false);
    assert.strictEqual(result.segments[5].mode, 6);
    assert.strictEqual(Object.hasOwn(result.segments[6], 'mode'), false);
    assert.strictEqual(Object.hasOwn(result.segments[7], 'mode'), false);
    assert.strictEqual(result.provider, 'valhalla');
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
    assert.strictEqual(result, undefined);
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
    assert.ok(result);
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
    assert.ok(result);
    assert.ok(result.query);
    assert.deepStrictEqual(result.query, query);
    assert.strictEqual(Object.hasOwn(result, 'name'), false);
    assert.strictEqual(Object.hasOwn(result, 'places'), false);
    assert.strictEqual(result.routes.length, 1);
    assert.strictEqual(result.routes[0].tolls, true);
    assert.strictEqual(result.segments.length, 10);
    assert.strictEqual(Object.hasOwn(result.segments[0], 'tolls'), false);
    assert.strictEqual(Object.hasOwn(result.segments[1], 'tolls'), false);
    assert.strictEqual(Object.hasOwn(result.segments[2], 'tolls'), false);
    assert.strictEqual(result.segments[3].tolls, true);
    assert.strictEqual(result.segments[4].tolls, true);
    assert.strictEqual(result.segments[5].tolls, true);
    assert.strictEqual(Object.hasOwn(result.segments[6], 'tolls'), false);
    assert.strictEqual(Object.hasOwn(result.segments[7], 'tolls'), false);
    assert.strictEqual(Object.hasOwn(result.segments[8], 'tolls'), false);
    assert.strictEqual(Object.hasOwn(result.segments[9], 'tolls'), false);
  });
});
