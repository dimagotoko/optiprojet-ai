"use client";

import type { Trip } from "@/types/db";

interface ProchainVersementProps {
  upcomingTrips: Trip[];
}

export function ProchainVersement({ upcomingTrips }: ProchainVersementProps) {
  const total = upcomingTrips.reduce(
    (acc, t) => acc + t.pricePerSeat * (t.totalBookings ?? 0),
    0,
  );

  if (total === 0) return null;

  return (
    <div className="rounded-xl border bg-card p-4 flex items-center justify-between gap-4">
      <div className="shrink-0">
        <p className="text-xs text-muted-foreground mb-1">Prochain versement</p>
        <p className="text-2xl font-bold whitespace-nowrap">
          {total.toLocaleString("fr-CA", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{" "}
          $
        </p>
      </div>
      <div className="text-right text-xs text-muted-foreground min-w-0">
        <p className="truncate">Versé après chaque trajet</p>
        <p className="text-primary font-medium mt-0.5 truncate">
          Virement · prochainement
        </p>
      </div>
    </div>
  );
}
