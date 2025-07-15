'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  saveTokenAddressToCookies,
  loadTokenAddressFromCookies,
  removeTokenAddressFromCookies
} from '@/lib/utils/Utils';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [tokenAddress, setTokenAddress] = useState(() => loadTokenAddressFromCookies());
  const [tickEffect, setTickEffect] = useState(false);

  const handleTokenAddressChange = (address: string) => {
    setTokenAddress(address);
    if (address.trim()) {
      saveTokenAddressToCookies(address);
    } else {
      removeTokenAddressFromCookies();
    }
  };

  return (
    <div>
      <nav className=" container mx-auto relative z-20 mb-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder="TOKEN ADDRESS"
              value={tokenAddress}
              onChange={(e) => handleTokenAddressChange(e.target.value)}
              className="w-full "
            />
            <div className="absolute right-3 top-3 text-muted-foreground text-xs font-mono">SOL</div>
          </div>
          
          {tokenAddress && (
            <Button
              variant="outline"
              onClick={() => handleTokenAddressChange('')}
            >
              <X />
            </Button>
          )}

          {/*<Button
            variant="outline"
            onClick={() => {
              setTickEffect(true);
              setTimeout(() => setTickEffect(false), 500);
              router.push('/wallets');
            }}
          >
            Wallets: <div className={`font-bold text-primary font-mono ${tickEffect ? 'scale-110 transition-transform' : 'transition-transform'}`}>
              {children.props.walletCount}
            </div>
          </Button>*/}
        </div>
      </nav>
      
      {children}
    </div>
  );
}