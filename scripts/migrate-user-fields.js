/**
 * Migration : champs sensibles UserProfile → sous-documents privés
 *
 * - email, phoneNumber, postalCode, driverLicense → /users/{uid}/private/profile
 * - stripeCustomerId                              → /stripe_customers/{uid}
 *
 * Idempotent : les utilisateurs dont /private/profile existe déjà sont ignorés.
 *
 * Usage :
 *   node scripts/migrate-user-fields.js
 *
 * Prérequis :
 *   GOOGLE_APPLICATION_CREDENTIALS défini, ou compte de service dans
 *   scripts/serviceAccount.json (ne pas commiter ce fichier).
 */

const admin = require('firebase-admin');
const path  = require('path');
const fs    = require('fs');

// Initialisation — cherche un compte de service local, sinon Application Default Credentials
if (!admin.apps.length) {
  const keyPath = path.join(__dirname, 'serviceAccountKey.json');
  if (fs.existsSync(keyPath)) {
    const serviceAccount = require(keyPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId:  'studio-2194514521-a4a53',
    });
    console.log('🔑 Authentification via serviceAccountKey.json\n');
  } else {
    // Tente Application Default Credentials (gcloud auth application-default login)
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId:  'studio-2194514521-a4a53',
    });
    console.log('🔑 Authentification via Application Default Credentials\n');
  }
}

const db = admin.firestore();
const PRIVATE_FIELDS = ['email', 'phoneNumber', 'postalCode', 'driverLicense'];

async function migrateUser(uid, data) {
  const userRef    = db.doc(`users/${uid}`);
  const privateRef = db.doc(`users/${uid}/private/profile`);
  const stripeRef  = db.doc(`stripe_customers/${uid}`);

  // Idempotence
  if ((await privateRef.get()).exists) {
    console.log(`⏭  ${uid} — déjà migré, ignoré`);
    return;
  }

  const privateData = {};
  const deleteMap   = {};

  for (const field of PRIVATE_FIELDS) {
    if (data[field] !== undefined) {
      if (data[field] !== '') privateData[field] = data[field];
      deleteMap[field] = admin.firestore.FieldValue.delete();
    }
  }

  const batch = db.batch();

  // Écriture des données privées + suppression du doc public
  if (Object.keys(privateData).length > 0 || Object.keys(deleteMap).length > 0) {
    batch.set(privateRef, {
      ...privateData,
      migratedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    if (Object.keys(deleteMap).length > 0) {
      batch.update(userRef, deleteMap);
    }
  }

  // stripeCustomerId → collection dédiée (bloquée côté client)
  if ('stripeCustomerId' in data) {
    if (data.stripeCustomerId && data.stripeCustomerId !== '') {
      batch.set(stripeRef, { stripeCustomerId: data.stripeCustomerId });
    }
    batch.update(userRef, { stripeCustomerId: admin.firestore.FieldValue.delete() });
  }

  await batch.commit();
  console.log(`✅ ${uid} — migré (${Object.keys(privateData).length} champs privés)`);
}

async function main() {
  const snap = await db.collection('users').get();
  console.log(`\n📋 ${snap.size} utilisateur(s) trouvé(s)\n`);

  let success = 0;
  let skipped = 0;
  let errors  = 0;

  for (const docSnap of snap.docs) {
    try {
      const before = console.log;
      await migrateUser(docSnap.id, docSnap.data());
      success++;
    } catch (e) {
      console.error(`❌ ${docSnap.id} — erreur: ${e.message}`);
      errors++;
    }
  }

  console.log(`\n────────────────────────────────`);
  console.log(`✅ Migrés  : ${success}`);
  console.log(`⏭  Ignorés : ${skipped}`);
  console.log(`❌ Erreurs  : ${errors}`);
  console.log(`────────────────────────────────\n`);
}

main().catch(console.error);
