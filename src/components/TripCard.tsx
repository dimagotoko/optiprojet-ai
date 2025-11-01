'use client';

import * as React from 'react';
import { ArrowRight, Calendar, Star } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

type TripCardProps = {
  from: string;
  to: string;
  date: string;
  price: string;
  driver: {
    name: string;
    avatar: string;
    rating: number;
  };
};

export function TripCard({ from, to, date, price, driver }: TripCardProps) {
  return (
    <Card className="flex flex-col h-full transition-all hover:shadow-lg hover:-translate-y-1">
      <CardHeader className="p-4">
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
        <div className="flex items-center text-sm text-muted-foreground">
          <Calendar className="mr-2 h-4 w-4" />
          <span>{date}</span>
        </div>
        <div className="h-[200px] bg-muted rounded-lg flex items-center justify-center">
            {/* Placeholder for map */}
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
