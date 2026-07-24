import { formatShortLocation } from "@/lib/address";
import { cn } from "@/lib/utils";

interface AddressLinkProps {
  address: string;
  className?: string;
}

export function AddressLink({ address, className }: AddressLinkProps) {
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "hover:underline hover:text-primary transition-colors",
        className,
      )}
    >
      {formatShortLocation(address)}
    </a>
  );
}
