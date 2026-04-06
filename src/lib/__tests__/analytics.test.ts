import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearPendingSignup,
  consumePendingSignup,
  rememberPendingSignup,
  trackAuthViewed,
  trackMagicLinkSent,
} from '../analytics';

function createStorage() {
  const store = new Map<string, string>();

  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => {
      store.clear();
    }),
  };
}

describe('analytics pending signup helpers', () => {
  const localStorage = createStorage();

  beforeEach(() => {
    vi.stubGlobal('__DEV__', false);
    vi.stubGlobal('window', {
      dataLayer: [{ event: 'gtm.js' }],
      localStorage,
    });

    localStorage.clear();
    vi.clearAllMocks();
  });

  it('stores and consumes pending signup context exactly once', () => {
    rememberPendingSignup('password');

    expect(consumePendingSignup()).toBe('password');
    expect(consumePendingSignup()).toBeNull();
  });

  it('clears pending signup context explicitly', () => {
    rememberPendingSignup('magic_link');
    clearPendingSignup();

    expect(consumePendingSignup()).toBeNull();
  });
});

describe('analytics funnel events', () => {
  const localStorage = createStorage();

  beforeEach(() => {
    vi.stubGlobal('__DEV__', false);
    vi.stubGlobal('window', {
      dataLayer: [{ event: 'gtm.js' }],
      localStorage,
    });

    localStorage.clear();
    vi.clearAllMocks();
  });

  it('tracks auth page views with explicit route context', () => {
    trackAuthViewed({ mode: 'signup', route: '/signup' });

    expect(window.dataLayer?.at(-1)).toEqual({
      event: 'auth_viewed',
      mode: 'signup',
      route: '/signup',
    });
  });

  it('tracks magic link sends as a separate event from sign_up', () => {
    trackMagicLinkSent({ mode: 'signup' });

    expect(window.dataLayer?.at(-1)).toEqual({
      event: 'magic_link_sent',
      mode: 'signup',
    });
  });
});
