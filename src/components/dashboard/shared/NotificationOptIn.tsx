"use client";

import * as React from "react";
import { getApp } from "firebase/app";
import { getMessaging, onMessage } from "firebase/messaging";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { isPushSupported, registerFcmToken } from "@/firebase/messaging";

type Status = "loading" | "unsupported" | NotificationPermission;

interface NotificationOptInProps {
  userId: string;
}

export function NotificationOptIn({ userId }: NotificationOptInProps) {
  const { toast } = useToast();
  const [status, setStatus] = React.useState<Status>("loading");
  const [pending, setPending] = React.useState(false);

  // isPushSupported() est async : on attend sa résolution avant d'afficher quoi
  // que ce soit, pour éviter un flash bouton → rien (ou l'inverse) au montage.
  React.useEffect(() => {
    let mounted = true;
    isPushSupported().then((supported) => {
      if (!mounted) return;
      setStatus(supported ? Notification.permission : "unsupported");
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Foreground : le Service Worker ne gère que les push reçus en arrière-plan
  // (onBackgroundMessage). Quand l'app a le focus, c'est ce listener qui reçoit
  // le message — jamais de showNotification() ici, seulement un toast, sinon
  // double affichage avec le SW.
  React.useEffect(() => {
    if (status !== "granted") return;
    const messaging = getMessaging(getApp());
    const unsubscribe = onMessage(messaging, (payload) => {
      const { title, body } = payload.data ?? {};
      if (!title) return;
      toast({ title, description: body });
    });
    return () => unsubscribe();
  }, [status, toast]);

  const handleEnable = async () => {
    setPending(true);
    const token = await registerFcmToken(userId);
    setPending(false);

    if (token) {
      setStatus("granted");
      toast({
        title: "Notifications activées",
        description: "Tu seras averti pour tes réservations.",
      });
    } else {
      setStatus(Notification.permission === "denied" ? "denied" : "default");
      toast({
        variant: "destructive",
        title: "Impossible d'activer les notifications",
        description: "Réessaie plus tard.",
      });
    }
  };

  if (
    status === "loading" ||
    status === "unsupported" ||
    status === "granted"
  ) {
    return null;
  }

  if (status === "denied") {
    return (
      <div className="rounded-xl border bg-card shadow-sm p-4 text-sm text-muted-foreground">
        Les notifications sont bloquées pour ce site. Pour les recevoir,
        réactive-les dans les paramètres de ton navigateur.
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-medium">
          Reste au courant de tes réservations
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        Active les notifications pour savoir tout de suite quand une demande est
        reçue, acceptée ou refusée.
      </p>
      <Button onClick={handleEnable} disabled={pending} className="w-full">
        {pending ? "Activation…" : "Activer les notifications"}
      </Button>
    </div>
  );
}
