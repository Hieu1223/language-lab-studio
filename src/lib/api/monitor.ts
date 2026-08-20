// Monitoring endpoint
// Matches: /monitor/* routes from OpenAPI spec
import { apiCall } from './client';
import type { components } from './types.gen';

// ─── Types ──────────────────────────────────────────────────────────────────

export type ServerMonitorResponse = components['schemas']['ServerMonitorResponse'];
export type CpuInfo = components['schemas']['CpuInfo'];
export type MemoryInfo = components['schemas']['MemoryInfo'];
export type ProcessInfo = components['schemas']['ProcessInfo'];

// ─── Monitor ────────────────────────────────────────────────────────────────

/** GET /monitor/ — Get server CPU/memory/process stats */
export async function getServerMonitor(): Promise<ServerMonitorResponse> {
  return apiCall<ServerMonitorResponse>('/monitor/');
}
