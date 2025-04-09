const fetchagent = require('fetchagent');
const { pathType } = require('../model');
const makeLimiter = require('limiter-component');
const status = require('./status');
const makeSimplify = require('./simplify');
const debug = require('debug')('furkot:directions:service');

module.exports = init;

const limiters = {};

const ERROR = 'input error';

function init(options) {
  options = {
    interval: 340,
    penaltyInterval: 2000,
    limiter: limiters[options.name],
    request,
    operation,
    ...options
  };
  options.url = initUrl(options.url);
  limiters[options.name] = options.limiter || makeLimiter(options.interval, options.penaltyInterval);
  const limiter = limiters[options.name];
  const simplify = makeSimplify(options);
  return options;

  async function operation(query) {
    const { maxPoints } = options;
    const { points } = query;
    if (points.length > maxPoints) {
      debug('Can only query %d points', maxPoints);
      query = {
        ...query,
        points: points.slice(0, maxPoints)
      };
    }
    return queryDirections(query);
  }

  async function queryDirections(query) {
    if (!query) {
      throw ERROR;
    }

    query.path = query.path || pathType.none;
    let req = options.prepareRequest(query);
    if (!req) {
      return;
    }
    if (req === true) {
      req = undefined;
    }

    await limiter.trigger();
    const { status: err, response } = await options.request(options.url(query), req);
    let st = options.status(err, response);
    if (st === undefined) {
      // shouldn't happen (bug or unexpected response format)
      // treat it as no route
      st = status.empty;
    }
    if (st === status.failure) {
      // don't ever ask again
      options.skip = () => true;
      return;
    }
    if (st === status.error) {
      // try again later
      limiter.penalty();
      return queryDirections(query);
    }
    if (st === status.empty) {
      return;
    }

    const res = options.processResponse(response, query);
    if (res) {
      if (!res.pathReady && res.routes && res.segments) {
        simplify(query.path, query.span, res.routes, res.segments);
      }
      if (!query.turnbyturn) {
        delete res.segments;
      }
    }
    return res;
  }
}

async function request(url, req) {
  let fa = fetchagent;
  if (this.post) {
    fa = fa.post(url).send(req);
  } else {
    fa = fa.get(url).query(req);
  }
  if (this.authorization) {
    fa.set('authorization', this.authorization);
  }
  const res = await fa.set('accept', 'application/json').end();
  let status;
  if (!res.ok) {
    status = {
      status: res.status
    };
  }
  return {
    status,
    response: await res.json()
  };
}

function initUrl(url) {
  return typeof url === 'function' ? url : () => url;
}
