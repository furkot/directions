const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { directionsQuery, pathType } = require('../../../lib/model');
const graphhopper = require('../../../lib/service/graphhopper');

describe('graphhopper directions', async () => {
  let response;

  const directions = graphhopper({
    name: 'graphhopper',
    skip() {},
    interval: 1,
    request() {
      return { response };
    }
  }).operation;

  await it('test', async () => {
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
    assert.ok(result);
    assert.deepEqual(result.query, query);
    assert.equal(Object.hasOwn(result, 'name'), false);
    assert.equal(Object.hasOwn(result, 'places'), false);
    assert.equal(result.routes.length, 1);
    assert.equal(result.routes[0].duration, 29740);
    assert.equal(result.routes[0].distance, 885618);
    assert.equal(result.routes[0].path.length, 7853);
    assert.equal(Object.hasOwn(result.routes[0], 'segmentIndex'), false);
    assert.equal(Object.hasOwn(result, 'segments'), false);
    assert.equal(result.provider, 'graphhopper');
  });

  await it('turn-by-turn', async () => {
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
    assert.ok(result);
    assert.deepEqual(result.query, query);
    assert.equal(Object.hasOwn(result, 'name'), false);
    assert.equal(Object.hasOwn(result, 'places'), false);
    assert.equal(result.routes.length, 1);
    assert.equal(result.routes[0].duration, 29740);
    assert.equal(result.routes[0].distance, 885618);
    assert.equal(result.routes[0].path.length, 5749);
    assert.equal(result.routes[0].segmentIndex, 0);
    assert.equal(result.segments.length, 151);
    assert.equal(result.segments[0].duration, 183);
    assert.equal(result.segments[0].distance, 508);
    assert.equal(result.segments[0].path.length, 13);
    assert.equal(result.segments[0].instructions, 'Continue');
    assert.equal(
      result.segments.reduce((len, seg) => len + seg.path.length - 1, 0),
      5749
    );
    assert.equal(result.provider, 'graphhopper');
  });

  await it('ferry', async () => {
    response = require('./fixtures/ferry');

    const query = {
      ...directionsQuery,
      points: [
        [18.936008142490863, 54.33379650788689],
        [18.94377850198444, 54.3330051697059]
      ],
      turnbyturn: true,
      path: pathType.full
    };
    const result = await directions(query);
    assert.ok(result);
    assert.equal(result.routes.length, 1);
    assert.equal(result.routes[0].ferry, true);
    assert.equal(result.segments.length, 4);
    assert.equal(Object.hasOwn(result.segments[0], 'mode'), false);
    assert.equal(result.segments[0].path.length, 7);
    assert.equal(result.segments[1].mode, 6);
    assert.equal(result.segments[1].path.length, 2);
    assert.equal(Object.hasOwn(result.segments[2], 'mode'), false);
    assert.equal(result.segments[2].path.length, 7);
    assert.equal(Object.hasOwn(result.segments[3], 'mode'), false);
    assert.equal(result.segments[3].path.length, 2);
    assert.equal(result.provider, 'graphhopper');
  });

  await it('other ferry', async () => {
    response = require('./fixtures/ferry-2');

    const query = {
      ...directionsQuery,
      points: [
        [1.7451973302237036, 50.936555851689576],
        [1.2756059870033596, 51.110532072304125]
      ],
      turnbyturn: true,
      path: pathType.full
    };
    const result = await directions(query);
    assert.ok(result);
    assert.equal(result.routes.length, 1);
    assert.equal(result.routes[0].ferry, true);
    assert.equal(result.segments.length, 2);
    assert.equal(result.segments[0].mode, 6);
    assert.equal(result.segments[0].path.length, 79);
    assert.equal(Object.hasOwn(result.segments[1], 'mode'), false);
    assert.equal(result.segments[1].path.length, 2);
    assert.equal(result.provider, 'graphhopper');
  });

  await it('rough surface', async () => {
    response = require('./fixtures/rough');

    const query = {
      ...directionsQuery,
      points: [
        [-117.66331, 37.19828],
        [-118.05343279926038, 36.56441786808713]
      ],
      turnbyturn: true,
      path: pathType.full
    };
    const result = await directions(query);
    assert.ok(result);
    assert.equal(result.routes.length, 1);
    assert.equal(result.routes[0].rough, true);
    assert.equal(result.segments.length, 14);
    assert.equal(result.segments[0].rough, true);
    assert.equal(result.segments[0].path.length, 150);
    assert.equal(Object.hasOwn(result.segments[1], 'rough'), false);
    assert.equal(result.segments[1].path.length, 94);
    assert.equal(result.segments[2].rough, true);
    assert.equal(result.segments[2].path.length, 4);
    assert.equal(result.segments[3].rough, true);
    assert.equal(result.segments[3].path.length, 259);
    assert.equal(Object.hasOwn(result.segments[4], 'rough'), false);
    assert.equal(result.segments[4].path.length, 399);
    assert.equal(Object.hasOwn(result.segments[5], 'rough'), false);
    assert.equal(result.segments[5].path.length, 32);
    assert.equal(Object.hasOwn(result.segments[6], 'rough'), false);
    assert.equal(result.segments[6].path.length, 156);
    assert.equal(result.segments[7].rough, true);
    assert.equal(result.segments[7].path.length, 2);
    assert.equal(Object.hasOwn(result.segments[8], 'rough'), false);
    assert.equal(result.segments[8].path.length, 65);
    assert.equal(Object.hasOwn(result.segments[9], 'rough'), false);
    assert.equal(result.segments[9].path.length, 3);
    assert.equal(Object.hasOwn(result.segments[10], 'rough'), false);
    assert.equal(result.segments[10].path.length, 2);
    assert.equal(Object.hasOwn(result.segments[11], 'rough'), false);
    assert.equal(result.segments[11].path.length, 3);
    assert.equal(result.segments[12].rough, true);
    assert.equal(result.segments[12].path.length, 15);
    assert.equal(Object.hasOwn(result.segments[13], 'rough'), false);
    assert.equal(result.segments[13].path.length, 2);
    assert.equal(result.provider, 'graphhopper');
  });

  await it('toll roads', async () => {
    response = require('./fixtures/tolls');

    const query = {
      ...directionsQuery,
      points: [
        [-71.23879, 42.34696],
        [-71.06060028076172, 42.35549949225654]
      ],
      turnbyturn: true,
      path: pathType.full
    };
    const result = await directions(query);
    assert.ok(result);
    assert.equal(result.routes.length, 1);
    assert.equal(result.routes[0].tolls, true);
    assert.equal(result.segments.length, 15);
    assert.equal(result.segments[0].tolls, true);
    assert.equal(result.segments[0].path.length, 23);
    assert.equal(result.segments[1].tolls, true);
    assert.equal(result.segments[1].path.length, 13);
    assert.equal(result.segments[2].tolls, true);
    assert.equal(result.segments[2].path.length, 5);
    assert.equal(Object.hasOwn(result.segments[3], 'tolls'), false);
    assert.equal(result.segments[3].path.length, 6);
    assert.equal(result.segments[4].tolls, true);
    assert.equal(result.segments[4].path.length, 147);
    assert.equal(result.segments[5].tolls, true);
    assert.equal(result.segments[5].path.length, 5);
    assert.equal(result.segments[6].tolls, true);
    assert.equal(result.segments[6].path.length, 14);
    assert.equal(Object.hasOwn(result.segments[7], 'tolls'), false);
    assert.equal(result.segments[7].path.length, 5);
    assert.equal(Object.hasOwn(result.segments[8], 'tolls'), false);
    assert.equal(result.segments[8].path.length, 4);
    assert.equal(Object.hasOwn(result.segments[9], 'tolls'), false);
    assert.equal(result.segments[9].path.length, 3);
    assert.equal(Object.hasOwn(result.segments[10], 'tolls'), false);
    assert.equal(result.segments[10].path.length, 3);
    assert.equal(Object.hasOwn(result.segments[11], 'tolls'), false);
    assert.equal(result.segments[11].path.length, 2);
    assert.equal(Object.hasOwn(result.segments[12], 'tolls'), false);
    assert.equal(result.segments[12].path.length, 7);
    assert.equal(Object.hasOwn(result.segments[13], 'tolls'), false);
    assert.equal(result.segments[13].path.length, 2);
    assert.equal(Object.hasOwn(result.segments[14], 'tolls'), false);
    assert.equal(result.segments[14].path.length, 2);
    assert.equal(result.provider, 'graphhopper');
  });
});
