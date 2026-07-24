"use client";

import * as React from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: (date: Date) => boolean;
  className?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Choisir une date",
  disabled,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const todayMidnight = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const handleSelect = (date: Date | undefined) => {
    onChange(date);
    if (date) setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-12 w-full items-center gap-2 rounded-md border bg-card px-3 text-sm transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
            value
              ? "border-primary/35 text-foreground"
              : "border-white/[0.06] text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon
            className={cn(
              "h-4 w-4 shrink-0 transition-colors",
              value ? "text-primary" : "text-muted-foreground",
            )}
            aria-hidden="true"
          />
          <span className="flex-1 truncate text-left">
            {value
              ? format(value, "eee d MMMM yyyy", { locale: fr })
              : placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto border border-white/[0.08] bg-card p-0 shadow-xl"
        align="start"
        sideOffset={4}
      >
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleSelect}
          disabled={disabled}
          defaultMonth={value ?? todayMidnight()}
          locale={fr}
          classNames={{
            day: cn(
              "h-9 w-9 rounded-md p-0 text-sm font-normal transition-colors",
              "hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              "aria-selected:opacity-100 disabled:pointer-events-none disabled:opacity-30",
            ),
            day_selected:
              "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-md",
            day_today:
              "ring-1 ring-inset ring-primary rounded-md aria-selected:ring-0",
            day_outside: "text-muted-foreground/40 aria-selected:opacity-100",
            nav_button: cn(
              "h-7 w-7 rounded-md border border-white/[0.06] bg-secondary p-0",
              "opacity-70 hover:opacity-100 transition-opacity",
            ),
          }}
          footer={
            <div className="flex items-center justify-between border-t border-white/[0.06] px-3 py-2">
              <button
                type="button"
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => {
                  onChange(undefined);
                  setOpen(false);
                }}
              >
                Effacer
              </button>
              <button
                type="button"
                className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
                onClick={() => {
                  onChange(todayMidnight());
                  setOpen(false);
                }}
              >
                Aujourd'hui
              </button>
            </div>
          }
        />
      </PopoverContent>
    </Popover>
  );
}
