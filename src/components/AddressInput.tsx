'use client';

import * as React from 'react';
import { MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import usePlacesAutocomplete from 'use-places-autocomplete';

type AddressInputProps = {
  placeholder: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
};

export function AddressInput({ placeholder, defaultValue, onValueChange }: AddressInputProps) {
  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      componentRestrictions: { country: 'ca' },
    },
    debounce: 300,
    defaultValue: defaultValue || '',
    initOnMount: false, // We will manually initialize
  });

  // This effect handles updates from the parent component (e.g., from the AI chatbot)
  React.useEffect(() => {
    if (defaultValue !== undefined) {
      setValue(defaultValue, false); // Set value without re-triggering suggestions
    }
  }, [defaultValue, setValue]);

  // This effect reports the current value back to the parent form
  React.useEffect(() => {
    if (onValueChange) {
      onValueChange(value);
    }
  }, [value, onValueChange]);
  
  // Manual initialization when the component mounts
  React.useEffect(() => {
    if (usePlacesAutocomplete().init) {
      usePlacesAutocomplete().init();
    }
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };

  const handleSelect = (suggestion: google.maps.places.AutocompletePrediction) => () => {
    setValue(suggestion.description, false);
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
        disabled={!ready} // Field is disabled until the script is loaded
        autoComplete="off"
      />
      {status === 'OK' && (
        <div className="absolute z-10 w-full mt-1 p-1 bg-card border rounded-md shadow-lg">
          {renderSuggestions()}
        </div>
      )}
    </div>
  );
}
