"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import WalletActions from "./WalletActions";
import WalletTable from "./WalletTable";
import { Wallet } from "@/app/(protected)/(confirmed)/new-launch/page";

export default function WalletManager({
  wallets,
  setWallets,
}: {
  wallets: Wallet[];
  setWallets: (wallets: Wallet[]) => void;
}) {
  const [selectedWallets, setSelectedWallets] = useState<string[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (wallets.length > 0) {
        console.log("Updating wallet balances and ATAs");
        toast.info("Updated wallet balances");
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [wallets]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wallet Manager</CardTitle>
      </CardHeader>
      <CardContent>
        <WalletActions
          wallets={wallets}
          selectedWallets={selectedWallets}
          setWallets={setWallets}
          setSelectedWallets={setSelectedWallets}
        />
        <WalletTable
          wallets={wallets}
          selectedWallets={selectedWallets}
          setSelectedWallets={setSelectedWallets}
          setWallets={setWallets}
        />
      </CardContent>
    </Card>
  );
}