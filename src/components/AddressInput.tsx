
'use client';

import * as React from 'react';
import { MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';

export type Address = {
  description: string;
  coords?: {
    lat: number;
    lng: number;
  } | null;
};

type AddressInputProps = {
  id: string;
  placeholder: string;
  defaultValue?: string;
  onAddressSelect: (address: Address) => void;
};

function AddressInputCore({ id, placeholder, defaultValue, onAddressSelect }: AddressInputProps) {
  const [location, setLocation] = React.useState<{ lat: number; lng: number } | null>(null);

  React.useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Erreur de géolocalisation: ", error);
        }
      );
    }
  }, []);

  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      componentRestrictions: { country: 'ca' },
      ...(location && {
        location: new google.maps.LatLng(location.lat, location.lng),
        radius: 100 * 1000,
      }),
    },
    debounce: 300,
    defaultValue: typeof defaultValue === 'string' ? defaultValue : '',
  });

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };

  React.useEffect(() => {
    setValue(typeof defaultValue === 'string' ? defaultValue : '', false);
  }, [defaultValue, setValue]);

  const handleSelect = (suggestion: google.maps.places.AutocompletePrediction) => async () => {
    setValue(suggestion.description, false);
    clearSuggestions();

    try {
      const results = await getGeocode({ address: suggestion.description });
      const { lat, lng } = await getLatLng(results[0]);
      onAddressSelect({ description: suggestion.description, coords: { lat, lng } });
    } catch (error) {
      console.error("Error geocoding: ", error);
      onAddressSelect({ description: suggestion.description, coords: null });
    }
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
          className="p-2 hover:bg-accent cursor-pointer rounded-md overflow-hidden"
        >
          <p className="truncate text-sm font-medium">{main_text}</p>
          <p className="truncate text-xs text-muted-foreground">{secondary_text}</p>
        </div>
      );
    });

  return (
    <div className="relative">
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
      <Input
        id={id}
        name={id}
        type="text"
        placeholder={placeholder}
        className="pl-10 h-12 text-base truncate"
        value={value}
        onChange={handleInput}
        disabled={!ready}
        autoComplete="off"
      />
      {status === 'OK' && (
        <div className="absolute z-10 w-full mt-1 p-1 bg-card border rounded-md shadow-lg max-h-52 overflow-y-auto">
          {renderSuggestions()}
        </div>
      )}
    </div>
  );
}

export function AddressInput(props: AddressInputProps) {
  return <AddressInputCore {...props} />;
}
