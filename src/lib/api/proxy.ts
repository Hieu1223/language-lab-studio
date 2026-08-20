// Proxy endpoint
// Matches: /proxy route from OpenAPI spec
import { apiCall } from './client';

/** GET /proxy — Fetch remote URL server-side (prevents SSRF) */
export async function proxyRequest(url: string): Promise<unknown> {
  return apiCall<unknown>('/proxy', {
    query: { url },
  });
}
