'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { LoadingLogo } from '@/components/LoadingLogo';
import { CheckCircle, Shield } from 'lucide-react';

const profileSchema = z.object({
  fullName:          z.string().min(1, 'Le nom complet est requis.'),
  email:             z.string().email('Veuillez entrer une adresse email valide.'),
  phoneNumber:       z.string().min(10, 'Le numéro de téléphone est requis.'),
  city:              z.string().min(1, 'La ville est requise.'),
  postalCode:        z.string().min(1, 'Le code postal est requis.'),
  profilePictureUrl: z.string().url('Veuillez entrer une URL valide.').optional().or(z.literal('')),
  userType:          z.enum(['voyageur', 'transporteur']),
  driverLicense:     z.string().optional(),
  protocolAccepted:  z.boolean(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isDataLoading, setIsDataLoading] = React.useState(false);
  const [initialData, setInitialData] = React.useState<ProfileFormValues | null>(null);
  const [existingProtocolSignedAt, setExistingProtocolSignedAt] = React.useState<Timestamp | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName:          '',
      email:             '',
      phoneNumber:       '',
      city:              '',
      postalCode:        '',
      profilePictureUrl: '',
      userType:          'voyageur',
      driverLicense:     '',
      protocolAccepted:  false,
    },
  });

  const { formState: { isSubmitting, isDirty } } = form;
  const watchedUserType = form.watch('userType');

  React.useEffect(() => {
    if (isUserLoading || !user || !firestore) return;

    const fetchUserData = async () => {
      try {
        setIsDataLoading(true);
        const userRef    = doc(firestore, 'users', user.uid);
        const privateRef = doc(firestore, 'users', user.uid, 'private', 'profile');

        const [userSnap, privateSnap] = await Promise.all([
          getDoc(userRef),
          getDoc(privateRef),
        ]);

        const pub  = userSnap.exists()    ? userSnap.data()    : {};
        const priv = privateSnap.exists() ? privateSnap.data() : {};

        const signedAt = priv.protocolSignedAt as Timestamp | undefined;
        setExistingProtocolSignedAt(signedAt ?? null);

        form.reset({
          fullName:          pub.name              || user.displayName || '',
          email:             priv.email            || user.email       || '',
          phoneNumber:       priv.phoneNumber      || '',
          city:              pub.city              || '',
          postalCode:        priv.postalCode       || '',
          profilePictureUrl: pub.profilePictureUrl || user.photoURL   || '',
          userType:          (pub.role as 'voyageur' | 'transporteur') || 'voyageur',
          driverLicense:     priv.driverLicense    || '',
          protocolAccepted:  !!signedAt,
        });
        setInitialData(form.getValues());
      } catch (error) {
        console.error('Error fetching profile:', error);
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
      const userDocRef    = doc(firestore, 'users', user.uid);
      const privateDocRef = doc(firestore, 'users', user.uid, 'private', 'profile');

      // Construire les données privées ; protocolSignedAt uniquement si première signature
      const privateData: Record<string, unknown> = {
        email:         values.email,
        phoneNumber:   values.phoneNumber,
        postalCode:    values.postalCode,
        driverLicense: values.driverLicense ?? '',
      };
      if (values.protocolAccepted && !existingProtocolSignedAt) {
        privateData.protocolSignedAt = serverTimestamp();
      }

      await Promise.all([
        setDoc(userDocRef, {
          id:                user.uid,
          name:              values.fullName,
          city:              values.city,
          profilePictureUrl: values.profilePictureUrl,
          role:              values.userType,
        }, { merge: true }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setDoc(privateDocRef, privateData as any, { merge: true }),
      ]);

      if (user.displayName !== values.fullName || user.photoURL !== values.profilePictureUrl) {
        await updateProfile(user, {
          displayName: values.fullName,
          photoURL:    values.profilePictureUrl || undefined,
        });
      }

      toast({
        title:       'Profil mis à jour',
        description: 'Vos informations ont été sauvegardées avec succès.',
      });

      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        variant:     'destructive',
        title:       'Erreur',
        description: 'Une erreur est survenue lors de la mise à jour de votre profil.',
      });
    }
  };

  if (isUserLoading || isDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
        <LoadingLogo className="h-12 w-12 text-primary" />
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="container py-12 px-4 md:px-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage
                    src={form.watch('profilePictureUrl') || user.photoURL || undefined}
                    alt={user.displayName || 'Avatar'}
                  />
                  <AvatarFallback>{user.displayName?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-3xl font-bold">
                    {form.watch('fullName') || user.displayName || 'Mon Profil'}
                  </CardTitle>
                  <CardDescription>{user.email}</CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Nom */}
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom complet</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Photo */}
              <FormField
                control={form.control}
                name="profilePictureUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL de la photo de profil</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://example.com/photo.jpg" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email + Téléphone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
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
                        <Input type="tel" {...field} placeholder="+1 514 000 0000" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Ville + Code postal */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ville</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code Postal</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Type de compte */}
              <FormField
                control={form.control}
                name="userType"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Je suis un…</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex gap-4 pt-2"
                      >
                        <FormItem className="flex items-center space-x-2">
                          <FormControl><RadioGroupItem value="voyageur" /></FormControl>
                          <FormLabel className="font-normal">Voyageur</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl><RadioGroupItem value="transporteur" /></FormControl>
                          <FormLabel className="font-normal">Transporteur</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Permis de conduire — transporteur uniquement */}
              {watchedUserType === 'transporteur' && (
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

              <Separator />

              {/* Protocole d'accord */}
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" aria-hidden="true" />
                  Protocole d'utilisation
                </h3>

                {existingProtocolSignedAt ? (
                  <div className="flex items-center gap-2 text-sm text-green-400">
                    <CheckCircle className="h-4 w-4" aria-hidden="true" />
                    Accepté le {format(existingProtocolSignedAt.toDate(), 'd MMMM yyyy', { locale: fr })}
                  </div>
                ) : (
                  <>
                    {watchedUserType === 'transporteur' ? (
                      <ul className="text-sm text-muted-foreground space-y-1.5">
                        <li>• Respecter les passagers : politesse, ponctualité et propreté du véhicule</li>
                        <li>• Ne jamais conduire sous l'influence de substances psychoactives</li>
                        <li>• Maintenir votre véhicule en bon état de fonctionnement et conforme au code de la route</li>
                        <li>• Respecter les tarifs affichés et ne pas demander de paiements supplémentaires non convenus</li>
                        <li>• Signaler tout incident ou problème dans les 24 h via le support</li>
                      </ul>
                    ) : (
                      <ul className="text-sm text-muted-foreground space-y-1.5">
                        <li>• Respecter le conducteur et les autres passagers : politesse et ponctualité</li>
                        <li>• Ne pas transporter de bagages dangereux, illicites ou encombrants sans accord préalable</li>
                        <li>• Honorer vos réservations confirmées ou annuler dans les délais prévus</li>
                        <li>• Ne pas partager les coordonnées personnelles des conducteurs en dehors de la plateforme</li>
                        <li>• Signaler tout incident ou comportement inapproprié dans les 24 h via le support</li>
                      </ul>
                    )}

                    <FormField
                      control={form.control}
                      name="protocolAccepted"
                      render={({ field }) => (
                        <FormItem className="flex items-start gap-3 space-y-0 pt-1">
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
                            {watchedUserType === 'transporteur'
                            ? "J'ai lu et j'accepte le protocole des transporteurs OptiTrajet AI"
                            : "J'ai lu et j'accepte le protocole des voyageurs OptiTrajet AI"
                          }
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </div>
            </CardContent>

            <CardFooter className="border-t px-6 py-4">
              <div className="flex justify-between items-center w-full gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!isDirty}
                  onClick={handleCancel}
                >
                  Annuler les modifications
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <LoadingLogo className="mr-2 h-4 w-4" />}
                  {initialData ? 'Mettre à jour le profil' : 'Créer mon profil'}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}
