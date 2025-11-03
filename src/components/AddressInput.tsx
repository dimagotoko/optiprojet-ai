'use client';

import * as React from 'react';
import { MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';

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
    init,
  } = usePlacesAutocomplete({
    requestOptions: {
      componentRestrictions: { country: 'ca' },
    },
    debounce: 300,
    defaultValue: defaultValue || '',
    initOnMount: false, // Nous allons initialiser manuellement
  });
  
  // Initialisation manuelle quand le composant est monté
  React.useEffect(() => {
    init();
  }, [init]);


  // Cet effet gère les mises à jour venant du parent (ex: du chatbot AI)
  React.useEffect(() => {
    if (defaultValue !== undefined) {
      setValue(defaultValue, false); // Met à jour la valeur sans déclencher de nouvelles suggestions
    }
  }, [defaultValue, setValue]);

  // Cet effet rapporte la valeur actuelle au formulaire parent
  React.useEffect(() => {
    if (onValueChange) {
      onValueChange(value);
    }
  }, [value, onValueChange]);
  

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
        disabled={!ready}
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
