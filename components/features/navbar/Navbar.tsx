'use client';

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Bitcoin, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuthActions } from "@/lib/hooks/useAuth";
import { useUser } from '@/lib/hooks/useUser';

interface NavItem {
  name: string;
  path: string;
  disabled?: boolean;
  disabledReason?: string;
  requiresSettingsConfirmed?: boolean;
}

const navItems: NavItem[] = [
  /*{ name: "History", path: "/history" },
  { name: "Setting", path: "/settings" },
  { 
    name: "New Launch", 
    path: "/new-launch",
    requiresSettingsConfirmed: true,
    disabledReason: "Settings not confirmed!"
  },*/
    { 
    name: "Wallets", 
    path: "/wallets",
    requiresSettingsConfirmed: true,
    disabledReason: "Settings not confirmed!"
  },
     { 
    name: "DCA", 
    path: "/dca",
    requiresSettingsConfirmed: true,
    disabledReason: "Settings not confirmed!"
  },
       { 
    name: "Pump", 
    path: "/pump",
    requiresSettingsConfirmed: true,
    disabledReason: "Settings not confirmed!"
  },

    /*  { 
    name: "Chart", 
    path: "/chart",
    requiresSettingsConfirmed: true,
    disabledReason: "Settings not confirmed!"
  },
     { 
    name: "Actions", 
    path: "/actions",
    requiresSettingsConfirmed: true,
    disabledReason: "Settings not confirmed!"
  },*/


];

export function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { user, isLoading } = useUser();
  const { logout } = useAuthActions();
  
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isUserMenuOpen &&
        !(event.target as Element).closest('.user-menu-trigger')
      ) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isUserMenuOpen]);

  const getNavItemState = (item: NavItem) => {
    if (!user?.isConfirmed) {
      return {
        disabled: true,
        disabledReason: "Account not confirmed"
      };
    }
    
    if (item.requiresSettingsConfirmed && !user?.isSettingConfirmed) {
      return {
        disabled: true,
        disabledReason: item.disabledReason || "Settings not confirmed"
      };
    }
    
    return {
      disabled: item.disabled || false,
      disabledReason: item.disabledReason
    };
  };

  const renderNavItem = (item: NavItem, mobile = false) => {
    const { disabled, disabledReason } = getNavItemState(item);
    
    if (disabled) {
      return (
        <TooltipProvider key={item.path}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={`relative px-4 py-2 text-sm font-medium transition-colors ${
                  mobile ? "py-3" : ""
                } text-muted-foreground/50 cursor-not-allowed`}
              >
                {item.name}
                {mobile && (
                  <span className="ml-2 text-xs text-muted-foreground/50">
                    ({disabledReason || "Unavailable"})
                  </span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{disabledReason || "This feature is currently unavailable"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <Link
        key={item.path}
        href={item.path}
        className={`relative px-4 py-2 text-sm font-medium transition-colors hover:text-primary ${
          mobile ? "py-3" : ""
        }`}
      >
        {item.path === pathname && (
          <motion.span
            layoutId="activeNavItem"
            className="absolute inset-0 rounded-md bg-primary/10"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            style={{ zIndex: -1 }}
          />
        )}
        <span className="relative z-10">{item.name}</span>
      </Link>
    );
  };

  if (isLoading) {
    return (
      <motion.header
        className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur"
      >
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Bitcoin />
            <span className="text-lg font-semibold">CryptoBundler</span>
          </div>
        </div>
      </motion.header>
    );
  }

  return (
    <>
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 15 }}
        className={`sticky top-0 z-50 w-full border-b transition-all duration-300 justify-center ${
          scrolled
            ? "bg-background/95 shadow-sm backdrop-blur"
            : "bg-background/80 backdrop-blur"
        }`}
      >
        <div className="container mx-auto flex h-16 items-center justify-between">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link href="/" className="flex items-center gap-2 font-bold">
              <Bitcoin/>
              <span className="text-lg font-semibold">CryptoBundler</span>
            </Link>
          </motion.div>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => renderNavItem(item))}
          </nav>

          <div className="flex md:hidden items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(!isOpen)}
              className="rounded-full p-0 h-10 w-10"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </Button>
          </div>

          <motion.div className="hidden md:block relative">
            <Button
              variant="ghost"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="rounded-full p-0 h-10 w-10 user-menu-trigger"
            >
              <Avatar>
                <AvatarFallback className="bg-primary/10 text-primary">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>

            <AnimatePresence>
              {isUserMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-2 w-36 bg-background rounded-md shadow-lg border z-50"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  <div className="py-1 text-right">
                    <div className="px-4 py-2 text-sm text-muted-foreground border-b">
                      {user?.email}
                    </div>
                    <button
                      onClick={() => logout()}
                      className="w-full text-right px-4 py-2 text-sm hover:bg-accent/50 text-destructive"
                    >
                      Logout
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden md:hidden"
            >
              <div className="container px-4 pb-4">
                <div className="flex flex-col space-y-2">
                  {navItems.map((item) => {
                    const { disabled } = getNavItemState(item);
                    return (
                      <div
                        key={item.path}
                        className={`px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                          item.path === pathname && !disabled
                            ? "bg-primary/10 text-primary"
                            : disabled
                            ? "text-muted-foreground/50"
                            : "hover:bg-accent/50"
                        } `}
                      >
                        {renderNavItem(item, true)}
                      </div>
                    );
                  })}
                  <div className="pt-2 border-t mt-2">
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 px-4 user-menu-trigger"
                      onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {user?.email?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span>Profile</span>
                    </Button>

                    {isUserMenuOpen && (
                      <div className="mt-2 pl-12 space-y-1">
                        <button
                          onClick={() => logout()}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-accent/50 text-destructive rounded-md"
                        >
                          Logout
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {user && !user.isSettingConfirmed && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full bg-yellow-400/90 text-yellow-900 py-2 px-4 text-center text-sm font-medium"
        >
          <div className="container mx-auto flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 mr-2" />
            <span>
              Not all features are available. Settings not confirmed
            </span>
          </div>
        </motion.div>
      )}
    </>
  );
}