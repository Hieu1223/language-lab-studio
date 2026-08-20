import { useEffect, useState } from 'react';
import type { DeviceType } from '../lib/device-detection';

interface DeviceRouterProps {
  pcComponent: React.ComponentType;
  mobileComponent: React.ComponentType;
}

/**
 * Renders different components based on device type (mobile vs PC)
 */
export function DeviceRouter({ pcComponent: PcComponent, mobileComponent: MobileComponent }: DeviceRouterProps) {
  const [deviceType, setDeviceType] = useState<DeviceType>('pc');

  useEffect(() => {
    // Initial check
    setDeviceType(window.innerWidth < 768 ? 'mobile' : 'pc');
    
    const handler = () => {
      setDeviceType(window.innerWidth < 768 ? 'mobile' : 'pc');
    };
    
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return deviceType === 'mobile' ? <MobileComponent /> : <PcComponent />;
}
