
'use client';

import * as React from 'react';
import { MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';
import { useLoadScript } from '@react-google-maps/api';

export type Address = {
  description: string;
  coords: {
    lat: number;
    lng: number;
  };
};

type AddressInputProps = {
  placeholder: string;
  defaultValue?: string;
  onAddressSelect?: (address: Address) => void;
  onValueChange?: (value: string) => void; // Kept for TripSearchForm
};

// Define libraries outside the component to prevent re-creation on every render.
const libraries: "places"[] = ['places'];

function AddressInputCore({ placeholder, defaultValue, onAddressSelect, onValueChange }: AddressInputProps) {
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

    React.useEffect(() => {
        // This is primarily for the simple search form which doesn't need coords
        if (onValueChange) {
            onValueChange(value);
        }
    }, [value, onValueChange]);

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        setValue(e.target.value);
    };

    const handleSelect = (suggestion: google.maps.places.AutocompletePrediction) => async () => {
        setValue(suggestion.description, false);
        clearSuggestions();

        // If a handler for the full address object is provided, get geocode
        if (onAddressSelect) {
            try {
                const results = await getGeocode({ address: suggestion.description });
                const { lat, lng } = await getLatLng(results[0]);
                onAddressSelect({ description: suggestion.description, coords: { lat, lng } });
            } catch (error) {
                console.error("Error geocoding: ", error);
            }
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
    )

}

export function AddressInput(props: AddressInputProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  
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
    )
  }

  return <AddressInputCore {...props} />;
}
