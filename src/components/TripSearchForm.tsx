"use client";

import * as React from "react";
import { useForm, FormProvider } from "react-hook-form";
import { Users, ArrowRight, Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import { AddressInput, Address } from "./AddressInput";

type TripSearchFormValues = {
  departure?: string;
  destination?: string;
  date?: Date;
};

type TripSearchFormProps = {
  initialSearch?: TripSearchFormValues;
  onSearch: (search: TripSearchFormValues) => void;
};

export function TripSearchForm({
  initialSearch,
  onSearch,
}: TripSearchFormProps) {
  const [passengers, setPassengers] = React.useState(1);

  const formMethods = useForm<TripSearchFormValues>({
    defaultValues: initialSearch,
  });

  const { handleSubmit, watch, setValue, reset } = formMethods;

  const date = watch("date");
  const departure = watch("departure");
  const destination = watch("destination");

  React.useEffect(() => {
    reset(initialSearch);
  }, [initialSearch, reset]);

  const onSubmit = (data: TripSearchFormValues) => {
    onSearch(data);
  };

  const handleReset = () => {
    reset({ departure: "", destination: "", date: undefined });
    onSearch({});
  };

  const canReset = departure || destination || date;

  return (
    <FormProvider {...formMethods}>
      <Card className="w-full shadow-2xl backdrop-blur-sm bg-card/80">
        <CardContent className="p-4 sm:p-6">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="grid grid-cols-1 md:grid-cols-12 gap-2 sm:gap-4 items-center"
          >
            <div className="relative md:col-span-3">
              <AddressInput
                id="departure"
                placeholder="Départ (ex: Station Berri-UQAM)"
                defaultValue={departure}
                onAddressSelect={(address) =>
                  setValue("departure", address.description)
                }
              />
            </div>

            <div className="hidden md:flex justify-center items-center md:col-span-1">
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>

            <div className="relative md:col-span-3">
              <AddressInput
                id="destination"
                placeholder="Destination (ex: Carrefour Laval)"
                defaultValue={destination}
                onAddressSelect={(address) =>
                  setValue("destination", address.description)
                }
              />
            </div>

            <div className="md:col-span-2">
              <DatePicker
                value={date}
                onChange={(d) => setValue("date", d)}
                disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
              />
            </div>

            <div className="relative md:col-span-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full h-12 text-base justify-start"
                  >
                    <Users className="mr-2 h-5 w-5 text-muted-foreground" />
                    <span>{passengers}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48" align="center">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Passagers</span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setPassengers((p) => Math.max(1, p - 1))}
                        disabled={passengers <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-10 text-center text-lg font-bold">
                        {passengers}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setPassengers((p) => p + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="md:col-span-2 flex items-center gap-2">
              <Button
                type="submit"
                className="w-full h-12 text-base"
                disabled={!departure && !destination}
              >
                Rechercher
              </Button>
              {canReset && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleReset}
                  className="h-12 w-12 shrink-0"
                >
                  <X className="h-5 w-5" />
                  <span className="sr-only">Réinitialiser</span>
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </FormProvider>
  );
}
