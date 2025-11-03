
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { Logo } from '@/components/Logo';
import { useAuth } from '@/firebase';
import React from 'react';
import { LoadingLogo } from '@/components/LoadingLogo';

const formSchema = z.object({
  email: z.string().email({ message: 'Veuillez entrer une adresse email valide.' }),
  password: z.string().min(1, { message: 'Veuillez entrer votre mot de passe.' }),
});

type LoginFormValues = z.infer<typeof formSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const {
    formState: { isSubmitting },
  } = form;

  const onSubmit = async (values: LoginFormValues) => {
    if (!auth) return;
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      toast({
        title: 'Connexion réussie',
        description: "Vous allez être redirigé vers votre tableau de bord.",
      });
      // Use window.location.href for a full page reload to ensure all states (like Header) are reset
      window.location.href = '/dashboard';
    } catch (error: any) {
      console.error('Login error:', error.code, error.message);
      let description;
      let action;

      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        description = "L'adresse e-mail ou le mot de passe est incorrect.";
        action = (
            <Button asChild variant="secondary">
                <Link href={`/signup?email=${encodeURIComponent(values.email)}`}>Créer un compte</Link>
            </Button>
        )
      } else {
        description = "Une erreur est survenue lors de la connexion. Veuillez réessayer.";
      }
      
      toast({
        variant: 'destructive',
        title: 'Erreur de connexion',
        description: description,
        action: action
      });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-10rem)] py-12 px-4">
      <Card className="w-full max-w-sm mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Logo className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Connexion</CardTitle>
          <CardDescription>
            Entrez vos identifiants pour accéder à votre compte.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="m@example.com"
                        {...field}
                        autoComplete="email"
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
                    <div className="flex items-center">
                      <FormLabel>Mot de passe</FormLabel>
                      <Link
                        href="#"
                        className="ml-auto inline-block text-sm underline"
                      >
                        Mot de passe oublié?
                      </Link>
                    </div>
                    <FormControl>
                      <Input
                        type="password"
                        {...field}
                        autoComplete="current-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isSubmitting || !auth}>
                {isSubmitting ? (
                  <>
                    <LoadingLogo className="mr-2 h-4 w-4" />
                    Connexion en cours...
                  </>
                ) : (
                  'Se connecter'
                )}
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm">
            Vous n'avez pas de compte?{' '}
            <Link href="/signup" className="underline">
              Inscrivez-vous
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
