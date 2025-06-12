const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const osrm = require('../../../lib/service/osrm');
const model = require('../../../lib/model');

describe('osrm', async () => {
  await it('should return turnbyturn directions', async t => {
    const request = t.mock.fn(undefined, async () => ({
      response: require('./fixtures/turnbyturn.json')
    }));

    const directions = osrm({
      name: 'osrm',
      skip() {},
      interval: 1,
      request
    }).operation;

    const query = {
      ...model.directionsQuery,
      points: [
        [-71.0589, 42.3601], // Boston, MA
        [-71.8023, 42.2626], // Worcester, MA
        [-72.5898, 42.1015] // Springfield, MA
      ],
      turnbyturn: true
    };

    const result = await directions(query);
    assert.ok(result);
    assert.equal(result.provider, 'osrm');
    assert.deepEqual(result.places, ['Cambridge Street', 'Main Street', 'City Hall Place']);
    assert.equal(result.routes.length, 2);

    result.routes.forEach(route => {
      assert.equal(typeof route.distance, 'number');
      assert.equal(typeof route.duration, 'number');
      assert.ok(Array.isArray(route.path));
      assert.equal(typeof route.segmentIndex, 'number');
      assert.equal(Object.hasOwn(route, 'segments'), false);
    });

    assert.ok(Array.isArray(result.segments));

    result.segments.forEach(segment => {
      assert.equal(typeof segment.distance, 'number');
      assert.equal(typeof segment.duration, 'number');
      assert.ok(Array.isArray(segment.path));
      assert.equal(typeof segment.instructions, 'string');
    });

    assert.strictEqual(request.mock.calls.length, 1);
    assert.deepStrictEqual(request.mock.calls[0].arguments, [
      'https://router.project-osrm.org/route/v1/car/-71.05890,42.36010;-71.80230,42.26260;-72.58980,42.10150',
      {
        alternatives: false,
        steps: true,
        overview: false,
        radiuses: '1000;1000;1000'
      }
    ]);
  });

  await it('should return zero results', async t => {
    const request = t.mock.fn(undefined, async () => ({
      response: require('./fixtures/zeroresults.json')
    }));

    const directions = osrm({
      name: 'osrm',
      interval: 1,
      skip() {},
      request
    }).operation;

    const query = {
      ...model.directionsQuery,
      points: [
        [-118.5301, 37.0272],
        [-118.5027, 36.9735]
      ],
      turnbyturn: true
    };
    const result = await directions(query);
    assert.strictEqual(result, undefined);

    assert.strictEqual(request.mock.calls.length, 1);
    assert.deepStrictEqual(request.mock.calls[0].arguments, [
      'https://router.project-osrm.org/route/v1/car/-118.53010,37.02720;-118.50270,36.97350',
      {
        alternatives: false,
        steps: true,
        overview: false,
        radiuses: '1000;1000'
      }
    ]);
  });
});
