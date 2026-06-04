import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
  increment,
  collectionGroup,
  query,
  where,
} from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PROJECT_ID = 'optitrajet-test';
const RULES_PATH = resolve(__dirname, '../../firestore.rules');

let testEnv: RulesTestEnvironment;

// ─── UIDs de test ─────────────────────────────────────────────────────────────
const TRAVELER = 'traveler1';
const DRIVER = 'driver1';
const OTHER = 'other1';
const USER = 'user1';
const REVIEWER = 'reviewer1';

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(RULES_PATH, 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

// Seed sans règles de sécurité
async function seed(fn: (db: any) => Promise<void>) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => fn(ctx.firestore()));
}

// Helpers contexte
const asUser = (uid: string) => testEnv.authenticatedContext(uid).firestore();
const asAnon = () => testEnv.unauthenticatedContext().firestore();

// ─── BOOKINGS – lecture collectionGroup ───────────────────────────────────────

describe('BOOKINGS – collectionGroup read', () => {
  const TRIP = 'trip1';
  const BOOKING = 'booking1';

  beforeEach(async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'trips', TRIP), {
        offeredBy: DRIVER,
        availableSeats: 3,
        pricePerSeat: 10,
        origin: 'Paris',
        destination: 'Lyon',
        details: '',
      });
      await setDoc(doc(db, 'trips', TRIP, 'bookings', BOOKING), {
        travelerId: TRAVELER,
        offeredBy: DRIVER,
        status: 'pending',
      });
    });
  });

  test('voyageur lit SES bookings (travelerId==uid) → succès', async () => {
    const db = asUser(TRAVELER);
    const q = query(
      collectionGroup(db, 'bookings'),
      where('travelerId', '==', TRAVELER),
    );
    await assertSucceeds(getDocs(q));
  });

  test('voyageur tente de lire les bookings d\'un autre (travelerId!=uid) → échec', async () => {
    const db = asUser(OTHER);
    const q = query(
      collectionGroup(db, 'bookings'),
      where('travelerId', '==', TRAVELER),
    );
    await assertFails(getDocs(q));
  });

  test('conducteur liste les bookings de SON trajet (offeredBy==uid) → succès', async () => {
    const db = asUser(DRIVER);
    const q = query(
      collectionGroup(db, 'bookings'),
      where('offeredBy', '==', DRIVER),
    );
    await assertSucceeds(getDocs(q));
  });

  test('non-propriétaire tente de lister via offeredBy!=uid → échec', async () => {
    const db = asUser(OTHER);
    // Tente de lire les bookings du conducteur
    const q = query(
      collectionGroup(db, 'bookings'),
      where('offeredBy', '==', DRIVER),
    );
    await assertFails(getDocs(q));
  });
});

// ─── BOOKINGS – create ────────────────────────────────────────────────────────

describe('BOOKINGS – create', () => {
  const TRIP = 'trip1';

  beforeEach(async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'trips', TRIP), {
        offeredBy: DRIVER,
        availableSeats: 3,
        pricePerSeat: 10,
        origin: 'Paris',
        destination: 'Lyon',
        details: '',
      });
    });
  });

  test('voyageur crée un booking (travelerId==uid, status==pending) → succès', async () => {
    const db = asUser(TRAVELER);
    await assertSucceeds(
      setDoc(doc(db, 'trips', TRIP, 'bookings', 'newB1'), {
        travelerId: TRAVELER,
        offeredBy: DRIVER,
        status: 'pending',
      }),
    );
  });

  test('voyageur crée un booking avec status==accepted (auto-acceptation) → échec', async () => {
    const db = asUser(TRAVELER);
    await assertFails(
      setDoc(doc(db, 'trips', TRIP, 'bookings', 'newB2'), {
        travelerId: TRAVELER,
        offeredBy: DRIVER,
        status: 'accepted',
      }),
    );
  });
});

// ─── BOOKINGS – update statut ─────────────────────────────────────────────────

describe('BOOKINGS – update statut', () => {
  const TRIP = 'trip1';
  const BOOKING = 'booking1';

  beforeEach(async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'trips', TRIP), {
        offeredBy: DRIVER,
        availableSeats: 3,
        pricePerSeat: 10,
        origin: 'Paris',
        destination: 'Lyon',
        details: '',
      });
      await setDoc(doc(db, 'trips', TRIP, 'bookings', BOOKING), {
        travelerId: TRAVELER,
        offeredBy: DRIVER,
        status: 'pending',
      });
    });
  });

  test('voyageur tente de passer status→accepted → échec', async () => {
    const db = asUser(TRAVELER);
    await assertFails(
      updateDoc(doc(db, 'trips', TRIP, 'bookings', BOOKING), {
        status: 'accepted',
      }),
    );
  });

  test('conducteur accepte un booking (status→accepted) → succès', async () => {
    const db = asUser(DRIVER);
    await assertSucceeds(
      updateDoc(doc(db, 'trips', TRIP, 'bookings', BOOKING), {
        status: 'accepted',
      }),
    );
  });

  test('conducteur refuse un booking (status→rejected) → succès', async () => {
    const db = asUser(DRIVER);
    await assertSucceeds(
      updateDoc(doc(db, 'trips', TRIP, 'bookings', BOOKING), {
        status: 'rejected',
      }),
    );
  });

  test('autre user tente de refuser un booking → échec', async () => {
    const db = asUser(OTHER);
    await assertFails(
      updateDoc(doc(db, 'trips', TRIP, 'bookings', BOOKING), {
        status: 'rejected',
      }),
    );
  });

  test('conducteur accepte + met à jour availableSeats/totalBookings (batch) → succès', async () => {
    const db = asUser(DRIVER);
    const batch = writeBatch(db);
    batch.update(doc(db, 'trips', TRIP, 'bookings', BOOKING), { status: 'accepted' });
    batch.update(doc(db, 'trips', TRIP), {
      availableSeats: increment(-1),
      totalBookings:  increment(1),
    });
    await assertSucceeds(batch.commit());
  });
});

// ─── PROFIL – /users/{uid} ────────────────────────────────────────────────────

describe('PROFIL – /users/{uid}', () => {
  beforeEach(async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'users', USER), {
        displayName: 'Test User',
        email: 'test@example.com',
      });
      await setDoc(doc(db, 'users', USER, 'private', 'profile'), {
        phoneNumber: '+33600000000',
        postalCode: '75001',
      });
    });
  });

  test('lecture publique de /users/{uid} (non authentifié) → succès', async () => {
    await assertSucceeds(getDoc(doc(asAnon(), 'users', USER)));
  });

  test('propriétaire lit /users/{uid}/private/profile → succès', async () => {
    await assertSucceeds(
      getDoc(doc(asUser(USER), 'users', USER, 'private', 'profile')),
    );
  });

  test('autre user lit /users/{uid}/private/profile → échec', async () => {
    await assertFails(
      getDoc(doc(asUser(OTHER), 'users', USER, 'private', 'profile')),
    );
  });
});

// ─── AVIS – /users/{userId}/reviews/{reviewId} ────────────────────────────────

describe('AVIS – /users/{userId}/reviews', () => {
  beforeEach(async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'users', USER), { displayName: 'Test User' });
      await setDoc(doc(db, 'users', USER, 'reviews', 'review0'), {
        reviewerId: REVIEWER,
        rating: 5,
        comment: 'Excellent trajet !',
      });
    });
  });

  test('lecture publique des avis (non authentifié) → succès', async () => {
    await assertSucceeds(
      getDoc(doc(asAnon(), 'users', USER, 'reviews', 'review0')),
    );
  });

  test('create avis avec reviewerId==auth.uid → succès', async () => {
    await assertSucceeds(
      setDoc(doc(asUser(REVIEWER), 'users', USER, 'reviews', 'review1'), {
        reviewerId: REVIEWER,
        rating: 4,
        comment: 'Très bien',
      }),
    );
  });

  test('create avis avec reviewerId != auth.uid → échec', async () => {
    await assertFails(
      setDoc(doc(asUser(REVIEWER), 'users', USER, 'reviews', 'review2'), {
        reviewerId: OTHER, // spoofing
        rating: 3,
        comment: 'Triche',
      }),
    );
  });

  test('auto-avis (reviewerId==userId du profil cible) → échec', async () => {
    await assertFails(
      setDoc(doc(asUser(USER), 'users', USER, 'reviews', 'review3'), {
        reviewerId: USER,
        rating: 5,
        comment: 'Je suis génial',
      }),
    );
  });
});
