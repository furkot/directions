const { describe, it } = require('node:test');
const should = require('should');

const osrm = require('../../../lib/service/osrm');
const model = require('../../../lib/model');

describe('osrm', async function () {
  await it('should return turnbyturn directions', async function (t) {
    const request = t.mock.fn(undefined, async () => {
      return { response: require('./fixtures/turnbyturn.json') };
    });

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
    should.exist(result);
    result.should.have.property('provider', 'osrm');
    result.should.have.property('places', ['Cambridge Street', 'Main Street', 'City Hall Place']);

    result.should.have.property('routes').with.length(2);

    result.routes.forEach(function (route) {
      route.should.have.property('distance').which.is.Number();
      route.should.have.property('duration').which.is.Number();
      route.should.have.property('path').which.is.Array();
      route.should.have.property('segmentIndex').which.is.Number();
      route.should.not.have.property('segments');
    });

    result.should.have.property('segments').which.is.Array();

    result.segments.forEach(function (segment) {
      segment.should.have.property('distance').which.is.Number();
      segment.should.have.property('duration').which.is.Number();
      segment.should.have.property('path').which.is.Array();
      segment.should.have.property('instructions').which.is.String();
    });

    request.mock.calls.should.have.length(1);
    request.mock.calls[0].arguments.should.be.deepEqual([
      'https://router.project-osrm.org/route/v1/car/-71.05890,42.36010;-71.80230,42.26260;-72.58980,42.10150',
      {
        alternatives: false,
        steps: true,
        overview: false,
        radiuses: '1000;1000;1000'
      }
    ]);
  });

  await it('should return zero results', async function (t) {
    const request = t.mock.fn(undefined, async () => {
      return { response: require('./fixtures/zeroresults.json') };
    });

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
    should.not.exist(result);

    request.mock.calls.should.have.length(1);
    request.mock.calls[0].arguments.should.be.deepEqual([
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
