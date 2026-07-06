import { errorFromResponse, MaskinportenError } from './errors';

export const stripAltinnQuotedToken = (body: string): string => {
  const trimmed = body.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    const parsed: unknown = JSON.parse(trimmed);
    if (typeof parsed === 'string') {
      return parsed;
    }
  }
  return trimmed;
};

export const exchangeMaskinportenTokenToAltinn = async (
  exchangeUrl: string,
  maskinportenToken: string,
): Promise<string> => {
  const response = await fetch(exchangeUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${maskinportenToken}`,
    },
  });

  if (!response.ok) {
    throw await errorFromResponse(response);
  }

  const token = stripAltinnQuotedToken(await response.text());
  if (!token) {
    throw new MaskinportenError('Altinn token exchange returned an empty token.', {
      status: response.status,
    });
  }
  return token;
};
