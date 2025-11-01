
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CalendarDays, MapPin, ShieldCheck, Users } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Button } from '@/components/ui/button';
import { TripSearchForm } from '@/components/TripSearchForm';
import { TripCard } from '@/components/TripCard';
import { Chatbot } from '@/components/Chatbot';
import { useState } from 'react';

type TripSearch = {
  departure?: string;
  destination?: string;
  date?: Date;
};

export default function Home() {
  const [tripSearch, setTripSearch] = useState<TripSearch>({});

  const heroImage = PlaceHolderImages.find((img) => img.id === 'hero-background');

  const howItWorks = [
    {
      icon: <MapPin className="h-8 w-8 text-primary" />,
      title: 'Recherchez votre trajet',
      description: 'Entrez votre départ, destination et date pour trouver les trajets disponibles.',
    },
    {
      icon: <Users className="h-8 w-8 text-primary" />,
      title: 'Réservez votre place',
      description: 'Payez en toute sécurité via notre plateforme et confirmez votre réservation.',
    },
    {
      icon: <CalendarDays className="h-8 w-8 text-primary" />,
      title: 'Voyagez ensemble',
      description: "Rencontrez votre conducteur et profitez d'un voyage économique et convivial.",
    },
    {
      icon: <ShieldCheck className="h-8 w-8 text-primary" />,
      title: 'Sécurité avant tout',
      description: 'Tous nos conducteurs sont vérifiés pour vous assurer un voyage en toute tranquillité.',
    },
  ];

  const popularTrips = [
    {
      from: 'Montréal',
      to: 'Québec',
      date: '30 Juil',
      price: '35$',
      driver: {
        name: 'Amélie Tremblay',
        avatar: PlaceHolderImages.find((img) => img.id === 'avatar-1')?.imageUrl || '',
        rating: 4.9,
      },
    },
    {
      from: 'Longueuil',
      to: 'Laval',
      date: '02 Août',
      price: '15$',
      driver: {
        name: 'Félix Bouchard',
        avatar: PlaceHolderImages.find((img) => img.id === 'avatar-2')?.imageUrl || '',
        rating: 4.8,
      },
    },
    {
      from: 'Montréal',
      to: 'Sherbrooke',
      date: '05 Août',
      price: '25$',
      driver: {
        name: 'Florence Gagnon',
        avatar: PlaceHolderImages.find((img) => img.id === 'avatar-3')?.imageUrl || '',
        rating: 5.0,
      },
    },
  ];

  const handleAiSearch = (search: any) => {
    const newSearch: TripSearch = {};
    if (search.departure) newSearch.departure = search.departure;
    if (search.destination) newSearch.destination = search.destination;
    // The AI returns a date string like "YYYY-MM-DD".
    // new Date("YYYY-MM-DD") creates a date at midnight UTC.
    // To avoid timezone issues where it might become the previous day,
    // we create the date and then get the UTC components.
    if (search.date) {
      const dateParts = search.date.split('-').map(Number);
      // Create date in UTC to avoid timezone shifts.
      newSearch.date = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2]));
    }
    setTripSearch(newSearch);
  };


  return (
    <div className="flex flex-col min-h-[100dvh]">
      <section className="relative w-full h-[70vh] md:h-[80vh]">
        {heroImage && (
          <Image
            src={heroImage.imageUrl}
            alt={heroImage.description}
            data-ai-hint={heroImage.imageHint}
            fill
            className="object-cover"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center text-primary-foreground px-4">
          <div className="max-w-4xl mx-auto flex flex-col items-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl font-headline text-foreground">
              Trouvez votre covoiturage idéal
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground sm:text-xl">
              Optimisé par l'IA pour des trajets plus intelligents, économiques et conviviaux.
            </p>
            <div className="mt-8 w-full max-w-3xl">
              <TripSearchForm key={JSON.stringify(tripSearch)} initialSearch={tripSearch} />
            </div>
          </div>
        </div>
      </section>

      <section id="comment-ca-marche" className="w-full py-12 md:py-24 lg:py-32 bg-background">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">Comment ça marche ?</h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Rejoignez la communauté OptiTrajet en quatre étapes simples.
              </p>
            </div>
          </div>
          <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-4 lg:max-w-none mt-12">
            {howItWorks.map((step) => (
              <div key={step.title} className="grid gap-4 text-center">
                <div className="flex justify-center items-center">{step.icon}</div>
                <h3 className="text-lg font-bold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="trajets-populaires" className="w-full py-12 md:py-24 lg:py-32 bg-secondary/20">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">Trajets populaires</h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Découvrez les itinéraires les plus prisés par notre communauté.
              </p>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-12">
            {popularTrips.map((trip, index) => (
              <TripCard key={index} {...trip} />
            ))}
          </div>
          <div className="mt-12 text-center">
            <Button asChild size="lg">
              <Link href="/trips">
                Voir tous les trajets <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
      <Chatbot onSearch={handleAiSearch} />
    </div>
  );
}
