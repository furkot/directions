const should = require('should');
const service = require('../../lib/service');
const status = require('../../lib/service/status');

describe('service', function () {
  let s;
  let st;
  let reqTimeout;
  let reqResponse;
  const timeout = 200;

  beforeEach(function () {
    st = [];
    reqResponse = 'response';
    reqTimeout = 1;

    s = service({
      timeout,
      interval: 10,
      penaltyInterval: 20,
      maxPoints: 10,
      request(url, req, fn) {
        req = setTimeout(function () {
          fn(undefined, reqResponse);
        }, reqTimeout);
        req.abort = function () {};
        return req;
      },
      status() {
        return st.shift() || status.success;
      },
      prepareRequest(query) {
        return query;
      },
      processResponse(response) {
        return response;
      },
      skip() {}
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
      setTimeout(done, Math.max(timeout, reqTimeout));
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
      setTimeout(done, Math.max(timeout, reqTimeout));
    });
  });

  it('no points', function (done) {
    s(3, [{}], [], function (err, trueValue, id, query, result) {
      should.not.exist(err);
      trueValue.should.equal(true);
      result.should.have.length(0);
      done();
    });
  });

  it('one point', function (done) {
    s(4, [{
      points: [[0, 0]]
    }], [], function (err, trueValue, id, query, result) {
      should.not.exist(err);
      trueValue.should.equal(true);
      result.should.have.length(0);
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
      setTimeout(done, Math.max(timeout, reqTimeout));
    });
  });

  it('abort', function (done) {
    let aborted;
    reqTimeout = 2 * timeout;
    s(6, [{
      points: [[0, 0], [1, 1]]
    }], [], function (err, trueValue, id, query, result) {
      should.not.exist(err);
      trueValue.should.equal(true);
      query.should.have.length(1);
      result.should.have.length(0);
      aborted = true;
    });
    setTimeout(function () {
      s.abort(6);
      setTimeout(function () {
        aborted.should.equal(true);
        setTimeout(done, Math.max(timeout, reqTimeout));
      }, 1);
    }, 1);
  });

  it('abort on second phase', function (done) {
    let aborted;
    reqTimeout = timeout / 2 + 2;
    reqResponse = undefined;
    st = [status.empty];
    s(7, [{
      points: [[0, 0], [1, 1], [2, 2]]
    }], [], function (err, trueValue, id, query, result) {
      should.not.exist(err);
      trueValue.should.equal(true);
      query.should.have.length(2);
      query[0].points.should.have.length(2);
      result.should.have.length(2);
      should.not.exist(result[0]);
      aborted = true;
    });
    setTimeout(function () {
      s.abort(7);
      setTimeout(function () {
        aborted.should.equal(true);
        setTimeout(done, Math.max(timeout, reqTimeout));
      }, 1);
    }, timeout);
  });
});
