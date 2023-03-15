module.exports = tagRoute;

function splitSegment(result, length) {
  const { segments, seg } = result;
  const { distance, duration, path } = segments[seg];
  if (length <= 0 || length + 1 >= path.length) {
    return;
  }
  const factor = length / path.length;
  segments.splice(seg, 0, {
    distance: distance * factor,
    duration: duration * factor,
    path: path?.slice(0, length + 1)
  });
  segments[seg + 1].distance -= segments[seg].distance;
  segments[seg + 1].duration -= segments[seg].duration;
  segments[seg + 1].path = path?.slice(length);
  result.running += length;
  result.seg += 1;
}

function extractRouteType(result, [from, to, type]) {
  const { segments, types, updateSegment } = result;
  if (!types[type]) {
    return result;
  }
  while (result.running + segments[result.seg].path.length - 1 <= from) {
    result.running += segments[result.seg].path.length - 1;
    result.seg += 1;
  }
  const { running } = result;
  splitSegment(result, from - running);
  let { seg } = result;
  splitSegment(result, to - from);
  updateSegment(segments[seg]);
  result.foundType = true;
  if (result.seg === seg) {
    while (result.running + segments[seg].path.length < to) {
      const { length } = segments[seg].path;
      from += length - 1;
      result.running += length - 1;
      result.seg += 1;
      seg = result.seg;
      splitSegment(result, to - from);
      updateSegment(segments[seg]);
    }
  }
  return result;
}

function tagRoute(tagSegments, params) {
  params.seg = params.running = 0;
  return tagSegments?.reduce(extractRouteType, params);
}
