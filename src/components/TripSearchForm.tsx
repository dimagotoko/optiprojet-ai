
'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar as CalendarIcon, Users, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { AddressInput } from './AddressInput';
import { useRouter } from 'next/navigation';

type TripSearchFormProps = {
  initialSearch?: {
    departure?: string;
    destination?: string;
    date?: Date;
  };
};

// Helper to check if a value is a valid Date object
const isValidDate = (d: any): d is Date => d instanceof Date && !isNaN(d.getTime());


export function TripSearchForm({ initialSearch }: TripSearchFormProps) {
  const router = useRouter();
  const [departure, setDeparture] = React.useState(initialSearch?.departure || '');
  const [destination, setDestination] = React.useState(initialSearch?.destination || '');
  const [date, setDate] = React.useState<Date | undefined>(initialSearch?.date);
  const [passengers, setPassengers] = React.useState(1);
  
  React.useEffect(() => {
    setDeparture(initialSearch?.departure || '');
    setDestination(initialSearch?.destination || '');
    setDate(initialSearch?.date);
  }, [initialSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (departure) params.set('departure', departure);
    if (destination) params.set('destination', destination);
    if (date) params.set('date', date.toISOString());
    if (passengers) params.set('passengers', passengers.toString());
    router.push(`/trips?${params.toString()}`);
  }

  return (
    <Card className="w-full shadow-2xl backdrop-blur-sm bg-card/80">
      <CardContent className="p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-2 sm:gap-4 items-center">
          <div className="relative md:col-span-3">
            <AddressInput
              placeholder="Départ (ex: Station Berri-UQAM)"
              defaultValue={departure}
              onValueChange={setDeparture}
            />
          </div>
          
          <div className="hidden md:flex justify-center items-center md:col-span-1">
             <ArrowRight className="h-5 w-5 text-muted-foreground"/>
          </div>

          <div className="relative md:col-span-3">
            <AddressInput
              placeholder="Destination (ex: Carrefour Laval)"
              defaultValue={destination}
              onValueChange={setDestination}
            />
          </div>
          
          <div className="relative md:col-span-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={'outline'}
                  className={cn(
                    'w-full justify-start text-left font-normal h-12 text-base',
                    !date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-5 w-5" />
                  {isValidDate(date) ? format(date, 'd MMM yyyy', { locale: fr }) : <span>Date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  defaultMonth={date}
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="relative md:col-span-1">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
              type="number" 
              placeholder="1" 
              className="pl-10 h-12 text-base" 
              min="1" 
              value={passengers}
              onChange={(e) => setPassengers(parseInt(e.target.value, 10))}
            />
          </div>

          <Button type="submit" className="md:col-span-2 h-12 text-base" disabled={!date}>
            Rechercher
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
