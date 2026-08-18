# Chat utilisateur-utilisateur lié aux réservations — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a voyageur and a transporteur exchange free-text messages once a booking is `accepted`, via a per-booking channel opened from a note icon on the booking card.

**Architecture:** The channel (`chat_channels/{bookingId}`) is created server-side (Admin SDK) inside the existing `booking-status` notification route the instant a booking flips to `accepted` — idempotent via the same `claim()` transaction pattern already used for push notifications. Messages live in a `messages` subcollection, written directly by the client (allowed by hardened Firestore rules) and read in real time via the existing `useCollection`/`useDoc` hooks. A new `message-created` API route mirrors `booking-status`/`booking-created` to fan out push + in-app notifications after each message.

**Tech Stack:** Next.js 15 App Router (API routes), Firebase Admin SDK, Firestore + Security Rules, `firebase/rules-unit-testing` + Jest, React client components, shadcn/ui `Sheet`.

**Spec:** `docs/superpowers/specs/2026-08-17-chat-reservation-design.md`

---

## File Structure

| File                                                      | Responsibility                                                                                                                     |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `src/types/db.ts`                                         | Modify — add `ChatChannel`, `ChatMessage` types; extend `AppNotification.type`                                                     |
| `firestore.rules`                                         | Modify — lock client-side `chat_channels` create; restrict `update` to `readBy`; add shape validation + immutability to `messages` |
| `tests/rules/firestore.rules.test.ts`                     | Modify — 8 new test cases for the hardened chat rules                                                                              |
| `src/app/api/notifications/booking-status/route.ts`       | Modify — create the chat channel when a booking is accepted                                                                        |
| `src/app/api/notifications/message-created/route.ts`      | Create — push/in-app notification on new message (mirrors `booking-status/route.ts`)                                               |
| `src/components/chat/ContactBookingButton.tsx`            | Create — note icon + unread badge, opens the chat sheet                                                                            |
| `src/components/chat/BookingChatSheet.tsx`                | Create — real-time message thread + input, inside a `Sheet`                                                                        |
| `src/components/dashboard/voyageur/VoyageurDashboard.tsx` | Modify — mount `ContactBookingButton` in `BookedTripItem` when `booking.status === "accepted"`                                     |
| `src/app/trip-details/[tripId]/TripDetailsClient.tsx`     | Modify — mount `ContactBookingButton` in `BookingRow` (owner view) and in the `isAccepted` banner (traveler view)                  |

---

### Task 1: Types — `ChatChannel`, `ChatMessage`, `AppNotification.type`

**Files:**

- Modify: `src/types/db.ts:104-112`

- [ ] **Step 1: Add the chat types and extend `AppNotification`**

Replace the current `AppNotification` block:

```ts
export type AppNotification = {
  id: string;
  type: "booking-created" | "booking-status";
  title: string;
  body: string;
  link: string;
  read: boolean;
  createdAt: Timestamp;
};
```

with:

```ts
export type AppNotification = {
  id: string;
  type: "booking-created" | "booking-status" | "new-message";
  title: string;
  body: string;
  link: string;
  read: boolean;
  createdAt: Timestamp;
};

// ID déterministe == bookingId — un canal par réservation, pas par paire d'utilisateurs.
export type ChatChannel = {
  id: string;
  tripId: string;
  bookingId: string;
  participant1Id: string; // travelerId
  participant2Id: string; // offeredBy (conducteur)
  createdAt: Timestamp;
  lastMessageAt?: Timestamp;
  lastMessagePreview?: string;
  readBy?: Record<string, Timestamp>;
};

export type ChatMessage = {
  id: string;
  senderId: string;
  text: string; // 1-1000 caractères
  createdAt: Timestamp;
  notifiedAt?: Timestamp; // idempotence push, même pattern que Booking.notifiedAt
};
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors (the two new types are additive; nothing consumes them yet).

- [ ] **Step 3: Commit**

```bash
git add src/types/db.ts
git commit -m "feat(chat): add ChatChannel/ChatMessage types"
```

---

### Task 2: Harden `firestore.rules` for `chat_channels` + `messages`

**Files:**

- Modify: `firestore.rules:260-315`

- [ ] **Step 1: Replace the `chat_channels` match block**

The current block (`firestore.rules:270-283`):

```js
match /chat_channels/{chatChannelId} {
  function isParticipant(participant1Id, participant2Id) {
    return request.auth.uid == participant1Id || request.auth.uid == participant2Id;
  }

  function isExistingParticipant(participant1Id, participant2Id) {
    return isParticipant(participant1Id, participant2Id) && resource != null;
  }

  allow get, list: if (request.auth != null && isParticipant(resource.data.participant1Id, resource.data.participant2Id)) || isAdmin();
  allow create: if request.auth != null && (request.resource.data.participant1Id == request.auth.uid || request.resource.data.participant2Id == request.auth.uid);
  allow update: if isExistingParticipant(resource.data.participant1Id, resource.data.participant2Id) || isAdmin();
  allow delete: if isExistingParticipant(resource.data.participant1Id, resource.data.participant2Id) || isAdmin();
}
```

becomes:

```js
match /chat_channels/{chatChannelId} {
  function isParticipant(participant1Id, participant2Id) {
    return request.auth.uid == participant1Id || request.auth.uid == participant2Id;
  }

  function isExistingParticipant(participant1Id, participant2Id) {
    return isParticipant(participant1Id, participant2Id) && resource != null;
  }

  allow get, list: if (request.auth != null && isParticipant(resource.data.participant1Id, resource.data.participant2Id)) || isAdmin();
  // Créé uniquement par l'Admin SDK (route booking-status), jamais par le client.
  allow create: if false;
  // Le client ne peut modifier que `readBy` (marquage lu) ; lastMessageAt/lastMessagePreview
  // ne sont écrits que par l'Admin SDK, qui bypass les règles.
  allow update: if (isExistingParticipant(resource.data.participant1Id, resource.data.participant2Id)
                    && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['readBy']))
                  || isAdmin();
  allow delete: if isExistingParticipant(resource.data.participant1Id, resource.data.participant2Id) || isAdmin();
}
```

- [ ] **Step 2: Replace the `messages` match block**

The current block (`firestore.rules:295-315`):

```js
match /chat_channels/{chatChannelId}/messages/{messageId} {

  function getChannelParticipant1Id(chatChannelId) {
      return get(/databases/$(database)/documents/chat_channels/$(chatChannelId)).data.participant1Id;
  }

  function getChannelParticipant2Id(chatChannelId) {
      return get(/databases/$(database)/documents/chat_channels/$(chatChannelId)).data.participant2Id;
  }

  function isParticipant(chatChannelId) {
    return getChannelParticipant1Id(chatChannelId) == request.auth.uid
        || getChannelParticipant2Id(chatChannelId) == request.auth.uid;
  }

  function isExistingParticipant(chatChannelId) {
    return request.auth != null && isParticipant(chatChannelId) && resource != null;
  }

  allow read, write: if (request.auth != null && isParticipant(chatChannelId)) || isAdmin();
}
```

becomes:

```js
match /chat_channels/{chatChannelId}/messages/{messageId} {

  function getChannelParticipant1Id(chatChannelId) {
      return get(/databases/$(database)/documents/chat_channels/$(chatChannelId)).data.participant1Id;
  }

  function getChannelParticipant2Id(chatChannelId) {
      return get(/databases/$(database)/documents/chat_channels/$(chatChannelId)).data.participant2Id;
  }

  function isParticipant(chatChannelId) {
    return getChannelParticipant1Id(chatChannelId) == request.auth.uid
        || getChannelParticipant2Id(chatChannelId) == request.auth.uid;
  }

  allow get, list: if (request.auth != null && isParticipant(chatChannelId)) || isAdmin();
  allow create: if request.auth != null && isParticipant(chatChannelId)
                && request.resource.data.senderId == request.auth.uid
                && request.resource.data.text is string
                && request.resource.data.text.size() > 0
                && request.resource.data.text.size() <= 1000;
  // Messages immuables en v1 — pas d'édition ni de suppression côté client.
  allow update, delete: if false;
}
```

- [ ] **Step 3: Commit**

```bash
git add firestore.rules
git commit -m "feat(chat): harden chat_channels/messages security rules"
```

(Left un-deployed for now — deployed together with everything else in Task 11.)

---

### Task 3: Rules tests for the hardened chat rules

**Files:**

- Modify: `tests/rules/firestore.rules.test.ts` (append at end of file, after the `PARTICIPANTS` describe block)

- [ ] **Step 1: Write the failing tests**

Append to `tests/rules/firestore.rules.test.ts`:

```ts
// ─── CHAT — chat_channels + messages ──────────────────────────────────────────

describe("CHAT — chat_channels (create verrouillé, update readBy-only)", () => {
  const BOOKING = "booking1";

  beforeEach(async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "chat_channels", BOOKING), {
        tripId: "trip1",
        bookingId: BOOKING,
        participant1Id: TRAVELER,
        participant2Id: DRIVER,
        createdAt: new Date(),
      });
    });
  });

  test("client (même participant) tente de créer un chat_channels → échec", async () => {
    await assertFails(
      setDoc(doc(asUser(TRAVELER), "chat_channels", "newChannel"), {
        tripId: "trip1",
        bookingId: "newChannel",
        participant1Id: TRAVELER,
        participant2Id: DRIVER,
        createdAt: new Date(),
      }),
    );
  });

  test("participant modifie uniquement readBy → succès", async () => {
    await assertSucceeds(
      updateDoc(doc(asUser(TRAVELER), "chat_channels", BOOKING), {
        readBy: { [TRAVELER]: new Date() },
      }),
    );
  });

  test("participant tente de modifier lastMessageAt → échec", async () => {
    await assertFails(
      updateDoc(doc(asUser(TRAVELER), "chat_channels", BOOKING), {
        lastMessageAt: new Date(),
        lastMessagePreview: "triche",
      }),
    );
  });
});

describe("CHAT — messages (shape validation + immutabilité)", () => {
  const BOOKING = "booking1";

  beforeEach(async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "chat_channels", BOOKING), {
        tripId: "trip1",
        bookingId: BOOKING,
        participant1Id: TRAVELER,
        participant2Id: DRIVER,
        createdAt: new Date(),
      });
    });
  });

  test("participant crée un message valide → succès", async () => {
    await assertSucceeds(
      setDoc(
        doc(asUser(TRAVELER), "chat_channels", BOOKING, "messages", "m1"),
        {
          senderId: TRAVELER,
          text: "Je serai en retard de 10 minutes",
          createdAt: new Date(),
        },
      ),
    );
  });

  test("non-participant tente de créer un message → échec", async () => {
    await assertFails(
      setDoc(doc(asUser(OTHER), "chat_channels", BOOKING, "messages", "m2"), {
        senderId: OTHER,
        text: "Je m'incruste",
        createdAt: new Date(),
      }),
    );
  });

  test("message avec senderId usurpé → échec", async () => {
    await assertFails(
      setDoc(
        doc(asUser(TRAVELER), "chat_channels", BOOKING, "messages", "m3"),
        {
          senderId: DRIVER, // spoofing
          text: "Usurpation",
          createdAt: new Date(),
        },
      ),
    );
  });

  test("message avec text vide → échec", async () => {
    await assertFails(
      setDoc(
        doc(asUser(TRAVELER), "chat_channels", BOOKING, "messages", "m4"),
        {
          senderId: TRAVELER,
          text: "",
          createdAt: new Date(),
        },
      ),
    );
  });

  test("message avec text > 1000 caractères → échec", async () => {
    await assertFails(
      setDoc(
        doc(asUser(TRAVELER), "chat_channels", BOOKING, "messages", "m5"),
        {
          senderId: TRAVELER,
          text: "a".repeat(1001),
          createdAt: new Date(),
        },
      ),
    );
  });

  test("participant tente d'éditer un message existant → échec", async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "chat_channels", BOOKING, "messages", "m6"), {
        senderId: TRAVELER,
        text: "Original",
        createdAt: new Date(),
      });
    });
    await assertFails(
      updateDoc(
        doc(asUser(TRAVELER), "chat_channels", BOOKING, "messages", "m6"),
        {
          text: "Modifié",
        },
      ),
    );
  });
});
```

- [ ] **Step 2: Run the tests to verify they pass against the hardened rules**

Run: `npm run test:rules`
Expected: all tests pass, including the 8 new ones (3 in the `chat_channels` describe + 6 in the `messages` describe — 9 total, exceeding the spec's 8-row table since the split into two describes adds no redundant case). Requires the Firebase emulator, started automatically by `firebase emulators:exec`.

If any fail, re-check Task 2's rule text against `firestore.rules` — a common mistake is using `resource.data` instead of `request.resource.data` in the `create` validation.

- [ ] **Step 3: Commit**

```bash
git add tests/rules/firestore.rules.test.ts
git commit -m "test(chat): cover hardened chat_channels/messages rules"
```

---

### Task 4: Create the chat channel when a booking is accepted

**Files:**

- Modify: `src/app/api/notifications/booking-status/route.ts`

- [ ] **Step 1: Insert channel creation after the successful `claim()`**

In `src/app/api/notifications/booking-status/route.ts`, the current flow (lines 75-89) is:

```ts
const won = await claim(bookingRef, "statusNotifiedAt");
if (!won) {
  return NextResponse.json({ status: "already-notified" });
}

const [tripSnap, conducteurSnap] = await Promise.all([
  db.collection("trips").doc(tripId).get(),
  db.collection("users").doc(uid).get(),
]);
const trip = tripSnap.data();
const prenom = firstNameOr(conducteurSnap.data()?.name, "Le conducteur");
const title =
  status === "accepted" ? "Réservation acceptée" : "Réservation refusée";
const body = `${prenom} a ${status === "accepted" ? "accepté" : "refusé"} ta demande pour ${formatShortLocation(trip?.origin ?? "")} → ${formatShortLocation(trip?.destination ?? "")}`;
const link = `/trip-details/${tripId}`;
```

Insert channel creation right after the `claim()` guard, before the `Promise.all` fetch:

```ts
const won = await claim(bookingRef, "statusNotifiedAt");
if (!won) {
  return NextResponse.json({ status: "already-notified" });
}

if (status === "accepted") {
  await db.collection("chat_channels").doc(bookingId).set(
    {
      tripId,
      bookingId,
      participant1Id: booking.travelerId,
      participant2Id: booking.offeredBy,
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

const [tripSnap, conducteurSnap] = await Promise.all([
  db.collection("trips").doc(tripId).get(),
  db.collection("users").doc(uid).get(),
]);
const trip = tripSnap.data();
const prenom = firstNameOr(conducteurSnap.data()?.name, "Le conducteur");
const title =
  status === "accepted" ? "Réservation acceptée" : "Réservation refusée";
const body = `${prenom} a ${status === "accepted" ? "accepté" : "refusé"} ta demande pour ${formatShortLocation(trip?.origin ?? "")} → ${formatShortLocation(trip?.destination ?? "")}`;
const link = `/trip-details/${tripId}`;
```

`FieldValue` is already imported at the top of the file (`import { FieldValue, type DocumentReference } from "firebase-admin/firestore";`), so no new import is needed.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification**

Run the dev server (`npm run dev`), accept a pending booking as a driver from `/trip-details/[tripId]` (isOwner view), then check the Firestore emulator/console for a new `chat_channels/{bookingId}` doc with `participant1Id`/`participant2Id` set. This is covered end-to-end in Task 11; skip a dedicated automated test here since it requires firebase-admin (excluded from the rules-emulator test harness).

- [ ] **Step 4: Commit**

```bash
git add src/app/api/notifications/booking-status/route.ts
git commit -m "feat(chat): create chat channel when a booking is accepted"
```

---

### Task 5: `message-created` notification endpoint

**Files:**

- Create: `src/app/api/notifications/message-created/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { FieldValue, type DocumentReference } from "firebase-admin/firestore";
import { requireUser } from "@/lib/auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { sendPushToUser, createInAppNotification } from "@/lib/notify";

async function claim(ref: DocumentReference) {
  return getAdminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.data()?.notifiedAt) return false;
    tx.update(ref, { notifiedAt: FieldValue.serverTimestamp() });
    return true;
  });
}

export async function POST(request: NextRequest) {
  let uid: string;
  try {
    const { user } = await requireUser();
    uid = user.uid;
  } catch (err) {
    console.error("[message-created] 403 — requireUser a échoué:", err);
    return new NextResponse(null, { status: 403 });
  }

  const { bookingId, messageId } = await request.json();
  if (
    !bookingId ||
    !messageId ||
    typeof bookingId !== "string" ||
    typeof messageId !== "string"
  ) {
    console.error(
      "[message-created] 403 — bookingId/messageId invalide:",
      bookingId,
      messageId,
    );
    return new NextResponse(null, { status: 403 });
  }

  const db = getAdminDb();
  const channelRef = db.collection("chat_channels").doc(bookingId);
  const channelSnap = await channelRef.get();
  if (!channelSnap.exists) {
    console.error(
      `[message-created] 403 — canal introuvable chat_channels/${bookingId}`,
    );
    return new NextResponse(null, { status: 403 });
  }
  const channel = channelSnap.data()!;
  if (channel.participant1Id !== uid && channel.participant2Id !== uid) {
    console.error(
      `[message-created] 403 — uid=${uid} n'est pas participant du canal ${bookingId}`,
    );
    return new NextResponse(null, { status: 403 });
  }

  const messageRef = channelRef.collection("messages").doc(messageId);
  const messageSnap = await messageRef.get();
  if (!messageSnap.exists) {
    console.error(
      `[message-created] 403 — message introuvable chat_channels/${bookingId}/messages/${messageId}`,
    );
    return new NextResponse(null, { status: 403 });
  }
  const message = messageSnap.data()!;

  const won = await claim(messageRef);
  if (!won) {
    return NextResponse.json({ status: "already-notified" });
  }

  const recipientId =
    channel.participant1Id === message.senderId
      ? channel.participant2Id
      : channel.participant1Id;

  const link = `/trip-details/${channel.tripId}`;
  const preview: string =
    message.text.length > 80 ? `${message.text.slice(0, 80)}…` : message.text;

  await Promise.all([
    sendPushToUser(recipientId, {
      title: "Nouveau message",
      body: preview,
      url: link,
      tag: `chat-${bookingId}`,
    }),
    createInAppNotification(recipientId, {
      type: "new-message",
      title: "Nouveau message",
      body: preview,
      link,
    }),
    channelRef.set(
      {
        lastMessageAt: FieldValue.serverTimestamp(),
        lastMessagePreview: preview,
      },
      { merge: true },
    ),
  ]);

  return NextResponse.json({ status: "sent" });
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/notifications/message-created/route.ts
git commit -m "feat(chat): add message-created notification endpoint"
```

---

### Task 6: `ContactBookingButton.tsx`

**Files:**

- Create: `src/components/chat/ContactBookingButton.tsx`

- [ ] **Step 1: Write the component**

```tsx
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
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: error referencing missing `./BookingChatSheet` module (expected — written in Task 7). No other errors.

- [ ] **Step 3: Commit** (deferred to end of Task 7, since this file doesn't compile alone)

---

### Task 7: `BookingChatSheet.tsx`

**Files:**

- Create: `src/components/chat/BookingChatSheet.tsx`

- [ ] **Step 1: Write the component**

```tsx
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
```

`addDocumentNonBlocking` returns the promise from `addDoc` (or `undefined` if the write already failed synchronously via `.catch`), so `await promise` above resolves to the `DocumentReference` on success — matching its signature in `src/firebase/non-blocking-updates.tsx:44-48`.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (this resolves the missing-module error from Task 6 Step 2).

- [ ] **Step 3: Commit**

```bash
git add src/components/chat/ContactBookingButton.tsx src/components/chat/BookingChatSheet.tsx
git commit -m "feat(chat): add ContactBookingButton and BookingChatSheet components"
```

---

### Task 8: Integrate into `VoyageurDashboard.tsx` (voyageur side)

**Files:**

- Modify: `src/components/dashboard/voyageur/VoyageurDashboard.tsx`

- [ ] **Step 1: Import the button**

Add to the import block near the top of the file (after the `AddressLink` import at line 50):

```tsx
import { AddressLink } from "@/components/ui/AddressLink";
import { ContactBookingButton } from "@/components/chat/ContactBookingButton";
```

- [ ] **Step 2: Mount it next to the driver-verified badge**

In `BookedTripItem`, inside the `booking.status === "accepted"` block (`VoyageurDashboard.tsx:288-296`), the current code is:

```tsx
          {booking.status === "accepted" && (
            <div className="rounded-lg border bg-muted/40 px-3 py-2.5 space-y-2">
              {/* Badge vérifié */}
              {driver?.isVerified && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                  <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                  Chauffeur vérifié
                </span>
              )}
```

Replace with (adds the button in a flex row alongside the badge, works whether or not the badge is present):

```tsx
          {booking.status === "accepted" && (
            <div className="rounded-lg border bg-muted/40 px-3 py-2.5 space-y-2">
              {/* Badge vérifié + contact */}
              <div className="flex items-center justify-between gap-2">
                {driver?.isVerified ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                    <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                    Chauffeur vérifié
                  </span>
                ) : (
                  <span />
                )}
                {driver && (
                  <ContactBookingButton
                    bookingId={booking.id}
                    otherUserName={driver.name}
                  />
                )}
              </div>
```

- [ ] **Step 2b: Close the extra wrapping div**

The block that was previously a single fragment (badge only) is now wrapped in a `<div className="flex items-center justify-between gap-2">`. Since the original code had no closing tag right after the badge's conditional (the `{driver?.isVerified && (...)}` block flowed directly into the vehicle section), add the closing `</div>` right before the `{/* Véhicule */}` comment (`VoyageurDashboard.tsx:297`):

```tsx
              </div>
              {/* Véhicule */}
              {vehicle && (
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification**

Run `npm run dev`, log in as a voyageur with an accepted booking, open `/dashboard`, confirm the message icon appears next to (or in place of) the verified badge on the accepted booking card, and clicking it opens the chat sheet.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/voyageur/VoyageurDashboard.tsx
git commit -m "feat(chat): show ContactBookingButton on accepted bookings (voyageur dashboard)"
```

---

### Task 9: Integrate into `TripDetailsClient.tsx` — owner/transporteur view (`BookingRow`)

**Files:**

- Modify: `src/app/trip-details/[tripId]/TripDetailsClient.tsx`

- [ ] **Step 1: Import the button**

Add near the other local imports (after the `getTripGradient` import at line 100):

```tsx
import { getTripGradient } from "@/lib/trip-gradient";
import { ContactBookingButton } from "@/components/chat/ContactBookingButton";
```

- [ ] **Step 2: Mount it in the status row of `BookingRow`**

The current status row (`TripDetailsClient.tsx:406-417`):

```tsx
{
  /* Statut */
}
<div className="flex items-center justify-between">
  <span
    className={cn(
      "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium",
      cfg.className,
    )}
  >
    <StatusIcon className="h-3 w-3" />
    {cfg.label}
  </span>
</div>;
```

becomes:

```tsx
{
  /* Statut */
}
<div className="flex items-center justify-between">
  <span
    className={cn(
      "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium",
      cfg.className,
    )}
  >
    <StatusIcon className="h-3 w-3" />
    {cfg.label}
  </span>
  {status === "accepted" && (
    <ContactBookingButton
      bookingId={booking.id}
      otherUserName={traveler.name}
    />
  )}
</div>;
```

`traveler` is guaranteed non-null at this point in the component (the `if (!traveler) return ...` early return happens above, at line 267-270).

- [ ] **Step 3: Mount it in the traveler-facing "Réservation acceptée" banner**

The current contact block inside the `isAccepted` banner (`TripDetailsClient.tsx:1056-1082`):

```tsx
                          {/* Contact conducteur */}
                          {(userBooking?.driverPhone ||
                            userBooking?.driverEmail) && (
                            <div className="rounded-md bg-green-100/60 dark:bg-green-900/30 px-3 py-2 space-y-1.5">
                              <p className="text-xs font-semibold text-green-700 dark:text-green-400">
                                Contacter le conducteur
                              </p>
```

becomes (adds the chat icon next to the "Contacter le conducteur" label):

```tsx
                          {/* Contact conducteur */}
                          {(userBooking?.driverPhone ||
                            userBooking?.driverEmail) && (
                            <div className="rounded-md bg-green-100/60 dark:bg-green-900/30 px-3 py-2 space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-semibold text-green-700 dark:text-green-400">
                                  Contacter le conducteur
                                </p>
                                {userBooking && (
                                  <ContactBookingButton
                                    bookingId={userBooking.id}
                                    otherUserName={driver.name}
                                  />
                                )}
                              </div>
```

Since the original `<p>` is no longer the direct child, close the new wrapping `<div>` right after it (before the `{userBooking.driverPhone && (` line at `TripDetailsClient.tsx:1063`):

```tsx
                              </div>
                              {userBooking.driverPhone && (
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual verification**

As a transporteur, open `/trip-details/[tripId]` for a trip with an accepted booking — confirm the icon shows in the passenger row status line. As the voyageur on that same booking, open the same page — confirm the icon shows in the green "Réservation acceptée" banner, and that both sides can exchange messages that appear in real time in both sessions.

- [ ] **Step 6: Commit**

```bash
git add src/app/trip-details/[tripId]/TripDetailsClient.tsx
git commit -m "feat(chat): show ContactBookingButton on accepted bookings (trip-details)"
```

---

### Task 10: Deploy rules and run full manual E2E pass

**Files:** none (deployment + manual QA only)

- [ ] **Step 1: Deploy the hardened Firestore rules**

Run: `firebase deploy --only firestore:rules`
Expected: deploy succeeds (idempotent per `[[project-state]]` memory — safe to run even if already up to date).

- [ ] **Step 2: Full manual pass on two real accounts (per `docs/TEST_NOTIFICATIONS_PUSH.md` conventions — `localhost` or `kamgo.ca` only, never a LAN IP, since `requireUser()` depends on the `__session` cookie)**

1. Voyageur books a trip; transporteur accepts it from `/trip-details/[tripId]`.
2. Confirm a `chat_channels/{bookingId}` doc now exists (Firebase console) with correct `participant1Id`/`participant2Id`.
3. Voyageur opens `/dashboard`, clicks the message icon on the accepted booking, sends a message.
4. Transporteur receives a push notification ("Nouveau message") and, opening the same trip's passenger row, sees the message in real time with an unread-dot before opening, which clears after opening.
5. Transporteur replies; voyageur receives the push and sees the reply in `/trip-details/[tripId]`'s green banner sheet.
6. Attempt (via browser devtools / a second unauthenticated tab) to read `chat_channels/{bookingId}` as a non-participant — confirm `PERMISSION_DENIED`.

- [ ] **Step 3: Update project memory**

Update `[[project-roadmap]]`'s "Fonctionnalité préparée mais non branchée en UI" section — the chat feature is no longer unbranched. Move it into the appropriate sprint section as done, dated with today's date, and remove the now-stale "Clarifier avec l'utilisateur" caveat.

---

## Self-Review

**Spec coverage:**

- §2 Modèle de données → Task 1
- §3 Création automatique du canal → Task 4
- §4 Point d'entrée UI (icône + Sheet, 3 surfaces: dashboard voyageur, trip-details owner row, trip-details traveler banner) → Tasks 6, 7, 8, 9
- §5 Non-lu (`readBy` map, badge, mark-as-read on open) → Task 6 (badge logic in `ContactBookingButton`), Task 7 (`setDocumentNonBlocking` on open)
- §6 Notifications (`message-created` endpoint) → Task 5
- §7 Sécurité (rules + 8-row test table) → Tasks 2, 3
- §8 Hors scope v1 → nothing built for these (no `/messages` page, no attachments, no quick replies, no block/report, no per-message read receipt, no archival) — consistent with all tasks above
- §9 Fichiers à créer/modifier → matches the File Structure table exactly, plus the dashboard/trip-details integration split into Tasks 8/9 as the spec's single row implied

**Placeholder scan:** no TBD/TODO; every step has complete, exact code — done.

**Type consistency:** `ChatChannel`/`ChatMessage` field names (`participant1Id`, `participant2Id`, `senderId`, `text`, `createdAt`, `notifiedAt`, `readBy`, `lastMessageAt`, `lastMessagePreview`) are identical across Task 1 (type definitions), Task 2 (rules), Task 4 (channel creation), Task 5 (endpoint), Task 6/7 (components). `AppNotification.type` value `"new-message"` matches between Task 1's type union and Task 5's `createInAppNotification` call.

---

**Plan complete and saved to `docs/superpowers/plans/2026-08-17-chat-reservation.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
