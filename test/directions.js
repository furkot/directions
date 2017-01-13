var should = require('should');
var furkotDirections = require('../lib/directions');

function mockService(query, result, fn) {
  query.forEach(function (res, i) {
    result[i] = {
      query: query[i],
      name: 'success'
    };
  });
  fn(undefined, false, query, result);
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
        mapzen_enable: function () {}
    };
    furkotDirections(options);
    options.should.have.property('services').with.length(1);
  });
});
