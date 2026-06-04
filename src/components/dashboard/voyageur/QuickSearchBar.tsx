'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search, Calendar, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AddressInput } from '@/components/AddressInput';

export function QuickSearchBar() {
  const router = useRouter();
  const [departure, setDeparture] = React.useState('');
  const [destination, setDestination] = React.useState('');
  const [date, setDate] = React.useState('');
  const [passengers, setPassengers] = React.useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (departure)  params.set('departure',  departure);
    if (destination) params.set('destination', destination);
    if (date)       params.set('date',        date);
    if (passengers) params.set('passengers',  passengers);
    const qs = params.toString();
    router.push(`/trips${qs ? `?${qs}` : ''}`);
  };

  return (
    <form
      onSubmit={handleSearch}
      className="rounded-xl border bg-card p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
      aria-label="Recherche rapide de trajet"
    >
      {/* Autocomplétion Places pour les villes */}
      <div className="flex-1 min-w-0">
        <AddressInput
          id="quick-departure"
          placeholder="Ville de départ"
          onAddressSelect={addr => setDeparture(addr.description)}
        />
      </div>
      <div className="flex-1 min-w-0">
        <AddressInput
          id="quick-destination"
          placeholder="Ville d'arrivée"
          onAddressSelect={addr => setDestination(addr.description)}
        />
      </div>

      {/* Date */}
      <div className="relative sm:w-40">
        <Calendar
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
          aria-hidden="true"
        />
        <Input
          type="date"
          className="pl-9 h-12"
          value={date}
          onChange={e => setDate(e.target.value)}
          aria-label="Date de départ"
        />
      </div>

      {/* Passagers */}
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
          onChange={e => setPassengers(e.target.value)}
          aria-label="Nombre de passagers"
        />
      </div>

      <Button type="submit" className="gap-2 shrink-0 h-12">
        <Search className="h-4 w-4" aria-hidden="true" />
        Rechercher
      </Button>
    </form>
  );
}
