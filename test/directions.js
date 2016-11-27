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
  it('no input no output', function () {
    var returned;
    furkotDirections(undefined)(undefined, function (query, result) {
      should.not.exist(query);
      should.not.exist(result);
      returned = true;
    });
    should.ok(returned, 'no callback');
  });

  it('empty input empty output', function () {
    var returned;
    furkotDirections(undefined)([], function (query, result) {
      query.should.have.length(0);
      result.should.have.length(0);
      returned = true;
    });
    should.ok(returned, 'no callback');
  });

  it('no service', function () {
    var returned;
    furkotDirections({
      services: []
    })([{}], function (query, result) {
      query.should.have.length(1);
      result.should.have.length(1);
      returned = true;
    });
    should.ok(returned, 'no callback');
  });

  it('service', function () {
    var returned;
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
      returned = true;
    });
    should.ok(returned, 'no callback');
  });
});
