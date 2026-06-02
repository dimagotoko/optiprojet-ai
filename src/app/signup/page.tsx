'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useFirestore } from '@/firebase';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Logo } from '@/components/Logo';
import { Eye, EyeOff } from 'lucide-react';
import React from 'react';
import { LoadingLogo } from '@/components/LoadingLogo';

const formSchema = z
  .object({
    fullName: z.string().min(1, { message: 'Le nom complet est requis.' }),
    email: z
      .string()
      .email({ message: 'Veuillez entrer une adresse email valide.' }),
    phoneNumber: z.string().min(10, { message: 'Le numéro de téléphone est requis.' }),
    password: z
      .string()
      .min(6, { message: 'Le mot de passe doit contenir au moins 6 caractères.' }),
    confirmPassword: z.string(),
    city: z.string().min(1, { message: 'La ville est requise.' }),
    postalCode: z.string()
      .min(1, { message: 'Le code postal est requis.' })
      .regex(/^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$/, { message: 'Format invalide. Exemple : H3A 0G4' }),
    profilePictureUrl: z.string().url({ message: "Veuillez entrer une URL valide." }).optional().or(z.literal('')),
    userType: z.enum(['voyageur', 'transporteur'], {
      required_error: 'Veuillez sélectionner un type de compte.',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas.',
    path: ['confirmPassword'],
  });

type SignupFormValues = z.infer<typeof formSchema>;

function passwordStrength(pwd: string): { score: number; label: string; color: string } {
  if (!pwd) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 1) return { score, label: 'Faible', color: 'bg-red-500' };
  if (score === 2) return { score, label: 'Moyen', color: 'bg-orange-400' };
  if (score === 3) return { score, label: 'Fort', color: 'bg-yellow-400' };
  return { score, label: 'Très fort', color: 'bg-green-500' };
}

function SignupPageInternal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const emailFromQuery = searchParams.get('email') || '';

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      fullName: '',
      email: emailFromQuery,
      phoneNumber: '',
      password: '',
      confirmPassword: '',
      city: '',
      postalCode: '',
      profilePictureUrl: '',
      userType: 'voyageur',
    },
  });

  const {
    formState: { isSubmitting, isValid },
  } = form;

  const passwordValue = form.watch('password') ?? '';
  const strength = passwordStrength(passwordValue);

  const onSubmit = async (values: SignupFormValues) => {
    if (!auth || !firestore) return;
    try {
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );
      const user = userCredential.user;

      // 2. Update Firebase Auth profile
      await updateProfile(user, {
        displayName: values.fullName,
        photoURL: values.profilePictureUrl || null,
      });

      // 3. Create user document in Firestore — champs publics + sous-doc privé
      const userDocRef    = doc(firestore, 'users', user.uid);
      const privateDocRef = doc(firestore, 'users', user.uid, 'private', 'profile');

      await setDoc(userDocRef, {
        id: user.uid,
        name: values.fullName,
        city: values.city,
        role: values.userType,
        profilePictureUrl: values.profilePictureUrl || '',
        averageRating: 0,
        totalRatings: 0,
      });

      await setDoc(privateDocRef, {
        email: values.email,
        phoneNumber: values.phoneNumber,
        postalCode: values.postalCode,
        driverLicense: '',
      });

      toast({
        title: 'Compte créé avec succès!',
        description: "Bienvenue sur OptiTrajet AI.",
      });

      // Force a full refresh to ensure all providers are synced with the new user data and project ID
      window.location.href = '/dashboard';

    } catch (error: any) {
      console.error("Signup error:", error);
      let description = "Une erreur est survenue lors de l'inscription.";
      if (error.code === 'auth/email-already-in-use') {
        description = 'Cette adresse e-mail est déjà utilisée.';
      }
      toast({
        variant: 'destructive',
        title: "Erreur d'inscription",
        description: description,
      });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-10rem)] py-12 px-4">
      <Card className="w-full max-w-md mx-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Logo className="h-10 w-10 text-primary" />
              </div>
              <CardTitle className="text-2xl">Créer un compte</CardTitle>
              <CardDescription>
                Rejoignez la communauté et commencez à voyager plus intelligemment.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom complet</FormLabel>
                      <FormControl>
                        <Input placeholder="Prénom Nom" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="m@example.com" {...field} />
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
                          <Input type="tel" placeholder="514-555-1234" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="profilePictureUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Photo de profil <span className="text-muted-foreground">(URL, optionnel)</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="url"
                          placeholder="https://example.com/photo.jpg"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mot de passe</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            className="pr-10"
                            {...field}
                            autoComplete="new-password"
                          />
                          <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => setShowPassword(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      {passwordValue && (
                        <div className="mt-1 space-y-1">
                          <div className="flex gap-1">
                            {[1, 2, 3, 4].map(i => (
                              <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= strength.score ? strength.color : 'bg-muted'}`} />
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground">{strength.label}</p>
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmer le mot de passe</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? 'text' : 'password'}
                            className="pr-10"
                            {...field}
                            autoComplete="new-password"
                          />
                          <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => setShowConfirmPassword(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            aria-label={showConfirmPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ville</FormLabel>
                        <FormControl>
                          <Input placeholder="Montréal" {...field} />
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
                        <FormLabel>Code Postal</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="H3A 0G4"
                            maxLength={7}
                            {...field}
                            onChange={(e) => {
                              const raw = e.target.value.toUpperCase().replace(/\s/g, '');
                              const formatted = raw.length > 3
                                ? `${raw.slice(0, 3)} ${raw.slice(3, 6)}`
                                : raw;
                              field.onChange(formatted);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="userType"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Je suis un...</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex gap-4 pt-2"
                        >
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <RadioGroupItem value="voyageur" />
                            </FormControl>
                            <FormLabel className="font-normal">Voyageur</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <RadioGroupItem value="transporteur" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Transporteur
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="mt-2 text-center text-sm">
                    Vous avez déjà un compte?{' '}
                    <Link href="/login" className="underline">
                    Connectez-vous
                    </Link>
                </div>
            </CardContent>
            <CardFooter className="flex-col items-stretch">
                <Button
                    type="submit"
                    className="w-full"
                    disabled={!isValid || isSubmitting || !auth || !firestore}
                >
                    {isSubmitting ? (
                    <>
                        <LoadingLogo className="mr-2 h-4 w-4" />
                        Création en cours...
                    </>
                    ) : (
                    'Créer mon compte'
                    )}
                </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}

export default function SignupPage() {
  return (
    <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen"><LoadingLogo className="h-12 w-12" /></div>}>
      <SignupPageInternal />
    </React.Suspense>
  );
}
