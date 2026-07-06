export type MockScenario = 'unknown-scope' | 'expired-assertion' | 'clock-skew' | 'extra-claim';

export const mockScenarios = ['unknown-scope', 'expired-assertion', 'clock-skew', 'extra-claim'] as const;

export const isMockScenario = (value: string | null | undefined): value is MockScenario =>
  mockScenarios.includes(value as MockScenario);
