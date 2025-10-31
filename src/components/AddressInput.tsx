'use client';

import * as React from 'react';
import { MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from 'use-places-autocomplete';

type AddressInputProps = {
  placeholder: string;
};

export function AddressInput({ placeholder }: AddressInputProps) {
  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      componentRestrictions: { country: 'ca' },
      types: ['establishment'],
    },
    debounce: 300,
  });

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };

  const handleSelect = ({ description }: { description: string }) => () => {
    setValue(description, false);
    clearSuggestions();
  };

  const renderSuggestions = () =>
    data.map((suggestion) => {
      const {
        place_id,
        structured_formatting: { main_text, secondary_text },
      } = suggestion;

      return (
        <div
          key={place_id}
          onClick={handleSelect(suggestion)}
          className="p-2 hover:bg-accent cursor-pointer rounded-md"
        >
          <strong>{main_text}</strong> <small>{secondary_text}</small>
        </div>
      );
    });

  return (
    <div className="relative">
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
      <Input
        type="text"
        placeholder={placeholder}
        className="pl-10 h-12 text-base"
        value={value}
        onChange={handleInput}
        disabled={!ready}
      />
      {status === 'OK' && (
        <div className="absolute z-10 w-full mt-1 p-1 bg-card border rounded-md shadow-lg">
          {renderSuggestions()}
        </div>
      )}
    </div>
  );
}
