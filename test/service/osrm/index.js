var should = require('should');
var _cloneDeep = require('lodash.clonedeep');
var sinon = require('sinon');

var osrm = require('../../../lib/service/osrm');
var model = require('../../../lib/model');

describe('osrm', function () {
  beforeEach(function() {
    this.query = _cloneDeep(model.directionsQuery);
  });

  it('should return turnbyturn directions', function (done) {

    var request = sinon.stub();

    // if called with expected arguments
    request
      .withArgs(
        'https://router.project-osrm.org/route/v1/car/-71.05890,42.36010;-71.80230,42.26260;-72.58980,42.10150',
        { alternatives: false, steps: true, overview: false, radiuses: '1000;1000;1000' }
      )
      .onFirstCall()
      .yieldsAsync(null, {
        status: 200,
        body: require('./fixtures/turnbyturn.json')
      });

    // otherwise
    request.yieldsAsync(400, { status: 400 });

    var directions = osrm({
      name: 'osrm',
      skip: function() {},
      request: request
    });

    this.query[0].points = [
      [ -71.0589, 42.3601 ], // Boston, MA
      [ -71.8023, 42.2626 ], // Worcester, MA
      [ -72.5898, 42.1015 ]  // Springfield, MA
    ];
    this.query[0].turnbyturn = true;

    directions(this.query, [], function (err, value, query, results) {
      should.not.exist(err);
      should.exist(results);


      results.should.have.length(1);
      var result = results[0];

      result.should.have.property('provider', 'osrm');
      result.should.have.property('places',  [
        'Cambridge Street',
        'Main Street',
        'City Hall Place'
      ]);

      result.should.have.property('routes').with.length(2);

      result.routes.forEach(function(route) {
        route.should.have.property('distance').which.is.Number();
        route.should.have.property('duration').which.is.Number();
        route.should.have.property('path').which.is.Array();
        route.should.have.property('segmentIndex').which.is.Number();
        route.should.not.have.property('segments');
      });

      result.should.have.property('segments').which.is.Array();

      result.segments.forEach(function(segment) {
        segment.should.have.property('distance').which.is.Number();
        segment.should.have.property('duration').which.is.Number();
        segment.should.have.property('path').which.is.Array();
        segment.should.have.property('instructions').which.is.String();
      });

      done();
    });
  });

  it('should return zero results', function (done) {

    var request = sinon.stub();

    // if called with expected arguments
    request
      .withArgs(
        'https://router.project-osrm.org/route/v1/car/-118.53010,37.02720;-118.50270,36.97350',
        { alternatives: false, steps: true, overview: false, radiuses: '1000;1000' }
      )
      .onFirstCall()
      .yieldsAsync(null, {
        status: 200,
        body: require('./fixtures/zeroresults.json')
      });

    // otherwise
    request.yieldsAsync(400, { status: 400 });

    var directions = osrm({
      name: 'osrm',
      skip: function() {},
      request: request
    });

    this.query[0].points = [
      [ -118.5301,37.0272 ],
      [ -118.5027,36.9735 ]
    ];
    this.query[0].turnbyturn = true;

    directions(this.query, [], function (err, value, query, results) {
      should.not.exist(err);
      should.exist(results);


      results.should.have.length(1);
      var result = results[0];

      result.should.have.property('provider', 'osrm');
      result.should.not.have.property('places');
      result.should.not.have.property('routes');
      result.should.not.have.property('segments');

      done();
    });
  });
});
