import type { ErrorEvent, ServerEvent } from '../messages';

const LOCAL_ALLOWED_ORIGINS = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

function readConfiguredOrigins(value: string | undefined): Set<string> {
  if (!value) {
    return new Set();
  }

  return new Set(
    value
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

function isPreviewVercelHostname(hostname: string): boolean {
  return hostname.startsWith('psyblr-') && hostname.endsWith('.vercel.app');
}

function isAllowedOrigin(origin: string, configuredOrigins: Set<string>): boolean {
  if (LOCAL_ALLOWED_ORIGINS.has(origin)) {
    return true;
  }

  if (configuredOrigins.has(origin)) {
    return true;
  }

  try {
    const url = new URL(origin);
    return url.protocol === 'https:' && (url.hostname === 'psyblr.vercel.app' || isPreviewVercelHostname(url.hostname));
  } catch {
    return false;
  }
}

export function applyCorsHeaders(
  response: Response,
  request: Request,
  corsAllowedOrigins?: string,
): Response {
  const origin = request.headers.get('origin');
  const configuredOrigins = readConfiguredOrigins(corsAllowedOrigins);

  if (!origin || !isAllowedOrigin(origin, configuredOrigins)) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.set('access-control-allow-origin', origin);
  headers.set('access-control-allow-methods', 'GET,POST,OPTIONS');
  headers.set('access-control-allow-headers', 'content-type');
  headers.set('access-control-max-age', '86400');
  headers.set('vary', 'Origin');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function corsPreflightResponse(request: Request, corsAllowedOrigins?: string): Response {
  const response = new Response(null, {
    status: 204,
  });

  return applyCorsHeaders(response, request, corsAllowedOrigins);
}

export async function readJson<T>(request: Request): Promise<T> {
  return (await request.json()) as T;
}

export function jsonResponse(body: ServerEvent | Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
  });
}

export function errorResponse(status: number, code: string, message: string): Response {
  const body: ErrorEvent = {
    type: 'error',
    code,
    message,
  };

  return jsonResponse(body, status);
}
