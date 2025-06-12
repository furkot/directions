const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const LatLon = require('geodesy/latlon-spherical');
const pathType = require('../../lib/model').pathType;

const simplify = require('../../lib/service/simplify')({
  algorithm(path, num) {
    num = num / 2;
    return path.slice(0, Math.ceil(num)).concat(path.slice(-Math.floor(num)));
  }
});

function distance(path) {
  return path.reduce(
    (result, p) => {
      p = new LatLon(p[1], p[0]);
      result.d += result.p.distanceTo(p);
      result.p = p;
      return result;
    },
    {
      p: new LatLon(path[0][1], path[0][0]),
      d: 0
    }
  ).d;
}

describe('simplify', () => {
  it('path type none', () => {
    const routes = [
      {
        segmentIndex: 0
      }
    ];

    simplify(pathType.none, 1000, routes, [
      {
        path: [[0, 0]]
      }
    ]);
    assert.equal(Object.hasOwn(routes[0], 'path'), false);
  });

  it('path type full', () => {
    const routes = [
      {
        segmentIndex: 0
      }
    ];

    const path = [];
    let i;

    for (i = 0; i < 105; i += 1) {
      path.push([i / 10, i / 10]);
    }
    routes[0].distance = distance(path);

    simplify(pathType.full, 10 * routes[0].distance, routes, [
      {
        path,
        distance: routes[0].distance
      }
    ]);
    assert.deepEqual(routes[0].path, path);
  });

  it('path type smooth with ends', () => {
    const routes = [
      {
        segmentIndex: 0
      }
    ];

    let path = [];

    for (let i = 0; i < 200; i += 1) {
      path.push([i / 10, i / 10]);
    }
    routes[0].distance = distance(path);

    const segments = [
      {
        path: path.slice(0, 30)
      },
      {
        path: path.slice(30, 170)
      },
      {
        path: path.slice(170)
      }
    ];
    segments.forEach(seg => {
      seg.distance = distance(seg.path);
    });
    simplify(pathType.smooth, segments[0].distance, routes, segments);
    assert.strictEqual(routes[0].path.length, 100);
    path = path
      .slice(0, 13)
      .concat(path.slice(18, 30))
      .concat(path.slice(30, 55))
      .concat(path.slice(144, 169))
      .concat(path.slice(169, 182))
      .concat(path.slice(-12));
    assert.deepStrictEqual(routes[0].path, path);
  });

  it('path type smooth single segment', () => {
    const routes = [
      {
        segmentIndex: 0
      }
    ];

    let path = [];
    let i;

    for (i = 0; i < 105; i += 1) {
      path.push([i / 5, i / 5]);
    }
    routes[0].distance = distance(path);

    simplify(pathType.smooth, distance(path.slice(0, 25)), routes, [
      {
        path,
        distance: routes[0].distance
      }
    ]);
    assert.strictEqual(routes[0].path.length, 100);
    path = path.slice(0, 25).concat(path.slice(25, 50)).concat(path.slice(-50, -25)).concat(path.slice(-25));
    assert.deepStrictEqual(routes[0].path, path);
  });

  it('path type smooth no ends', () => {
    const routes = [
      {
        segmentIndex: 0
      }
    ];

    const path = [];
    let i;

    for (i = 0; i < 105; i += 1) {
      path.push([i / 10, i / 10]);
    }
    routes[0].distance = distance(path);

    simplify(pathType.smooth, 10 * routes[0].distance, routes, [
      {
        path,
        distance: routes[0].distance
      }
    ]);
    assert.deepStrictEqual(routes[0].path, path.slice(0, 50).concat(path.slice(-50)));
  });
});
