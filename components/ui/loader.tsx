'use client';

import { Loader2 } from 'lucide-react';

export const Loader = ({ 
  size = 24,
  className = ''
}: {
  size?: number;
  className?: string;
}) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Loader2 className="animate-spin" size={size} />
    </div>
  );
};