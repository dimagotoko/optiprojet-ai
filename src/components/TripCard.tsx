
'use client';

import * as React from 'react';
import { ArrowRight, Calendar, Star } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Button } from './ui/button';
import Link from 'next/link';

type TripCardProps = {
  id: string;
  from: string;
  to: string;
  date: string;
  price: string;
  driver: {
    name: string;
    avatar: string;
    rating: number;
  };
  onLocationClick?: (type: 'departure' | 'destination', value: string) => void;
};

export function TripCard({ id, from, to, date, price, driver, onLocationClick }: TripCardProps) {
  // Simple hash function to get a numeric seed from a string for picsum.photos
  const toSeed = (s: string) => {
    if(!s) return 0;
    return s.split('').reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);
  };
  
  const handleLocationClick = (type: 'departure' | 'destination', value: string) => {
    if (onLocationClick) {
      onLocationClick(type, value);
    }
  };

  const LocationButton = ({ value, type }: { value: string, type: 'departure' | 'destination' }) => (
    <Button 
      variant="link" 
      className="p-0 h-auto text-lg font-semibold text-card-foreground hover:text-primary transition-colors"
      onClick={() => handleLocationClick(type, value)}
      disabled={!onLocationClick}
    >
      {value}
    </Button>
  );

  return (
    <Card className="flex flex-col h-full transition-all hover:shadow-lg hover:-translate-y-1 overflow-hidden">
      <CardHeader className="p-4 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg font-semibold flex-wrap">
            <LocationButton value={from} type="departure" />
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
            <LocationButton value={to} type="destination" />
          </div>
          <Badge variant="secondary" className="text-base font-bold shrink-0">{price}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-4 pt-0 space-y-4">
        <div className="relative h-48 w-full rounded-lg overflow-hidden group">
          <Image
            src={`https://picsum.photos/seed/${toSeed(to)}/600/400`}
            alt={`Paysage représentant la destination: ${to}`}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            data-ai-hint="landscape"
          />
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <Calendar className="mr-2 h-4 w-4" />
          <span>{date}</span>
        </div>
      </CardContent>
      <CardFooter className="p-4 border-t flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={driver.avatar} alt={driver.name} data-ai-hint="person portrait" />
            <AvatarFallback>{driver.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">{driver.name}</p>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Star className="w-4 h-4 fill-primary text-primary" />
              <span>{driver.rating.toFixed(1)}</span>
            </div>
          </div>
        </div>
         <Button asChild variant="ghost" size="sm">
            <Link href={`/trip-details/${id}`}>
              Voir détails <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
