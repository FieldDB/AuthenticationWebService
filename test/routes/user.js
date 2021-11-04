const { expect } = require('chai');

const user = require('../../routes/user');

describe('routes/user', () => {
  it('should load', () => {
    expect(user).to.be.a('object');
    expect(user.getUser).to.be.a('object');
    expect(user.getList).to.be.a('object');
  });
});
