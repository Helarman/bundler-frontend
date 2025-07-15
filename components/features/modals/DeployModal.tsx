import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Rocket, Zap, X, Utensils } from 'lucide-react';
import { DeployPumpModal } from './DeployPumpModal';
import { DeployBonkModal } from './DeployBonkModal';
import { DeployCookModal } from './DeployCookModal';
import { DeployMoonModal } from './DeployMoonModal';
import { DeployBoopModal } from './DeployBoopModal';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DeployModalProps extends BaseModalProps {
  onDeploy: (data: any) => void;
  handleRefresh: () => void;
  solBalances: Map<string, number>;
}

export const DeployModal: React.FC<DeployModalProps> = ({
  isOpen,
  onClose,
  onDeploy,
  handleRefresh,
  solBalances,
}) => {
  const [selectedDeployType, setSelectedDeployType] = useState<'pump' | 'bonk' | 'cook' | 'moon' | 'boop' | null>(null);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <Rocket className="w-6 h-6 text-primary" />
            <DialogTitle>Select Deploy Type</DialogTitle>
          </div>
          <DialogDescription>
            Choose the platform you want to deploy your token on
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Pump Deploy Option */}
          <Card 
            onClick={() => setSelectedDeployType('pump')}
            className="group cursor-pointer transition-all hover:border-primary hover:shadow-md"
          >
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <Zap className="text-primary group-hover:animate-pulse" size={24} />
              </div>
              <CardTitle>PUMP.FUN</CardTitle>
              <CardDescription>
                Create a new pump.fun token with customizable parameters. Includes liquidity setup.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Bonk Deploy Option */}
          <Card 
            onClick={() => setSelectedDeployType('bonk')}
            className="group cursor-pointer transition-all hover:border-primary hover:shadow-md"
          >
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <Rocket className="text-primary group-hover:animate-pulse" size={24} />
              </div>
              <CardTitle>LETSBONK.FUN</CardTitle>
              <CardDescription>
                Create a new letsbonk.fun token with customizable parameters. Includes liquidity setup.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Cook.Meme Deploy Option */}
          <Card 
            onClick={() => setSelectedDeployType('cook')}
            className="group cursor-pointer transition-all hover:border-primary hover:shadow-md"
          >
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <Utensils className="text-primary group-hover:animate-pulse" size={24} />
              </div>
              <CardTitle>COOK.MEME</CardTitle>
              <CardDescription>
                Create a new cook.meme token with customizable parameters. Includes liquidity setup.
              </CardDescription>
            </CardHeader>
          </Card>
          
          {/* moon.it Deploy Option */}
          <Card 
            onClick={() => setSelectedDeployType('moon')}
            className="group cursor-pointer transition-all hover:border-primary hover:shadow-md"
          >
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <Utensils className="text-primary group-hover:animate-pulse" size={24} />
              </div>
              <CardTitle>MOON.IT</CardTitle>
              <CardDescription>
                Create a new moon.it token with customizable parameters. Includes liquidity setup.
              </CardDescription>
            </CardHeader>
          </Card>
          
          {/* boop.fun Deploy Option */}
          <Card 
            onClick={() => setSelectedDeployType('boop')}
            className="group cursor-pointer transition-all hover:border-primary hover:shadow-md"
          >
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <Utensils className="text-primary group-hover:animate-pulse" size={24} />
              </div>
              <CardTitle>BOOP.FUN</CardTitle>
              <CardDescription>
                Create a new boop.fun token with customizable parameters. Includes liquidity setup.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Coming Soon Option */}
          <Card 
            onClick={() => toast("LAUNCHPAD deployment coming soon!")}
            className="group cursor-not-allowed opacity-60"
          >
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <Utensils className="text-primary" size={24} />
              </div>
              <CardTitle>LAUNCHPAD</CardTitle>
              <CardDescription>
                Create a new LAUNCHPAD token. Advanced features including customizable tokenomics and marketing.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Render selected modal */}
        {selectedDeployType === 'pump' && (
          <DeployPumpModal
            isOpen={true}
            onClose={() => setSelectedDeployType(null)}
            onDeploy={onDeploy}
            handleRefresh={handleRefresh}
            solBalances={solBalances}
          />
        )}
        
        {selectedDeployType === 'bonk' && (
          <DeployBonkModal
            isOpen={true}
            onClose={() => setSelectedDeployType(null)}
            onDeploy={onDeploy}
            handleRefresh={handleRefresh}
            solBalances={solBalances}
          />
        )}
        
        {selectedDeployType === 'cook' && (
          <DeployCookModal
            isOpen={true}
            onClose={() => setSelectedDeployType(null)}
            onDeploy={onDeploy}
            handleRefresh={handleRefresh}
            solBalances={solBalances}
          />
        )}
        
        {selectedDeployType === 'moon' && (
          <DeployMoonModal
            isOpen={true}
            onClose={() => setSelectedDeployType(null)}
            onDeploy={onDeploy}
            handleRefresh={handleRefresh}
            solBalances={solBalances}
          />
        )}
        
        {selectedDeployType === 'boop' && (
          <DeployBoopModal
            isOpen={true}
            onClose={() => setSelectedDeployType(null)}
            onDeploy={onDeploy}
            handleRefresh={handleRefresh}
            solBalances={solBalances}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};