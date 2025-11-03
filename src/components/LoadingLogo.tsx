import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

export function LoadingLogo({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(className)}
      {...props}
    >
      <g className="animate-car-rumble origin-center">
        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1 .4-1 1v7c0 .6.4 1 1 1h2" />
        <circle cx="7" cy="17" r="2" className="animate-spin-wheels" />
        <path d="M9 17h6" />
        <circle cx="17" cy="17" r="2" className="animate-spin-wheels" />
      </g>
      {/* Replaced path with circle for a better puff effect */}
      <circle cx="2.5" cy="17" r="1.5" className="animate-smoke-puff-1" stroke="currentColor" strokeWidth="1" opacity="0" />
      <circle cx="2.5" cy="17" r="1.5" className="animate-smoke-puff-2" stroke="currentColor" strokeWidth="1" opacity="0" />
    </svg>
  );
}
