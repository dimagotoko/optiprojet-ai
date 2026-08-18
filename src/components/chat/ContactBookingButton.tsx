"use client";

import * as React from "react";
import { MessageSquareText } from "lucide-react";
import { doc } from "firebase/firestore";
import { useFirestore, useDoc, useMemoFirebase, useUser } from "@/firebase";
import { Button } from "@/components/ui/button";
import { BookingChatSheet } from "./BookingChatSheet";
import type { ChatChannel } from "@/types/db";

interface ContactBookingButtonProps {
  bookingId: string;
  otherUserName: string;
}

export function ContactBookingButton({
  bookingId,
  otherUserName,
}: ContactBookingButtonProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const [open, setOpen] = React.useState(false);

  const channelRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, "chat_channels", bookingId);
  }, [firestore, bookingId]);
  const { data: channel } = useDoc<ChatChannel>(channelRef);

  const lastRead = user ? channel?.readBy?.[user.uid] : undefined;
  const hasUnread = !!(
    channel?.lastMessageAt &&
    (!lastRead || channel.lastMessageAt.toMillis() > lastRead.toMillis())
  );

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative h-8 w-8 shrink-0"
        aria-label={`Contacter ${otherUserName}`}
        onClick={() => setOpen(true)}
      >
        <MessageSquareText className="h-4 w-4" aria-hidden="true" />
        {hasUnread && (
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-destructive" />
        )}
      </Button>
      <BookingChatSheet
        open={open}
        onOpenChange={setOpen}
        bookingId={bookingId}
        otherUserName={otherUserName}
      />
    </>
  );
}
