var should = require('should');
var strategy = require('../lib/strategy');

describe('strategy', function () {
  it('test', function (done) {
    strategy([function (a, b, fn) {
      fn(undefined, false, a + a, b + b);
    }, function (a, b, fn) {
      fn(undefined, true, a + a, b + b);
    }, function () {
      should.fail('this is not to be called');
    }], 'A', 'B', function (err, a, b) {
      a.should.equal('AAAA');
      b.should.equal('BBBB');
      done();
    });
  });
});
