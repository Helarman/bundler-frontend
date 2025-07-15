import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Search, AlertCircle, BarChart } from 'lucide-react';

interface ChartPageProps {
  isLoadingChart: boolean;
  tokenAddress: string;
  ammKey: string | null;
  walletAddresses: string[];
}

const IconButton: React.FC<{
  icon: React.ReactNode;
  onClick: () => void;
  title: string;
  variant?: 'primary' | 'secondary';
  className?: string;
}> = ({ icon, onClick, title, variant = 'primary', className = '' }) => {
  const variants = {
    primary: 'bg-primary/20 hover:bg-primary/30 text-primary',
    secondary: 'bg-secondary/40 hover:bg-secondary/50 text-foreground'
  };
  
  return (
    <motion.button
      className={`p-2 rounded-md transition-colors ${variants[variant]} ${className}`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      title={title}
    >
      {icon}
    </motion.button>
  );
};

export const ChartPage: React.FC<ChartPageProps> = ({
  isLoadingChart,
  tokenAddress,
  ammKey,
  walletAddresses
}) => {
  const [frameLoading, setFrameLoading] = useState(true);
  const [iframeKey, setIframeKey] = useState(Date.now());
  const [showGMGN, setShowGMGN] = useState(false);
  
  useEffect(() => {
    if (tokenAddress) {
      setFrameLoading(true);
    }
  }, [tokenAddress, ammKey, showGMGN]);
  
  const handleFrameLoad = () => {
    setFrameLoading(false);
  };

  const toggleGraphSource = () => {
    setFrameLoading(true);
    setShowGMGN(prev => !prev);
    setIframeKey(Date.now());
  };

  const formatWalletAddresses = (addresses: string[]) => {
    return addresses
      .map(address => address.substring(0, 5))
      .join(',');
  };
  
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        duration: 0.5,
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { 
        type: "spring", 
        stiffness: 300,
        damping: 24
      }
    }
  };

  const pulseVariants: Variants = {
    initial: { opacity: 0.5, scale: 0.98 },
    animate: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 2,
        repeat: Infinity,
        repeatType: "reverse" as "reverse",
        ease: "easeInOut"
      }
    }
  };

  const loaderVariants: Variants = {
    animate: {
      rotate: 360,
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "linear"
      }
    }
  };
  
  const renderControls = () => (
    <motion.div 
      className="absolute top-3 right-6 z-30 flex items-center space-x-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.7 }}
      whileHover={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <IconButton
        icon={<BarChart className="h-4 w-4" />}
        onClick={toggleGraphSource}
        title={showGMGN ? "Switch to Jeton graph" : "Switch to GMGN graph"}
        variant="primary"
      />
    </motion.div>
  );
  
  const renderLoader = (loading: boolean) => (
    <AnimatePresence>
      {loading && (
        <motion.div 
          className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div 
            className="w-12 h-12 rounded-full border-2 border-t-transparent border-primary/30"
            variants={loaderVariants}
            animate="animate"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
  
  const renderFrame = () => {
    const walletParams = walletAddresses && walletAddresses.length > 0 
      ? `&wallets=${formatWalletAddresses(walletAddresses)}` 
      : '';
    
    if (showGMGN) {
      const transactionsSrc = `https://frame.jeton/?token=${tokenAddress}${walletParams}&view=transactions`;
      
      return (
        <div className="relative flex-1 overflow-hidden flex flex-col">
          {renderLoader(frameLoading || isLoadingChart)}
          
          <div className="absolute inset-0 overflow-hidden flex flex-col">
            <div className="h-[70%] relative">
              <iframe 
                key={`gmgn-${iframeKey}`}
                src={`https://www.gmgn.cc/kline/sol/${tokenAddress}`}
                className="absolute inset-0 w-full h-[calc(100%+35px)]"
                style={{ marginBottom: '-35px' }}
                title="GMGN Chart"
                loading="lazy"
                onLoad={handleFrameLoad}
              />
            </div>
            <div className="h-[30%] relative border-t border-border">
              <iframe 
                key={`transactions-${iframeKey}`}
                src={transactionsSrc}
                className="absolute inset-0 w-full h-full"
                title="Transactions"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      );
    } else {
      const iframeSrc = `https://frame.jeton/?token=${tokenAddress}${walletParams}`;
      
      return (
        <div className="relative flex-1 overflow-hidden">
          {renderLoader(frameLoading || isLoadingChart)}
          
          <div className="absolute inset-0 overflow-hidden">
            <iframe 
              key={iframeKey}
              src={iframeSrc}
              className="absolute inset-0 w-full h-full"
              title="Token Frame"
              loading="lazy"
              onLoad={handleFrameLoad}
            />
          </div>
        </div>
      );
    }
  };
  
  const renderPlaceholder = () => (
    <motion.div 
      key="placeholder"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0 }}
      className="w-full h-full flex flex-col items-center justify-center p-8"
    >
      <motion.div
        variants={pulseVariants}
        initial="initial"
        animate="animate" 
        className="rounded-full bg-muted p-4 mb-6"
      >
        <Search className="h-10 w-10 text-muted-foreground" />
      </motion.div>
      
      <motion.h3 
        variants={itemVariants}
        className="text-lg font-medium text-muted-foreground mb-2"
      >
        Set token address
      </motion.h3>
      
      <motion.p 
        variants={itemVariants}
        className="text-muted-foreground text-sm max-w-md text-center"
      >
        Enter a valid token address in the search bar above to view the token frame
      </motion.p>
      
      <motion.div
        variants={itemVariants}
        className="mt-6 flex items-center gap-2 px-4 py-3 rounded-lg bg-primary/10 border border-primary/20"
      >
        <AlertCircle size={16} className="text-primary" />
        <span className="text-primary text-sm">No token selected</span>
      </motion.div>
    </motion.div>
  );

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="relative h-full w-full rounded-lg overflow-hidden bg-background"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-muted/10 to-transparent pointer-events-none" />
      
      {renderControls()}
      
      <AnimatePresence mode="wait">
        {isLoadingChart ? (
          <div className="h-full flex items-center justify-center">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            >
              <BarChart size={24} className="text-primary" />
            </motion.div>
          </div>
        ) : !tokenAddress ? (
          renderPlaceholder()
        ) : (
          <motion.div 
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-1 h-full"
          >
            {renderFrame()}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ChartPage;