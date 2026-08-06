"use client";

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LoadingLogo } from "@/components/LoadingLogo";
import {
  CameraModal,
  compressImage,
  formatSize,
  isHeicFile,
  MAX_FILE_SIZE,
} from "@/components/AvatarUpload";
import { Camera, CheckCircle, Car, Trash2, Upload } from "lucide-react";

interface VehiclePhotoPickerProps {
  onChange: (blob: Blob | null) => void;
  initialImageUrl?: string;
}

type PickerStatus = "idle" | "processing" | "done" | "error";

/**
 * Variante véhicule de AvatarPicker : compresse et prévisualise l'image
 * localement sans l'envoyer à Storage — le véhicule n'a pas encore d'ID avant
 * la création du document. Le blob final est remonté au parent via onChange
 * pour être uploadé une fois le document créé (voir handleAddVehicle).
 * En mode édition, initialImageUrl affiche la photo déjà enregistrée ; tant
 * qu'aucun fichier n'est choisi ni supprimé, onChange n'est jamais appelé et
 * le parent garde l'URL existante inchangée.
 */
export function VehiclePhotoPicker({
  onChange,
  initialImageUrl,
}: VehiclePhotoPickerProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraFallbackRef = React.useRef<HTMLInputElement>(null);
  const previewUrlRef = React.useRef<string | null>(null);

  const [status, setStatus] = React.useState<PickerStatus>("idle");
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(
    initialImageUrl ?? null,
  );
  const [sizes, setSizes] = React.useState<{
    original: number;
    compressed: number;
  } | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = React.useState(false);

  React.useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const processFile = React.useCallback(
    async (file: File) => {
      setErrorMessage(null);
      setStatus("processing");

      try {
        const { blob, originalSize, compressedSize } =
          await compressImage(file);

        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        const url = URL.createObjectURL(blob);
        previewUrlRef.current = url;

        setSizes({ original: originalSize, compressed: compressedSize });
        setPreviewUrl(url);
        setStatus("done");
        onChange(blob);
      } catch (err) {
        console.error("[VehiclePhotoPicker] compression error:", err);
        setErrorMessage(
          "Une erreur est survenue lors du traitement de l'image.",
        );
        setStatus("error");
      }
    },
    [onChange],
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (isHeicFile(file)) {
      setErrorMessage(
        "Format HEIC non pris en charge. Sur iPhone : Réglages › Photos › Transférer sur Mac ou PC › Automatique, puis choisissez un JPG.",
      );
      setStatus("error");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage(
        `Fichier trop volumineux (${formatSize(file.size)}). Maximum : 10 Mo.`,
      );
      setStatus("error");
      return;
    }

    await processFile(file);
  };

  const handleCameraClick = () => {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      cameraFallbackRef.current?.click();
      return;
    }
    setIsCameraOpen(true);
  };

  const handleCameraCapture = async (rawBlob: Blob) => {
    setIsCameraOpen(false);
    const file = new File([rawBlob], "capture.webp", { type: "image/webp" });
    await processFile(file);
  };

  const handleRemove = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
    setSizes(null);
    setStatus("idle");
    setErrorMessage(null);
    onChange(null);
  };

  const busy = status === "processing";

  return (
    <>
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <Avatar className="h-24 w-24 shrink-0 rounded-lg border">
          <AvatarImage
            className="rounded-lg object-cover"
            src={previewUrl || undefined}
            alt="Photo du véhicule"
          />
          <AvatarFallback className="rounded-lg bg-muted text-muted-foreground">
            <Car className="h-10 w-10" aria-hidden="true" />
          </AvatarFallback>
        </Avatar>

        <div className="flex flex-col gap-3 w-full">
          {status === "processing" && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <LoadingLogo className="h-4 w-4 text-primary" />
              Optimisation en cours…
            </p>
          )}
          {status === "done" && sizes && (
            <p className="text-sm text-success flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              512 × 512 · {formatSize(sizes.compressed)}
            </p>
          )}
          {status === "error" && errorMessage && (
            <p className="text-sm text-destructive">{errorMessage}</p>
          )}
          {(status === "idle" || status === "error") && !previewUrl && (
            <p className="text-xs text-muted-foreground">
              JPG, PNG ou WebP · 10 Mo max (optionnel)
            </p>
          )}

          <div className="flex flex-col gap-2 w-full sm:flex-row sm:flex-wrap sm:items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
            <input
              ref={cameraFallbackRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={handleCameraClick}
              aria-label="Prendre une photo avec la caméra"
              className="gap-2 w-full sm:w-auto"
            >
              <Camera className="h-4 w-4" />
              Prendre une photo
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
              aria-label="Choisir un fichier image"
              className="gap-2 w-full sm:w-auto"
            >
              <Upload className="h-4 w-4" />
              Choisir un fichier
            </Button>

            {previewUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                className="text-muted-foreground hover:text-destructive w-full sm:w-auto gap-2"
                onClick={handleRemove}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sm:sr-only">Supprimer la photo</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      <CameraModal
        open={isCameraOpen}
        onCapture={handleCameraCapture}
        onClose={() => setIsCameraOpen(false)}
      />
    </>
  );
}
