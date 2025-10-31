import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Logo } from "@/components/Logo";

export default function SignupPage() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-10rem)] py-12 px-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
           <div className="flex justify-center mb-4">
            <Logo className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Créer un compte</CardTitle>
          <CardDescription>
            Rejoignez la communauté et commencez à voyager plus intelligemment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="full-name">Nom complet</Label>
              <Input id="full-name" placeholder="Prénom Nom" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input id="password" type="password" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="city">Ville</Label>
                <Input id="city" placeholder="Montréal" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="postal-code">Code Postal</Label>
                <Input id="postal-code" placeholder="H3A 0G4" required />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Je suis un...</Label>
              <RadioGroup defaultValue="voyageur" className="flex gap-4 pt-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="voyageur" id="voyageur" />
                  <Label htmlFor="voyageur">Voyageur</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="transporteur" id="transporteur" />
                  <Label htmlFor="transporteur">Transporteur</Label>
                </div>
              </RadioGroup>
            </div>
            <Button type="submit" className="w-full">
              Créer mon compte
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Vous avez déjà un compte?{" "}
            <Link href="/login" className="underline">
              Connectez-vous
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
