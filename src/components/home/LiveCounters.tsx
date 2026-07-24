"use client";

import { useEffect, useState } from "react";
import { useFirestore } from "@/firebase";
import {
  collection,
  getCountFromServer,
  doc,
  getDoc,
} from "firebase/firestore";
import { Car, Leaf, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function useCountUp(target: number, duration = 1200) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (target === 0) return;
    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress >= 1) {
        setCount(target);
        clearInterval(timer);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);

  return count;
}

function Counter({
  value,
  label,
  icon: Icon,
  unit,
}: {
  value: number;
  label: string;
  icon: React.ElementType;
  unit?: string;
}) {
  const displayed = useCountUp(value);
  return (
    <div className="flex flex-col items-center gap-1 px-6">
      <Icon className="h-6 w-6 text-primary mb-1" />
      <span className="text-3xl font-bold tabular-nums">
        {displayed.toLocaleString("fr-CA")}
        {unit}
      </span>
      <span className="text-sm text-muted-foreground text-center">{label}</span>
    </div>
  );
}

function CounterSkeleton() {
  return (
    <div className="flex flex-col items-center gap-1 px-6">
      <Skeleton className="h-6 w-6 rounded mb-1" />
      <Skeleton className="h-9 w-20 mt-1" />
      <Skeleton className="h-4 w-28 mt-1" />
    </div>
  );
}

export function LiveCounters() {
  const firestore = useFirestore();
  const [stats, setStats] = useState<{
    trips: number;
    co2: number;
    members: number;
  } | null>(null);

  useEffect(() => {
    if (!firestore) return;

    async function fetchCounts() {
      let trips = 0;
      try {
        const tripsSnap = await getCountFromServer(
          collection(firestore!, "trips"),
        );
        trips = tripsSnap.data().count;
      } catch {
        // trips inaccessible — on garde 0
      }

      let members = 0;
      try {
        const statsSnap = await getDoc(doc(firestore!, "stats", "global"));
        if (statsSnap.exists()) {
          members = statsSnap.data().memberCount ?? 0;
        }
      } catch {
        // stats doc absent ou inaccessible
      }

      // ~18 kg CO₂ évités par trajet (150 km moy. × 0,12 kg/km)
      setStats({ trips, co2: Math.round(trips * 18), members });
    }

    fetchCounts();
  }, [firestore]);

  const visibleCounters =
    stats === null
      ? null
      : [
          {
            value: stats.trips,
            label: "Trajets partagés",
            icon: Car,
            unit: undefined,
          },
          {
            value: stats.co2,
            label: "kg de CO₂ évités",
            icon: Leaf,
            unit: " kg",
          },
          {
            value: stats.members,
            label: "Membres inscrits",
            icon: Users,
            unit: undefined,
          },
        ].filter((c) => c.value >= 10);

  if (visibleCounters !== null && visibleCounters.length === 0) return null;

  return (
    <section className="w-full border-y border-white/5 bg-secondary py-8">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-0 divide-y sm:divide-y-0 sm:divide-x divide-white/5">
          {visibleCounters === null ? (
            <>
              <CounterSkeleton />
              <CounterSkeleton />
              <CounterSkeleton />
            </>
          ) : (
            visibleCounters.map((c) => (
              <Counter
                key={c.label}
                value={c.value}
                label={c.label}
                icon={c.icon}
                unit={c.unit}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
}
