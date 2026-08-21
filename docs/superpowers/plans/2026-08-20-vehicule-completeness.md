# Complétude des véhicules (type/maxSeats) et édition universelle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop new véhicules from being created without `type`/`maxSeats` via `edit-trip`, and let a transporteur edit any of their véhicules (not just the oldest one) from `edit-trip`, `post-trip`, and the profile sidebar, with a visual "À compléter" nudge on incomplete ones.

**Architecture:** Reuse the existing `EditVehicleDialog` component everywhere a véhicule is already listed/selected instead of building a new edit path. Align `edit-trip`'s add-vehicle form on the full `vehicleSchema` (already used by `post-trip`). No new components, no schema/rules/type changes.

**Tech Stack:** Next.js 15 App Router, React Hook Form + Zod, Firebase Firestore/Storage (client SDK), shadcn/ui, lucide-react, TypeScript.

**Spec:** `docs/superpowers/specs/2026-08-20-vehicule-completeness-design.md`

---

## Context for the implementer

- No Jest/RTL test harness exists for these page components (`edit-trip`, `post-trip`, `ProfileSidebar`) — only Firestore Security Rules have a Jest suite (`npm run test:rules`), which is unrelated to this change and does not need to run. Verification for every task in this plan is: `npx tsc --noEmit` (must show zero new errors), `npm run lint`, and a manual check described in each task.
- `src/lib/vehicle-schema.ts`, `src/components/EditVehicleDialog.tsx`, `firestore.rules`, and `src/types/db.ts` are **not modified** by this plan — everything needed already exists there.
- Every task below is independently committable and leaves the app in a working state.

---

### Task 1: `edit-trip` — schéma complet du formulaire d'ajout (type/province/maxSeats)

**Files:**

- Modify: `src/app/edit-trip/[tripId]/page.tsx`

- [ ] **Step 1: Switch to the full vehicle schema and import the missing types**

Find this import block near the top of the file:

```ts
import {
  vehicleBaseSchema as vehicleSchema,
  type VehicleBaseFormValues as VehicleFormValues,
} from "@/lib/vehicle-schema";
import { VEHICLE_MAKES, VEHICLE_COLOR_OPTIONS } from "@/types/db";
```

Replace it with:

```ts
import { vehicleSchema, type VehicleFormValues } from "@/lib/vehicle-schema";
import {
  VEHICLE_MAKES,
  VEHICLE_COLOR_OPTIONS,
  VEHICLE_TYPE_CONFIG,
  CANADIAN_PROVINCES,
  type VehicleType,
  type ProvinceCode,
} from "@/types/db";
```

- [ ] **Step 2: Add `type`/`province` defaults to `vehicleForm`**

Find:

```ts
const vehicleForm = useForm<VehicleFormValues>({
  resolver: zodResolver(vehicleSchema),
  defaultValues: {
    make: "",
    model: "",
    year: new Date().getFullYear(),
    color: "",
    licensePlate: "",
  },
});
```

Replace with:

```ts
const vehicleForm = useForm<VehicleFormValues>({
  resolver: zodResolver(vehicleSchema),
  defaultValues: {
    make: "",
    model: "",
    year: new Date().getFullYear(),
    color: "",
    licensePlate: "",
    province: "QC",
    type: "berline",
  },
});
```

- [ ] **Step 3: Compute `maxSeats` before writing the new vehicle**

Find, inside `handleAddVehicle`:

```ts
await setDoc(vehicleRef, {
  ...values,
  imageUrl,
  ownerId: user.uid,
  createdAt: serverTimestamp(),
});
```

Replace with:

```ts
const maxSeats = VEHICLE_TYPE_CONFIG[values.type as VehicleType]?.maxSeats ?? 8;
await setDoc(vehicleRef, {
  ...values,
  imageUrl,
  maxSeats,
  ownerId: user.uid,
  createdAt: serverTimestamp(),
});
```

- [ ] **Step 4: Add the "Type de véhicule" field to the add-vehicle dialog form**

Find, inside the `<form id="add-vehicle-form" ...>` block:

```tsx
                                  <div className="grid grid-cols-2 gap-4">
                                    <SelectOrCustomField
                                      control={vehicleForm.control}
                                      name="make"
                                      label="Marque"
                                      placeholder="Sélectionner la marque"
                                      options={makeOptions}
                                    />
```

Replace with (adds a new `type` field immediately before the existing make/model grid — do not remove the grid, just insert above it):

```tsx
                                  <FormField
                                    control={vehicleForm.control}
                                    name="type"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>
                                          Type de véhicule
                                        </FormLabel>
                                        <Select
                                          onValueChange={field.onChange}
                                          value={field.value}
                                        >
                                          <FormControl>
                                            <SelectTrigger className="h-11">
                                              <SelectValue placeholder="Sélectionner le type" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            {(
                                              Object.entries(
                                                VEHICLE_TYPE_CONFIG,
                                              ) as [
                                                VehicleType,
                                                { label: string; maxSeats: number },
                                              ][]
                                            ).map(([key, cfg]) => (
                                              <SelectItem key={key} value={key}>
                                                {cfg.label} — max {cfg.maxSeats}{" "}
                                                places
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <div className="grid grid-cols-2 gap-4">
                                    <SelectOrCustomField
                                      control={vehicleForm.control}
                                      name="make"
                                      label="Marque"
                                      placeholder="Sélectionner la marque"
                                      options={makeOptions}
                                    />
```

- [ ] **Step 5: Replace the standalone `licensePlate` field with a `province` + `licensePlate` grid**

Find:

```tsx
<FormField
  control={vehicleForm.control}
  name="licensePlate"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Plaque d'immatriculation</FormLabel>
      <FormControl>
        <Input className="h-11" {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

Replace with:

```tsx
<div className="grid grid-cols-2 gap-4">
  <FormField
    control={vehicleForm.control}
    name="province"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Province</FormLabel>
        <Select onValueChange={field.onChange} value={field.value}>
          <FormControl>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Prov." />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            {(
              Object.entries(CANADIAN_PROVINCES) as [
                ProvinceCode,
                {
                  label: string;
                  plateFormat: string;
                  placeholder: string;
                },
              ][]
            ).map(([code, p]) => (
              <SelectItem key={code} value={code}>
                {code} — {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FormMessage />
      </FormItem>
    )}
  />
  <FormField
    control={vehicleForm.control}
    name="licensePlate"
    render={({ field }) => {
      const prov = vehicleForm.watch("province") as ProvinceCode;
      const fmt = CANADIAN_PROVINCES[prov];
      return (
        <FormItem>
          <FormLabel>Plaque</FormLabel>
          <FormControl>
            <Input
              {...field}
              className="h-11"
              placeholder={fmt?.placeholder ?? "ABC-123"}
              onChange={(e) => field.onChange(e.target.value.toUpperCase())}
            />
          </FormControl>
          {fmt && (
            <p className="text-xs text-muted-foreground">
              Format : {fmt.plateFormat}
            </p>
          )}
          <FormMessage />
        </FormItem>
      );
    }}
  />
</div>
```

- [ ] **Step 6: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: no errors referencing `edit-trip/[tripId]/page.tsx`.

- [ ] **Step 7: Manual check**

Run `npm run dev`, open `/edit-trip/<any existing tripId you own>`, click the `+` button next to the véhicule select, confirm the dialog now shows: Type de véhicule (select), Marque/Modèle, Année/Couleur, Province/Plaque (placeholder changes when you change province), Photo. Submit with a full berline → confirm in Firestore console (or by reopening the dialog for that vehicle via Task 2 once done) that the new doc has `type: "berline"` and `maxSeats: 4`.

- [ ] **Step 8: Commit**

```bash
git add "src/app/edit-trip/[tripId]/page.tsx"
git commit -m "fix(edit-trip): complete vehicle schema (type/province) on the add-vehicle form

Every new vehicle now gets type and maxSeats computed from
VEHICLE_TYPE_CONFIG, matching post-trip's behavior. Closes the gap
that let vehicles be created with no type."
```

---

### Task 2: `edit-trip` — bouton "Modifier" + badge "À compléter"

**Files:**

- Modify: `src/app/edit-trip/[tripId]/page.tsx`

- [ ] **Step 1: Import `Pencil`, `Badge`, `EditVehicleDialog`, and `Vehicle`**

Find:

```ts
import {
  Users,
  Clock,
  DollarSign,
  Minus,
  Plus,
  Luggage,
  Briefcase,
  Dog,
  CigaretteOff,
} from "lucide-react";
```

Replace with:

```ts
import {
  Users,
  Clock,
  DollarSign,
  Minus,
  Plus,
  Pencil,
  Luggage,
  Briefcase,
  Dog,
  CigaretteOff,
} from "lucide-react";
```

Then find:

```ts
import {
  VEHICLE_MAKES,
  VEHICLE_COLOR_OPTIONS,
  VEHICLE_TYPE_CONFIG,
  CANADIAN_PROVINCES,
  type VehicleType,
  type ProvinceCode,
} from "@/types/db";
```

Replace with (adds `type Vehicle`):

```ts
import {
  VEHICLE_MAKES,
  VEHICLE_COLOR_OPTIONS,
  VEHICLE_TYPE_CONFIG,
  CANADIAN_PROVINCES,
  type VehicleType,
  type ProvinceCode,
  type Vehicle,
} from "@/types/db";
```

Then find the `VehiclePhotoPicker` import line:

```ts
import { VehiclePhotoPicker } from "@/components/VehiclePhotoPicker";
```

Replace with:

```ts
import { VehiclePhotoPicker } from "@/components/VehiclePhotoPicker";
import { EditVehicleDialog } from "@/components/EditVehicleDialog";
import { Badge } from "@/components/ui/badge";
```

- [ ] **Step 2: Add `showEditVehicleDialog` state**

Find:

```ts
const [showAddVehicleDialog, setShowAddVehicleDialog] = useState(false);
```

Replace with:

```ts
const [showAddVehicleDialog, setShowAddVehicleDialog] = useState(false);
const [showEditVehicleDialog, setShowEditVehicleDialog] = useState(false);
```

- [ ] **Step 3: Derive `selectedVehicle` from the current form value**

Find, right before `const handleAddVehicle = async ...`:

```ts
  const handleAddVehicle = async (values: VehicleFormValues) => {
```

Replace with:

```ts
  const selectedVehicle = vehicles?.find(
    (v) => v.id === tripForm.watch("vehicleId"),
  ) as Vehicle | undefined;

  const handleAddVehicle = async (values: VehicleFormValues) => {
```

- [ ] **Step 4: Add the "À compléter" badge to each `SelectItem`**

Find:

```tsx
                            <SelectContent>
                              {vehicles &&
                                vehicles.map((v) => (
                                  <SelectItem key={v.id} value={v.id}>
                                    {v.make} {v.model} ({v.licensePlate})
                                  </SelectItem>
                                ))}
```

Replace with:

```tsx
                            <SelectContent>
                              {vehicles &&
                                vehicles.map((v) => (
                                  <SelectItem key={v.id} value={v.id}>
                                    {v.make} {v.model} ({v.licensePlate})
                                    {!v.type && (
                                      <Badge
                                        variant="outline"
                                        className="ml-2"
                                      >
                                        À compléter
                                      </Badge>
                                    )}
                                  </SelectItem>
                                ))}
```

- [ ] **Step 5: Add the Pencil button and `EditVehicleDialog` next to the `+` button**

Find:

```tsx
                          </Select>
                          <Dialog
                            open={showAddVehicleDialog}
```

Replace with:

```tsx
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-11 w-11 flex-shrink-0"
                            disabled={!selectedVehicle}
                            onClick={() => setShowEditVehicleDialog(true)}
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">
                              Modifier le véhicule sélectionné
                            </span>
                          </Button>
                          {selectedVehicle && (
                            <EditVehicleDialog
                              vehicle={selectedVehicle}
                              open={showEditVehicleDialog}
                              onOpenChange={setShowEditVehicleDialog}
                            />
                          )}
                          <Dialog
                            open={showAddVehicleDialog}
```

- [ ] **Step 6: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: no errors referencing `edit-trip/[tripId]/page.tsx`.

- [ ] **Step 7: Manual check**

Run `npm run dev`, open `/edit-trip/<tripId>`. Confirm: the crayon button is disabled only when no véhicule is selected; selecting a véhicule and clicking the crayon opens `EditVehicleDialog` pre-filled with that véhicule's data; a véhicule with no `type` in Firestore shows the "À compléter" badge in the select list, and opening it via the crayon then saving clears the badge on next render.

- [ ] **Step 8: Commit**

```bash
git add "src/app/edit-trip/[tripId]/page.tsx"
git commit -m "feat(edit-trip): edit any selected vehicle from the trip form

Adds a pencil button next to the vehicle select that opens the
existing EditVehicleDialog for whichever vehicle is selected, and an
'À compléter' badge on vehicles missing a type. Previously only the
oldest vehicle (via ProfileSidebar) was editable."
```

---

### Task 3: `post-trip` — bouton "Modifier" + badge "À compléter"

**Files:**

- Modify: `src/app/post-trip/page.tsx`

`post-trip` already uses the full `vehicleSchema` and already computes `selectedVehicle` (line ~661) — this task only adds the edit affordance and the badge, mirroring Task 2.

- [ ] **Step 1: Import `Pencil`, `EditVehicleDialog`, `Badge`**

Find:

```ts
import {
  ArrowLeft,
  Users,
  Clock,
  DollarSign,
  Minus,
  Plus,
  Luggage,
  Briefcase,
  Dog,
  CigaretteOff,
  Landmark,
  Banknote,
} from "lucide-react";
```

Replace with:

```ts
import {
  ArrowLeft,
  Users,
  Clock,
  DollarSign,
  Minus,
  Plus,
  Pencil,
  Luggage,
  Briefcase,
  Dog,
  CigaretteOff,
  Landmark,
  Banknote,
} from "lucide-react";
```

Then find the `VehiclePhotoPicker` import line:

```ts
import { VehiclePhotoPicker } from "@/components/VehiclePhotoPicker";
```

Replace with:

```ts
import { VehiclePhotoPicker } from "@/components/VehiclePhotoPicker";
import { EditVehicleDialog } from "@/components/EditVehicleDialog";
import { Badge } from "@/components/ui/badge";
```

- [ ] **Step 2: Add `showEditVehicleDialog` state**

Find:

```ts
const [showAddVehicleDialog, setShowAddVehicleDialog] = useState(false);
```

Replace with:

```ts
const [showAddVehicleDialog, setShowAddVehicleDialog] = useState(false);
const [showEditVehicleDialog, setShowEditVehicleDialog] = useState(false);
```

- [ ] **Step 3: Add the "À compléter" badge to each `SelectItem`**

Find:

```tsx
                            <SelectContent>
                              {vehicles &&
                                vehicles.map((v) => (
                                  <SelectItem key={v.id} value={v.id}>
                                    {v.make} {v.model} ({v.licensePlate})
                                  </SelectItem>
                                ))}
```

Replace with:

```tsx
                            <SelectContent>
                              {vehicles &&
                                vehicles.map((v) => (
                                  <SelectItem key={v.id} value={v.id}>
                                    {v.make} {v.model} ({v.licensePlate})
                                    {!v.type && (
                                      <Badge
                                        variant="outline"
                                        className="ml-2"
                                      >
                                        À compléter
                                      </Badge>
                                    )}
                                  </SelectItem>
                                ))}
```

- [ ] **Step 4: Add the Pencil button and `EditVehicleDialog` next to the `+` button**

Find:

```tsx
                          </Select>
                          <Dialog
                            open={showAddVehicleDialog}
```

Replace with:

```tsx
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-11 w-11 flex-shrink-0"
                            disabled={!selectedVehicle}
                            onClick={() => setShowEditVehicleDialog(true)}
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">
                              Modifier le véhicule sélectionné
                            </span>
                          </Button>
                          {selectedVehicle && (
                            <EditVehicleDialog
                              vehicle={selectedVehicle}
                              open={showEditVehicleDialog}
                              onOpenChange={setShowEditVehicleDialog}
                            />
                          )}
                          <Dialog
                            open={showAddVehicleDialog}
```

- [ ] **Step 5: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: no errors referencing `post-trip/page.tsx`.

- [ ] **Step 6: Manual check**

Run `npm run dev`, open `/post-trip`. Confirm the same behavior as Task 2's manual check: crayon disabled with no selection, opens prefilled dialog, badge shows/clears correctly. Also confirm the existing "Maximum N places pour ce véhicule (Type)" hint text below the seats stepper still updates correctly after editing a véhicule's type via the new dialog (it reads `selectedVehicle`, which is the same object used by the new button).

- [ ] **Step 7: Commit**

```bash
git add "src/app/post-trip/page.tsx"
git commit -m "feat(post-trip): edit any selected vehicle from the trip form

Mirrors the edit-trip pencil button: opens EditVehicleDialog for the
currently selected vehicle, and flags vehicles missing a type with an
'À compléter' badge in the select list."
```

---

### Task 4: `ProfileSidebar` — badge "À compléter" sur le véhicule principal

**Files:**

- Modify: `src/components/dashboard/shared/ProfileSidebar.tsx`

`Badge` and the `Edit` icon are already imported in this file — no new imports needed.

- [ ] **Step 1: Add the badge next to the vehicle name/model in the card**

Find:

```tsx
<div className="min-w-0 flex-1">
  <p className="text-xs font-semibold truncate">
    {firstVehicle.make} {firstVehicle.model} {firstVehicle.year}
  </p>
  <p className="text-xs text-muted-foreground truncate">
    {firstVehicle.color} · {firstVehicle.licensePlate}
  </p>
</div>
```

Replace with:

```tsx
<div className="min-w-0 flex-1">
  <p className="text-xs font-semibold truncate flex items-center gap-1.5">
    <span className="truncate">
      {firstVehicle.make} {firstVehicle.model} {firstVehicle.year}
    </span>
    {!firstVehicle.type && (
      <Badge variant="outline" className="shrink-0">
        À compléter
      </Badge>
    )}
  </p>
  <p className="text-xs text-muted-foreground truncate">
    {firstVehicle.color} · {firstVehicle.licensePlate}
  </p>
</div>
```

- [ ] **Step 2: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: no errors referencing `ProfileSidebar.tsx`.

- [ ] **Step 3: Manual check**

Run `npm run dev`, log in as a transporteur whose oldest véhicule has no `type` (or temporarily unset `type` on one in the Firestore console), open the dashboard, confirm the "À compléter" badge shows next to the véhicule name in the sidebar card, and clicking the card still opens `EditVehicleDialog` as before. Set the `type` and save, confirm the badge disappears.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/shared/ProfileSidebar.tsx
git commit -m "feat(profile): flag incomplete primary vehicle with a badge

Shows an 'À compléter' badge next to the vehicle name when it has no
type, so the gap is visible from the dashboard sidebar too."
```

---

### Task 5: Vérification finale

**Files:** none (verification only)

- [ ] **Step 1: Full project typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no new errors/warnings in the 3 modified files.

- [ ] **Step 3: End-to-end manual smoke test**

Run `npm run dev` and, as a transporteur account with at least 2 véhicules (one with `type` unset in Firestore, one complete):

1. On `/post-trip`: confirm both véhicules show in the select, the incomplete one has the badge, editing it via the crayon clears the badge and updates `maxSeats` (check the "Maximum N places" hint text changes accordingly).
2. On `/edit-trip/<tripId>`: repeat the same check.
3. Add a brand-new véhicule from `/edit-trip`'s `+` dialog with a non-default type/province, confirm it appears in the select with no badge (i.e. `type`/`maxSeats` were written correctly).
4. On the dashboard sidebar: confirm the badge appears/disappears in sync with the véhicule's `type` field.

- [ ] **Step 4: No commit for this task** — it's verification only. If any check fails, fix the issue in the relevant file and make a new fix commit (never amend a prior task's commit); note the fix when reporting completion.

---

## Self-review notes

- Spec §2 (schéma complet + maxSeats + licensePlate placeholder) → Task 1. §3 (bouton crayon) → Tasks 2 & 3. §4 (badges) → Tasks 2, 3, 4. §5 (edge cases) → covered by reusing `EditVehicleDialog` as-is (no new code needed) and verified manually in Tasks 2/3/5. §6 (hors scope) → nothing in this plan touches Stripe, a dedicated véhicules page, VehicleAvatar, or `firestore.rules`.
- No placeholders: every step has literal code, exact commands, and expected output.
- Type consistency check: `VehicleFormValues` (from `vehicle-schema.ts`) is used consistently after Task 1 switches `edit-trip` off `VehicleBaseFormValues`; `selectedVehicle` is typed `Vehicle | undefined` the same way in both `edit-trip` (new, Task 2) and `post-trip` (pre-existing); `EditVehicleDialog`'s prop name is `vehicle` (not `initialVehicle` or similar) — matched in all three call sites (Tasks 2, 3, and the pre-existing `ProfileSidebar` one).
