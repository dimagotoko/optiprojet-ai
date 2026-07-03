# Login Page Design Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le fond blanc neutre de la page login par un fond sombre immersif avec grille de points cyan, lueur top-right et lignes de route, avec une card blanche flottante portant le branding complet d'OptiTrajet.

**Architecture:** Modification d'un seul fichier `src/app/login/page.tsx`. Toute la logique auth/redirect/Suspense reste intacte. On remplace le `<Card>` shadcn/ui par un `<div>` custom (pour contrôle total du shadow et du bg-white fixe indépendamment du thème), et on encapsule le tout dans un wrapper fond sombre avec éléments décoratifs positionnés en `absolute`.

**Tech Stack:** Next.js 15, Tailwind CSS, shadcn/ui (Form, Input, Button, AlertDialog), Firebase Auth, React Hook Form, Zod.

---

### Task 1 : Mettre à jour les imports

**Files:**

- Modify: `src/app/login/page.tsx` (lignes 11-18)

- [ ] **Supprimer les imports Card** — on n'utilise plus les composants shadcn Card.

Remplacer ce bloc :

```tsx
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
```

Par :

```tsx
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
```

- [ ] **Vérifier que le build TypeScript ne signale aucune erreur d'import**

```bash
cd "C:\Users\toko.TRANSIMEX\Documents\PROJET OPTITRAJET\OPTIPROJET\project"
npx tsc --noEmit 2>&1 | head -20
```

Résultat attendu : aucune erreur liée aux imports Card.

---

### Task 2 : Remplacer le JSX de `LoginPageInternal` — fond sombre + card

**Files:**

- Modify: `src/app/login/page.tsx` — remplacer entièrement le `return` de `LoginPageInternal` (lignes 115-228)

- [ ] **Remplacer le bloc loading state** (lignes 115-121)

Ancienne version :

```tsx
if (isUserLoading || user) {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
      <LoadingLogo className="h-12 w-12 text-primary" />
    </div>
  );
}
```

Nouvelle version :

```tsx
if (isUserLoading || user) {
  return (
    <div
      className="relative flex items-center justify-center min-h-[calc(100vh-10rem)] overflow-hidden"
      style={{
        backgroundColor: "#0f172a",
        backgroundImage:
          "radial-gradient(circle, rgba(6,182,212,0.18) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      <LoadingLogo className="h-12 w-12 text-cyan-400" />
    </div>
  );
}
```

- [ ] **Remplacer le `return` principal** — tout ce qui suit ce loading guard.

Remplacer depuis `return (` jusqu'à la fin de `LoginPageInternal` par :

```tsx
return (
  <>
    <div
      className="relative flex items-center justify-center min-h-[calc(100vh-10rem)] py-12 px-4 overflow-hidden"
      style={{
        backgroundColor: "#0f172a",
        backgroundImage:
          "radial-gradient(circle, rgba(6,182,212,0.18) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
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
        }}
      >
        {/* En-tête : logo + tagline + séparateur + titre */}
        <div className="flex flex-col items-center gap-1.5 pb-5 mb-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
              style={{
                background: "linear-gradient(135deg, #0f172a 0%, #0e7490 100%)",
                boxShadow: "0 4px 12px rgba(14,116,144,0.35)",
              }}
            >
              <Logo className="h-5 w-5" />
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
                      className="h-10 bg-slate-50 border-slate-200 rounded-lg focus-visible:ring-cyan-700/20 focus-visible:border-cyan-700"
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
                        className="h-10 pr-10 bg-slate-50 border-slate-200 rounded-lg focus-visible:ring-cyan-700/20 focus-visible:border-cyan-700"
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
          Vous n'avez pas de compte?{" "}
          <Link
            href={signupHref}
            className="text-cyan-700 font-semibold hover:underline"
          >
            Inscrivez-vous
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
```

---

### Task 3 : Mettre à jour le fallback Suspense de `LoginPage`

**Files:**

- Modify: `src/app/login/page.tsx` — fonction `LoginPage` (lignes 231-241)

- [ ] **Remplacer le fallback Suspense** pour qu'il ait aussi le fond sombre.

Remplacer :

```tsx
export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
          <LoadingLogo className="h-12 w-12 text-primary" />
        </div>
      }
    >
      <LoginPageInternal />
    </React.Suspense>
  );
}
```

Par :

```tsx
export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div
          className="relative flex items-center justify-center min-h-[calc(100vh-10rem)] overflow-hidden"
          style={{
            backgroundColor: "#0f172a",
            backgroundImage:
              "radial-gradient(circle, rgba(6,182,212,0.18) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        >
          <LoadingLogo className="h-12 w-12 text-cyan-400" />
        </div>
      }
    >
      <LoginPageInternal />
    </React.Suspense>
  );
}
```

---

### Task 4 : Vérification TypeScript + visuelle + commit

**Files:**

- Vérification : `src/app/login/page.tsx`

- [ ] **Vérifier TypeScript**

```bash
cd "C:\Users\toko.TRANSIMEX\Documents\PROJET OPTITRAJET\OPTIPROJET\project"
npx tsc --noEmit
```

Résultat attendu : aucune erreur.

- [ ] **Lancer le serveur dev** (port 9003)

```bash
npm run dev
```

Attendre `✓ Ready` ou `compiled successfully`.

- [ ] **Vérifier visuellement dans le navigateur**

Ouvrir `http://localhost:9003/login` et confirmer :

- Fond sombre `#0f172a` avec grille de points cyan visible
- Lueur cyan en haut à droite
- Lignes de route subtiles en bas
- Card blanche flottante avec ombre profonde
- Logo OptiTrajet (icône + nom) visible en haut de la card
- Tagline en italique gris
- Séparateur + titre "Connexion"
- Champs Email et Mot de passe avec fond slate-50
- Bouton cyan gradient
- Lien "Inscrivez-vous" en cyan

- [ ] **Committer**

```bash
git add src/app/login/page.tsx
git commit -m "feat - login : design polish (fond sombre, card flottante, branding OptiTrajet)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```
