"use client";

import * as React from "react";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { doc, setDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { useStorage, useFirestore, useUser } from "@/firebase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LoadingLogo } from "@/components/LoadingLogo";
import {
  Camera,
  CheckCircle,
  RotateCcw,
  SwitchCamera,
  Trash2,
  Upload,
  X,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_BLOB_SIZE = 200 * 1024;
const TARGET_SIZE = 512;
const QUALITY_STEPS = [0.82, 0.7, 0.6, 0.5, 0.4];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0]?.[0] ?? "?").toUpperCase();
  return (
    (parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")
  ).toUpperCase();
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function isHeicFile(file: File): boolean {
  return (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    /\.hei[cf]$/i.test(file.name)
  );
}

async function compressImage(
  file: File,
): Promise<{ blob: Blob; originalSize: number; compressedSize: number }> {
  const originalSize = file.size;

  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });

  const cropSize = Math.min(bitmap.width, bitmap.height);
  const offsetX = (bitmap.width - cropSize) / 2;
  const offsetY = (bitmap.height - cropSize) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = TARGET_SIZE;
  canvas.height = TARGET_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas non disponible.");
  ctx.drawImage(
    bitmap,
    offsetX,
    offsetY,
    cropSize,
    cropSize,
    0,
    0,
    TARGET_SIZE,
    TARGET_SIZE,
  );
  bitmap.close();

  for (const quality of QUALITY_STEPS) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", quality),
    );
    if (!blob) throw new Error("Échec de l'encodage de l'image.");
    if (
      blob.size <= MAX_BLOB_SIZE ||
      quality === QUALITY_STEPS[QUALITY_STEPS.length - 1]
    ) {
      return { blob, originalSize, compressedSize: blob.size };
    }
  }
  throw new Error("Impossible de compresser l'image.");
}

// ─── CameraModal ──────────────────────────────────────────────────────────────

interface CameraModalProps {
  open: boolean;
  onCapture: (blob: Blob) => void;
  onClose: () => void;
}

type CameraPhase = "loading" | "streaming" | "preview" | "error";

function CameraModal({ open, onCapture, onClose }: CameraModalProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const previewUrlRef = React.useRef<string | null>(null);
  const dialogRef = React.useRef<HTMLDivElement>(null);

  const [phase, setPhase] = React.useState<CameraPhase>("loading");
  const [facingMode, setFacingMode] = React.useState<"user" | "environment">(
    "user",
  );
  const [hasMultipleCameras, setHasMultipleCameras] = React.useState(false);
  const [capturedBlob, setCapturedBlob] = React.useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [cameraError, setCameraError] = React.useState<string | null>(null);

  const stopStream = React.useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const clearPreview = React.useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
    setCapturedBlob(null);
  }, []);

  const startStream = React.useCallback(
    async (mode: "user" | "environment") => {
      stopStream();
      setPhase("loading");
      setCameraError(null);

      if (!window.isSecureContext) {
        setCameraError(
          "La caméra nécessite une connexion sécurisée (HTTPS). Accédez à kamgo.ca depuis votre navigateur.",
        );
        setPhase("error");
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError(
          "Votre navigateur ne prend pas en charge l'accès à la caméra.",
        );
        setPhase("error");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setPhase("streaming");

        const devices = await navigator.mediaDevices.enumerateDevices();
        setHasMultipleCameras(
          devices.filter((d) => d.kind === "videoinput").length > 1,
        );
      } catch (err) {
        let msg = "Impossible d'accéder à la caméra.";
        if (err instanceof DOMException) {
          if (err.name === "NotAllowedError")
            msg =
              "Accès à la caméra refusé. Autorisez-le dans les réglages du navigateur.";
          else if (err.name === "NotFoundError")
            msg = "Aucune caméra détectée.";
          else if (err.name === "NotReadableError")
            msg = "La caméra est déjà utilisée par une autre application.";
        }
        setCameraError(msg);
        setPhase("error");
      }
    },
    [stopStream],
  );

  // Start / stop stream on open toggle — cleanup also fires on unmount and route change
  React.useEffect(() => {
    if (open) {
      void startStream(facingMode);
    } else {
      stopStream();
      clearPreview();
      setPhase("loading");
      setFacingMode("user");
      setCameraError(null);
    }
    return stopStream;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Keyboard: Escape + focus trap (re-runs when phase changes because buttons change)
  React.useEffect(() => {
    if (!open || !dialogRef.current) return;
    const el = dialogRef.current;

    const getFocusable = () =>
      Array.from(
        el.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );

    getFocusable()[0]?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = getFocusable();
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose, phase]);

  const handleToggleCamera = async () => {
    const next = facingMode === "user" ? "environment" : "user";
    setFacingMode(next);
    await startStream(next);
  };

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Mirror the capture to match what the user saw in the mirrored preview
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);

    stopStream();

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        previewUrlRef.current = url;
        setCapturedBlob(blob);
        setPreviewUrl(url);
        setPhase("preview");
      },
      "image/webp",
      0.92,
    );
  };

  const handleRetake = () => {
    clearPreview();
    void startStream(facingMode);
  };

  const handleUse = () => {
    if (!capturedBlob) return;
    const blobToSend = capturedBlob;
    clearPreview();
    onCapture(blobToSend);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/75 p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="camera-dialog-title"
        className="relative w-full max-w-sm rounded-t-2xl sm:rounded-2xl bg-card overflow-hidden shadow-2xl outline-none"
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 id="camera-dialog-title" className="text-sm font-semibold">
            {phase === "preview" ? "Aperçu de la photo" : "Prendre une photo"}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Fermer"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Viewfinder */}
        <div className="relative aspect-square bg-black overflow-hidden">
          {/* Video — always mounted so srcObject can be assigned; hidden when not streaming */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              transform: "scaleX(-1)",
              display: phase === "streaming" ? "block" : "none",
            }}
          />

          {phase === "preview" && previewUrl && (
            <img
              src={previewUrl}
              alt="Aperçu capturé"
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}

          {phase === "loading" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <LoadingLogo className="h-8 w-8 text-primary" />
            </div>
          )}

          {phase === "error" && (
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <p className="text-sm text-center text-destructive">
                {cameraError}
              </p>
            </div>
          )}

          {/* Vignette + circle framing guide */}
          {phase === "streaming" && (
            <>
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(circle at center, transparent 27%, rgba(0,0,0,0.5) 28%)",
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className="rounded-full border-2 border-primary/60"
                  style={{ width: "55%", height: "55%" }}
                />
              </div>
            </>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 p-5">
          {phase === "streaming" && (
            <>
              <div className="w-10 flex justify-center">
                {hasMultipleCameras && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Basculer caméra frontale / arrière"
                    onClick={handleToggleCamera}
                    className="h-10 w-10 rounded-full"
                  >
                    <SwitchCamera className="h-5 w-5" />
                  </Button>
                )}
              </div>

              {/* Shutter */}
              <button
                type="button"
                aria-label="Capturer la photo"
                onClick={handleCapture}
                className="h-16 w-16 rounded-full bg-white border-4 border-primary/40 hover:border-primary transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              />

              <div className="w-10" />
            </>
          )}

          {phase === "preview" && (
            <>
              <Button
                type="button"
                variant="outline"
                className="flex-1 gap-2"
                onClick={handleRetake}
              >
                <RotateCcw className="h-4 w-4" />
                Reprendre
              </Button>
              <Button type="button" className="flex-1" onClick={handleUse}>
                Utiliser cette photo
              </Button>
            </>
          )}

          {phase === "error" && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={onClose}
            >
              Fermer
            </Button>
          )}

          {phase === "loading" && (
            <p className="text-sm text-muted-foreground py-4">
              Démarrage de la caméra…
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── AvatarUpload ─────────────────────────────────────────────────────────────

interface AvatarUploadProps {
  uid: string;
  currentUrl: string;
  displayName: string;
  onUploadComplete: (url: string) => void;
  onRemove: () => void;
}

type UploadStatus = "idle" | "processing" | "uploading" | "done" | "error";

export function AvatarUpload({
  uid,
  currentUrl,
  displayName,
  onUploadComplete,
  onRemove,
}: AvatarUploadProps) {
  const storage = useStorage();
  const firestore = useFirestore();
  const { user } = useUser();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraFallbackRef = React.useRef<HTMLInputElement>(null);

  const [status, setStatus] = React.useState<UploadStatus>("idle");
  const [progress, setProgress] = React.useState(0);
  const [sizes, setSizes] = React.useState<{
    original: number;
    compressed: number;
  } | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = React.useState(false);
  const [isCameraOpen, setIsCameraOpen] = React.useState(false);

  const busy = status === "processing" || status === "uploading";

  const processAndUpload = React.useCallback(
    async (file: File) => {
      if (!storage || !firestore || !user) return;

      setErrorMessage(null);
      setStatus("processing");

      try {
        const { blob, originalSize, compressedSize } =
          await compressImage(file);
        setSizes({ original: originalSize, compressed: compressedSize });

        setStatus("uploading");
        setProgress(0);

        const avatarRef = ref(storage, `avatars/${uid}/avatar.webp`);
        const task = uploadBytesResumable(avatarRef, blob, {
          contentType: "image/webp",
        });

        const uploadTimeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 60000),
        );

        await Promise.race([
          new Promise<void>((resolve, reject) => {
            task.on(
              "state_changed",
              (snap) =>
                setProgress(
                  Math.round((snap.bytesTransferred / snap.totalBytes) * 100),
                ),
              reject,
              resolve,
            );
          }),
          uploadTimeout,
        ]);

        const url = await getDownloadURL(avatarRef);
        await setDoc(
          doc(firestore, "users", uid),
          { profilePictureUrl: url },
          { merge: true },
        );
        await updateProfile(user, { photoURL: url });

        setStatus("done");
        onUploadComplete(url);
      } catch (err) {
        const isTimeout = err instanceof Error && err.message === "timeout";
        console.error("[AvatarUpload] upload error:", err);
        setErrorMessage(
          isTimeout
            ? "L'envoi a expiré. Vérifiez votre connexion et que Firebase Storage est activé."
            : "Une erreur est survenue lors de l'envoi. Veuillez réessayer.",
        );
        setStatus("error");
      }
    },
    [storage, firestore, user, uid, onUploadComplete],
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

    await processAndUpload(file);
  };

  const handleCameraClick = () => {
    // Non-secure context or no getUserMedia → native camera input fallback
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      cameraFallbackRef.current?.click();
      return;
    }
    setIsCameraOpen(true);
  };

  const handleCameraCapture = async (rawBlob: Blob) => {
    setIsCameraOpen(false);
    const file = new File([rawBlob], "capture.webp", { type: "image/webp" });
    await processAndUpload(file);
  };

  const handleRemove = async () => {
    if (!storage || !firestore || !user) return;
    setShowRemoveConfirm(false);
    try {
      try {
        await deleteObject(ref(storage, `avatars/${uid}/avatar.webp`));
      } catch {
        // File absent if URL was external — intentionally ignored
      }
      await setDoc(
        doc(firestore, "users", uid),
        { profilePictureUrl: "" },
        { merge: true },
      );
      await updateProfile(user, { photoURL: null });
      setSizes(null);
      setStatus("idle");
      onRemove();
    } catch {
      setErrorMessage("Impossible de supprimer la photo. Veuillez réessayer.");
      setStatus("error");
    }
  };

  const initials = getInitials(displayName) || "?";

  return (
    <>
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <Avatar className="h-24 w-24 shrink-0 ring-2 ring-primary/20">
          <AvatarImage
            src={currentUrl || undefined}
            alt={displayName || "Avatar"}
          />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-2xl">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex flex-col gap-3 w-full">
          {/* Status messages */}
          {status === "processing" && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <LoadingLogo className="h-4 w-4 text-primary" />
              Optimisation en cours…
            </p>
          )}
          {status === "uploading" && (
            <div className="space-y-1.5">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <LoadingLogo className="h-4 w-4 text-primary" />
                Envoi… {progress}%
                {sizes && (
                  <span className="text-xs">
                    ({formatSize(sizes.original)} →{" "}
                    {formatSize(sizes.compressed)})
                  </span>
                )}
              </p>
              <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
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
          {(status === "idle" || status === "done") && !currentUrl && (
            <p className="text-xs text-muted-foreground">
              JPG, PNG ou WebP · 10 Mo max
            </p>
          )}

          {/* Actions */}
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
              capture="user"
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

            {currentUrl && !showRemoveConfirm && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                className="text-muted-foreground hover:text-destructive w-full sm:w-auto gap-2"
                onClick={() => setShowRemoveConfirm(true)}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sm:sr-only">Supprimer la photo</span>
              </Button>
            )}

            {showRemoveConfirm && (
              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                <span className="text-xs text-muted-foreground">
                  Supprimer la photo ?
                </span>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleRemove}
                >
                  Confirmer
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRemoveConfirm(false)}
                >
                  Annuler
                </Button>
              </div>
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
