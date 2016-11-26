var _ = require('lodash');
var should = require('should');
var model = require('../../../lib/model');
var directions = require('../../../lib/service/google')({
  check: function () {
    return true;
  }
});

/* global window:true, google:true */

function initConstants(str) {
  return str.split('-').reduce(function map(result, key) {
    result[key] = key;
    return result;
  }, {});
}

var response = [];

function initDirectionsService(res) {
  response = response.concat(res);
}

describe('google maps API directions', function () {
  before(function () {
    if (typeof google === 'undefined') {
      google = {};
    }
    google.maps = {
      DirectionsTravelMode: initConstants('DRIVING-BICYCLING-WALKING'),
      DirectionsStatus: initConstants('OK-ZERO_RESULTS-OVER_QUERY_LIMIT-UNKNOWN_ERROR'),
      UnitSystem: initConstants('IMPERIAL-METRIC'),
      LatLng: function (lat, lng) {
        this.lat = function () {
          return lat;
        };
        this.lng = function () {
          return lng;
        };
        return this;
      },
      DirectionsService: function () {
        this.route = function (req, fn) {
          var res = response.shift();
          res = _.cloneDeepWith(res, function (value) {
            if (value.hasOwnProperty('lat') && value.hasOwnProperty('lng')) {
              return new google.maps.LatLng(value.lat, value.lng);
            }
          });
          return fn(res, res.status);
        };
        return this;
      },
      geometry: {
        spherical: {
          computeDistanceBetween: function () {}
        }
      }
    };
    if (typeof window === 'undefined') {
      window = {};
    }
    window.google = google;
  });

  after(function () {
    delete window.google.maps;
  });

  it('test', function (done) {
    var query, result = [], response;

    response = require('./fixtures/response');
    initDirectionsService(response);

    query = _.cloneDeep(model.directionsQuery);
    query[0].points = [
      [response.request.origin.lng, response.request.origin.lat],
      [response.request.destination.lng, response.request.destination.lat]
    ];
    directions(query, result, function (err, value, query, result) {
      should.not.exist(err);
      value.should.equal(false);
      should.exist(result);
      result.should.have.length(1);
      result[0].should.have.property('query');
      result[0].query.should.deepEqual(query[0]);
      result[0].should.have.property('name', 'I-40 W');
      result[0].should.have.property('places').with.length(2);
      result[0].places.should.deepEqual([
        '3898 Qr 64, Tucumcari, NM 88401, USA',
        'I-40 Frontage Rd, Tucumcari, NM 88401, USA'
      ]);
      result[0].should.have.property('routes').with.length(1);
      result[0].routes[0].should.have.property('duration', 1952);
      result[0].routes[0].should.have.property('distance', 46113);
      result[0].routes[0].should.have.property('path').with.length(208);
      result[0].routes[0].should.have.property('segmentIndex', 0);
      result[0].should.have.property('segments').with.length(8);
      result[0].segments[0].should.have.property('duration', 134);
      result[0].segments[0].should.have.property('distance', 806);
      result[0].segments[0].should.have.property('path').with.length(6);
      result[0].segments[0].should.have.property('instructions',
        'Head <b>northeast</b> on <b>Qr 64</b> toward <b>Quay Rd Am</b>');
      done();
    });
  });

  it('zero results', function (done) {
    var query, result = [], response;

    response = require('./fixtures/response');
    initDirectionsService([{
      status: 'ZERO_RESULTS'
    }, response, {
      status: 'ZERO_RESULTS'
    }]);

    query = _.cloneDeep(model.directionsQuery);
    query[0].points = [
      [response.request.origin.lng, response.request.origin.lat],
      [response.request.destination.lng, response.request.destination.lat],
      [response.request.origin.lng, response.request.origin.lat]
    ];
    directions(query, result, function (err, value, query, result) {
      should.not.exist(err);
      value.should.equal(false);
      should.exist(result);
      result.should.have.length(2);
      result[0].should.have.property('query');
      result[0].query.should.deepEqual(query[0]);
      result[0].should.have.property('name', 'I-40 W');
      result[0].should.have.property('places').with.length(2);
      result[0].places.should.deepEqual([
        '3898 Qr 64, Tucumcari, NM 88401, USA',
        'I-40 Frontage Rd, Tucumcari, NM 88401, USA'
      ]);
      result[0].should.have.property('routes').with.length(1);
      result[0].routes[0].should.have.property('duration', 1952);
      result[0].routes[0].should.have.property('distance', 46113);
      result[0].routes[0].should.have.property('path').with.length(208);
      result[0].routes[0].should.have.property('segmentIndex', 0);
      result[0].should.have.property('segments').with.length(8);
      result[0].segments[0].should.have.property('duration', 134);
      result[0].segments[0].should.have.property('distance', 806);
      result[0].segments[0].should.have.property('path').with.length(6);
      result[0].segments[0].should.have.property('instructions',
        'Head <b>northeast</b> on <b>Qr 64</b> toward <b>Quay Rd Am</b>');
      result[1].should.have.property('query');
      result[1].query.should.deepEqual(query[1]);
      result[1].should.not.have.property('name');
      result[1].should.not.have.property('places');
      result[1].should.not.have.property('routes');
      result[1].should.not.have.property('segments');
      done();
    });
  });
});
