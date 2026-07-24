"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser, useFirestore } from "@/firebase";
import { AvatarUpload } from "@/components/AvatarUpload";
import { doc, getDoc, setDoc, increment } from "firebase/firestore";
import type { Timestamp } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { signProtocol } from "@/lib/protocol";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LoadingLogo } from "@/components/LoadingLogo";
import { ProfileSkeleton } from "@/components/skeletons/ProfileSkeleton";
import { CheckCircle, FileText, Shield } from "lucide-react";

function ProtocolText({ role }: { role: string }) {
  if (role === "transporteur") {
    return (
      <ul className="text-sm text-muted-foreground space-y-1.5">
        <li>
          • Respecter les passagers : politesse, ponctualité et propreté du
          véhicule
        </li>
        <li>
          • Ne jamais conduire sous l&apos;influence de substances psychoactives
        </li>
        <li>
          • Maintenir votre véhicule en bon état de fonctionnement et conforme
          au code de la route
        </li>
        <li>
          • Respecter les tarifs affichés et ne pas demander de paiements
          supplémentaires non convenus
        </li>
        <li>
          • Signaler tout incident ou problème dans les 24 h via le support
        </li>
      </ul>
    );
  }
  return (
    <ul className="text-sm text-muted-foreground space-y-1.5">
      <li>
        • Respecter le conducteur et les autres passagers : politesse et
        ponctualité
      </li>
      <li>
        • Ne pas transporter de bagages dangereux, illicites ou encombrants sans
        accord préalable
      </li>
      <li>
        • Honorer vos réservations confirmées ou annuler dans les délais prévus
      </li>
      <li>
        • Ne pas partager les coordonnées personnelles des conducteurs en dehors
        de la plateforme
      </li>
      <li>
        • Signaler tout incident ou comportement inapproprié dans les 24 h via
        le support
      </li>
    </ul>
  );
}

const profileSchema = z.object({
  fullName: z.string().min(1, "Le nom complet est requis."),
  email: z.string().email("Veuillez entrer une adresse email valide."),
  phoneNumber: z.string().min(10, "Le numéro de téléphone est requis."),
  city: z.string().min(1, "La ville est requise."),
  postalCode: z.string().min(1, "Le code postal est requis."),
  userType: z.enum(["voyageur", "transporteur"]),
  driverLicense: z.string().optional(),
  protocolAccepted: z.boolean(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

function ProfilePageInternal() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const redirect = searchParams.get("redirect");
  const redirectUrl =
    redirect && redirect.startsWith("/") ? redirect : "/dashboard";
  const [isDataLoading, setIsDataLoading] = React.useState(false);
  const [initialData, setInitialData] =
    React.useState<ProfileFormValues | null>(null);
  const [existingProtocolSignedAt, setExistingProtocolSignedAt] =
    React.useState<Timestamp | null>(null);
  const [currentPhotoUrl, setCurrentPhotoUrl] = React.useState<string>("");
  const isNewProfileRef = React.useRef(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phoneNumber: "",
      city: "",
      postalCode: "",
      userType: "voyageur",
      driverLicense: "",
      protocolAccepted: false,
    },
  });

  const {
    formState: { isSubmitting },
  } = form;
  const watchedUserType = form.watch("userType");

  React.useEffect(() => {
    if (isUserLoading || !user || !firestore) return;

    const fetchUserData = async () => {
      try {
        setIsDataLoading(true);
        const userRef = doc(firestore, "users", user.uid);
        const privateRef = doc(
          firestore,
          "users",
          user.uid,
          "private",
          "profile",
        );

        const [userSnap, privateSnap] = await Promise.all([
          getDoc(userRef),
          getDoc(privateRef),
        ]);

        isNewProfileRef.current = !userSnap.exists();

        const pub = userSnap.exists() ? userSnap.data() : {};
        const priv = privateSnap.exists() ? privateSnap.data() : {};

        const signedAt = priv.protocolSignedAt as Timestamp | undefined;
        setExistingProtocolSignedAt(signedAt ?? null);

        setCurrentPhotoUrl(pub.profilePictureUrl || user.photoURL || "");
        form.reset({
          fullName: pub.name || user.displayName || "",
          email: priv.email || user.email || "",
          phoneNumber: priv.phoneNumber || "",
          city: pub.city || "",
          postalCode: priv.postalCode || "",
          userType: (pub.role as "voyageur" | "transporteur") || "voyageur",
          driverLicense: priv.driverLicense || "",
          protocolAccepted: !!signedAt,
        });
        setInitialData(form.getValues());
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setIsDataLoading(false);
      }
    };

    fetchUserData();
  }, [user, isUserLoading, firestore, form]);

  const handleCancel = () => {
    if (initialData) form.reset(initialData);
  };

  const onSubmit = async (values: ProfileFormValues) => {
    if (!user || !firestore) return;

    try {
      const userDocRef = doc(firestore, "users", user.uid);
      const privateDocRef = doc(
        firestore,
        "users",
        user.uid,
        "private",
        "profile",
      );

      await Promise.all([
        setDoc(
          userDocRef,
          {
            id: user.uid,
            name: values.fullName,
            city: values.city,
            role: values.userType,
          },
          { merge: true },
        ),
        setDoc(
          privateDocRef,
          {
            email: values.email,
            phoneNumber: values.phoneNumber,
            postalCode: values.postalCode,
            driverLicense: values.driverLicense ?? "",
          },
          { merge: true },
        ),
      ]);

      // Signature du protocole : idempotente (ne réécrit jamais la date originale)
      if (values.protocolAccepted && !existingProtocolSignedAt) {
        await signProtocol(firestore, user.uid);
      }

      if (isNewProfileRef.current) {
        isNewProfileRef.current = false;
        const statsRef = doc(firestore, "stats", "global");
        setDoc(statsRef, { memberCount: increment(1) }, { merge: true }).catch(
          () => {},
        );
      }

      if (user.displayName !== values.fullName) {
        await updateProfile(user, { displayName: values.fullName });
      }

      toast({
        title: "Profil mis à jour",
        description: "Vos informations ont été sauvegardées avec succès.",
      });

      window.location.href = redirectUrl;
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description:
          "Une erreur est survenue lors de la mise à jour de votre profil.",
      });
    }
  };

  if (isUserLoading || isDataLoading) {
    return <ProfileSkeleton />;
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  const avatarFallback =
    (form.watch("fullName") || user.displayName || "")
      .split(" ")
      .map((n) => n.charAt(0).toUpperCase())
      .slice(0, 2)
      .join("") || "U";

  return (
    <div className="container py-12 px-4 md:px-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage
                    src={currentPhotoUrl || undefined}
                    alt={user.displayName || "Avatar"}
                  />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xl">
                    {avatarFallback}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-xl sm:text-3xl font-bold">
                    {form.watch("fullName") || user.displayName || "Mon Profil"}
                  </CardTitle>
                  <CardDescription>{user.email}</CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Identité */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-primary">
                    Identité
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom complet</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="space-y-1.5">
                    <p className="text-sm font-medium leading-none">
                      Photo de profil
                    </p>
                    <AvatarUpload
                      uid={user.uid}
                      currentUrl={currentPhotoUrl}
                      displayName={
                        form.watch("fullName") || user.displayName || ""
                      }
                      onUploadComplete={(url) => setCurrentPhotoUrl(url)}
                      onRemove={() => setCurrentPhotoUrl("")}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Coordonnées */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-primary">
                    Coordonnées
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Courriel</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="votre@email.com" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Téléphone</FormLabel>
                          <FormControl>
                            <Input
                              type="tel"
                              {...field}
                              placeholder="+1 514 000 0000"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ville</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="postalCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Code postal</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Rôle */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-primary">Rôle</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <FormField
                    control={form.control}
                    name="userType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Je suis un…</FormLabel>
                        <FormControl>
                          <div className="grid grid-cols-2 gap-3 pt-1">
                            {(["voyageur", "transporteur"] as const).map(
                              (val) => (
                                <div
                                  key={val}
                                  onClick={() => field.onChange(val)}
                                  className={cn(
                                    "flex items-center justify-center rounded-lg border px-4 py-3 text-sm font-medium cursor-pointer transition-colors",
                                    field.value === val
                                      ? "border-primary bg-primary/10 text-primary"
                                      : "border-white/[0.06] text-muted-foreground hover:border-primary/30 hover:text-foreground",
                                  )}
                                >
                                  {val === "voyageur"
                                    ? "Voyageur"
                                    : "Transporteur"}
                                </div>
                              ),
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {watchedUserType === "transporteur" && (
                    <FormField
                      control={form.control}
                      name="driverLicense"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Numéro de permis de conduire</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ex. A12-345-678-9" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </CardContent>
              </Card>

              {/* Protocole d'utilisation */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-primary flex items-center gap-2">
                    <Shield className="h-4 w-4" aria-hidden="true" />
                    Protocole d&apos;utilisation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {existingProtocolSignedAt ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-success">
                        <CheckCircle className="h-4 w-4" aria-hidden="true" />
                        Accepté le{" "}
                        {format(
                          existingProtocolSignedAt.toDate(),
                          "d MMMM yyyy",
                          { locale: fr },
                        )}
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-auto px-0 py-0 text-xs text-muted-foreground underline-offset-2 hover:underline hover:bg-transparent"
                          >
                            <FileText
                              className="h-3 w-3 mr-1"
                              aria-hidden="true"
                            />
                            Revoir le protocole
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <Shield
                                className="h-4 w-4 text-primary"
                                aria-hidden="true"
                              />
                              Protocole d&apos;utilisation
                            </DialogTitle>
                          </DialogHeader>
                          <ProtocolText role={watchedUserType} />
                        </DialogContent>
                      </Dialog>
                    </div>
                  ) : (
                    <>
                      <ProtocolText role={watchedUserType} />
                      <FormField
                        control={form.control}
                        name="protocolAccepted"
                        render={({ field }) => (
                          <FormItem className="flex items-start gap-3 space-y-0 pt-3">
                            <FormControl>
                              <Checkbox
                                id="protocol-accepted"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel
                              htmlFor="protocol-accepted"
                              className="font-normal cursor-pointer text-sm leading-snug"
                            >
                              {watchedUserType === "transporteur"
                                ? "J'ai lu et j'accepte le protocole des transporteurs KamGo"
                                : "J'ai lu et j'accepte le protocole des voyageurs KamGo"}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </CardContent>
              </Card>
            </CardContent>

            <CardFooter className="border-t px-6 py-4">
              <div className="flex flex-col-reverse sm:flex-row sm:justify-between items-stretch sm:items-center w-full gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={handleCancel}
                  className="w-full sm:w-auto"
                >
                  Annuler les modifications
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  {isSubmitting && <LoadingLogo className="mr-2 h-4 w-4" />}
                  {initialData ? "Mettre à jour le profil" : "Créer mon profil"}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <React.Suspense fallback={<ProfileSkeleton />}>
      <ProfilePageInternal />
    </React.Suspense>
  );
}
