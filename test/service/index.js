const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const service = require('../../lib/service');
const status = require('../../lib/service/status');
const util = require('../../lib/service/util');

describe('service', () => {
  let s;
  let st;
  let reqTimeout;
  let reqResponse;
  const timeout = 200;

  beforeEach(() => {
    st = [];
    reqResponse = 'response';
    reqTimeout = 1;

    s = service({
      timeout,
      interval: 10,
      penaltyInterval: 20,
      maxPoints: 10,
      async request() {
        await util.timeout(reqTimeout);
        return { response: reqResponse };
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
    }).operation;
  });

  it('success', async () => {
    const result = await s({
      points: [
        [0, 0],
        [1, 1]
      ]
    });
    assert.equal(result, 'response');
  });

  it('request later', async () => {
    st = [status.error];
    const result = await s({
      points: [
        [0, 0],
        [1, 1]
      ]
    });
    assert.equal(result, 'response');
  });

  it('cascade to next service', async () => {
    reqResponse = undefined;
    const result = await s({
      points: [
        [0, 0],
        [1, 1]
      ]
    });
    assert.equal(result, undefined);
  });
});
