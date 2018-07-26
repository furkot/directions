var should = require('should');
var furkotDirections = require('../lib/directions');

function mockService(queryId, query, result, fn) {
  query.forEach(function (res, i) {
    result[i] = {
      query: query[i],
      name: 'success'
    };
  });
  fn(undefined, false, queryId, query, result);
}

function timeService(timeout) {
  var service, timeoutId, queryInProgress, resultInProgress, callback;
  service = function (queryId, query, result, fn) {
    queryInProgress = query;
    resultInProgress = result;
    callback = fn;
    timeoutId = setTimeout(function () {
      query.forEach(function (res, i) {
        result[i] = {
          query: query[i],
          name: 'success'
        };
      });
      fn(undefined, false, queryId, query, result);
    }, timeout);
  };
  service.abort = function (queryId) {
    clearTimeout(timeoutId);
    callback(undefined, false, queryId, queryInProgress, resultInProgress);
  };
  return service;
}

describe('furkot-directions node module', function () {

  it('no input no output', function (done) {
    furkotDirections(undefined)(undefined, function (query, result) {
      should.not.exist(query);
      should.not.exist(result);
      done();
    });
  });

  it('empty input empty output', function (done) {
    furkotDirections(undefined)([], function (query, result) {
      query.should.have.length(0);
      result.should.have.length(0);
      done();
    });
  });

  it('no service', function (done) {
    furkotDirections({
      services: []
    })([{}], function (query, result) {
      query.should.have.length(1);
      result.should.have.length(1);
      done();
    });
  });

  it('service', function (done) {
    furkotDirections({
      services: [
        mockService
      ]
    })([{}], function (query, result) {
      query.should.have.length(1);
      result.should.have.length(1);
      result = result[0];
      should.exist(result);
      result.should.have.property('name', 'success');
      result.should.have.property('query', query[0]);
      done();
    });
  });

  it('only enabled services', function () {
    var options = {
        valhalla_enable: function () {}
    };
    var directions = furkotDirections(options);
    directions.options.should.have.property('services').with.length(1);
  });

  it('override provider name', function () {
    var options = {
        order: ['stadiamaps'],
        stadiamaps: 'valhalla',
        stadiamaps_enable: function () {}
    };
    var directions = furkotDirections(options);
    directions.options.should.have.property('services').with.length(1);
  });

  it('timeout', function (done) {
    furkotDirections({
      services: [
        timeService(200)
      ],
      timeout: 100
    })([{}], function (query, result) {

      query.should.have.length(1);
      result.should.have.length(1);
      should.exists(result[0]);
      result[0].routes.should.have.length(1);
      should.exists(result[0].routes[0]);
      result[0].routes[0].should.have.property('distance', 0);
      result[0].routes[0].should.have.property('duration', 0);
      setTimeout(done, 250);
    });
  });
});
