// Barrel for the typed API layer. Import domains explicitly
// (`import * as flashcard from '@/lib/api/flashcard'`) when names would clash.
export {
  API_BASE_URL,
  ApiError,
  apiCall,
  buildUrl,
  ping,
  onUnauthorized,
  subscribeNetworkStatus,
  getStoredToken,
  storeToken,
  getStoredRefreshToken,
  storeRefreshToken,
  clearToken,
} from './client';
export type { FieldError, RequestOptions } from './client';

export * as auth from './auth';
export * as user from './user';
export * as dictionary from './dictionary';
export * as transcription from './transcription';
export * as manga from './manga';
export * as flashcard from './flashcard';
export * as webnovel from './webnovel';
export * as proxy from './proxy';
