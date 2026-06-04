'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowRight, MoreVertical, Edit, Trash2, Lock, Unlock } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { Trip } from '@/types/db';

interface TripPublieRowProps {
  trip: Trip;
  onEditClick: (id: string) => void;
  onDeleteClick: (id: string) => void;
  onToggleCloseTrip: (id: string, currentState: boolean) => void;
}

export function TripPublieRow({ trip, onEditClick, onDeleteClick, onToggleCloseTrip }: TripPublieRowProps) {
  const date = trip.departureTime.toDate();
  const booked = trip.totalBookings ?? 0;
  const total = booked + trip.availableSeats;
  const fillPct = total > 0 ? Math.round((booked / total) * 100) : 0;

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold flex items-center gap-1 flex-wrap">
            <span>{trip.origin}</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span>{trip.destination}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(date, 'd MMM, HH:mm', { locale: fr })}
          </p>
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
