"use client";

import * as React from "react";
import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from "use-places-autocomplete";

export type Address = {
  description: string;
  coords?: {
    lat: number;
    lng: number;
  } | null;
};

type AddressInputProps = {
  id: string;
  label: string;
  placeholder: string;
  defaultValue?: string;
  onAddressSelect: (address: Address) => void;
};

function AddressInputCore({
  id,
  label,
  placeholder,
  defaultValue,
  onAddressSelect,
}: AddressInputProps) {
  const [location, setLocation] = React.useState<{
    lat: number;
    lng: number;
  } | null>(null);

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
        },
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
      componentRestrictions: { country: "ca" },
      ...(location && {
        location: new google.maps.LatLng(location.lat, location.lng),
        radius: 100 * 1000,
      }),
    },
    debounce: 300,
    defaultValue: typeof defaultValue === "string" ? defaultValue : "",
  });

  const [activeIndex, setActiveIndex] = React.useState(-1);
  const listboxId = `${id}-listbox`;

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    setActiveIndex(-1);
  };

  React.useEffect(() => {
    setValue(typeof defaultValue === "string" ? defaultValue : "", false);
  }, [defaultValue, setValue]);

  const selectSuggestion = async (
    suggestion: google.maps.places.AutocompletePrediction,
  ) => {
    setValue(suggestion.description, false);
    clearSuggestions();
    setActiveIndex(-1);

    try {
      const results = await getGeocode({ address: suggestion.description });
      const { lat, lng } = await getLatLng(results[0]);
      onAddressSelect({
        description: suggestion.description,
        coords: { lat, lng },
      });
    } catch (error) {
      console.error("Error geocoding: ", error);
      onAddressSelect({ description: suggestion.description, coords: null });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (status !== "OK") return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % data.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? data.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectSuggestion(data[activeIndex]);
    } else if (e.key === "Escape") {
      clearSuggestions();
      setActiveIndex(-1);
    }
  };

  const renderSuggestions = () =>
    data.map((suggestion, index) => {
      const {
        place_id,
        structured_formatting: { main_text, secondary_text },
      } = suggestion;

      return (
        <button
          key={place_id}
          id={`${listboxId}-option-${index}`}
          type="button"
          role="option"
          aria-selected={index === activeIndex}
          onClick={() => selectSuggestion(suggestion)}
          onMouseEnter={() => setActiveIndex(index)}
          className={`w-full p-2 text-left hover:bg-accent rounded-md overflow-hidden ${
            index === activeIndex ? "bg-accent" : ""
          }`}
        >
          <p className="truncate text-sm font-medium">{main_text}</p>
          <p className="truncate text-xs text-muted-foreground">
            {secondary_text}
          </p>
        </button>
      );
    });

  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
      <Input
        id={id}
        name={id}
        type="text"
        placeholder={placeholder}
        className="pl-10 h-12 text-base truncate"
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        disabled={!ready}
        autoComplete="off"
        role="combobox"
        aria-expanded={status === "OK"}
        aria-controls={listboxId}
        aria-activedescendant={
          activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
        }
      />
      {status === "OK" && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={label}
          className="absolute z-10 w-full mt-1 p-1 bg-card border rounded-md shadow-lg max-h-52 overflow-y-auto"
        >
          {renderSuggestions()}
        </div>
      )}
    </div>
  );
}

export function AddressInput(props: AddressInputProps) {
  return <AddressInputCore {...props} />;
}
