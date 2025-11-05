
'use client';

import * as React from 'react';
import { MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';
import { useLoadScript } from '@react-google-maps/api';
import { useFormContext } from 'react-hook-form';

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
  onAddressSelect?: (address: Address) => void;
};

const libraries: "places"[] = ['places'];

function AddressInputCore({ id, placeholder, defaultValue, onAddressSelect }: AddressInputProps) {
  const [location, setLocation] = React.useState<{ lat: number; lng: number } | null>(null);
  const [inputValue, setInputValue] = React.useState(defaultValue || '');


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
  });

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setValue(e.target.value);
  };
  
  React.useEffect(() => {
    setInputValue(defaultValue || '');
    setValue(defaultValue || '', false);
  }, [defaultValue, setValue]);


  const handleSelect = (suggestion: google.maps.places.AutocompletePrediction) => async () => {
    setValue(suggestion.description, false);
    setInputValue(suggestion.description);
    clearSuggestions();

    try {
      const results = await getGeocode({ address: suggestion.description });
      const { lat, lng } = await getLatLng(results[0]);
      const fullAddress: Address = { description: suggestion.description, coords: { lat, lng } };
      if (onAddressSelect) onAddressSelect(fullAddress);

    } catch (error) {
      console.error("Error geocoding: ", error);
      const addressWithoutCoords: Address = { description: suggestion.description, coords: null };
      if (onAddressSelect) onAddressSelect(addressWithoutCoords);
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
        id={id}
        name={id}
        type="text"
        placeholder={placeholder}
        className="pl-10 h-12 text-base"
        value={inputValue}
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

export function AddressInput(props: AddressInputProps) {
  const formMethods = useFormContext(); // Can be null

  const handleAddressSelect = (address: Address) => {
    if (formMethods && props.id) {
      formMethods.setValue(props.id, address, { shouldValidate: true, shouldDirty: true });
    }
    if (props.onAddressSelect) {
      props.onAddressSelect(address);
    }
  };

  return <AddressInputCore {...props} onAddressSelect={handleAddressSelect} />;
}
