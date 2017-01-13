var should = require('should');
var util = require('../../lib/service/util');

describe('util', function () {
  it('splitPoints', function () {
    var query, segments;

    segments = util.splitPoints({}, 10);
    should.not.exist(segments);

    query = {
      points: new Array(2)
    };
    segments = util.splitPoints(query, 10);
    segments.should.equal(query);

    query = {
      points: new Array(11),
      opt: true
    };
    segments = util.splitPoints(query, 10);
    segments.should.have.length(2);
    segments[0].should.have.property('points').with.length(10);
    segments[0].should.have.property('opt', true);
    segments[1].should.have.property('points').with.length(2);
    segments[1].should.have.property('opt', true);

    query = {
      points: new Array(22),
      opt: true
    };
    segments = util.splitPoints(query, 10);
    segments.should.have.length(3);
    segments[0].should.have.property('points').with.length(10);
    segments[0].should.have.property('opt', true);
    segments[1].should.have.property('points').with.length(10);
    segments[1].should.have.property('opt', true);
    segments[2].should.have.property('points').with.length(4);
    segments[2].should.have.property('opt', true);
  });
});
