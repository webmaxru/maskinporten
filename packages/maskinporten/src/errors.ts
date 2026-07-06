export class MaskinportenError extends Error {
  readonly code?: string;
  readonly description?: string;
  readonly status?: number;

  constructor(message: string, options: { code?: string; description?: string; status?: number } = {}) {
    super(message);
    this.name = 'MaskinportenError';
    this.code = options.code;
    this.description = options.description;
    this.status = options.status;
  }
}

const isErrorBody = (value: unknown): value is { error?: unknown; error_description?: unknown } =>
  typeof value === 'object' && value !== null && ('error' in value || 'error_description' in value);

export const errorFromResponse = async (response: Response): Promise<MaskinportenError> => {
  const text = await response.text();
  let code: string | undefined;
  let description: string | undefined;

  if (text.length > 0) {
    try {
      const parsed: unknown = JSON.parse(text);
      if (isErrorBody(parsed)) {
        code = typeof parsed.error === 'string' ? parsed.error : undefined;
        description =
          typeof parsed.error_description === 'string' ? parsed.error_description : undefined;
      }
    } catch {
      description = text;
    }
  }

  const reason = description ?? response.statusText;
  return new MaskinportenError(`Maskinporten request failed (${response.status}): ${reason}`, {
    code,
    description,
    status: response.status,
  });
};

export const asMaskinportenError = (error: unknown, fallback: string): MaskinportenError => {
  if (error instanceof MaskinportenError) {
    return error;
  }

  const message = error instanceof Error ? error.message : fallback;
  return new MaskinportenError(message);
};
