import React, { useState, useEffect, useMemo } from 'react';
import { FintechThemeProvider } from '../fintech/FintechThemeContext';
import { FintechShell } from '../fintech/FintechShell';
import { CommandPalette } from '../fintech/CommandPalette';
import { KycOnboardingModal } from '../fintech/KycOnboardingModal';
import { PropertyDetailModal } from '../fintech/pages/PropertyDetailModal';
import { OverviewTab } from '../fintech/pages/OverviewTab';
import { ExplorerTab } from '../fintech/pages/ExplorerTab';
import { MyPropertiesTab } from '../fintech/pages/MyPropertiesTab';
import { TransactionsTab } from '../fintech/pages/TransactionsTab';
import { IncomeTab } from '../fintech/pages/IncomeTab';
import { DocumentsTab } from '../fintech/pages/DocumentsTab';
import { SettingsTab } from '../fintech/pages/SettingsTab';
import { Property } from '../../types/property';
import { Investment } from '../../types/investment';
import { Transaction } from '../../types/transaction';
import { useAuth } from '../../lib/auth';
import { ledger } from '../../lib/ledger';

export interface DashboardPageProps {
  defaultTab?: string;
  onSelectProperty: (propertyId: string) => void;
  onExploreProperties: () => void;
  onNavigateProfile: () => void;
  onNavigateTransactions: () => void;
  onNavigatePortfolio: () => void;
  onNavigateHome?: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  defaultTab = 'overview',
  onSelectProperty: onSelectPropertyProp,
  onExploreProperties,
  onNavigateProfile,
  onNavigateTransactions,
  onNavigatePortfolio,
  onNavigateHome,
}) => {
  const { user } = useAuth();

  // Normalize default tab
  const normalizeTab = (tab: string) => {
    switch (tab) {
      case 'marketplace':
      case 'explorer':
      case 'properties':
        return 'marketplace';
      case 'my-properties':
      case 'portfolio':
      case 'holdings':
        return 'my-properties';
      case 'transactions':
        return 'transactions';
      case 'income':
      case 'distributions':
      case 'analytics':
        return 'income';
      case 'documents':
        return 'documents';
      case 'settings':
      case 'profile':
      case 'wallet':
        return 'settings';
      default:
        return 'overview';
    }
  };

  const [activeTab, setActiveTab] = useState<string>(() => normalizeTab(defaultTab));
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [kycModalOpen, setKycModalOpen] = useState(false);
  const [selectedPropertyModal, setSelectedPropertyModal] = useState<Property | null>(null);

  // Synchronized state with ledger
  const [properties, setProperties] = useState<Property[]>(() => ledger.getProperties());
  const [investments, setInvestments] = useState<Investment[]>(() => (user?.id ? ledger.getInvestments(user.id) : []));
  const [transactions, setTransactions] = useState<Transaction[]>(() => (user?.id ? ledger.getTransactions(user.id) : []));

  useEffect(() => {
    const syncData = () => {
      setProperties(ledger.getProperties());
      if (user?.id) {
        setInvestments(ledger.getInvestments(user.id));
        setTransactions(ledger.getTransactions(user.id));
      }
    };
    syncData();
    return ledger.subscribe(syncData);
  }, [user?.id]);

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(normalizeTab(defaultTab));
    }
  }, [defaultTab]);

  const handleSelectProperty = (property: Property) => {
    setSelectedPropertyModal(property);
  };

  const handleNavigateTab = (tabId: string) => {
    setActiveTab(normalizeTab(tabId));
  };

  return (
    <FintechThemeProvider>
      <FintechShell
        activeTab={activeTab}
        onNavigateTab={handleNavigateTab}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onOpenKyc={() => setKycModalOpen(true)}
      >
        {/* Render Active View */}
        {activeTab === 'overview' && (
          <OverviewTab
            user={user}
            investments={investments}
            properties={properties}
            transactions={transactions}
            onSelectProperty={handleSelectProperty}
            onNavigateTab={handleNavigateTab}
            onOpenKyc={() => setKycModalOpen(true)}
          />
        )}

        {activeTab === 'marketplace' && (
          <ExplorerTab
            properties={properties}
            onSelectProperty={handleSelectProperty}
          />
        )}

        {activeTab === 'my-properties' && (
          <MyPropertiesTab
            investments={investments}
            properties={properties}
            onSelectProperty={handleSelectProperty}
            onExploreProperties={() => setActiveTab('marketplace')}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionsTab
            transactions={transactions}
          />
        )}

        {activeTab === 'income' && (
          <IncomeTab
            investments={investments}
          />
        )}

        {activeTab === 'documents' && (
          <DocumentsTab />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            onOpenKyc={() => setKycModalOpen(true)}
          />
        )}
      </FintechShell>

      {/* ⌘K Command Palette Modal */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigateTab={handleNavigateTab}
        onSelectProperty={handleSelectProperty}
        properties={properties}
      />

      {/* Full-Screen KYC Onboarding Stepper */}
      <KycOnboardingModal
        isOpen={kycModalOpen}
        onClose={() => setKycModalOpen(false)}
        onSuccess={() => {
          if (user?.id) {
            setInvestments(ledger.getInvestments(user.id));
            setTransactions(ledger.getTransactions(user.id));
          }
        }}
      />

      {/* Property Detail Modal */}
      <PropertyDetailModal
        property={selectedPropertyModal}
        isOpen={!!selectedPropertyModal}
        onClose={() => setSelectedPropertyModal(null)}
        onInvestSuccess={() => {
          if (user?.id) {
            setInvestments(ledger.getInvestments(user.id));
            setTransactions(ledger.getTransactions(user.id));
          }
        }}
      />
    </FintechThemeProvider>
  );
};
