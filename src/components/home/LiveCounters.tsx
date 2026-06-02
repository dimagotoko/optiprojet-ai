'use client';

import { useEffect, useState } from 'react';
import { useFirestore } from '@/firebase';
import { collection, getCountFromServer } from 'firebase/firestore';
import { Car, Leaf, Users } from 'lucide-react';

function useCountUp(target: number, duration = 1200) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (target === 0) return;
    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
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

function Counter({ value, label, icon: Icon, unit }: {
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
        {displayed.toLocaleString('fr-CA')}{unit}
      </span>
      <span className="text-sm text-muted-foreground text-center">{label}</span>
    </div>
  );
}

export function LiveCounters() {
  const firestore = useFirestore();
  const [stats, setStats] = useState({ trips: 0, co2: 0, members: 0 });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!firestore || loaded) return;

    async function fetchCounts() {
      try {
        const [tripsSnap, usersSnap] = await Promise.all([
          getCountFromServer(collection(firestore!, 'trips')),
          getCountFromServer(collection(firestore!, 'users')),
        ]);
        const trips = tripsSnap.data().count;
        const members = usersSnap.data().count;
        // ~18 kg CO₂ évités par trajet (150 km moy. × 0,12 kg/km)
        const co2 = Math.round(trips * 18);
        setStats({ trips, co2, members });
        setLoaded(true);
      } catch {
        // Silently ignore — section simply won't show
      }
    }

    fetchCounts();
  }, [firestore, loaded]);

  if (!loaded && stats.trips === 0) return null;

  return (
    <section className="w-full border-y bg-card py-8">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-0 divide-y sm:divide-y-0 sm:divide-x divide-border">
          <Counter value={stats.trips} label="Trajets partagés" icon={Car} />
          <Counter value={stats.co2} label="kg de CO₂ évités" icon={Leaf} unit=" kg" />
          <Counter value={stats.members} label="Membres inscrits" icon={Users} />
        </div>
      </div>
    </section>
  );
}
