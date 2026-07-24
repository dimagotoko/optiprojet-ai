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
import { CheckCircle, Trash2, Upload } from "lucide-react";

interface AvatarUploadProps {
  uid: string;
  currentUrl: string;
  displayName: string;
  onUploadComplete: (url: string) => void;
  onRemove: () => void;
}

type Status = "idle" | "processing" | "uploading" | "done" | "error";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_BLOB_SIZE = 200 * 1024;
const TARGET_SIZE = 512;
const QUALITY_STEPS = [0.82, 0.7, 0.6, 0.5, 0.4];

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
  const inputRef = React.useRef<HTMLInputElement>(null);

  const [status, setStatus] = React.useState<Status>("idle");
  const [progress, setProgress] = React.useState(0);
  const [sizes, setSizes] = React.useState<{
    original: number;
    compressed: number;
  } | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = React.useState(false);

  const busy = status === "processing" || status === "uploading";

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !storage || !firestore || !user) return;

    setErrorMessage(null);
    setStatus("idle");

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

    try {
      setStatus("processing");
      const { blob, originalSize, compressedSize } = await compressImage(file);
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
  };

  const handleRemove = async () => {
    if (!storage || !firestore || !user) return;
    setShowRemoveConfirm(false);
    try {
      try {
        await deleteObject(ref(storage, `avatars/${uid}/avatar.webp`));
      } catch {
        // ignore : fichier inexistant si l'URL était externe
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
        {/* État */}
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
                  ({formatSize(sizes.original)} → {formatSize(sizes.compressed)}
                  )
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
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            {currentUrl ? "Remplacer" : "Choisir une photo"}
          </Button>

          {currentUrl && !showRemoveConfirm && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              className="text-muted-foreground hover:text-destructive"
              onClick={() => setShowRemoveConfirm(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}

          {showRemoveConfirm && (
            <div className="flex items-center gap-2 flex-wrap">
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
  );
}
