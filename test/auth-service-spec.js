var expect = require('chai').expect;

var service = process.env.URL || require('../auth_service');

describe('auth_service', function () {
  it('should load', function () {
    expect(process.env.NODE_ENV).to.equal('test');
    expect(service).to.not.equal(undefined);
  });
  it('should be an express app', function () {
    expect(typeof service.listen).to.equal('function');
  });
});
