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

export function TripSearchForm() {
  const [date, setDate] = React.useState<Date>();

  return (
    <Card className="w-full shadow-2xl backdrop-blur-sm bg-card/80">
      <CardContent className="p-4 sm:p-6">
        <form className="grid grid-cols-1 md:grid-cols-12 gap-2 sm:gap-4 items-center">
          <div className="relative md:col-span-3">
            <AddressInput placeholder="Départ (ex: Station Berri-UQAM)" />
          </div>
          
          <div className="hidden md:flex justify-center items-center md:col-span-1">
             <ArrowRight className="h-5 w-5 text-muted-foreground"/>
          </div>

          <div className="relative md:col-span-3">
            <AddressInput placeholder="Destination (ex: Carrefour Laval)" />
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
                  {date ? format(date, 'd MMM yyyy', { locale: fr }) : <span>Date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="relative md:col-span-1">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input type="number" placeholder="1" className="pl-10 h-12 text-base" min="1" />
          </div>

          <Button type="submit" className="md:col-span-2 h-12 text-base">
            Rechercher
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
