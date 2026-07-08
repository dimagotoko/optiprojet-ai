"use client";

import * as React from "react";
import { useFirestore, useUser } from "@/firebase";
import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface RatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driverId: string;
  driverName: string;
  tripId: string;
  onRated?: () => void;
}

export function RatingDialog({
  open,
  onOpenChange,
  driverId,
  driverName,
  tripId,
  onRated,
}: RatingDialogProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [rating, setRating] = React.useState(0);
  const [hovered, setHovered] = React.useState(0);
  const [comment, setComment] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async () => {
    if (!firestore || !user || rating === 0) return;
    setIsSubmitting(true);

    // reviewId déterministe : empêche de noter deux fois le même trajet
    const reviewId = `${tripId}_${user.uid}`;
    const reviewRef = doc(firestore, "users", driverId, "reviews", reviewId);
    const driverRef = doc(firestore, "users", driverId);

    try {
      await runTransaction(firestore, async (tx) => {
        const [reviewSnap, driverSnap] = await Promise.all([
          tx.get(reviewRef),
          tx.get(driverRef),
        ]);

        if (reviewSnap.exists())
          throw new Error("Vous avez déjà noté ce trajet.");

        const d = driverSnap.data();
        const currentTotal = d?.totalRatings ?? 0;
        const currentAvg = d?.averageRating ?? 0;
        const newTotal = currentTotal + 1;
        const newAverage = (currentAvg * currentTotal + rating) / newTotal;

        tx.set(reviewRef, {
          reviewerId: user.uid,
          tripId,
          rating,
          comment: comment.trim(),
          createdAt: serverTimestamp(),
        });
        tx.update(driverRef, {
          averageRating: Math.round(newAverage * 10) / 10,
          totalRatings: newTotal,
        });
      });

      toast({
        title: "Avis envoyé !",
        description: `Merci d'avoir noté ${driverName}.`,
      });
      onOpenChange(false);
      onRated?.();
      setRating(0);
      setComment("");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: err.message ?? "Impossible d'envoyer l'avis.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayed = hovered || rating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Évaluer {driverName}</DialogTitle>
          <DialogDescription>
            Partagez votre expérience avec ce conducteur pour aider la
            communauté.
          </DialogDescription>
        </DialogHeader>

        {/* Étoiles */}
        <div className="flex justify-center gap-2 py-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className="focus:outline-none"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              aria-label={`${star} étoile${star > 1 ? "s" : ""}`}
            >
              <Star
                className={cn(
                  "h-9 w-9 transition-colors",
                  star <= displayed
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground/30",
                )}
              />
            </button>
          ))}
        </div>
        {rating === 0 && (
          <p className="text-center text-xs text-muted-foreground">
            Sélectionnez une note
          </p>
        )}

        {/* Commentaire */}
        <Textarea
          placeholder="Commentaire optionnel…"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={500}
          rows={3}
        />

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || isSubmitting}
          >
            {isSubmitting ? "Envoi…" : "Envoyer l'avis"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
