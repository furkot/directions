const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const model = require('../../../lib/model');
const mapquest = require('../../../lib/service/mapquest');

let response;
const directions = mapquest({
  name: 'mapquest',
  skip() {},
  interval: 1,
  request() {
    return { response };
  }
}).operation;

describe('mapquest directions', async () => {
  await it('test', async () => {
    response = require('./fixtures/turnbyturn');

    const query = {
      ...model.directionsQuery,
      points: [
        [response.route.locations[0].latLng.lng, response.route.locations[0].latLng.lat],
        [response.route.locations[1].latLng.lng, response.route.locations[1].latLng.lat]
      ],
      alternate: true,
      turnbyturn: true,
      path: model.pathType.full,
      units: 'km'
    };
    const result = await directions(query);
    assert(result);
    assert.deepEqual(result.query, query);
    assert.equal(result.name, 'US-54 W');
    assert(!Object.hasOwn(result, 'places'));
    assert.equal(result.routes.length, 1);
    assert.equal(result.routes[0].duration, 1939);
    assert.equal(result.routes[0].distance, 41603);
    assert.equal(result.routes[0].path.length, 40);
    assert.equal(result.routes[0].segmentIndex, 0);
    assert.equal(result.segments.length, 7);
    assert.equal(result.segments[0].duration, 86);
    assert.equal(result.segments[0].distance, 906);
    assert.equal(result.segments[0].path.length, 3);
    assert.equal(
      result.segments[0].instructions,
      'Start out going south on Quay Road V toward US Highway 54/US-54 W/US-54 E.'
    );
    assert.equal(result.provider, 'mapquest');
  });
});

describe('open mapquest directions', async () => {
  await it('test', async () => {
    response = require('./fixtures/response');

    const query = {
      ...model.directionsQuery,
      points: [
        [response.route.locations[0].latLng.lng, response.route.locations[0].latLng.lat],
        [response.route.locations[1].latLng.lng, response.route.locations[1].latLng.lat]
      ],
      path: model.pathType.smooth
    };
    const result = await directions(query);
    assert(result);
    assert.deepEqual(result.query, query);
    assert.equal(result.name, 'US-54 W');
    assert(!Object.hasOwn(result, 'places'));
    assert.equal(result.routes.length, 1);
    assert.equal(result.routes[0].duration, 1939);
    assert.equal(result.routes[0].distance, 41603);
    assert.equal(result.routes[0].path.length, 40);
    assert.equal(result.routes[0].segmentIndex, 0);
    assert(!Object.hasOwn(result, 'segments'));
    assert.equal(result.provider, 'openmapquest');
  });
});
