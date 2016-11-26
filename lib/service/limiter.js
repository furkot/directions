module.exports = initLimiter;

function initLimiter(interval, penaltyInterval) {
  var limiter;

  function getLimiter() {
    if (!limiter) {
        limiter = require('limiter-component')(interval, penaltyInterval);
    }
    return limiter;
  }

  function trigger(fn) {
    getLimiter().trigger(fn);
  }

  function penalty() {
    getLimiter().penalty();
  }

  return {
    trigger: trigger,
    penalty: penalty
  };
}
