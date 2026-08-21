import { cpSync, mkdtempSync, readFileSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  CommercialUse,
  LicenseTerm,
  RestrictedPackError,
  available,
  load,
  parse_license,
} from '../src/locales/loader';

const PACK_ROOT = resolve(__dirname, '../../locale_packs');

describe('locale loader', () => {
  it('loads every pack and keeps aliases inside the catalogue', () => {
    expect(available(PACK_ROOT)).toEqual(['en_US', 'ja_JP', 'tr']);

    for (const locale of available(PACK_ROOT)) {
      const pack = load(locale, PACK_ROOT);
      expect(Object.keys(pack.foods).length).toBeGreaterThan(0);
      expect(pack.license).toBeTruthy();
      for (const foodId of Object.keys(pack.aliases)) {
        expect(pack.foods).toHaveProperty(foodId);
      }
    }
  });

  it('maps licence vocabulary and fails closed for unknown values', () => {
    expect(parse_license('public-domain')).toBe(LicenseTerm.PUBLIC_DOMAIN);
    expect(parse_license('RESTRICTED - non-commercial')).toBe(LicenseTerm.UNVERIFIED);
    expect(parse_license(undefined)).toBe(LicenseTerm.UNVERIFIED);
    expect(load('tr', PACK_ROOT).commercial_use).toBe(CommercialUse.PROHIBITED);
    expect(load('ja_JP', PACK_ROOT).commercial_use).toBe(CommercialUse.UNKNOWN);
  });

  it('refuses restricted and unverified packs in commercial mode', () => {
    expect(() => load('tr', PACK_ROOT, { commercial_mode: true })).toThrow(RestrictedPackError);
    expect(() => load('ja_JP', PACK_ROOT, { commercial_mode: true })).toThrow(RestrictedPackError);
    expect(() => load('en_US', PACK_ROOT, { commercial_mode: true })).not.toThrow();
  });

  it('does not let a development cache warm bypass the licence gate', () => {
    expect(load('tr', PACK_ROOT, { commercial_mode: false }).foods).not.toEqual({});
    expect(() => load('tr', PACK_ROOT, { commercial_mode: true })).toThrow(
      'MEALOG_COMMERCIAL_MODE',
    );
  });

  it('treats a pack without a licence as unverified and refuses it commercially', () => {
    const root = makeFixtureRoot('license-missing');
    const packPath = join(root, 'xx_TEST', 'pack.yaml');
    writeFileSync(packPath, 'locale: xx_TEST\ncuisine_bucket: other_mixed\nnutrition_source: hand-typed\n');
    writeFileSync(join(root, 'xx_TEST', 'text_rules.yaml'), '{}\n');

    expect(load('xx_TEST', root).license).toBe(LicenseTerm.UNVERIFIED);
    expect(() => load('xx_TEST', root, { commercial_mode: true })).toThrow(RestrictedPackError);
  });

  it('rebuilds cache when pack content changes, not when mtime changes', () => {
    const root = makeFixtureRoot('content-cache');
    const first = load('xx_TEST', root);
    const foodsPath = join(root, 'xx_TEST', 'foods.jsonl');
    const oldTime = new Date('2020-01-01T00:00:00Z');
    utimesSync(foodsPath, oldTime, oldTime);
    const same = load('xx_TEST', root);
    expect(same).toBe(first);

    const foods = readFileSync(foodsPath, 'utf8').replace('Test food', 'Changed food');
    writeFileSync(foodsPath, foods);

    const rebuilt = load('xx_TEST', root);
    expect(rebuilt).not.toBe(first);
    expect(rebuilt.foods['xx.test'].name).toBe('Changed food');
  });
});

function makeFixtureRoot(label: string): string {
  const root = mkdtempSync(join(tmpdir(), `mealog-${label}-`));
  cpSync(join(PACK_ROOT, 'en_US'), join(root, 'xx_TEST'), { recursive: true });
  const packPath = join(root, 'xx_TEST', 'pack.yaml');
  writeFileSync(
    packPath,
    readFileSync(packPath, 'utf8').replaceAll('en_US', 'xx_TEST').replace('western', 'other_mixed'),
  );
  const foodsPath = join(root, 'xx_TEST', 'foods.jsonl');
  writeFileSync(
    foodsPath,
    readFileSync(foodsPath, 'utf8')
      .split(/\r?\n/)
      .filter(Boolean)
      .slice(0, 1)
      .map((line) => line
        .replace(/"food_id"\s*:\s*"[^"]+"/, '"food_id":"xx.test"')
        .replace(/"name"\s*:\s*"[^"]+"/, '"name":"Test food"'))
      .join('\n') + '\n',
  );
  return root;
}
