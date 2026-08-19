"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  Check,
  MapPin,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TripSearchForm } from "@/components/TripSearchForm";
import { RealTripsSection } from "@/components/home/RealTripsSection";
import { Chatbot } from "@/components/Chatbot";
import { LiveCounters } from "@/components/home/LiveCounters";
import { useState } from "react";

const HERO_IMAGE: string | null = "/hero/ambiance.jpg";

type TripSearch = {
  departure?: string;
  destination?: string;
  date?: Date;
  passengers?: number;
};

export default function Home() {
  const router = useRouter();
  const [tripSearch, setTripSearch] = useState<TripSearch>({});

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
      title: "Profitez du voyage",
      description:
        "Rencontrez votre conducteur et profitez d'un voyage économique et convivial.",
    },
    {
      icon: <ShieldCheck className="h-8 w-8 text-primary" />,
      title: "Sécurité avant tout",
      description:
        "Chaque conducteur signe notre protocole de confiance et accepte nos conditions d'utilisation.",
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
      {/* ── HÉRO ── */}
      <section
        className="relative h-[55vh] md:h-[70vh] overflow-hidden"
        style={
          HERO_IMAGE
            ? undefined
            : {
                background: [
                  "radial-gradient(ellipse 60% 55% at 75% 8%, rgba(83,200,223,0.20) 0%, transparent 65%)",
                  "radial-gradient(ellipse 45% 50% at 25% 92%, rgba(47,180,209,0.12) 0%, transparent 60%)",
                  "linear-gradient(155deg, #0B1622 0%, #12202F 55%, #162840 100%)",
                ].join(", "),
              }
        }
      >
        {HERO_IMAGE && (
          <Image
            src={HERO_IMAGE}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-[62%_45%] brightness-110 dark:brightness-90"
            aria-hidden="true"
          />
        )}

        {/* Voile — léger en mode clair, plus soutenu en mode sombre */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-black/20 dark:from-black/10 dark:via-transparent dark:to-black/45" />

        {/* Texte centré */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4 pt-14">
          <div className="max-w-3xl">
            <h1
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight font-headline text-white leading-[1.08]"
              style={{ textShadow: "0 2px 20px rgba(11,22,34,0.6)" }}
            >
              Voyagez ensemble,{" "}
              <span className="bg-gradient-to-r from-primary to-cyan-300 bg-clip-text text-transparent">
                partagez les frais.
              </span>
            </h1>
            <p
              className="mt-4 text-base sm:text-lg text-white/75 max-w-xl mx-auto"
              style={{ textShadow: "0 1px 8px rgba(11,22,34,0.7)" }}
            >
              Le covoiturage entre membres, sans commission.
            </p>
          </div>
        </div>
      </section>

      {/* ── FORMULAIRE flottant — chevauche le héro ── */}
      <div className="relative z-20 container px-4 md:px-6 -mt-10 md:-mt-12">
        <div className="bg-card border border-border rounded-2xl shadow-2xl p-4 md:p-6">
          <TripSearchForm
            key={JSON.stringify(tripSearch)}
            initialSearch={tripSearch}
            onSearch={(s) =>
              router.push(
                `/trips?departure=${s.departure || ""}&destination=${s.destination || ""}&date=${s.date ? s.date.toISOString() : ""}&passengers=${s.passengers || 1}`,
              )
            }
          />
        </div>
      </div>

      {/* ── TRUST BAR fine ── */}
      <div className="container px-4 md:px-6 pt-6 pb-2">
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          {[
            "Sans commission",
            "Paiement direct",
            "Plafond légal 0,54 $/km",
          ].map((item) => (
            <span key={item} className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-success shrink-0" />
              {item}
            </span>
          ))}
        </div>
      </div>

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
                Rejoignez la communauté KamGo en quatre étapes simples —
                inscription gratuite.
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
      <section className="relative overflow-hidden w-full py-12 md:py-20 bg-secondary border-y border-white/5">
        <div className="absolute inset-0 pointer-events-none bg-brand-glow-right" />
        <div className="container px-4 md:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Vous conduisez ? Rentabilisez vos trajets.
            </h2>
            <p className="mt-2 text-foreground/70 max-w-xl">
              Proposez vos trajets, partagez les frais et voyagez accompagné.
              Inscription gratuite.
            </p>
          </div>
          <Button asChild size="lg" className="shrink-0 shadow-lg">
            <Link href="/signup">
              Devenir conducteur <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section
        id="trajets-populaires"
        className="w-full py-12 md:py-24 lg:py-32 bg-background"
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
