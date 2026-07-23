"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { sendPasswordResetEmail } from "firebase/auth";
import { ArrowLeft, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/firebase";
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
});

type ForgotPasswordValues = z.infer<typeof formSchema>;

function ForgotPasswordPageInternal() {
  const auth = useAuth();
  const [status, setStatus] = React.useState<
    "idle" | "submitting" | "sent" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: ForgotPasswordValues) => {
    if (!auth) return;
    setStatus("submitting");
    setErrorMessage(null);

    try {
      await sendPasswordResetEmail(auth, values.email, {
        url: `${window.location.origin}/login`,
        handleCodeInApp: false,
      });
      setStatus("sent");
    } catch (error: any) {
      switch (error.code) {
        case "auth/invalid-email":
          setErrorMessage("L'adresse email est invalide.");
          break;
        case "auth/too-many-requests":
          setErrorMessage(
            "Trop de tentatives. Réessayez dans quelques minutes.",
          );
          break;
        // auth/user-not-found: treated as success to avoid account enumeration
        case "auth/user-not-found":
          setStatus("sent");
          return;
        default:
          setErrorMessage(
            "Une erreur est survenue. Vérifiez votre connexion et réessayez.",
          );
      }
      setStatus("error");
    }
  };

  return (
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
          boxShadow: "0 25px 80px rgba(0,0,0,0.5), 0 8px 24px rgba(0,0,0,0.3)",
          color: "#0f172a",
        }}
      >
        {/* En-tête */}
        <div className="flex flex-col items-center gap-1.5 pb-5 mb-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
              style={{
                background: "linear-gradient(135deg, #0f172a 0%, #0e7490 100%)",
                boxShadow: "0 4px 12px rgba(14,116,144,0.35)",
              }}
            >
              <Logo className="h-5 w-5" aria-hidden="true" />
            </div>
            <span className="font-extrabold text-lg text-slate-900 tracking-tight">
              KamGo
            </span>
          </div>
          <p className="text-xs text-slate-400 italic">
            Covoiturage intelligent
          </p>
          <div className="w-full h-px bg-slate-100 my-1.5" />
          <p className="font-bold text-sm text-slate-800">
            Réinitialiser le mot de passe
          </p>
        </div>

        {status === "sent" ? (
          /* État : courriel envoyé */
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: "rgba(6,182,212,0.12)" }}
            >
              <MailCheck className="h-7 w-7" style={{ color: "#0e7490" }} />
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              Si un compte existe pour cette adresse, un courriel de
              réinitialisation a été envoyé.{" "}
              <span className="text-slate-500">
                Vérifiez également vos indésirables.
              </span>
            </p>
          </div>
        ) : (
          /* État : formulaire */
          <>
            <p className="text-xs text-slate-500 mb-4 text-center">
              Entrez votre adresse email et nous vous enverrons un lien pour
              réinitialiser votre mot de passe.
            </p>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="grid gap-4"
              >
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
                          className="h-10 bg-slate-50 border-slate-200 rounded-lg text-slate-900 focus-visible:ring-cyan-700/20 focus-visible:border-cyan-700 focus-visible:ring-offset-white placeholder:text-slate-400 [&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_#f8fafc] [&:-webkit-autofill]:[color:#0f172a]"
                          style={{ color: "#0f172a" }}
                          autoComplete="email"
                          disabled={status === "submitting"}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {status === "error" && errorMessage && (
                  <p className="text-xs text-red-600 text-center -mt-1">
                    {errorMessage}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full h-[42px] font-bold rounded-lg bg-gradient-to-r from-[#0891b2] to-[#06b6d4] hover:from-[#0e7490] hover:to-[#0891b2] border-0 shadow-[0_4px_14px_rgba(6,182,212,0.35)] text-white mt-1"
                  disabled={status === "submitting" || !auth}
                >
                  {status === "submitting" ? (
                    <>
                      <LoadingLogo className="mr-2 h-4 w-4" />
                      Envoi en cours...
                    </>
                  ) : (
                    "Envoyer le lien"
                  )}
                </Button>
              </form>
            </Form>
          </>
        )}

        <div className="mt-5 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1 text-xs text-cyan-700 hover:underline"
          >
            <ArrowLeft className="h-3 w-3" />
            Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordPageInternal />;
}
