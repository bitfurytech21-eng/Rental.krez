import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '../lib/api';

interface AnnouncementBanner {
  active: boolean;
  text: string;
  type: 'info' | 'warning' | 'success';
}

interface PlatformConfig {
  platformName: string;
  baseCurrency: string;
  minInvestment: number;
  maxInvestmentPerInvestor: number;
  tradingEnabled: boolean;
  depositsEnabled: boolean;
  withdrawalsEnabled: boolean;
  maintenanceMode: boolean;
  announcementBanner: AnnouncementBanner;
  kycEnforcement: string;
  supportedChains: string[];
  settlementTimeHours: number;
}

interface ConfigContextType {
  config: PlatformConfig | null;
  refreshConfig: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<PlatformConfig | null>(null);

  const refreshConfig = async () => {
    try {
      const response = await apiRequest<{ data: PlatformConfig }>('/config', { skipAuth: true });
      setConfig(response.data);
    } catch (err) {
      console.error('Failed to fetch platform config:', err);
    }
  };

  useEffect(() => {
    refreshConfig();
    const interval = setInterval(refreshConfig, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <ConfigContext.Provider value={{ config, refreshConfig }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};
