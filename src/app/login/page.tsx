"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/Logo";
import { useAuth, useUser } from "@/firebase";
import React from "react";
import { LoadingLogo } from "@/components/LoadingLogo";

const darkBgStyle: React.CSSProperties = {
  backgroundColor: "#0f172a",
  backgroundImage:
    "radial-gradient(circle, rgba(6,182,212,0.18) 1px, transparent 1px)",
  backgroundSize: "24px 24px",
};

const formSchema = z.object({
  email: z
    .string()
    .email({ message: "Veuillez entrer une adresse email valide." }),
  password: z
    .string()
    .min(1, { message: "Veuillez entrer votre mot de passe." }),
});

type LoginFormValues = z.infer<typeof formSchema>;

function safeRedirect(
  redirect: string | null,
  fallback = "/dashboard",
): string {
  if (!redirect || !redirect.startsWith("/")) return fallback;
  return redirect;
}

function LoginPageInternal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const [loginError, setLoginError] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);

  const redirect = searchParams.get("redirect");
  const redirectUrl = safeRedirect(redirect);
  const signupHref = redirect
    ? `/signup?redirect=${encodeURIComponent(redirect)}`
    : "/signup";

  React.useEffect(() => {
    if (!isUserLoading && user) {
      router.push(redirectUrl);
    }
  }, [user, isUserLoading, router, redirectUrl]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const {
    formState: { isSubmitting },
  } = form;

  const onSubmit = async (values: LoginFormValues) => {
    if (!auth) return;
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      window.location.href = redirectUrl;
    } catch (error: any) {
      console.error("Login error:", error.code, error.message);

      let message: string;
      switch (error.code) {
        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":
          message = "Email ou mot de passe incorrect.";
          break;
        case "auth/invalid-email":
          message = "L'adresse email est invalide.";
          break;
        case "auth/user-disabled":
          message = "Ce compte a été désactivé. Contactez le support.";
          break;
        case "auth/too-many-requests":
          message =
            "Trop de tentatives échouées. Réessayez dans quelques minutes.";
          break;
        default:
          message =
            "Une erreur est survenue lors de la connexion. Veuillez réessayer.";
      }
      setLoginError(message);
    }
  };

  if (isUserLoading || user) {
    return (
      <div
        className="relative flex items-center justify-center min-h-[calc(100vh-10rem)] overflow-hidden"
        style={darkBgStyle}
      >
        <LoadingLogo className="h-12 w-12 text-cyan-400" />
      </div>
    );
  }

  return (
    <>
      <div
        className="relative flex items-center justify-center min-h-[calc(100vh-10rem)] py-12 px-4 overflow-hidden"
        style={darkBgStyle}
      >
        {/* Lueur cyan — coin supérieur droit */}
        <div
          className="absolute pointer-events-none"
          style={{
            width: 500,
            height: 500,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 65%)",
            top: -150,
            right: -100,
            filter: "blur(10px)",
          }}
        />

        {/* Lignes de route — bas de page */}
        <svg
          className="absolute bottom-0 left-0 w-full pointer-events-none"
          style={{ height: 80, opacity: 0.06 }}
          viewBox="0 0 1200 80"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <line
            x1="0"
            y1="40"
            x2="1200"
            y2="40"
            stroke="#06b6d4"
            strokeWidth="2"
            strokeDasharray="40 20"
          />
          <line
            x1="0"
            y1="20"
            x2="1200"
            y2="20"
            stroke="#06b6d4"
            strokeWidth="1"
          />
          <line
            x1="0"
            y1="60"
            x2="1200"
            y2="60"
            stroke="#06b6d4"
            strokeWidth="1"
          />
        </svg>

        {/* Card */}
        <div
          className="relative z-10 w-full max-w-sm mx-auto bg-white rounded-2xl px-8 pt-8 pb-7"
          style={{
            boxShadow:
              "0 25px 80px rgba(0,0,0,0.5), 0 8px 24px rgba(0,0,0,0.3)",
          }}
        >
          {/* En-tête : logo + tagline + séparateur + titre */}
          <div className="flex flex-col items-center gap-1.5 pb-5 mb-5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
                style={{
                  background:
                    "linear-gradient(135deg, #0f172a 0%, #0e7490 100%)",
                  boxShadow: "0 4px 12px rgba(14,116,144,0.35)",
                }}
              >
                <Logo className="h-5 w-5" aria-hidden="true" />
              </div>
              <span className="font-extrabold text-lg text-slate-900 tracking-tight">
                OptiTrajet
              </span>
            </div>
            <p className="text-xs text-slate-400 italic">
              Covoiturage intelligent au Québec
            </p>
            <div className="w-full h-px bg-slate-100 my-1.5" />
            <p className="font-bold text-sm text-slate-800">Connexion</p>
          </div>

          {/* Formulaire */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-gray-700">
                      Email
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="m@example.com"
                        className="h-10 bg-slate-50 border-slate-200 rounded-lg focus-visible:ring-cyan-700/20 focus-visible:border-cyan-700 focus-visible:ring-offset-white [&::placeholder]:text-slate-400"
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
                      <FormLabel className="text-xs font-semibold text-gray-700">
                        Mot de passe
                      </FormLabel>
                      <Link
                        href="#"
                        className="ml-auto text-xs text-cyan-700 hover:underline"
                      >
                        Mot de passe oublié?
                      </Link>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          className="h-10 pr-10 bg-slate-50 border-slate-200 rounded-lg focus-visible:ring-cyan-700/20 focus-visible:border-cyan-700 focus-visible:ring-offset-white [&::placeholder]:text-slate-400"
                          {...field}
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          aria-label={
                            showPassword
                              ? "Masquer le mot de passe"
                              : "Afficher le mot de passe"
                          }
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full h-[42px] font-bold rounded-lg bg-gradient-to-r from-[#0891b2] to-[#06b6d4] hover:from-[#0e7490] hover:to-[#0891b2] border-0 shadow-[0_4px_14px_rgba(6,182,212,0.35)] text-white mt-1"
                disabled={isSubmitting || !auth}
              >
                {isSubmitting ? (
                  <>
                    <LoadingLogo className="mr-2 h-4 w-4" />
                    Connexion en cours...
                  </>
                ) : (
                  "Se connecter"
                )}
              </Button>
            </form>
          </Form>

          <p className="mt-5 text-center text-xs text-slate-500">
            Vous n&apos;avez pas de compte?{" "}
            <Link
              href={signupHref}
              className="text-cyan-700 font-semibold hover:underline"
            >
              Inscrivez-vous
            </Link>
          </p>
          <p className="mt-2 text-center text-xs text-slate-400">
            <Link href="/confidentialite" className="hover:underline">
              Politique de confidentialité
            </Link>
          </p>
        </div>
      </div>

      <AlertDialog
        open={!!loginError}
        onOpenChange={(open) => {
          if (!open) setLoginError(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Erreur de connexion</AlertDialogTitle>
            <AlertDialogDescription>{loginError}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setLoginError(null)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div
          className="relative flex items-center justify-center min-h-[calc(100vh-10rem)] overflow-hidden"
          style={darkBgStyle}
        >
          <LoadingLogo className="h-12 w-12 text-cyan-400" />
        </div>
      }
    >
      <LoginPageInternal />
    </React.Suspense>
  );
}
