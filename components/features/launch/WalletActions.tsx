"use client";

import { Button } from "@/components/ui/button";
import { Trash2Icon } from "lucide-react";
import { Wallet } from "@/app/(protected)/(confirmed)/new-launch/page";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function WalletActions({
  wallets,
  selectedWallets,
  setWallets,
  setSelectedWallets,
}: {
  wallets: Wallet[];
  selectedWallets: string[];
  setWallets: (wallets: Wallet[]) => void;
  setSelectedWallets: (wallets: string[]) => void;
}) {
  const [isDisperseDialogOpen, setIsDisperseDialogOpen] = useState(false);
  const [disperseParams, setDisperseParams] = useState({
    totalSol: 0,
    minPerWallet: 0,
    maxPerWallet: 0,
    rounds: 1,
  });

  const handleGenerateWallets = (count: number, type: "holder" | "other") => {
    console.log(`Generating ${count} ${type} wallets`);
    const newWallets: Wallet[] = Array.from({ length: count }, (_, i) => ({
      address: `Generated${type}Address${i}`,
      privateKey: `Generated${type}PrivateKey${i}`,
      solBalance: 0,
      atas: [],
      isHolder: type === "holder",
    }));
    setWallets([...wallets, ...newWallets]);
    toast.success(`Generated ${count} ${type} wallets`);
  };

  const handleImportWallets = (file: File) => {
    console.log("Importing wallets from file:", file.name);
    toast.info(`Importing wallets from ${file.name}`);
    // Simulate file reading
    setTimeout(() => {
      const importedWallets: Wallet[] = [
        {
          address: "ImportedAddress1",
          privateKey: "ImportedPrivateKey1",
          solBalance: 1.5,
          atas: ["ATA1", "ATA2"],
          isHolder: true,
        },
        {
          address: "ImportedAddress2",
          privateKey: "ImportedPrivateKey2",
          solBalance: 0.5,
          atas: ["ATA1"],
          isHolder: false,
        },
      ];
      setWallets([...wallets, ...importedWallets]);
      toast.success(`Imported ${importedWallets.length} wallets`);
    }, 1000);
  };

  const handleImportFromPreviousLaunch = () => {
    console.log("Importing wallets from previous launch");
    toast.info("Importing wallets from previous launch");
    const previousWallets: Wallet[] = [
      {
        address: "PreviousAddress1",
        privateKey: "PreviousPrivateKey1",
        solBalance: 2.0,
        atas: ["ATA1", "ATA2", "ATA3"],
        isHolder: true,
      },
    ];
    setWallets([...wallets, ...previousWallets]);
    toast.success("Imported wallets from previous launch");
  };

  const handleExportWallets = () => {
    console.log("Exporting wallets");
    const privateKeys = wallets.map((w) => w.privateKey).join("\n");
    console.log("Exported private keys:\n", privateKeys);
    toast.success("Wallets exported to clipboard");
  };

  const handleDisperse = () => {
    if (disperseParams.totalSol <= 0) {
      toast.error("Total SOL amount must be greater than 0");
      return;
    }

    if (disperseParams.minPerWallet <= 0 || disperseParams.maxPerWallet <= 0) {
      toast.error("Min and Max amounts must be greater than 0");
      return;
    }

    if (disperseParams.minPerWallet > disperseParams.maxPerWallet) {
      toast.error("Min amount cannot be greater than Max amount");
      return;
    }

    if (disperseParams.rounds <= 0) {
      toast.error("Number of rounds must be at least 1");
      return;
    }

    const totalPossible = selectedWallets.length * disperseParams.maxPerWallet * disperseParams.rounds;
    if (disperseParams.totalSol > totalPossible) {
      toast.error(
        `Total SOL amount exceeds maximum possible distribution (max: ${totalPossible} SOL)`
      );
      return;
    }

    console.log("Dispersing SOL with params:", disperseParams);
    console.log("Selected wallets:", selectedWallets);
    toast.success(
      `Dispersed ${disperseParams.totalSol} SOL to ${selectedWallets.length} wallets in ${disperseParams.rounds} rounds`
    );
    setIsDisperseDialogOpen(false);
  };

  const handleWarmup = () => {
    console.log("Warming up wallets");
    console.log("Selected wallets:", selectedWallets);
    toast.success(`Warmed up ${selectedWallets.length} wallets`);
  };

  const handleCloseATAs = () => {
    console.log("Closing ATAs for wallets");
    console.log("Selected wallets:", selectedWallets);
    toast.success(`Closed ATAs for ${selectedWallets.length} wallets`);
  };

  const handleTransferAllSol = (to: string) => {
    console.log(`Transferring all SOL to ${to}`);
    toast.success("Transferred all SOL to dev wallet");
  };

  const handleDeleteWallets = () => {
    const walletsWithBalance = wallets.filter(
      (w) => selectedWallets.includes(w.address) && w.solBalance > 0
    );

    if (walletsWithBalance.length > 0) {
      toast.error("Cannot delete wallets with SOL balance", {
        description: "Please transfer SOL out before deleting",
      });
    } else {
      setWallets(wallets.filter((w) => !selectedWallets.includes(w.address)));
      setSelectedWallets([]);
      toast.success(`Deleted ${selectedWallets.length} wallets`);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <Button
        onClick={() => handleGenerateWallets(5, "holder")}
        variant="outline"
      >
        Generate Holders
      </Button>
      <Button
        onClick={() => handleGenerateWallets(5, "other")}
        variant="outline"
      >
        Generate Other
      </Button>
      <Button
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = ".txt";
          input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) handleImportWallets(file);
          };
          input.click();
        }}
        variant="outline"
      >
        Import
      </Button>
      <Button onClick={handleImportFromPreviousLaunch} variant="outline">
        Import from Previous Launch
      </Button>
      <Button onClick={handleExportWallets} variant="outline">
        Export
      </Button>

      <Dialog open={isDisperseDialogOpen} onOpenChange={setIsDisperseDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            disabled={selectedWallets.length === 0}
          >
            Disperse
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disperse SOL to {selectedWallets.length} wallets</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="totalSol">Total SOL to disperse</Label>
              <Input
                id="totalSol"
                type="number"
                min="0"
                step="0.01"
                value={disperseParams.totalSol}
                onChange={(e) =>
                  setDisperseParams({
                    ...disperseParams,
                    totalSol: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="Enter total SOL amount"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minPerWallet">Min per wallet (SOL)</Label>
                <Input
                  id="minPerWallet"
                  type="number"
                  min="0"
                  step="0.01"
                  value={disperseParams.minPerWallet}
                  onChange={(e) =>
                    setDisperseParams({
                      ...disperseParams,
                      minPerWallet: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="Minimum amount"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxPerWallet">Max per wallet (SOL)</Label>
                <Input
                  id="maxPerWallet"
                  type="number"
                  min="0"
                  step="0.01"
                  value={disperseParams.maxPerWallet}
                  onChange={(e) =>
                    setDisperseParams({
                      ...disperseParams,
                      maxPerWallet: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="Maximum amount"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rounds">Number of rounds</Label>
              <Input
                id="rounds"
                type="number"
                min="1"
                value={disperseParams.rounds}
                onChange={(e) =>
                  setDisperseParams({
                    ...disperseParams,
                    rounds: parseInt(e.target.value) || 1,
                  })
                }
                placeholder="Enter number of rounds"
              />
            </div>
            <div className="pt-4">
              <Button onClick={handleDisperse} className="w-full">
                Confirm Disperse
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Button
        onClick={handleWarmup}
        variant="outline"
        disabled={selectedWallets.length === 0}
      >
        Warmup
      </Button>
      <Button
        onClick={handleCloseATAs}
        variant="outline"
        disabled={selectedWallets.length === 0}
      >
        Close ATAs
      </Button>
      <Button
        onClick={() => handleTransferAllSol("DevAddress")}
        variant="outline"
        disabled={wallets.length === 0}
      >
        Transfer All SOL to Dev
      </Button>
      <Button
        onClick={handleDeleteWallets}
        variant="destructive"
        disabled={selectedWallets.length === 0}
      >
        <Trash2Icon className="mr-2 h-4 w-4" />
        Delete Selected
      </Button>
    </div>
  );
}