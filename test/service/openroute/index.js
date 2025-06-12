const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const model = require('../../../lib/model');
const openroute = require('../../../lib/service/openroute');

let response;
const directions = openroute({
  name: 'openroute',
  skip() {},
  interval: 1,
  request() {
    return { response };
  }
}).operation;

describe('openroute directions', async () => {
  await it('turn-by-turn', async () => {
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
    assert.ok(result);
    assert.ok(result.query);
    assert.deepEqual(result.query, query);
    assert.equal(Object.hasOwn(result, 'name'), false);
    assert.equal(Object.hasOwn(result, 'places'), false);
    assert.equal(result.routes.length, 1);
    assert.equal(result.routes[0].duration, 29696);
    assert.equal(result.routes[0].distance, 881238);
    assert.equal(result.routes[0].path.length, 7964);
    assert.equal(result.routes[0].segmentIndex, 0);
    assert.equal(result.segments.length, 83);
    assert.equal(result.segments[0].duration, 94);
    assert.equal(result.segments[0].distance, 2226);
    assert.equal(result.segments[0].path.length, 42);
    assert.equal(result.segments[0].instructions, 'Head south on K 7931');
    assert.equal(
      result.segments.reduce((len, seg) => len + seg.path.length - 1, 0),
      7964
    );
    assert.equal(result.provider, 'openroute');
  });

  await it('empty', async () => {
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
    assert.ok(result);
    assert.ok(result.query);
    assert.deepEqual(result.query, query);
    assert.equal(Object.hasOwn(result, 'name'), false);
    assert.equal(Object.hasOwn(result, 'places'), false);
    assert.equal(result.routes.length, 1);
    assert.equal(result.routes[0].duration, 0);
    assert.equal(result.routes[0].distance, 0);
    assert.equal(result.routes[0].path.length, 0);
    assert.equal(result.routes[0].segmentIndex, 0);
    assert.equal(result.segments.length, 1);
    assert.equal(result.segments[0].duration, 0);
    assert.equal(result.segments[0].distance, 0);
    assert.equal(result.segments[0].path.length, 0);
    assert.equal(result.segments[0].instructions, 'Head east');
    assert.equal(
      result.segments.reduce((len, seg) => len + seg.path.length, 0),
      0
    );
    assert.equal(result.provider, 'openroute');
  });

  await it('ferry', async () => {
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
    assert.ok(result);
    assert.ok(result.query);
    assert.deepEqual(result.query, query);
    assert.equal(result.routes.length, 1);
    assert.equal(result.routes[0].ferry, true);
    assert.equal(result.segments.length, 7);
    assert.equal(Object.hasOwn(result.segments[0], 'mode'), false);
    assert.equal(result.segments[0].path.length, 14);
    assert.equal(Object.hasOwn(result.segments[1], 'mode'), false);
    assert.equal(result.segments[1].path.length, 2);
    assert.equal(Object.hasOwn(result.segments[2], 'mode'), false);
    assert.equal(result.segments[2].path.length, 4);
    assert.equal(result.segments[3].mode, 6);
    assert.equal(result.segments[3].path.length, 2);
    assert.equal(Object.hasOwn(result.segments[4], 'mode'), false);
    assert.equal(result.segments[4].path.length, 17);
    assert.equal(Object.hasOwn(result.segments[5], 'mode'), false);
    assert.equal(result.segments[5].path.length, 3);
    assert.equal(Object.hasOwn(result.segments[6], 'mode'), false);
    assert.equal(result.segments[6].path.length, 2);
    assert.equal(result.provider, 'openroute');
  });

  await it('too long roundabout route', async () => {
    response = require('./fixtures/roundabout-too-long');

    const query = {
      ...model.directionsQuery,
      points: response.metadata.query.coordinates,
      turnbyturn: true,
      path: model.pathType.full
    };
    const result = await directions(query);
    assert.strictEqual(result, undefined);
  });

  await it('rough surface', async () => {
    response = require('./fixtures/rough');

    const query = {
      ...model.directionsQuery,
      points: response.metadata.query.coordinates,
      turnbyturn: true,
      path: model.pathType.full
    };
    const result = await directions(query);
    assert.ok(result);
    assert.equal(result.routes.length, 1);
    assert.equal(result.routes[0].rough, true);
    assert.equal(result.segments.length, 7);
    assert.equal(result.segments[0].rough, true);
    assert.equal(result.segments[0].path.length, 159);
    assert.equal(Object.hasOwn(result.segments[1], 'rough'), false);
    assert.equal(result.segments[1].path.length, 99);
    assert.equal(result.segments[2].rough, true);
    assert.equal(result.segments[2].path.length, 7);
    assert.equal(result.segments[3].rough, true);
    assert.equal(result.segments[3].path.length, 40);
    assert.equal(result.segments[4].rough, true);
    assert.equal(result.segments[4].path.length, 232);
    assert.equal(Object.hasOwn(result.segments[5], 'rough'), false);
    assert.equal(result.segments[5].path.length, 140);
    assert.equal(Object.hasOwn(result.segments[6], 'rough'), false);
    assert.equal(result.segments[6].path.length, 2);
    assert.equal(result.provider, 'openroute');
  });

  await it('toll roads', async () => {
    response = require('./fixtures/tolls');

    const query = {
      ...model.directionsQuery,
      points: response.metadata.query.coordinates,
      turnbyturn: true,
      path: model.pathType.full
    };
    const result = await directions(query);
    assert.ok(result);
    assert.equal(result.routes.length, 1);
    assert.equal(result.routes[0].tolls, true);
    assert.equal(result.segments.length, 15);
    assert.equal(Object.hasOwn(result.segments[0], 'tolls'), false);
    assert.equal(result.segments[0].path.length, 13);
    assert.equal(Object.hasOwn(result.segments[1], 'tolls'), false);
    assert.equal(result.segments[1].path.length, 15);
    assert.equal(Object.hasOwn(result.segments[2], 'tolls'), false);
    assert.equal(result.segments[2].path.length, 18);
    assert.equal(Object.hasOwn(result.segments[3], 'tolls'), false);
    assert.equal(result.segments[3].path.length, 2);
    assert.equal(result.segments[4].tolls, true);
    assert.equal(result.segments[4].path.length, 4);
    assert.equal(result.segments[5].tolls, true);
    assert.equal(result.segments[5].path.length, 61);
    assert.equal(result.segments[6].tolls, true);
    assert.equal(result.segments[6].path.length, 58);
    assert.equal(result.segments[7].tolls, true);
    assert.equal(result.segments[7].path.length, 33);
    assert.equal(result.segments[8].tolls, true);
    assert.equal(result.segments[8].path.length, 26);
    assert.equal(result.segments[9].tolls, true);
    assert.equal(result.segments[9].path.length, 10);
    assert.equal(Object.hasOwn(result.segments[10], 'tolls'), false);
    assert.equal(result.segments[10].path.length, 19);
    assert.equal(Object.hasOwn(result.segments[11], 'tolls'), false);
    assert.equal(result.segments[11].path.length, 38);
    assert.equal(Object.hasOwn(result.segments[12], 'tolls'), false);
    assert.equal(result.segments[12].path.length, 11);
    assert.equal(Object.hasOwn(result.segments[13], 'tolls'), false);
    assert.equal(result.segments[13].path.length, 33);
    assert.equal(Object.hasOwn(result.segments[14], 'tolls'), false);
    assert.equal(result.segments[14].path.length, 2);
    assert.equal(result.provider, 'openroute');
  });
});
