"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CopyIcon } from "lucide-react";
import { toast } from "sonner";
import { Wallet } from "@/app/(protected)/(confirmed)/new-launch/page";
import { TableCell, TableRow } from "@/components/ui/table";

export default function WalletRow({
  wallet,
  isSelected,
  onSelectChange,
  onTransfer,
}: {
  wallet: Wallet;
  isSelected: boolean;
  onSelectChange: (checked: boolean) => void;
  onTransfer: (amount: number) => void;
}) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <TableRow>
      <TableCell>
        <Checkbox checked={isSelected} onCheckedChange={onSelectChange} />
      </TableCell>
      <TableCell>
        <div className="flex items-center">
          {wallet.address}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 ml-1"
            onClick={() => copyToClipboard(wallet.address)}
          >
            <CopyIcon className="h-3 w-3" />
          </Button>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center">
          ••••••••
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 ml-1"
            onClick={() => copyToClipboard(wallet.privateKey)}
          >
            <CopyIcon className="h-3 w-3" />
          </Button>
        </div>
      </TableCell>
      <TableCell>{wallet.solBalance.toFixed(2)} SOL</TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {wallet.atas.map((ata) => (
            <Badge key={ata} variant="outline" className="text-xs">
              {ata.slice(0, 4)}...{ata.slice(-4)}
            </Badge>
          ))}
        </div>
      </TableCell>
      <TableCell>
        {wallet.isHolder ? (
          <Badge>Holder</Badge>
        ) : (
          <Badge variant="secondary">Other</Badge>
        )}
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onTransfer(0.1)}
          disabled={wallet.solBalance <= 0}
        >
          Transfer SOL
        </Button>
      </TableCell>
    </TableRow>
  );
}