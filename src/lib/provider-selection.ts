export interface ProviderOption {
  name: string;
}

export function resolveProviderSelection(
  providers: ProviderOption[],
  preferred: string,
): string {
  if (providers.some(provider => provider.name === preferred)) return preferred;
  return providers[0]?.name ?? preferred;
}
