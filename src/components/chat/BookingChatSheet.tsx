"use client";

import * as React from "react";
import { Send } from "lucide-react";
import {
  collection,
  doc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useUser,
} from "@/firebase";
import {
  addDocumentNonBlocking,
  setDocumentNonBlocking,
} from "@/firebase/non-blocking-updates";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import type { ChatMessage } from "@/types/db";

interface BookingChatSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  otherUserName: string;
}

export function BookingChatSheet({
  open,
  onOpenChange,
  bookingId,
  otherUserName,
}: BookingChatSheetProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const [text, setText] = React.useState("");

  const messagesQuery = useMemoFirebase(() => {
    if (!firestore || !open) return null;
    return query(
      collection(firestore, "chat_channels", bookingId, "messages"),
      orderBy("createdAt", "asc"),
    );
  }, [firestore, bookingId, open]);
  const { data: messages, isLoading } =
    useCollection<ChatMessage>(messagesQuery);

  const scrollEndRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (open) {
      scrollEndRef.current?.scrollIntoView({ block: "end" });
    }
  }, [open, messages?.length]);

  // Marque le canal comme lu à l'ouverture.
  React.useEffect(() => {
    if (!open || !firestore || !user) return;
    const channelRef = doc(firestore, "chat_channels", bookingId);
    setDocumentNonBlocking(
      channelRef,
      { readBy: { [user.uid]: serverTimestamp() } },
      { merge: true },
    );
  }, [open, firestore, user, bookingId]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !firestore || !user) return;
    setText("");
    const messagesRef = collection(
      firestore,
      "chat_channels",
      bookingId,
      "messages",
    );
    const promise = addDocumentNonBlocking(messagesRef, {
      senderId: user.uid,
      text: trimmed,
      createdAt: serverTimestamp(),
    });
    const docRef = await promise;
    if (docRef) {
      fetch("/api/notifications/message-created", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, messageId: docRef.id }),
      }).catch(() => {});
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col p-0 sm:max-w-md">
        <SheetHeader className="p-4 border-b text-left">
          <SheetTitle>{otherUserName}</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4">
          <div className="flex flex-col gap-2 py-4">
            {isLoading ? (
              <>
                <Skeleton className="h-10 w-2/3" />
                <Skeleton className="h-10 w-1/2 ml-auto" />
              </>
            ) : !messages || messages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucun message pour l&apos;instant — écrivez pour contacter{" "}
                {otherUserName}.
              </p>
            ) : (
              messages.map((m) => {
                const mine = m.senderId === user?.uid;
                return (
                  <div
                    key={m.id}
                    className={cn(
                      "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                      mine
                        ? "self-end bg-primary text-primary-foreground"
                        : "self-start bg-muted",
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.text}</p>
                    {m.createdAt && (
                      <p
                        className={cn(
                          "text-[10px] mt-1",
                          mine
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground",
                        )}
                      >
                        {formatDistanceToNow(m.createdAt.toDate(), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </p>
                    )}
                  </div>
                );
              })
            )}
            <div ref={scrollEndRef} />
          </div>
        </ScrollArea>

        <div className="flex items-center gap-2 border-t p-3">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Écrire un message…"
            maxLength={1000}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!text.trim()}
            aria-label="Envoyer"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
