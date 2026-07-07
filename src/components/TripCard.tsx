"use client";

import * as React from "react";
import { ArrowRight, Calendar, Star } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { Button } from "./ui/button";
import Link from "next/link";

type TripCardProps = {
  id: string;
  from: string;
  to: string;
  date: string;
  price: string;
  onLocationClick?: (type: "departure" | "destination", value: string) => void;
  // Driver info — all optional; row skeletonises while isDriverLoading, hides when absent
  driverName?: string;
  driverPhotoUrl?: string;
  driverRating?: number;
  driverTotalRatings?: number;
  driverIsVerified?: boolean;
  isDriverLoading?: boolean;
};

const formatDriverName = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return name;
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
};

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0][0] ?? "?").toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export function TripCard({
  id,
  from,
  to,
  date,
  price,
  onLocationClick,
  driverName,
  driverPhotoUrl,
  driverRating,
  driverTotalRatings,
  driverIsVerified,
  isDriverLoading,
}: TripCardProps) {
  const toSeed = (s: string) => {
    if (!s) return 0;
    return s.split("").reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);
  };

  const handleLocationClick = (
    type: "departure" | "destination",
    value: string,
  ) => {
    if (onLocationClick) {
      onLocationClick(type, value);
    }
  };

  const LocationButton = ({
    value,
    type,
  }: {
    value: string;
    type: "departure" | "destination";
  }) => (
    <Button
      variant="link"
      className="p-0 h-auto text-sm font-semibold text-card-foreground hover:text-primary transition-colors min-w-0 flex-1"
      onClick={() => handleLocationClick(type, value)}
      disabled={!onLocationClick}
      title={value}
    >
      <span className="line-clamp-2 break-words">{value}</span>
    </Button>
  );

  return (
    <Card className="flex flex-col h-full transition-all duration-200 hover:shadow-lg hover:-translate-y-1 overflow-hidden">
      <CardHeader className="p-4 relative">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-1 font-semibold min-w-0 flex-1">
            <LocationButton value={from} type="departure" />
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
            <LocationButton value={to} type="destination" />
          </div>
          <Badge variant="secondary" className="text-sm font-bold shrink-0">
            {price}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-4 pt-0 space-y-3">
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

        {/* Rangée conducteur */}
        {isDriverLoading ? (
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-muted animate-pulse shrink-0" />
            <div className="h-3.5 w-28 rounded bg-muted animate-pulse" />
          </div>
        ) : driverName ? (
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarImage src={driverPhotoUrl} alt={driverName} />
              <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                {getInitials(driverName)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground truncate flex-1">
              {formatDriverName(driverName)}
            </span>
            {(driverTotalRatings ?? 0) > 0 ? (
              <span className="flex items-center gap-0.5 text-xs text-muted-foreground shrink-0">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                <span>{driverRating?.toFixed(1)}</span>
              </span>
            ) : (
              <Badge
                variant="secondary"
                className="text-xs px-1.5 py-0 shrink-0 font-normal"
              >
                Nouveau
              </Badge>
            )}
            {driverIsVerified && (
              <Badge
                variant="outline"
                className="text-xs px-1.5 py-0 shrink-0 font-normal text-emerald-700 border-emerald-300 dark:text-emerald-400 dark:border-emerald-700"
              >
                Vérifié
              </Badge>
            )}
          </div>
        ) : null}
      </CardContent>
      <CardFooter className="p-4 border-t flex justify-end items-center">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/trip-details/${id}`}>
            Voir détails <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
