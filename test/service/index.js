var should = require('should');
var service = require('../../lib/service');
var status = require('../../lib/service/status');

describe('service', function () {
  var s, st, reqTimeout, noAbort, timeout = 200;

  beforeEach(function () {
    st = [];
    reqTimeout = undefined;
    noAbort = undefined;

    s = service({
      timeout: timeout,
      interval: 10,
      penaltyInterval: 20,
      maxPoints: 10,
      request: function (url, req, fn) {
        reqTimeout = reqTimeout || 1;
        return setTimeout(function () {
          fn(undefined, 'response');
        }, reqTimeout);
      },
      abort: function (req) {
        if (!noAbort) {
          clearTimeout(req);
        }
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
    s([{
      points: [[0, 0], [1, 1]]
    }], [], function (err, trueValue, query, result) {
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
    s([{
      points: [[0, 0], [1, 1]]
    }], [], function (err, trueValue, query, result) {
      should.not.exist(err);
      trueValue.should.equal(false);
      query.should.have.length(1);
      result.should.have.length(1);
      result[0].should.equal('response');
      setTimeout(done, Math.max(s.timeout , reqTimeout));
    });
  });

  it('timeout', function (done) {
    reqTimeout = 2 * timeout;
    s([{
      points: [[0, 0], [1, 1]]
    }], [], function (err, trueValue, query, result) {
      should.not.exist(err);
      trueValue.should.equal(true);
      query.should.have.length(1);
      result.should.have.length(0);
      setTimeout(done, Math.max(timeout, reqTimeout));
    });
  });

  it('timeout cannot abort', function (done) {
    reqTimeout = 2 * timeout;
    noAbort = true;
    s([{
      points: [[0, 0], [1, 1]]
    }], [], function (err, trueValue, query, result) {
      should.not.exist(err);
      trueValue.should.equal(true);
      query.should.have.length(1);
      result.should.have.length(0);
      setTimeout(done, Math.max(timeout, reqTimeout));
    });
  });

  it('request later timeout', function (done) {
    st = [status.error];
    reqTimeout = timeout / 2 + 1;
    s([{
      points: [[0, 0], [1, 1]]
    }], [], function (err, trueValue, query, result) {
      should.not.exist(err);
      trueValue.should.equal(true);
      query.should.have.length(1);
      result.should.have.length(0);
      setTimeout(done, Math.max(timeout, reqTimeout));
    });
  });

  it('no points', function (done) {
    s([{}], [], function (err, trueValue, query, result) {
      should.not.exist(err);
      trueValue.should.equal(true);
      should.not.exist(query);
      should.not.exist(result);
      done();
    });
  });

  it('one point', function (done) {
    s([{
      points: [[0, 0]]
    }], [], function (err, trueValue, query, result) {
      should.not.exist(err);
      trueValue.should.equal(true);
      should.not.exist(query);
      should.not.exist(result);
      done();
    });
  });
});
