"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  collection,
  query,
  orderBy,
  limit,
  doc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  useUser,
  useFirestore,
  useCollection,
  useMemoFirebase,
} from "@/firebase";
import type { AppNotification } from "@/types/db";

export function NotificationBell() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  const notificationsRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, "users", user.uid, "notifications"),
      orderBy("createdAt", "desc"),
      limit(20),
    );
  }, [firestore, user]);
  const { data: notifications } =
    useCollection<AppNotification>(notificationsRef);

  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;

  const markAsRead = (notif: AppNotification) => {
    if (!firestore || !user || notif.read) return;
    updateDoc(doc(firestore, "users", user.uid, "notifications", notif.id), {
      read: true,
    });
  };

  const markAllAsRead = () => {
    if (!firestore || !user || !notifications) return;
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    const batch = writeBatch(firestore);
    unread.forEach((n) => {
      batch.update(doc(firestore, "users", user.uid, "notifications", n.id), {
        read: true,
      });
    });
    batch.commit();
  };

  const handleClick = (notif: AppNotification) => {
    markAsRead(notif);
    setOpen(false);
    router.push(notif.link);
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={
            unreadCount > 0
              ? `Notifications (${unreadCount} non lue${unreadCount > 1 ? "s" : ""})`
              : "Notifications"
          }
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <p className="text-sm font-semibold">Notifications</p>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="text-xs text-primary hover:underline"
            >
              Tout marquer comme lu
            </button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {!notifications || notifications.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Aucune notification
            </p>
          ) : (
            <div className="flex flex-col">
              {notifications.map((notif) => (
                <button
                  key={notif.id}
                  type="button"
                  onClick={() => handleClick(notif)}
                  className={cn(
                    "flex flex-col items-start gap-0.5 border-b px-3 py-2.5 text-left last:border-b-0 hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring",
                    !notif.read && "bg-primary/5",
                  )}
                >
                  <div className="flex w-full items-center gap-1.5">
                    {!notif.read && (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    )}
                    <p className="text-sm font-medium truncate">
                      {notif.title}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {notif.body}
                  </p>
                  {notif.createdAt && (
                    <p className="text-[11px] text-muted-foreground/70">
                      {formatDistanceToNow(notif.createdAt.toDate(), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
