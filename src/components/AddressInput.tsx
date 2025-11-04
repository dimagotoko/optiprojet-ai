
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
  onValueChange?: (value: string) => void;
};

const libraries: "places"[] = ['places'];

function AddressInputCore({ id, placeholder, defaultValue, onAddressSelect, onValueChange }: AddressInputProps) {
  const form = useFormContext();
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
  });

  React.useEffect(() => {
    if (defaultValue !== undefined) {
      setValue(defaultValue, false);
    }
  }, [defaultValue, setValue]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    if (onValueChange) {
        onValueChange(newValue);
    }
    // For non-form usage, we might still want to propagate this
    if (onAddressSelect) {
        onAddressSelect({ description: newValue, coords: null });
    }
  };

  const handleSelect = (suggestion: google.maps.places.AutocompletePrediction) => async () => {
    setValue(suggestion.description, false);
    clearSuggestions();
     if (onValueChange) {
        onValueChange(suggestion.description);
    }

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

export function AddressInput(props: AddressInputProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const formMethods = useFormContext(); // Can be null

  const handleAddressSelect = (address: Address) => {
    if (formMethods) {
      formMethods.setValue(props.id, address, { shouldValidate: true, shouldDirty: true });
    }
    if (props.onAddressSelect) {
      props.onAddressSelect(address);
    }
  };

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries,
  });

  if (loadError) {
    return (
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-destructive" />
        <Input
          type="text"
          placeholder="Erreur de carte"
          className="pl-10 h-12 text-base border-destructive text-destructive"
          disabled={true}
          defaultValue="Erreur lors du chargement de Google Maps"
        />
      </div>
    );
  }

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
    );
  }

  return <AddressInputCore {...props} onAddressSelect={handleAddressSelect} />;
}
