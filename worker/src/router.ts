type RouteHandler = (request: Request, params: Record<string, string>) => Promise<Response> | Response;

interface Route {
  method: string;
  pattern: URLPattern;
  handler: RouteHandler;
}

/**
 * Minimaler URL-pattern-basierter Router für Cloudflare Workers.
 */
export class Router {
  private routes: Route[] = [];

  private add(method: string, path: string, handler: RouteHandler): void {
    const pattern = new URLPattern({ pathname: path });
    this.routes.push({ method, pattern, handler });
  }

  get(path: string, handler: RouteHandler): void {
    this.add('GET', path, handler);
  }

  post(path: string, handler: RouteHandler): void {
    this.add('POST', path, handler);
  }

  put(path: string, handler: RouteHandler): void {
    this.add('PUT', path, handler);
  }

  delete(path: string, handler: RouteHandler): void {
    this.add('DELETE', path, handler);
  }

  options(path: string, handler: RouteHandler): void {
    this.add('OPTIONS', path, handler);
  }

  async handle(request: Request): Promise<Response | null> {
    const url = new URL(request.url);

    for (const route of this.routes) {
      if (route.method !== request.method) continue;
      const match = route.pattern.exec({ pathname: url.pathname });
      if (!match) continue;

      const params: Record<string, string> = {};
      const groups = match.pathname.groups;
      for (const [key, value] of Object.entries(groups)) {
        if (value !== undefined) params[key] = value;
      }

      try {
        return await route.handler(request, params);
      } catch (error) {
        console.error(`[Router] Fehler bei ${request.method} ${url.pathname}:`, error);
        return jsonResponse({ error: 'Interner Serverfehler' }, 500);
      }
    }

    return null;
  }
}

export function jsonResponse(data: unknown, status = 200, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...headers,
    },
  });
}

export function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}
