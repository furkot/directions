var util = require('../../lib/service/util');

describe('util', function () {
  it('splitPoints', function () {
    var legs;

    legs = util.splitPoints([], [], 10);
    legs.should.have.property('maxPoints', 10);
    legs.should.have.property('query').with.length(0);
    legs.should.have.property('result').with.length(0);
    legs.should.have.property('superResult').with.length(0);

    legs = util.splitPoints([{
      points: new Array(2)
    }], [], 10);
    legs.should.have.property('maxPoints', 10);
    legs.should.have.property('query').with.length(1);
    legs.should.have.property('result').with.length(1);
    legs.should.have.property('superResult').with.length(0);

    legs = util.splitPoints([{
      points: new Array(22)
    }], [], 10);
    legs.should.have.property('maxPoints', 10);
    legs.should.have.property('query').with.length(3);
    legs.should.have.property('result').with.length(3);
    legs.should.have.property('superResult').with.length(0);

    legs = util.splitPoints([{}], [], 10);
    legs.should.have.property('error', true);

    legs = util.splitPoints([{
      points: new Array(1)
    }, {
      points: new Array(1)
    }, {
      points: new Array(1)
    }], [], 10);
    legs.should.have.property('error', true);
  });
});
