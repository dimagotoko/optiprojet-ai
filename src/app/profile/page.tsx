'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';

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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { LoadingLogo } from '@/components/LoadingLogo';

const profileSchema = z.object({
  fullName: z.string().min(1, 'Le nom complet est requis.'),
  email: z.string().email('Veuillez entrer une adresse email valide.'),
  phoneNumber: z.string().min(10, 'Le numéro de téléphone est requis.'),
  city: z.string().min(1, 'La ville est requise.'),
  postalCode: z.string().min(1, 'Le code postal est requis.'),
  profilePictureUrl: z.string().url("Veuillez entrer une URL valide.").optional().or(z.literal('')),
  userType: z.enum(['voyageur', 'transporteur']),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isDataLoading, setIsDataLoading] = React.useState(true);
  const [initialData, setInitialData] = React.useState<ProfileFormValues | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phoneNumber: '',
      city: '',
      postalCode: '',
      profilePictureUrl: '',
      userType: 'voyageur',
    },
  });
  
  const { formState: { isSubmitting, isDirty } } = form;

  React.useEffect(() => {
    if (isUserLoading) return; // Wait until user auth state is resolved
    if (!user) {
      router.push('/login');
      return;
    }
    if (!firestore) {
      setIsDataLoading(false);
      return;
    };

    const fetchUserData = async () => {
      setIsDataLoading(true);
      const userRef = doc(firestore, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      let dataToSet;
      if (userSnap.exists()) {
        const userData = userSnap.data();
        dataToSet = {
          fullName: userData.name || '',
          email: userData.email || user.email || '',
          phoneNumber: userData.phoneNumber || '',
          city: userData.city || '',
          postalCode: userData.postalCode || '',
          profilePictureUrl: userData.profilePictureUrl || '',
          userType: userData.role || 'voyageur',
        };
      } else {
        // Pre-fill with what we know from auth if no DB entry
        dataToSet = {
            fullName: user.displayName || '',
            email: user.email || '',
            phoneNumber: user.phoneNumber || '',
            city: '',
            postalCode: '',
            profilePictureUrl: user.photoURL || '',
            userType: 'voyageur',
        };
      }
      form.reset(dataToSet);
      setInitialData(dataToSet);
      setIsDataLoading(false);
    };

    fetchUserData();
  }, [user, isUserLoading, firestore, router, form]);


  const onSubmit = async (values: ProfileFormValues) => {
    if (!user || !firestore) return;

    try {
      // Update Firestore document
      const userDocRef = doc(firestore, 'users', user.uid);
      await setDoc(userDocRef, {
        name: values.fullName,
        email: values.email,
        phoneNumber: values.phoneNumber,
        city: values.city,
        postalCode: values.postalCode,
        profilePictureUrl: values.profilePictureUrl,
        role: values.userType,
      }, { merge: true });

      // Update Firebase Auth profile
      if (user.displayName !== values.fullName || user.photoURL !== values.profilePictureUrl) {
        await updateProfile(user, {
          displayName: values.fullName,
          photoURL: values.profilePictureUrl || undefined,
        });
      }

      toast({
        title: 'Profil mis à jour',
        description: 'Vos informations ont été sauvegardées avec succès.',
      });
      form.reset(values); // Resets form to new values, making it "not dirty"
      router.refresh();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la mise à jour de votre profil.',
      });
    }
  };
  
  const handleCancel = () => {
    if (initialData) {
      form.reset(initialData);
    }
  }


  if (isUserLoading || isDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
        <LoadingLogo className="h-12 w-12 text-primary" />
      </div>
    );
  }
  
  if (!user) {
    // This will be briefly visible before the redirect kicks in
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
                  <AvatarImage src={form.watch('profilePictureUrl') || user.photoURL || undefined} alt={user.displayName || 'Avatar'} />
                  <AvatarFallback>{user.displayName?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-3xl font-bold">{form.watch('fullName') || user.displayName}</CardTitle>
                  <CardDescription>{user.email}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} disabled />
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
                        <Input type="tel" {...field} />
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
                      <FormLabel>Code Postal</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                        value={field.value}
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
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
                <div className="flex justify-end gap-3 w-full">
                    <Button type="button" variant="outline" onClick={handleCancel} disabled={!isDirty || isSubmitting}>
                        Annuler
                    </Button>
                    <Button type="submit" disabled={!isDirty || isSubmitting}>
                        {isSubmitting && <LoadingLogo className="mr-2 h-4 w-4" />}
                        Mettre à jour le profil
                    </Button>
                </div>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}
