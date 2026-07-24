"use client";

import { getStorage, type FirebaseStorage } from "firebase/storage";
import { useFirebaseApp } from "@/firebase/provider";

export function useStorage(): FirebaseStorage | null {
  const app = useFirebaseApp();
  if (!app) return null;
  return getStorage(app);
}
