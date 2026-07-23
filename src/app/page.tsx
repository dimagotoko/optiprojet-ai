"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  MapPin,
  ShieldCheck,
  Users,
} from "lucide-react";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Button } from "@/components/ui/button";
import { TripSearchForm } from "@/components/TripSearchForm";
import { RealTripsSection } from "@/components/home/RealTripsSection";
import { Chatbot } from "@/components/Chatbot";
import { LiveCounters } from "@/components/home/LiveCounters";
import { useState } from "react";

type TripSearch = {
  departure?: string;
  destination?: string;
  date?: Date;
};

export default function Home() {
  const router = useRouter();
  const [tripSearch, setTripSearch] = useState<TripSearch>({});

  const heroImage = PlaceHolderImages.find(
    (img) => img.id === "hero-background",
  );

  const howItWorks = [
    {
      icon: <MapPin className="h-8 w-8 text-primary" />,
      title: "Recherchez votre trajet",
      description:
        "Entrez votre départ, destination et date pour trouver les trajets disponibles.",
    },
    {
      icon: <Users className="h-8 w-8 text-primary" />,
      title: "Réservez votre place",
      description:
        "Réservez votre place en quelques clics. Le paiement est réglé directement avec le conducteur selon le mode qu'il a choisi (comptant, Interac ou les deux).",
    },
    {
      icon: <CalendarDays className="h-8 w-8 text-primary" />,
      title: "Voyagez ensemble",
      description:
        "Rencontrez votre conducteur et profitez d'un voyage économique et convivial.",
    },
    {
      icon: <ShieldCheck className="h-8 w-8 text-primary" />,
      title: "Sécurité avant tout",
      description:
        "Tous nos conducteurs sont vérifiés pour vous assurer un voyage en toute tranquillité.",
    },
  ];

  const handleAiSearch = (search: any) => {
    const newSearch: TripSearch = {};
    if (search.departure) newSearch.departure = search.departure;
    if (search.destination) newSearch.destination = search.destination;
    // The AI returns a date string like "YYYY-MM-DD".
    // new Date("YYYY-MM-DD") might parse it as midnight UTC, which can cause timezone issues.
    // Appending "T00:00:00" ensures it's parsed as midnight in the user's local timezone,
    // which is more robust for date-only operations in the UI.
    if (search.date) {
      const date = new Date(`${search.date}T00:00:00`);
      if (!isNaN(date.getTime())) {
        newSearch.date = date;
      }
    }
    setTripSearch(newSearch);
    router.push(
      `/trips?departure=${newSearch.departure || ""}&destination=${newSearch.destination || ""}&date=${newSearch.date ? newSearch.date.toISOString() : ""}`,
    );
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
            <p className="mt-4 max-w-2xl text-lg sm:text-xl font-semibold bg-gradient-to-r from-cyan-400 to-sky-300 bg-clip-text text-transparent">
              Optimisé par l'IA pour des trajets plus intelligents, économiques
              et conviviaux.
            </p>
            <div className="mt-8 w-full max-w-3xl">
              <TripSearchForm
                key={JSON.stringify(tripSearch)}
                initialSearch={tripSearch}
                onSearch={(s) =>
                  router.push(
                    `/trips?departure=${s.departure || ""}&destination=${s.destination || ""}&date=${s.date ? s.date.toISOString() : ""}`,
                  )
                }
              />
            </div>
          </div>
        </div>
      </section>

      <LiveCounters />

      <section
        id="comment-ca-marche"
        className="w-full py-12 md:py-24 lg:py-32 bg-background"
      >
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">
                Comment ça marche ?
              </h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Rejoignez la communauté KamGo en quatre étapes simples.
              </p>
            </div>
          </div>
          <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-4 lg:max-w-none mt-12">
            {howItWorks.map((step, index) => (
              <div key={step.title} className="grid gap-4 text-center">
                <div className="flex flex-col items-center gap-3">
                  <span className="text-xs font-bold text-primary uppercase tracking-widest">
                    Étape {index + 1}
                  </span>
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                    {step.icon}
                  </div>
                </div>
                <h3 className="text-lg font-bold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA for drivers */}
      <section className="w-full py-12 md:py-20 bg-secondary/50 border-y border-border">
        <div className="container px-4 md:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Vous conduisez ? Rentabilisez vos trajets.
            </h2>
            <p className="mt-2 text-muted-foreground max-w-xl">
              Proposez vos trajets, partagez les frais et voyagez accompagné.
              Inscription gratuite.
            </p>
          </div>
          <Button asChild size="lg" className="shrink-0">
            <Link href="/signup">
              Devenir conducteur <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section
        id="trajets-populaires"
        className="w-full py-12 md:py-24 lg:py-32 bg-secondary/20"
      >
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">
                Trajets populaires
              </h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Découvrez les itinéraires les plus prisés par notre communauté.
              </p>
            </div>
          </div>
          <RealTripsSection />
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
