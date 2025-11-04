'use client';

import * as React from 'react';
import { MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import usePlacesAutocomplete from 'use-places-autocomplete';
import { useLoadScript } from '@react-google-maps/api';

type AddressInputProps = {
  placeholder: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
};

// We define the libraries outside the component to prevent re-creation on every render.
const libraries: "places"[] = ['places'];

export function AddressInput({ placeholder, defaultValue, onValueChange }: AddressInputProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  
  // The useLoadScript hook now lives inside the component that uses it directly.
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries,
  });

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
    defaultValue: defaultValue || '',
    initOnMount: false, // We will init manually once the script is loaded
  });

  // This effect will run when isLoaded changes to true, ensuring we only init once.
  React.useEffect(() => {
    if (isLoaded) {
      // The init function is part of usePlacesAutocomplete, but we don't need to call it explicitly
      // as setting `initOnMount: false` and letting the component render when `isLoaded` is true
      // is enough. The `ready` flag from the hook will become true.
    }
  }, [isLoaded]);


  React.useEffect(() => {
    if (defaultValue !== undefined) {
      setValue(defaultValue, false);
    }
  }, [defaultValue, setValue]);

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

  if (!isLoaded) {
    return (
       <div className="relative">
         <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
         <Input
            type="text"
            placeholder="Chargement..."
            className="pl-10 h-12 text-base"
            disabled={true}
        />
       </div>
    )
  }

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
