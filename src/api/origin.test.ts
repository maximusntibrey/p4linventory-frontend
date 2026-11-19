import { describe, expect, it } from 'vitest';

import { originOf } from './origin.ts';

const PAGE = 'https://app.example.com';

describe('originOf', () => {
  it('is same origin for empty and relative values', () => {
    expect(originOf(undefined, PAGE)).toBe('');
    expect(originOf('', PAGE)).toBe('');
    expect(originOf('/api/v1', PAGE)).toBe('');
  });
  it('accepts an absolute URL on the page origin', () => {
    expect(originOf('https://app.example.com/api/v1', PAGE)).toBe('');
  });
  it('refuses a cross-origin URL with a clear message', () => {
    expect(() => originOf('https://api.other.com/api/v1', PAGE)).toThrow(
      /Cross-origin API hosting is not supported.*OQ-26/,
    );
  });
});
