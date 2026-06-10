"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Calendar, Users, Bookmark } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AddressInput } from "@/components/AddressInput";

interface SavedFavorite {
  origin: string;
  destination: string;
  originCoords?: { lat: number; lng: number };
  destinationCoords?: { lat: number; lng: number };
}

interface QuickSearchBarProps {
  initialDeparture?: string;
  initialDestination?: string;
  onSaveFavorite?: (fav: SavedFavorite) => void;
}

export function QuickSearchBar({
  initialDeparture,
  initialDestination,
  onSaveFavorite,
}: QuickSearchBarProps) {
  const router = useRouter();
  const [departure, setDeparture] = React.useState(initialDeparture ?? "");
  const [destination, setDestination] = React.useState(
    initialDestination ?? "",
  );
  const [originCoords, setOriginCoords] = React.useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [destinationCoords, setDestinationCoords] = React.useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [date, setDate] = React.useState("");
  const [passengers, setPassengers] = React.useState("");

  const canSave =
    onSaveFavorite != null &&
    departure.trim() !== "" &&
    destination.trim() !== "";

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (departure) params.set("departure", departure);
    if (destination) params.set("destination", destination);
    if (date) params.set("date", date);
    if (passengers) params.set("passengers", passengers);
    const qs = params.toString();
    router.push(`/trips${qs ? `?${qs}` : ""}`);
  };

  const handleSave = () => {
    if (!canSave) return;
    onSaveFavorite!({
      origin: departure.trim(),
      destination: destination.trim(),
      ...(originCoords ? { originCoords } : {}),
      ...(destinationCoords ? { destinationCoords } : {}),
    });
  };

  return (
    <div className="space-y-2">
      <form
        onSubmit={handleSearch}
        className="rounded-xl border bg-card p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
        aria-label="Recherche rapide de trajet"
      >
        <div className="flex-1 min-w-0">
          <AddressInput
            id="quick-departure"
            placeholder="Ville de départ"
            defaultValue={initialDeparture}
            onAddressSelect={(addr) => {
              setDeparture(addr.description);
              setOriginCoords(addr.coords ?? null);
            }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <AddressInput
            id="quick-destination"
            placeholder="Ville d'arrivée"
            defaultValue={initialDestination}
            onAddressSelect={(addr) => {
              setDestination(addr.description);
              setDestinationCoords(addr.coords ?? null);
            }}
          />
        </div>

        <div className="relative sm:w-40">
          <Calendar
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          />
          <Input
            type="date"
            className="pl-9 h-12"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label="Date de départ"
          />
        </div>

        <div className="relative sm:w-28">
          <Users
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          />
          <Input
            type="number"
            min="1"
            max="8"
            placeholder="Pers."
            className="pl-9 h-12"
            value={passengers}
            onChange={(e) => setPassengers(e.target.value)}
            aria-label="Nombre de passagers"
          />
        </div>

        <Button type="submit" className="gap-2 shrink-0 h-12">
          <Search className="h-4 w-4" aria-hidden="true" />
          Rechercher
        </Button>
      </form>

      {canSave && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
            aria-label="Enregistrer ce trajet en favori"
          >
            <Bookmark className="h-3.5 w-3.5" />
            Enregistrer en favori
          </button>
        </div>
      )}
    </div>
  );
}
