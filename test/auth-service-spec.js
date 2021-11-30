const { expect } = require('chai');

// eslint-disable-next-line global-require
const service = process.env.URL || require('../auth_service');

describe('auth_service', () => {
  it('should load', () => {
    expect(process.env.NODE_ENV).to.equal('test');
    expect(service).to.not.equal(undefined);
  });
  it('should be an express app', () => {
    expect(typeof service.listen).to.equal('function');
  });
});
