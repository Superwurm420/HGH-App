export type ApiErrorDetails = {
  message: string;
  statusCode: number | null;
};

type ApiErrorPayload = {
  error?: string;
};

export function formatApiStatus(response: Response): string {
  return `${response.status}${response.statusText ? ` ${response.statusText}` : ''}`;
}

export async function parseApiError(response: Response): Promise<ApiErrorDetails> {
  try {
    const payload = (await response.json()) as ApiErrorPayload;
    const errorText = typeof payload.error === 'string' && payload.error.trim().length > 0
      ? payload.error.trim()
      : 'Unbekannter Serverfehler.';

    return {
      message: `${response.status} ${errorText}`,
      statusCode: response.status,
    };
  } catch {
    return {
      message: `${response.status} Serverfehler: Ungültige Fehlerantwort vom Server.`,
      statusCode: response.status,
    };
  }
}

export function parseRequestFailure(error: unknown): ApiErrorDetails {
  if (error instanceof TypeError) {
    return {
      message: 'Verbindungsfehler: Server nicht erreichbar.',
      statusCode: null,
    };
  }

  if (error instanceof SyntaxError) {
    return {
      message: 'Serverfehler: Ungültige Serverantwort.',
      statusCode: null,
    };
  }

  return {
    message: 'Serverfehler: Unbekannter Fehler bei der Verarbeitung der Antwort.',
    statusCode: null,
  };
}
