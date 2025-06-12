const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const furkotDirections = require('../lib/directions');
const { timeout } = require('../lib/service/util');

/* global AbortController */

function skip() {}

function mockService(query) {
  return Promise.resolve({
    query,
    name: 'success'
  });
}

function timeService(millis, success = true) {
  return service;

  async function service(query) {
    await timeout(millis);
    return success && { query, name: 'success' };
  }
}

describe('furkot-directions node module', async () => {
  await it('no input', async () => {
    const result = await furkotDirections()();
    assert.strictEqual(result, undefined);
  });

  await it('empty input', async () => {
    const result = await furkotDirections()({});
    assert.strictEqual(result, undefined);
  });

  await it('one point', async () => {
    const result = await furkotDirections()({
      points: [[0, 0]]
    });
    assert.strictEqual(result, undefined);
  });

  await it('no service', async () => {
    const result = await furkotDirections({
      services: []
    })({
      points: [
        [0, 0],
        [1, 1]
      ]
    });
    assert.ok(result);
    assert.strictEqual(result.routes.length, 1);
  });

  await it('service', async () => {
    const query = {
      points: [
        [0, 0],
        [1, 1]
      ]
    };
    const result = await furkotDirections({
      services: [
        {
          operation: mockService,
          name: 'mock',
          skip
        }
      ]
    })(query);
    assert.ok(result);
    assert.deepStrictEqual(result.stats, ['mock']);
    assert.strictEqual(result.provider, 'mock');
    assert.strictEqual(result.name, 'success');
    assert.deepStrictEqual(result.query, query);
  });

  await it('only enabled services', () => {
    const options = {
      valhalla_enable() {}
    };
    const directions = furkotDirections(options);
    assert.strictEqual(directions.options.services.length, 1);
  });

  await it('override provider name', () => {
    const options = {
      order: ['stadiamaps'],
      stadiamaps: 'valhalla',
      stadiamaps_enable() {}
    };
    const directions = furkotDirections(options);
    assert.strictEqual(directions.options.services.length, 1);
  });

  await it('timeout', async () => {
    const promise = furkotDirections({
      services: [
        {
          operation: timeService(20),
          skip
        }
      ],
      timeout: 10
    })({
      points: [
        [0, 0],
        [1, 1]
      ]
    });
    await assert.doesNotReject(promise);
    const result = await promise;
    assert.deepStrictEqual(result, {
      query: {
        points: [
          [0, 0],
          [1, 1]
        ]
      },
      stats: [undefined],
      routes: [{}]
    });
  });

  await it('abort', async () => {
    const ac = new AbortController();
    const promise = furkotDirections({
      services: [
        {
          operation: timeService(10, null),
          skip
        },
        {
          operation: timeService(10, null),
          skip
        },
        {
          operation: timeService(10),
          skip
        }
      ],
      timeout: 400
    })(
      {
        points: [
          [0, 0],
          [1, 1]
        ]
      },
      { signal: ac.signal }
    );
    await timeout(15);
    ac.abort();
    await assert.rejects(promise, /aborted/);
  });
});
