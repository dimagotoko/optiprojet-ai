
'use client';

import {
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  CollectionReference,
  DocumentReference,
  SetOptions,
  FirestoreError,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

function handleWriteError(error: unknown, path: string, operation: 'write' | 'create' | 'update' | 'delete', data?: any) {
  const firestoreError = error as FirestoreError;
  if (firestoreError?.code === 'permission-denied') {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({ path, operation, requestResourceData: data })
    );
  }
  // Autres codes (failed-precondition, unavailable…) : silencieux ici,
  // l'appelant await-able peut gérer l'erreur lui-même.
}

/**
 * Initiates a setDoc operation for a document reference.
 * Does NOT await the write operation internally.
 */
export function setDocumentNonBlocking(docRef: DocumentReference, data: any, options?: SetOptions) {
  const op = options ? setDoc(docRef, data, options) : setDoc(docRef, data);
  op.catch(error => handleWriteError(error, docRef.path, 'write', data));
}


/**
 * Initiates an addDoc operation for a collection reference.
 * Does NOT await the write operation internally.
 * Returns the Promise for the new doc ref, but typically not awaited by caller.
 */
export function addDocumentNonBlocking(colRef: CollectionReference, data: any) {
  const promise = addDoc(colRef, data)
    .catch(error => handleWriteError(error, colRef.path, 'create', data));
  return promise;
}


/**
 * Initiates an updateDoc operation for a document reference.
 * Does NOT await the write operation internally.
 */
export function updateDocumentNonBlocking(docRef: DocumentReference, data: any) {
  updateDoc(docRef, data)
    .catch(error => handleWriteError(error, docRef.path, 'update', data));
}


/**
 * Initiates a deleteDoc operation for a document reference.
 * Does NOT await the write operation internally.
 */
export function deleteDocumentNonBlocking(docRef: DocumentReference) {
  deleteDoc(docRef)
    .catch(error => handleWriteError(error, docRef.path, 'delete'));
}
