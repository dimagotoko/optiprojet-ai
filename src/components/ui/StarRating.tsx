import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  totalRatings?: number;
  size?: "sm" | "md";
  showAvisLabel?: boolean;
  /** Masque le chiffre et le compteur — affiche les étoiles seules */
  hideCount?: boolean;
  className?: string;
}

export function StarRating({
  rating,
  totalRatings = 0,
  size = "sm",
  showAvisLabel = false,
  hideCount = false,
  className,
}: StarRatingProps) {
  const starSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";

  return (
    <span
      className={cn("inline-flex items-center gap-1", className)}
      aria-label={
        hideCount
          ? `Note : ${rating.toFixed(1)} sur 5`
          : `Note : ${rating.toFixed(1)} sur 5 (${totalRatings} avis)`
      }
    >
      {/* Rangée de 5 étoiles avec remplissage partiel */}
      <span className="inline-flex items-center gap-px" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((i) => {
          const fill = Math.min(1, Math.max(0, rating - (i - 1)));
          return (
            <span key={i} className="relative inline-flex shrink-0">
              {/* Étoile vide en fond */}
              <Star
                className={cn(
                  starSize,
                  "fill-amber-100 text-amber-200 dark:fill-amber-900/30 dark:text-amber-800/50",
                )}
              />
              {/* Portion colorée clippée */}
              {fill > 0 && (
                <span
                  className="absolute inset-y-0 left-0 overflow-hidden"
                  style={{ width: `${Math.round(fill * 100)}%` }}
                >
                  <Star
                    className={cn(
                      starSize,
                      "fill-amber-400 text-amber-400 shrink-0",
                    )}
                  />
                </span>
              )}
            </span>
          );
        })}
      </span>

      {/* Chiffre + compteur (masqué en mode hideCount) */}
      {!hideCount && (
        <span
          className={cn(
            "flex items-center gap-0.5 text-muted-foreground",
            size === "sm" ? "text-xs" : "text-sm",
          )}
        >
          <span className="font-semibold text-foreground">
            {rating.toFixed(1)}
          </span>
          <span>
            ({totalRatings}
            {showAvisLabel ? " avis" : ""})
          </span>
        </span>
      )}
    </span>
  );
}
