"use client";

import * as React from "react";
import { useFirestore, useUser } from "@/firebase";
import { signProtocol } from "@/lib/protocol";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Shield } from "lucide-react";

function ProtocolText({ role }: { role: string }) {
  if (role === "transporteur") {
    return (
      <ul className="text-sm text-muted-foreground space-y-1.5">
        <li>
          • Respecter les passagers : politesse, ponctualité et propreté du
          véhicule
        </li>
        <li>
          • Ne jamais conduire sous l&apos;influence de substances psychoactives
        </li>
        <li>
          • Maintenir votre véhicule en bon état de fonctionnement et conforme
          au code de la route
        </li>
        <li>
          • Respecter les tarifs affichés et ne pas demander de paiements
          supplémentaires non convenus
        </li>
        <li>
          • Signaler tout incident ou problème dans les 24 h via le support
        </li>
      </ul>
    );
  }
  return (
    <ul className="text-sm text-muted-foreground space-y-1.5">
      <li>
        • Respecter le conducteur et les autres passagers : politesse et
        ponctualité
      </li>
      <li>
        • Ne pas transporter de bagages dangereux, illicites ou encombrants sans
        accord préalable
      </li>
      <li>
        • Honorer vos réservations confirmées ou annuler dans les délais prévus
      </li>
      <li>
        • Ne pas partager les coordonnées personnelles des conducteurs en dehors
        de la plateforme
      </li>
      <li>
        • Signaler tout incident ou comportement inapproprié dans les 24 h via
        le support
      </li>
    </ul>
  );
}

interface ProtocolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: string;
  /** Fourni → mode signature (checkbox + bouton). Omis → lecture seule. */
  onAccepted?: () => void;
}

export function ProtocolDialog({
  open,
  onOpenChange,
  role,
  onAccepted,
}: ProtocolDialogProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const [checked, setChecked] = React.useState(false);
  const [signing, setSigning] = React.useState(false);

  React.useEffect(() => {
    if (open) setChecked(false);
  }, [open]);

  const handleAccept = async () => {
    if (!firestore || !user || !checked || signing) return;
    setSigning(true);
    try {
      await signProtocol(firestore, user.uid);
      onOpenChange(false);
      onAccepted?.();
    } finally {
      setSigning(false);
    }
  };

  const signMode = !!onAccepted;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" aria-hidden="true" />
            Protocole d&apos;utilisation
          </DialogTitle>
        </DialogHeader>
        <ProtocolText role={role} />
        {signMode && (
          <>
            <div className="flex items-start gap-3 pt-1">
              <Checkbox
                id="protocol-dialog-accept"
                checked={checked}
                onCheckedChange={(v) => setChecked(!!v)}
                disabled={signing}
              />
              <Label
                htmlFor="protocol-dialog-accept"
                className="text-sm leading-snug cursor-pointer font-normal"
              >
                {role === "transporteur"
                  ? "J'ai lu et j'accepte le protocole des transporteurs OptiTrajet AI"
                  : "J'ai lu et j'accepte le protocole des voyageurs OptiTrajet AI"}
              </Label>
            </div>
            <DialogFooter>
              <Button
                className="w-full"
                onClick={handleAccept}
                disabled={!checked || signing}
              >
                {signing ? "Enregistrement…" : "Accepter et continuer"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
