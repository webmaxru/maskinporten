export interface CachedToken {
  token: string;
  expiresAt: number;
}

export class TokenCache {
  readonly key: string;
  private cached?: CachedToken;
  private inFlight?: Promise<string>;

  constructor(key: string) {
    this.key = key;
  }

  get(now = Date.now()): string | undefined {
    if (this.cached && this.cached.expiresAt > now) {
      return this.cached.token;
    }
    return undefined;
  }

  set(token: string, expiresInSeconds: number, refreshMarginSeconds: number, now = Date.now()): void {
    this.cached = {
      token,
      expiresAt: now + Math.max(0, expiresInSeconds - refreshMarginSeconds) * 1000,
    };
  }

  clear(): void {
    this.cached = undefined;
    this.inFlight = undefined;
  }

  singleFlight(fetchToken: () => Promise<string>): Promise<string> {
    this.inFlight ??= fetchToken().finally(() => {
      this.inFlight = undefined;
    });
    return this.inFlight;
  }
}

export const createTokenCacheKey = (parts: {
  clientId: string;
  scope: string;
  env: string;
  systemUserOrg?: string;
}): string => [parts.clientId, parts.scope, parts.env, parts.systemUserOrg ?? ''].join('|');
