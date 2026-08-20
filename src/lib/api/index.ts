/**
 * API Client Modules
 * 
 * Organized by domain/feature area, matching backend OpenAPI spec.
 * All modules use the centralized apiCall() from client.ts for:
 * - Base URL configuration
 * - JWT token injection
 * - Error handling
 * - Request/response typing
 */

// Core client
export { apiCall, buildUrl, getStoredToken, clearStoredToken } from './client';

// Domain modules
export * as auth from './auth';
export * as user from './user';
export * as dictionary from './dictionary';
export * as transcription from './transcription';
export * as manga from './manga';
export * as flashcard from './flashcard';
export * as monitor from './monitor';
export * as webnovel from './webnovel';
export * as proxy from './proxy';

// Re-export commonly used types
export type { components, operations } from './types.gen';
