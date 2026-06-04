'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowRight, MoreVertical, Edit, Trash2, Lock, Unlock, Car } from 'lucide-react';
import Image from 'next/image';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { Trip, Vehicle } from '@/types/db';

interface TripPublieRowProps {
  trip: Trip;
  vehicle?: Vehicle;
  onEditClick: (id: string) => void;
  onDeleteClick: (id: string) => void;
  onToggleCloseTrip: (id: string, currentState: boolean) => void;
}

export function TripPublieRow({ trip, vehicle, onEditClick, onDeleteClick, onToggleCloseTrip }: TripPublieRowProps) {
  const date = trip.departureTime.toDate();
  const booked = trip.totalBookings ?? 0;
  const total = booked + trip.availableSeats;
  const fillPct = total > 0 ? Math.round((booked / total) * 100) : 0;

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold flex items-center gap-1 flex-wrap">
            <span>{trip.origin}</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span>{trip.destination}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(date, 'd MMM, HH:mm', { locale: fr })}
          </p>

          {/* Infos véhicule */}
          {vehicle && (
            <div className="mt-2 flex items-center gap-2">
              {vehicle.imageUrl ? (
                <div className="relative h-8 w-14 rounded overflow-hidden shrink-0 border">
                  <Image src={vehicle.imageUrl} alt={`${vehicle.make} ${vehicle.model}`} fill className="object-cover" />
                </div>
              ) : (
                <div className="flex items-center justify-center h-8 w-8 rounded bg-muted shrink-0">
                  <Car className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </div>
              )}
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Pastille couleur */}
                <span
                  className="inline-block h-3 w-3 rounded-full border border-border shrink-0"
                  style={{ backgroundColor: vehicle.color.toLowerCase() }}
                  title={vehicle.color}
                  aria-label={`Couleur : ${vehicle.color}`}
                />
                <span className="text-xs text-muted-foreground">
                  {vehicle.make} {vehicle.model} {vehicle.year}
                </span>
                <span className="text-xs text-muted-foreground">· {vehicle.color}</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-bold text-primary whitespace-nowrap">
            {trip.pricePerSeat} $
            <span className="font-normal text-muted-foreground">/place</span>
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Options du trajet">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onToggleCloseTrip(trip.id, !!trip.isClosed)}>
                {trip.isClosed
                  ? <><Unlock className="mr-2 h-4 w-4" />Rouvrir les réservations</>
                  : <><Lock className="mr-2 h-4 w-4" />Fermer les réservations</>
                }
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEditClick(trip.id)}>
                <Edit className="mr-2 h-4 w-4" />Modifier
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDeleteClick(trip.id)}
                className="text-destructive focus:text-destructive"
                disabled={booked > 0}
              >
                <Trash2 className="mr-2 h-4 w-4" />Annuler
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="mt-3 space-y-1">
        <Progress
          value={fillPct}
          className="h-1.5"
          aria-label={`${booked} sur ${total} places réservées`}
        />
        <p className="text-xs text-muted-foreground">{booked} / {total} places</p>
      </div>
    </div>
  );
}
