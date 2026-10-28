import { afterEach, describe, expect, it } from 'vitest';
import { rememberIdentity, resolveIdentity } from './identityStore';

describe('identityStore', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('resolves a remembered user to their email', () => {
    rememberIdentity('user-1', 'ada@example.com');

    expect(resolveIdentity('user-1')).toEqual({
      type: 'user',
      userId: 'user-1',
      email: 'ada@example.com',
    });
  });

  it('treats an unknown customer id as anonymous', () => {
    expect(resolveIdentity('anonymous-1')).toEqual({
      type: 'anonymous',
      customerId: 'anonymous-1',
    });
  });

  it('ignores corrupt storage', () => {
    localStorage.setItem('gshop:knownIdentities', '{not json');

    expect(resolveIdentity('user-1')).toEqual({
      type: 'anonymous',
      customerId: 'user-1',
    });
  });
});
