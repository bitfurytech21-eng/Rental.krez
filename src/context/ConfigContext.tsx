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

const DEFAULT_PLATFORM_CONFIG: PlatformConfig = {
  platformName: "L'Agence Real Estate Platform",
  baseCurrency: 'EUR',
  minInvestment: 750,
  maxInvestmentPerInvestor: 500000,
  tradingEnabled: true,
  depositsEnabled: true,
  withdrawalsEnabled: true,
  maintenanceMode: false,
  announcementBanner: {
    active: false,
    text: '',
    type: 'info'
  },
  kycEnforcement: 'verified_only',
  supportedChains: ['Solana', 'Ethereum', 'Polygon'],
  settlementTimeHours: 24
};

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<PlatformConfig>(DEFAULT_PLATFORM_CONFIG);

  const refreshConfig = async () => {
    try {
      const response = await apiRequest<any>('/config', { skipAuth: true });
      const fetched = response?.data || response;
      if (fetched && typeof fetched === 'object' && 'platformName' in fetched) {
        setConfig((prev) => ({ ...prev, ...fetched }));
      }
    } catch (err) {
      // Retain active config on offline / network initialization
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
