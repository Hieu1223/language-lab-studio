/**
 * Device detection utilities for responsive UI routing
 */

export type DeviceType = 'mobile' | 'pc';

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
}

export function getDeviceType(): DeviceType {
  return isMobileDevice() ? 'mobile' : 'pc';
}

export function onDeviceChange(callback: (deviceType: DeviceType) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  
  const handler = () => callback(getDeviceType());
  window.addEventListener('resize', handler);
  return () => window.removeEventListener('resize', handler);
}
