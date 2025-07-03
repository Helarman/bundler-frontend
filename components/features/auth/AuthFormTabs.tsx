'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const AuthFormTabs = ({
  activeTab,
  onTabChange,
}: {
  activeTab: 'login' | 'register';
  onTabChange: (tab: 'login' | 'register') => void;
}) => {
  return (
    <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as 'login' | 'register')}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="login">Login</TabsTrigger>
        <TabsTrigger value="register">Register</TabsTrigger>
      </TabsList>
    </Tabs>
  );
};