"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useUser } from "@/lib/hooks/useUser";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import TokenMetadataForm from "@/components/features/launch/TokenMetadataForm";
import WalletManager from "@/components/features/launch/WalletManager";

export type Wallet = {
  address: string;
  privateKey: string;
  solBalance: number;
  atas: string[];
  isHolder: boolean;
};

type TabValue = "metadata" | "wallets";

export default function NewLaunchPage() {
  const router = useRouter();
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<TabValue>("metadata");
  const [wallets, setWallets] = useState<Wallet[]>([]);

  useEffect(() => {
    if (!user?.isSettingConfirmed) {
      router.push("/settings");
    }
  }, [user, router]);

  if (!user?.isSettingConfirmed) {
    return null;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">New Token Launch</h1>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
        <TabsList>
          <TabsTrigger value="metadata">Token Metadata</TabsTrigger>
          <TabsTrigger value="wallets" disabled={activeTab === "metadata"}>
            Wallet Manager
          </TabsTrigger>
        </TabsList>

        <TabsContent value="metadata">
          <Card>
            <CardHeader>
              <CardTitle>Token Metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <TokenMetadataForm onSuccess={() => setActiveTab("wallets")} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wallets">
          <WalletManager wallets={wallets} setWallets={setWallets} />
        </TabsContent>
      </Tabs>
    </div>
  );
}