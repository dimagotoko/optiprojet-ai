"use client";

import * as React from "react";
import type { Control, FieldValues, Path } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const OTHER_VALUE = "__autre__";

interface SelectOrCustomOption {
  value: string;
  label: string;
  swatch?: string;
}

interface SelectOrCustomFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  placeholder: string;
  options: SelectOrCustomOption[];
}

/**
 * Champ Select fermé + repli "Autre (préciser)" en saisie libre. Utilisé pour
 * Marque et Couleur : offre le maximum de choix courants sans bloquer les
 * véhicules atypiques ou les données déjà enregistrées en texte libre.
 */
export function SelectOrCustomField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  options,
}: SelectOrCustomFieldProps<T>) {
  const [manualMode, setManualMode] = React.useState(false);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const isKnown = options.some((o) => o.value === field.value);
        const useManual = manualMode || (!!field.value && !isKnown);

        return (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            {useManual ? (
              <div className="flex gap-2">
                <FormControl>
                  <Input
                    {...field}
                    placeholder={placeholder}
                    className="h-11"
                  />
                </FormControl>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-11 shrink-0"
                  onClick={() => {
                    setManualMode(false);
                    field.onChange("");
                  }}
                >
                  Liste
                </Button>
              </div>
            ) : (
              <Select
                onValueChange={(val) => {
                  if (val === OTHER_VALUE) {
                    setManualMode(true);
                    field.onChange("");
                  } else {
                    field.onChange(val);
                  }
                }}
                value={isKnown ? field.value : undefined}
              >
                <FormControl>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder={placeholder} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="max-h-72">
                  {options.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.swatch ? (
                        <span className="flex items-center gap-2">
                          <span
                            className="inline-block h-3 w-3 rounded-full border shrink-0"
                            style={{ backgroundColor: o.swatch }}
                            aria-hidden="true"
                          />
                          {o.label}
                        </span>
                      ) : (
                        o.label
                      )}
                    </SelectItem>
                  ))}
                  <SelectItem value={OTHER_VALUE}>Autre (préciser)</SelectItem>
                </SelectContent>
              </Select>
            )}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
