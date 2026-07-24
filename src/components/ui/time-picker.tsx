"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = ["00", "15", "30", "45"];
const ITEM_H = 36;
const VISIBLE = 5;
const HALF = Math.floor(VISIBLE / 2);

function nearestMinute(min: string): string {
  const m = parseInt(min, 10);
  return MINUTES.reduce((best, c) =>
    Math.abs(parseInt(c, 10) - m) < Math.abs(parseInt(best, 10) - m) ? c : best,
  );
}

interface ScrollColumnProps {
  items: string[];
  selected: string;
  onSelect: (val: string) => void;
}

function ScrollColumn({ items, selected, onSelect }: ScrollColumnProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const ignoreRef = React.useRef(false);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout>>();

  const scrollToIdx = React.useCallback((idx: number, smooth = false) => {
    const el = containerRef.current;
    if (!el) return;
    ignoreRef.current = true;
    if (smooth) {
      el.scrollTo({ top: idx * ITEM_H, behavior: "smooth" });
    } else {
      el.scrollTop = idx * ITEM_H;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      ignoreRef.current = false;
    }, 350);
  }, []);

  // Scroll on open (no animation)
  React.useLayoutEffect(() => {
    const idx = items.indexOf(selected);
    if (idx !== -1) scrollToIdx(idx, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Smooth scroll when selected changes via click / keyboard
  const prevRef = React.useRef(selected);
  React.useEffect(() => {
    if (selected !== prevRef.current) {
      prevRef.current = selected;
      const idx = items.indexOf(selected);
      if (idx !== -1) scrollToIdx(idx, true);
    }
  }, [selected, items, scrollToIdx]);

  // Detect snapped item after user scroll
  const handleScroll = () => {
    if (ignoreRef.current) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const el = containerRef.current;
      if (!el) return;
      const idx = Math.max(
        0,
        Math.min(items.length - 1, Math.round(el.scrollTop / ITEM_H)),
      );
      if (items[idx] !== selected) onSelect(items[idx]);
    }, 120);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const idx = items.indexOf(selected);
    if (e.key === "ArrowDown" && idx < items.length - 1) {
      e.preventDefault();
      onSelect(items[idx + 1]);
    } else if (e.key === "ArrowUp" && idx > 0) {
      e.preventDefault();
      onSelect(items[idx - 1]);
    }
  };

  return (
    <div className="relative flex-1" role="listbox">
      {/* Central selection band */}
      <div
        className="pointer-events-none absolute inset-x-0 z-10 border-y border-primary/30 bg-primary/10"
        style={{ top: HALF * ITEM_H, height: ITEM_H }}
      />
      <div
        ref={containerRef}
        className="overflow-y-auto outline-none"
        style={{ height: VISIBLE * ITEM_H }}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <div style={{ height: HALF * ITEM_H }} />
        {items.map((item) => (
          <div
            key={item}
            role="option"
            aria-selected={item === selected}
            className={cn(
              "flex cursor-pointer select-none items-center justify-center text-sm font-mono transition-colors",
              item === selected
                ? "font-bold text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
            style={{ height: ITEM_H }}
            onClick={() => onSelect(item)}
          >
            {item}
          </div>
        ))}
        <div style={{ height: HALF * ITEM_H }} />
      </div>
    </div>
  );
}

interface TimePickerProps {
  value?: string;
  onChange: (time: string) => void;
  placeholder?: string;
  className?: string;
}

export function TimePicker({
  value,
  onChange,
  placeholder = "HH : mm",
  className,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false);

  const initHour = () => (value ? (value.split(":")[0] ?? "08") : "08");
  const initMinute = () => {
    if (!value) return "00";
    const m = value.split(":")[1] ?? "00";
    return MINUTES.includes(m) ? m : nearestMinute(m);
  };

  const [hour, setHour] = React.useState(initHour);
  const [minute, setMinute] = React.useState(initMinute);

  // Re-sync draft when popover opens
  React.useEffect(() => {
    if (open) {
      setHour(initHour());
      setMinute(initMinute());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleConfirm = () => {
    onChange(`${hour}:${minute}`);
    setOpen(false);
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
          <Clock
            className={cn(
              "h-4 w-4 shrink-0 transition-colors",
              value ? "text-primary" : "text-muted-foreground",
            )}
            aria-hidden="true"
          />
          <span className="flex-1 text-left font-mono">
            {value ? value.replace(":", " : ") : placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-44 border border-white/[0.08] bg-card p-0 shadow-xl"
        align="start"
        sideOffset={4}
      >
        <div className="flex border-b border-white/[0.06]">
          <ScrollColumn items={HOURS} selected={hour} onSelect={setHour} />
          <div className="flex shrink-0 items-center justify-center px-1 font-bold text-muted-foreground">
            :
          </div>
          <ScrollColumn
            items={MINUTES}
            selected={minute}
            onSelect={setMinute}
          />
        </div>
        <div className="flex items-center justify-between px-3 py-2">
          <button
            type="button"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => setOpen(false)}
          >
            Annuler
          </button>
          <button
            type="button"
            className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
            onClick={handleConfirm}
          >
            OK
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
