// @vitest-environment node
// Version check used by scripts/sync-contract.mjs.
import { describe, expect, it } from 'vitest';

import { compareVersions, readContractVersion } from '../../scripts/sync-contract.mjs';

describe('sync-contract version check', () => {
  it('reads info.version from an OpenAPI 3.1 file', () => {
    expect(readContractVersion('openapi: 3.1.0\ninfo:\n  version: 0.2.0\n')).toBe('0.2.0');
  });
  it('rejects other OpenAPI versions and bad version strings', () => {
    expect(() => readContractVersion('openapi: 3.0.3\ninfo:\n  version: 0.2.0\n')).toThrow(/3\.1/);
    expect(() => readContractVersion('openapi: 3.1.0\ninfo:\n  version: next\n')).toThrow(/MAJOR/);
  });
  it('compares versions numerically', () => {
    expect(compareVersions('0.10.0', '0.9.0')).toBe(1);
    expect(compareVersions('0.2.0', '0.2.0')).toBe(0);
    expect(compareVersions('0.2.0', '1.0.0')).toBe(-1);
  });
});
