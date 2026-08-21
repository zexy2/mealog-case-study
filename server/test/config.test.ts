import { describe, expect, it } from 'vitest';

import { Settings, _truthy, settings } from '../src/config';

describe('Settings', () => {
  it('matches Python defaults for an offline environment', () => {
    const value = new Settings({}).validated();

    expect(value.vision_provider).toBe('fixture');
    expect(value.gemini_api_key).toBeNull();
    expect(value.default_locale).toBe('en_US');
    expect(value.log_level).toBe('INFO');
    expect(value.commercial_mode).toBe(false);
  });

  it('accepts only the explicit truthy spellings', () => {
    expect(['1', 'true', 'YES', 'on'].map(_truthy)).toEqual([true, true, true, true]);
    expect([undefined, '', '0', 'enabled'].map(_truthy)).toEqual([false, false, false, false]);
  });

  it('fails validation when Gemini is selected without a key', () => {
    expect(() => new Settings({ VISION_PROVIDER: 'gemini' }).validated()).toThrow(
      'VISION_PROVIDER=gemini requires GEMINI_API_KEY',
    );
  });

  it('validates exported settings during module initialization', () => {
    expect(settings).toBeInstanceOf(Settings);
    expect(settings.validated()).toBe(settings);
  });
});
