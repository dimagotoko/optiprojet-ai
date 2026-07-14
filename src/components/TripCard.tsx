"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Calendar, MapPin, Navigation, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getTripGradient } from "@/lib/trip-gradient";
import { StarRating } from "@/components/ui/StarRating";

// "Berri-UQAM, Rue Sainte-Catherine Est, Montréal, QC, Canada" → "Berri-UQAM, Montréal"
function shortAddress(full: string): string {
  const parts = full.split(", ").map((s) => s.trim());
  const filtered = parts.filter((p) => p !== "Canada" && !/^[A-Z]{2}$/.test(p));
  if (filtered.length <= 1) return filtered[0] ?? full;
  if (filtered.length === 2) return filtered.join(", ");
  return `${filtered[0]}, ${filtered[filtered.length - 1]}`;
}

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

type TripCardProps = {
  id: string;
  from: string;
  to: string;
  date: string; // date + heure formatée
  price: string;
  seatsBooked?: number;
  totalSeats?: number;
  driverName?: string;
  driverPhotoUrl?: string;
  driverRating?: number;
  driverTotalRatings?: number;
  driverIsVerified?: boolean;
  isDriverLoading?: boolean;
};

export function TripCard({
  id,
  from,
  to,
  date,
  price,
  seatsBooked,
  totalSeats,
  driverName,
  driverPhotoUrl,
  driverRating,
  driverTotalRatings,
  driverIsVerified,
  isDriverLoading,
}: TripCardProps) {
  const gradient = getTripGradient(to);
  const fillPercent =
    totalSeats != null && totalSeats > 0
      ? Math.min(((seatsBooked ?? 1) / totalSeats) * 100, 100)
      : 0;
  const remaining = totalSeats != null ? totalSeats - (seatsBooked ?? 0) : null;

  return (
    <Link href={`/trip-details/${id}`} className="block group">
      <Card className="flex flex-col h-full transition-all duration-200 hover:shadow-lg hover:-translate-y-1 overflow-hidden cursor-pointer">
        {/* ─── Bandeau gradient compact ─── */}
        <div
          className="relative h-20 shrink-0 overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
          }}
        >
          <div className="absolute inset-0 bg-black/25" />
          <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/10" />
          <div className="absolute -bottom-4 -left-4 h-16 w-16 rounded-full bg-white/10" />

          {/* Itinéraire + prix */}
          <div className="absolute inset-0 flex items-center justify-between px-3 py-2">
            <div className="flex flex-col gap-0.5 min-w-0 flex-1 mr-2">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3 w-3 text-white/80 shrink-0" />
                <span className="text-white font-semibold text-sm truncate leading-tight">
                  {shortAddress(from)}
                </span>
              </div>
              <span className="pl-1 text-white/50 text-xs leading-none">↓</span>
              <div className="flex items-center gap-1.5">
                <Navigation className="h-3 w-3 text-white/80 shrink-0" />
                <span className="text-white font-semibold text-sm truncate leading-tight">
                  {shortAddress(to)}
                </span>
              </div>
            </div>
            <span className="shrink-0 text-white font-bold text-base leading-none bg-black/25 rounded-lg px-2.5 py-1.5">
              {price}
            </span>
          </div>
        </div>

        {/* ─── Corps ─── */}
        <CardContent className="flex flex-col gap-2.5 p-3 flex-grow">
          {/* Date + heure */}
          <div className="flex items-center gap-1.5 text-sm font-medium text-cyan-700 dark:text-primary">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span>{date}</span>
          </div>

          {/* Barre de remplissage */}
          {totalSeats != null && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {seatsBooked ?? 0} / {totalSeats} place
                  {totalSeats !== 1 ? "s" : ""}
                </span>
                {remaining != null && (
                  <span>
                    {remaining} restante{remaining !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <div className="h-1 w-full rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary motion-safe:transition-[width] duration-500"
                  style={{ width: `${fillPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Conducteur */}
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
                <StarRating
                  rating={driverRating ?? 0}
                  totalRatings={driverTotalRatings ?? 0}
                  size="sm"
                  className="shrink-0"
                />
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

          {/* Voir détails — indicateur visuel, navigation gérée par le Link parent */}
          <div className="mt-auto border-t pt-2 flex justify-end">
            <span className="inline-flex items-center gap-1 text-sm text-primary font-medium group-hover:underline transition-colors">
              Voir détails <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
