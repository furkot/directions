var should = require('should');
var service = require('../../lib/service');
var status = require('../../lib/service/status');

describe('service', function () {
  var s, st, reqTimeout, reqResponse, timeout = 200;

  beforeEach(function () {
    st = [];
    reqResponse = 'response';

    s = service({
      timeout: timeout,
      interval: 10,
      penaltyInterval: 20,
      maxPoints: 10,
      request: function (url, req, fn) {
        reqTimeout = reqTimeout || 1;
        return setTimeout(function () {
          fn(undefined, reqResponse);
        }, reqTimeout);
      },
      status: function () {
        return st.shift() || status.success;
      },
      prepareRequest: function (query) {
        return query;
      },
      processResponse: function (response) {
        return response;
      },
      skip: function () {}
    });
  });

  it('success', function (done) {
    s(1, [{
      points: [[0, 0], [1, 1]]
    }], [], function (err, trueValue, id, query, result) {
      should.not.exist(err);
      trueValue.should.equal(false);
      query.should.have.length(1);
      result.should.have.length(1);
      result[0].should.equal('response');
      setTimeout(done, Math.max(s.timeout, reqTimeout));
    });
  });

  it('request later', function (done) {
    st = [status.error];
    s(2, [{
      points: [[0, 0], [1, 1]]
    }], [], function (err, trueValue, id, query, result) {
      should.not.exist(err);
      trueValue.should.equal(false);
      query.should.have.length(1);
      result.should.have.length(1);
      result[0].should.equal('response');
      setTimeout(done, Math.max(s.timeout, reqTimeout));
    });
  });

  it('no points', function (done) {
    s(3, [{}], [], function (err, trueValue, id, query, result) {
      should.not.exist(err);
      trueValue.should.equal(true);
      should.not.exist(query);
      should.not.exist(result);
      done();
    });
  });

  it('one point', function (done) {
    s(4, [{
      points: [[0, 0]]
    }], [], function (err, trueValue, id, query, result) {
      should.not.exist(err);
      trueValue.should.equal(true);
      should.not.exist(query);
      should.not.exist(result);
      done();
    });
  });

  it('cascade to next service', function (done) {
    reqResponse = undefined;
    s(5, [{
      points: [[0, 0], [1, 1]]
    }], [], function (err, trueValue, id, query, result) {
      should.not.exist(err);
      trueValue.should.equal(false);
      query.should.have.length(1);
      result.should.have.length(0);
      setTimeout(done, Math.max(s.timeout, reqTimeout));
    });
  });
});
