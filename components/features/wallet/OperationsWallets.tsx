import React, { useState } from 'react';
import { 
  RefreshCw, Coins, CheckSquare, Square, ArrowDownAZ, ArrowUpAZ, 
  Wallet, Share2, Network, Send, HandCoins, DollarSign
} from 'lucide-react';
import { Connection } from '@solana/web3.js';
import { saveWalletsToCookies } from '@/lib/utils/Utils';
import { DistributeModal } from '../modals/DistributeModal';
import { ConsolidateModal } from '../modals/ConsolidateModal';
import { TransferModal } from '../modals/TransferModal';
import { DepositModal } from '../modals/DepositModal';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip';
import { Button } from '../../ui/button';
import { Wallet as WalletType } from '@/lib/types/wallet';

interface WalletOperationsButtonsProps {
  wallets: WalletType[];
  solBalances: Map<string, number>;
  connection: Connection;
  tokenBalances: Map<string, number>;
  handleRefresh: () => void;
  isRefreshing: boolean;
  showingTokenWallets: boolean;
  handleBalanceToggle: () => void;
  setWallets: React.Dispatch<React.SetStateAction<WalletType[]>>;
  sortDirection: string;
  handleSortWallets: () => void;
  setIsModalOpen: (open: boolean) => void;
}

type OperationTab = 'distribute' | 'consolidate' | 'transfer' | 'deposit';

export const WalletOperationsButtons: React.FC<WalletOperationsButtonsProps> = ({
  wallets,
  solBalances,
  connection,
  tokenBalances,
  handleRefresh,
  isRefreshing,
  showingTokenWallets,
  handleBalanceToggle,
  setWallets,
  sortDirection,
  handleSortWallets,
  setIsModalOpen
}) => {
  const [activeModal, setActiveModal] = useState<OperationTab | null>(null);
  
  // Check if all wallets are active
  const allWalletsActive = wallets.every(wallet => wallet.isActive);

  // Function to toggle all wallets
  const toggleAllWalletsHandler = () => {
    setWallets(prev => {
      const allActive = prev.every(wallet => wallet.isActive);
      const newWallets = prev.map(wallet => ({
        ...wallet,
        isActive: !allActive
      }));
      saveWalletsToCookies(newWallets);
      return newWallets;
    });
  };

  // Function to open a specific modal
  const openModal = (modal: OperationTab) => {
    setActiveModal(modal);
  };
  
  // Function to close the active modal
  const closeModal = () => {
    setActiveModal(null);
  };

  // Primary action buttons
  const primaryActions = [
    {
      icon: <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />,
      tooltip: "Refresh balances",
      onClick: handleRefresh,
      disabled: isRefreshing
    },
    {
      icon: showingTokenWallets ? <Coins size={14} /> : <DollarSign size={14} />,
      tooltip: showingTokenWallets ? "Show SOL balances" : "Show token balances",
      onClick: handleBalanceToggle
    },
    {
      icon: allWalletsActive ? <Square size={14} /> : <CheckSquare size={14} />,
      tooltip: allWalletsActive ? "Deselect all wallets" : "Select all wallets",
      onClick: toggleAllWalletsHandler
    },
    {
      icon: sortDirection === 'asc' ? <ArrowDownAZ size={14} /> : <ArrowUpAZ size={14} />,
      tooltip: "Sort wallets",
      onClick: handleSortWallets
    }
  ];

  // Operation buttons
  const operations = [
    {
      icon: <Wallet size={14} />,
      label: "Wallets",
      tooltip: "Manage wallets",
      onClick: () => setIsModalOpen(true)
    },
    {
      icon: <Share2 size={14} />,
      label: "Distribute",
      tooltip: "Distribute SOL",
      onClick: () => openModal('distribute')
    },
    {
      icon: <Network size={14} />,
      label: "Consolidate",
      tooltip: "Consolidate SOL",
      onClick: () => openModal('consolidate')
    },
    {
      icon: <Send size={14} />,
      label: "Transfer",
      tooltip: "Transfer assets",
      onClick: () => openModal('transfer')
    },
    {
      icon: <HandCoins size={14} />,
      label: "Deposit",
      tooltip: "Deposit SOL",
      onClick: () => openModal('deposit')
    }
  ];

  return (
    <>
      <DistributeModal
        isOpen={activeModal === 'distribute'}
        onClose={closeModal}
        wallets={wallets}
        solBalances={solBalances}
        connection={connection}
      />
     
      <ConsolidateModal
        isOpen={activeModal === 'consolidate'}
        onClose={closeModal}
        wallets={wallets}
        solBalances={solBalances}
        connection={connection}
      />
     
      <TransferModal
        isOpen={activeModal === 'transfer'}
        onClose={closeModal}
        wallets={wallets}
        solBalances={solBalances}
        connection={connection}
      />
     
      <DepositModal
        isOpen={activeModal === 'deposit'}
        onClose={closeModal}
        wallets={wallets}
        solBalances={solBalances}
        connection={connection}
      />

      <div className="w-full mb-4">
          <div className="flex flex-wrap gap-2">
            {/* Primary actions */}
            {wallets.length === 0 ? (
              <Button 
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-1"
              >
                <Wallet size={14} />
                <span>Add Wallets</span>
              </Button>
            ) : (
              <>
                {primaryActions.map((action, index) => (
                  <Tooltip key={`primary-${index}`}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={action.onClick}
                        disabled={action.disabled}
                        className="p-2 h-8 w-8"
                      >
                        {action.icon}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>{action.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
                
                {/* Operations */}
                {operations.map((op, index) => (
                  <Tooltip key={`operation-${index}`}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={op.onClick}
                        className="flex items-center gap-1"
                      >
                        {op.icon}
                        <span>{op.label}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>{op.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </>
            )}
          </div>
      </div>
    </>
  );
};