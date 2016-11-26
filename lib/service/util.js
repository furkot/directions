var _ = require('lodash');

module.exports = {
  last: last,
  splitPoints: splitPoints
};

function last(arr) {
  return arr[arr.length - 1];
}

function doSplitPoints(result, seg, idx) {
  var i, maxPoints = result.maxPoints;
  if (result.superResult[idx]) {
    result.query.push(seg);
    result.result.push(result.superResult[idx]);
  }
  else if (seg.points.length <= maxPoints) {
    result.query.push(seg);
    result.result.push(undefined);
  }
  else {
    for (i = 0; i < seg.points.length - 1; i += maxPoints - 1) {
      result.query.push(_.defaults({
        points: seg.points.slice(i, i + maxPoints)
      }, seg));
    }
    Array.prototype.push.apply(result.result, new Array(Math.ceil((seg.points.length - 1) / (maxPoints - 1))));
  }
  return result;
}

function splitPoints(query, result, maxPoints) {
  return query.reduce(doSplitPoints, {
    maxPoints: query.maxPoints || maxPoints,
    query: [],
    result: [],
    superResult: result
  });
}
