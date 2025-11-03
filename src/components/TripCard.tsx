'use client';

import * as React from 'react';
import { ArrowRight, Calendar, Star, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from './ui/button';

type TripCardProps = {
  id?: string;
  from: string;
  to: string;
  date: string;
  price: string;
  driver: {
    name: string;
    avatar: string;
    rating: number;
  };
  showTripActions?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
};

export function TripCard({ id, from, to, date, price, driver, showTripActions = false, onEdit, onDelete }: TripCardProps) {
  // Simple hash function to get a numeric seed from a string for picsum.photos
  const toSeed = (s: string) => {
    if(!s) return 0;
    return s.split('').reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);
  };
  
  return (
    <Card className="flex flex-col h-full transition-all hover:shadow-lg hover:-translate-y-1">
      <CardHeader className="p-4 relative">
        {showTripActions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="mr-2 h-4 w-4" />
                <span>Modifier</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-red-500 focus:text-red-500">
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Annuler le trajet</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <span>{from}</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <span>{to}</span>
          </div>
          <Badge variant="secondary" className="text-base font-bold">{price}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-4 pt-0 space-y-4">
        <div className="relative h-48 w-full rounded-lg overflow-hidden">
          <Image
            src={`https://picsum.photos/seed/${toSeed(to)}/600/400`}
            alt={`Paysage représentant la destination: ${to}`}
            fill
            className="object-cover"
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
      </CardFooter>
    </Card>
  );
}

    