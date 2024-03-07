const { describe, it } = require('node:test');
const should = require('should');
const model = require('../../../lib/model');
const mapquest = require('../../../lib/service/mapquest');

let response;
const directions = mapquest({
  name: 'mapquest',
  skip() { },
  interval: 1,
  request() { return { response }; }
}).operation;

describe('mapquest directions', async function () {

  await it('test', async function () {
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
      units: 'km',
    };
    const result = await directions(query);
    should.exist(result);
    result.should.have.property('query');
    result.query.should.deepEqual(query);
    result.should.have.property('name', 'US-54 W');
    result.should.not.have.property('places');
    result.should.have.property('routes').with.length(1);
    result.routes[0].should.have.property('duration', 1939);
    result.routes[0].should.have.property('distance', 41603);
    result.routes[0].should.have.property('path').with.length(40);
    result.routes[0].should.have.property('segmentIndex', 0);
    result.should.have.property('segments').with.length(7);
    result.segments[0].should.have.property('duration', 86);
    result.segments[0].should.have.property('distance', 906);
    result.segments[0].should.have.property('path').with.length(3);
    result.segments[0].should.have.property('instructions',
      'Start out going south on Quay Road V toward US Highway 54/US-54 W/US-54 E.');
    result.should.have.property('provider', 'mapquest');
  });
});

describe('open mapquest directions', async function () {
  await it('test', async function () {
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
    should.exist(result);
    result.should.have.property('query');
    result.query.should.deepEqual(query);
    result.should.have.property('name', 'US-54 W');
    result.should.not.have.property('places');
    result.should.have.property('routes').with.length(1);
    result.routes[0].should.have.property('duration', 1939);
    result.routes[0].should.have.property('distance', 41603);
    result.routes[0].should.have.property('path').with.length(40);
    result.routes[0].should.have.property('segmentIndex', 0);
    result.should.not.have.property('segments');
    result.should.have.property('provider', 'openmapquest');
  });
});
