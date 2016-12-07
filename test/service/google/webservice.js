var _cloneDeep = require('lodash.clonedeep');
var should = require('should');
var model = require('../../../lib/model');

var response;
var directions = require('../../../lib/service/google/webservice')({
  check: function () {
    return true;
  },
  request: function (url, req, fn) {
    fn(undefined, {
      body: response
    });
  }
});

describe('google WS directions', function () {

  it('test', function (done) {
    var query, result = [];

    response = require('./fixtures/googlews');

    query = _cloneDeep(model.directionsQuery);
    query[0].points = [
      [response.routes[0].legs[0].start_location.lng, response.routes[0].legs[0].start_location.lat],
      [response.routes[0].legs[0].end_location.lng, response.routes[0].legs[0].end_location.lat]
    ];
    query[0].begin = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().substr(0, 16);
    directions(query, result, function (err, value, query, result) {
      should.not.exist(err);
      value.should.equal(false);
      should.exist(result);
      result.should.have.length(1);
      result[0].should.have.property('query');
      result[0].query.should.deepEqual(query[0]);
      result[0].should.have.property('name', 'Glacier Point Rd');
      result[0].should.have.property('places').with.length(2);
      result[0].places.should.deepEqual([
        '5105 Glacier Point Rd, California 95389, USA',
        'Glacier Point Rd, Yosemite Village, CA 95389, USA'
      ]);
      result[0].should.have.property('routes').with.length(1);
      result[0].routes[0].should.have.property('duration', 705);
      result[0].routes[0].should.have.property('distance', 12139);
      result[0].routes[0].should.have.property('path').with.length(189);
      result[0].routes[0].should.have.property('segmentIndex', 0);
      result[0].should.have.property('segments').with.length(1);
      result[0].segments[0].should.have.property('duration', 705);
      result[0].segments[0].should.have.property('distance', 12139);
      result[0].segments[0].should.have.property('path').with.length(312);
      result[0].segments[0].should.have.property('instructions',
        'Head <b>northeast</b> on <b>Glacier Point Rd</b> toward <b>Yosemite National Park Rd</b><div style=\"font-size:0.9em\">May be closed at certain times or days</div><div style=\"font-size:0.9em\">Destination will be on the right</div>');
      done();
    });
  });
});
