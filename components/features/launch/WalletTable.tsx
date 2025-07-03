"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import WalletRow from "./WalletRow";
import { Wallet } from "@/app/(protected)/(confirmed)/new-launch/page";
import { toast } from "sonner";

export default function WalletTable({
  wallets,
  selectedWallets,
  setSelectedWallets,
}: {
  wallets: Wallet[];
  selectedWallets: string[];
  setSelectedWallets: (wallets: string[]) => void;
  setWallets: (wallets: Wallet[]) => void;
}) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Select</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Private Key</TableHead>
            <TableHead>SOL Balance</TableHead>
            <TableHead>ATAs</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {wallets.length > 0 ? (
            wallets.map((wallet) => (
              <WalletRow
                key={wallet.address}
                wallet={wallet}
                isSelected={selectedWallets.includes(wallet.address)}
                onSelectChange={(checked) => {
                  if (checked) {
                    setSelectedWallets([...selectedWallets, wallet.address]);
                  } else {
                    setSelectedWallets(
                      selectedWallets.filter((addr) => addr !== wallet.address)
                    );
                  }
                }}
                onTransfer={(amount) => {
                  const otherWallets = wallets.filter(
                    (w) => w.address !== wallet.address
                  );
                  if (otherWallets.length > 0) {
                    console.log(
                      `Transfer ${amount} SOL to ${otherWallets[0].address}`
                    );
                    toast.success(
                      `Transferred ${amount} SOL to ${otherWallets[0].address}`
                    );
                  }
                }}
              />
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center">
                No wallets added yet
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}