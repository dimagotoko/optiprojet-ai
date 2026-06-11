"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, updateDoc } from "firebase/firestore";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import type { UserProfile } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import {
  Car,
  MapPin,
  PawPrint,
  CigaretteOff,
  Luggage,
  ShoppingBag,
  ArrowRight,
  LayoutDashboard,
  CheckCircle2,
} from "lucide-react";

type Prefs = {
  allowPets: boolean;
  isNonSmoking: boolean;
  allowLargeBags: boolean;
  allowSmallBags: boolean;
};

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>({
    allowPets: false,
    isNonSmoking: true,
    allowLargeBags: true,
    allowSmallBags: true,
  });

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user]);

  const { data: userData, isLoading: isUserDocLoading } =
    useDoc<UserProfile>(userDocRef);

  useEffect(() => {
    if (!isUserLoading && !user) router.push("/login");
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (userData?.onboardingCompleted === true) router.push("/dashboard");
  }, [userData, router]);

  const togglePref = (key: keyof Prefs) =>
    setPrefs((p) => ({ ...p, [key]: !p[key] }));

  const handleFinish = async (destination: string) => {
    if (!user || !firestore) return;
    setSaving(true);
    try {
      await updateDoc(doc(firestore, "users", user.uid), {
        onboardingCompleted: true,
        preferences: prefs,
      });
      router.push(destination);
    } finally {
      setSaving(false);
    }
  };

  if (isUserLoading || isUserDocLoading || !userData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Logo className="h-10 w-10 animate-pulse text-primary" />
      </div>
    );
  }

  const isTransporteur = userData.role === "transporteur";
  const firstName = userData.name?.split(" ")[0] || "";

  const TOTAL_STEPS = 3;
  const progress = Math.round((step / TOTAL_STEPS) * 100);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      {/* Logo */}
      <div className="mb-8 flex items-center gap-2">
        <Logo className="h-7 w-7 text-primary" />
        <span className="text-lg font-bold">OptiTrajet AI</span>
      </div>

      {/* Progress */}
      <div className="mb-8 w-full max-w-md">
        <div className="mb-2 flex justify-between text-xs text-muted-foreground">
          <span>
            Étape {step} sur {TOTAL_STEPS}
          </span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-secondary">
          <div
            className="h-1.5 rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step 1 — Bienvenue */}
      {step === 1 && (
        <Card className="w-full max-w-md">
          <CardContent className="space-y-6 pt-8 pb-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold">
                Bienvenue{firstName ? `, ${firstName}` : ""}&nbsp;!
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Votre compte a été créé avec succès. Prenons 2 minutes pour
                personnaliser votre expérience.
              </p>
            </div>

            {/* Role card */}
            <div className="flex items-start gap-4 rounded-xl border bg-secondary/40 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                {isTransporteur ? (
                  <Car className="h-6 w-6 text-primary" />
                ) : (
                  <MapPin className="h-6 w-6 text-primary" />
                )}
              </div>
              <div>
                <p className="font-semibold">
                  {isTransporteur ? "Conducteur" : "Voyageur"}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {isTransporteur
                    ? "Proposez vos trajets, partagez les frais et rencontrez des voyageurs de confiance."
                    : "Trouvez des trajets abordables, réservez en quelques clics et voyagez confortablement."}
                </p>
              </div>
            </div>

            <Button className="w-full" onClick={() => setStep(2)}>
              Commencer <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2 — Préférences */}
      {step === 2 && (
        <Card className="w-full max-w-md">
          <CardContent className="space-y-6 pt-8 pb-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold">Vos préférences</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {isTransporteur
                  ? "Ces préférences seront affichées sur vos trajets publiés."
                  : "Ces préférences aident les conducteurs à mieux vous accueillir."}
              </p>
            </div>

            <div className="space-y-4">
              {[
                {
                  key: "allowPets" as keyof Prefs,
                  icon: PawPrint,
                  label: "Animaux de compagnie acceptés",
                },
                {
                  key: "isNonSmoking" as keyof Prefs,
                  icon: CigaretteOff,
                  label: "Non-fumeur",
                },
                {
                  key: "allowLargeBags" as keyof Prefs,
                  icon: Luggage,
                  label: "Grands bagages acceptés",
                },
                {
                  key: "allowSmallBags" as keyof Prefs,
                  icon: ShoppingBag,
                  label: "Petits bagages acceptés",
                },
              ].map(({ key, icon: Icon, label }) => (
                <div
                  key={key}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-secondary/40"
                >
                  <Checkbox
                    id={key}
                    checked={prefs[key]}
                    onCheckedChange={() => togglePref(key)}
                  />
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <Label htmlFor={key} className="cursor-pointer text-sm">
                    {label}
                  </Label>
                </div>
              ))}
            </div>

            <Button className="w-full" onClick={() => setStep(3)}>
              Continuer <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3 — Première action */}
      {step === 3 && (
        <Card className="w-full max-w-md">
          <CardContent className="space-y-6 pt-8 pb-8">
            <div className="flex flex-col items-center text-center">
              <CheckCircle2 className="mb-4 h-14 w-14 text-emerald-500" />
              <h1 className="text-2xl font-bold">
                Vous êtes prêt{isTransporteur ? "" : "(e)"}&nbsp;!
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {isTransporteur
                  ? "Publiez votre premier trajet et commencez à partager les frais."
                  : "Trouvez un trajet et profitez de votre première réservation."}
              </p>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={() =>
                handleFinish(isTransporteur ? "/post-trip" : "/trips")
              }
              disabled={saving}
            >
              {isTransporteur
                ? "Proposer mon premier trajet"
                : "Chercher mon premier trajet"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            <button
              onClick={() => handleFinish("/dashboard")}
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <LayoutDashboard className="h-4 w-4" />
              Aller au tableau de bord
            </button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
