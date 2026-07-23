"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  applyActionCode,
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "firebase/auth";
import { Eye, EyeOff, CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { LoadingLogo } from "@/components/LoadingLogo";
import { useAuth } from "@/firebase";
import React from "react";

const darkBgStyle: React.CSSProperties = {
  backgroundColor: "#0f172a",
  backgroundImage:
    "radial-gradient(circle, rgba(6,182,212,0.18) 1px, transparent 1px)",
  backgroundSize: "24px 24px",
};

const passwordSchema = z
  .object({
    password: z
      .string()
      .min(8, {
        message: "Le mot de passe doit contenir au moins 8 caractères.",
      }),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirm"],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

type Status =
  "loading" | "form" | "success" | "error" | "submitting" | "password_success";

function AuthActionPageInternal() {
  const auth = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const mode = searchParams.get("mode") ?? "";
  const oobCode = searchParams.get("oobCode") ?? "";
  const continueUrl = searchParams.get("continueUrl") ?? "/login";

  const [status, setStatus] = React.useState<Status>("loading");
  const [errorMessage, setErrorMessage] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "", confirm: "" },
  });

  React.useEffect(() => {
    if (!auth || !oobCode) {
      setStatus("error");
      setErrorMessage("Lien invalide ou expiré. Veuillez refaire la demande.");
      return;
    }

    if (mode === "verifyEmail" || mode === "recoverEmail") {
      applyActionCode(auth, oobCode)
        .then(() => setStatus("success"))
        .catch(() => {
          setErrorMessage(
            "Ce lien est invalide ou a déjà été utilisé. Veuillez refaire la demande.",
          );
          setStatus("error");
        });
    } else if (mode === "resetPassword") {
      verifyPasswordResetCode(auth, oobCode)
        .then(() => setStatus("form"))
        .catch(() => {
          setErrorMessage(
            "Ce lien de réinitialisation est invalide ou expiré. Veuillez refaire la demande.",
          );
          setStatus("error");
        });
    } else {
      setErrorMessage("Action non reconnue.");
      setStatus("error");
    }
  }, [auth, mode, oobCode]);

  const onSubmit = async (values: PasswordFormValues) => {
    if (!auth) return;
    setStatus("submitting");
    try {
      await confirmPasswordReset(auth, oobCode, values.password);
      setStatus("password_success");
    } catch (err: any) {
      let msg = "Une erreur est survenue. Veuillez refaire la demande.";
      if (err.code === "auth/weak-password")
        msg = "Le mot de passe est trop faible (8 caractères minimum).";
      if (err.code === "auth/expired-action-code")
        msg =
          "Ce lien a expiré. Veuillez refaire la demande de réinitialisation.";
      if (err.code === "auth/invalid-action-code")
        msg = "Ce lien est invalide ou a déjà été utilisé.";
      setErrorMessage(msg);
      setStatus("error");
    }
  };

  const title =
    mode === "verifyEmail"
      ? "Vérification de l'adresse email"
      : mode === "recoverEmail"
        ? "Récupération de l'adresse email"
        : "Réinitialisation du mot de passe";

  return (
    <div
      className="relative flex items-center justify-center min-h-[calc(100vh-10rem)] py-12 px-4 overflow-hidden"
      style={darkBgStyle}
    >
      {/* Lueur cyan */}
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

      {/* Lignes de route */}
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
          <p className="font-bold text-sm text-slate-800 text-center">
            {title}
          </p>
        </div>

        {/* Loading */}
        {status === "loading" && (
          <div className="flex flex-col items-center gap-4 py-4">
            <LoadingLogo className="h-10 w-10 text-cyan-500" />
            <p className="text-sm text-slate-500">Vérification en cours…</p>
          </div>
        )}

        {/* Succès — email vérifié ou récupéré */}
        {status === "success" && (
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: "rgba(6,182,212,0.12)" }}
            >
              <CheckCircle className="h-7 w-7" style={{ color: "#0e7490" }} />
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              {mode === "verifyEmail"
                ? "Votre adresse email a été vérifiée avec succès."
                : "Votre adresse email originale a été restaurée."}
            </p>
            <Button
              className="w-full h-[42px] font-bold rounded-lg bg-gradient-to-r from-[#0891b2] to-[#06b6d4] hover:from-[#0e7490] hover:to-[#0891b2] border-0 shadow-[0_4px_14px_rgba(6,182,212,0.35)] text-white mt-1"
              onClick={() => router.push("/login")}
            >
              Se connecter
            </Button>
          </div>
        )}

        {/* Succès — mot de passe réinitialisé */}
        {status === "password_success" && (
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: "rgba(6,182,212,0.12)" }}
            >
              <CheckCircle className="h-7 w-7" style={{ color: "#0e7490" }} />
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              Votre mot de passe a été réinitialisé avec succès.
            </p>
            <Button
              className="w-full h-[42px] font-bold rounded-lg bg-gradient-to-r from-[#0891b2] to-[#06b6d4] hover:from-[#0e7490] hover:to-[#0891b2] border-0 shadow-[0_4px_14px_rgba(6,182,212,0.35)] text-white mt-1"
              onClick={() => router.push("/login")}
            >
              Se connecter
            </Button>
          </div>
        )}

        {/* Erreur */}
        {status === "error" && (
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: "rgba(239,68,68,0.1)" }}
            >
              <XCircle className="h-7 w-7 text-red-500" />
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              {errorMessage}
            </p>
            <Link
              href="/forgot-password"
              className="inline-flex items-center gap-1 text-xs text-cyan-700 hover:underline"
            >
              <ArrowLeft className="h-3 w-3" />
              Refaire la demande
            </Link>
          </div>
        )}

        {/* Formulaire reset password */}
        {(status === "form" || status === "submitting") && (
          <>
            <p className="text-xs text-slate-500 mb-4 text-center">
              Choisissez un nouveau mot de passe pour votre compte.
            </p>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="grid gap-4"
              >
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-gray-700">
                        Nouveau mot de passe
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            className="h-10 pr-10 bg-slate-50 border-slate-200 rounded-lg text-slate-900 focus-visible:ring-cyan-700/20 focus-visible:border-cyan-700 focus-visible:ring-offset-white placeholder:text-slate-400"
                            style={{ color: "#0f172a" }}
                            autoComplete="new-password"
                            disabled={status === "submitting"}
                            {...field}
                          />
                          <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            aria-label={showPassword ? "Masquer" : "Afficher"}
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
                <FormField
                  control={form.control}
                  name="confirm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-gray-700">
                        Confirmer le mot de passe
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirm ? "text" : "password"}
                            className="h-10 pr-10 bg-slate-50 border-slate-200 rounded-lg text-slate-900 focus-visible:ring-cyan-700/20 focus-visible:border-cyan-700 focus-visible:ring-offset-white placeholder:text-slate-400"
                            style={{ color: "#0f172a" }}
                            autoComplete="new-password"
                            disabled={status === "submitting"}
                            {...field}
                          />
                          <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => setShowConfirm((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            aria-label={showConfirm ? "Masquer" : "Afficher"}
                          >
                            {showConfirm ? (
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
                  disabled={status === "submitting" || !auth}
                >
                  {status === "submitting" ? (
                    <>
                      <LoadingLogo className="mr-2 h-4 w-4" />
                      Enregistrement…
                    </>
                  ) : (
                    "Enregistrer le nouveau mot de passe"
                  )}
                </Button>
              </form>
            </Form>
          </>
        )}

        {status !== "loading" && (
          <div className="mt-5 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-xs text-cyan-700 hover:underline"
            >
              <ArrowLeft className="h-3 w-3" />
              Retour à la connexion
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuthActionPage() {
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
      <AuthActionPageInternal />
    </React.Suspense>
  );
}
