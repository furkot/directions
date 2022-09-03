const should = require('should');
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

describe('furkot-directions node module', function () {

  it('no input', async function () {
    const result = await furkotDirections()();
    should.not.exist(result);
  });

  it('empty input', async function () {
    const result = await furkotDirections()({});
    should.not.exist(result);
  });

  it('one point', async function () {
    const result = await furkotDirections()({
      points: [[0, 0]]
    });
    should.not.exist(result);
  });

  it('no service', async function () {
    const result = await furkotDirections({
      services: []
    })({
      points: [[0, 0], [1, 1]]
    });
    should.exist(result);
    result.should.have.property('routes').with.length(1);
  });

  it('service', async function () {
    const query = {
      points: [[0, 0], [1, 1]]
    };
    const result = await furkotDirections({
      services: [{
        operation: mockService,
        name: 'mock',
        skip
      }]
    })(query);
    should.exist(result);
    result.should.have.property('stats', [ 'mock' ]);
    result.should.have.property('provider', 'mock');
    result.should.have.property('name', 'success');
    result.should.have.property('query', query);
  });

  it('only enabled services', function () {
    const options = {
      valhalla_enable() { }
    };
    const directions = furkotDirections(options);
    directions.options.should.have.property('services').with.length(1);
  });

  it('override provider name', function () {
    const options = {
      order: ['stadiamaps'],
      stadiamaps: 'valhalla',
      stadiamaps_enable() { }
    };
    const directions = furkotDirections(options);
    directions.options.should.have.property('services').with.length(1);
  });

  it('timeout', async function () {
    const promise = furkotDirections({
      services: [{
        operation: timeService(20),
        skip
      }],
      timeout: 10
    })({
      points: [[0, 0], [1, 1]]
    });
    await promise.should.be.rejectedWith('timeout');
  });

  it('abort', async function () {
    const ac = new AbortController();
    const promise = furkotDirections({
      services: [{
        operation: timeService(10, null),
        skip
      }, {
        operation: timeService(10, null),
        skip
      }, {
        operation: timeService(10),
        skip
      }],
      timeout: 400
    })({
      points: [[0, 0], [1, 1]]
    }, { signal: ac.signal });
    await timeout(15);
    ac.abort();
    await promise.should.be.rejectedWith(/aborted/);
  });

});
