'use client';

import * as React from 'react';
import { MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';

type AddressInputProps = {
  placeholder: string;
};

export function AddressInput({ placeholder }: AddressInputProps) {
  const [query, setQuery] = React.useState('');
  // In a real application, you would fetch suggestions from an API here.
  const suggestions: string[] = [];

  return (
    <div className="relative">
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
      <Input
        type="text"
        placeholder={placeholder}
        className="pl-10 h-12 text-base"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-card border rounded-md shadow-lg">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="p-2 hover:bg-accent cursor-pointer"
              onClick={() => setQuery(suggestion)}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
