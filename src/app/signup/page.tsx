
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
    postalCode: z.string().min(1, { message: 'Le code postal est requis.' }),
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

function SignupPageInternal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();

  const emailFromQuery = searchParams.get('email') || '';

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onChange', // Validate on change
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

      // 3. Create user document in Firestore
      const userDocRef = doc(firestore, 'users', user.uid);
      await setDoc(userDocRef, {
        id: user.uid,
        name: values.fullName,
        email: values.email,
        city: values.city,
        postalCode: values.postalCode,
        role: values.userType,
        phoneNumber: values.phoneNumber,
        profilePictureUrl: values.profilePictureUrl || '',
        driverLicense: '',
        stripeCustomerId: '',
        averageRating: 0,
        totalRatings: 0,
      });

      toast({
        title: 'Compte créé avec succès!',
        description: "Vous allez être redirigé vers votre tableau de bord.",
      });
       // Use window.location.href for a full page reload to ensure all states (like Header) are reset
      window.location.href = '/dashboard';
    } catch (error: any) {
      console.error('Signup error:', error.code, error.message);
      let description =
        "Une erreur est survenue lors de l'inscription. Veuillez réessayer.";
      if (error.code === 'auth/email-already-in-use') {
        description =
          'Cette adresse e-mail est déjà utilisée. Essayez de vous connecter.';
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
                        <Input type="password" {...field} autoComplete="new-password" />
                      </FormControl>
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
                        <Input type="password" {...field} autoComplete="new-password"/>
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
                          <Input placeholder="H3A 0G4" {...field} />
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
                <Button 
                    type="button" 
                    variant="ghost" 
                    className="w-full mt-2" 
                    onClick={() => router.push('/')}
                >
                    Annuler
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
    <React.Suspense fallback={<div>Loading...</div>}>
      <SignupPageInternal />
    </React.Suspense>
  );
}

    