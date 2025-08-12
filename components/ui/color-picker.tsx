'use client';

import { Input } from './input';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Button } from './button';
import { HexColorPicker } from 'react-colorful';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        
        <Button
          variant="outline"
          className={`w-full justify-center bg-[${value}]`}
        >
          {value}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <HexColorPicker 
          color={value}
          className='w-full' 
          onChange={onChange} 
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="border-t-0 rounded-t-none"
        />
      </PopoverContent>
    </Popover>
  );
}