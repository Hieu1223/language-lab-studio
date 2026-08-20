// Proxy endpoint (from OpenAPI spec).
import { apiCall } from './client';

export interface ProxyParams {
  url: string;
}

/**
 * GET /proxy — fetch a remote URL server-side and return its response.
 * 
 * Uses plain requests (no configured HTTP_PROXY). The backend explicitly
 * bypasses any HTTP_PROXY/HTTPS_PROXY env vars so the request goes out
 * directly from the server.
 */
export async function proxyRequest({ url }: ProxyParams): Promise<unknown> {
  return apiCall<unknown>('/proxy', {
    query: { url },
  });
}
