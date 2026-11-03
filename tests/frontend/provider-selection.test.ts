import { describe, expect, it } from 'vitest';
import { resolveProviderSelection } from '../../src/lib/provider-selection';

const providers = [{ name: 'gemini' }, { name: 'ollama' }];

describe('resolveProviderSelection', () => {
  it('keeps an available preference', () => {
    expect(resolveProviderSelection(providers, 'ollama')).toBe('ollama');
  });

  it('falls back to the first available provider', () => {
    expect(resolveProviderSelection(providers, 'missing')).toBe('gemini');
  });

  it('preserves the preference until providers are available', () => {
    expect(resolveProviderSelection([], 'ollama')).toBe('ollama');
  });
});
