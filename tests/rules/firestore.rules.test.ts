import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
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
} from "firebase/firestore";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const PROJECT_ID = "optitrajet-test";
const RULES_PATH = resolve(__dirname, "../../firestore.rules");

let testEnv: RulesTestEnvironment;

// ─── UIDs de test ─────────────────────────────────────────────────────────────
const TRAVELER = "traveler1";
const DRIVER = "driver1";
const OTHER = "other1";
const USER = "user1";
const TRANSPORTER = "transporter1";
const REVIEWER = "reviewer1";

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(RULES_PATH, "utf8"),
      host: "127.0.0.1",
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

describe("BOOKINGS – collectionGroup read", () => {
  const TRIP = "trip1";
  const BOOKING = "booking1";

  beforeEach(async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "trips", TRIP), {
        offeredBy: DRIVER,
        availableSeats: 3,
        pricePerSeat: 10,
        origin: "Paris",
        destination: "Lyon",
        details: "",
      });
      await setDoc(doc(db, "trips", TRIP, "bookings", BOOKING), {
        travelerId: TRAVELER,
        offeredBy: DRIVER,
        status: "pending",
      });
    });
  });

  test("voyageur lit SES bookings (travelerId==uid) → succès", async () => {
    const db = asUser(TRAVELER);
    const q = query(
      collectionGroup(db, "bookings"),
      where("travelerId", "==", TRAVELER),
    );
    await assertSucceeds(getDocs(q));
  });

  test("voyageur tente de lire les bookings d'un autre (travelerId!=uid) → échec", async () => {
    const db = asUser(OTHER);
    const q = query(
      collectionGroup(db, "bookings"),
      where("travelerId", "==", TRAVELER),
    );
    await assertFails(getDocs(q));
  });

  test("conducteur liste les bookings de SON trajet (offeredBy==uid) → succès", async () => {
    const db = asUser(DRIVER);
    const q = query(
      collectionGroup(db, "bookings"),
      where("offeredBy", "==", DRIVER),
    );
    await assertSucceeds(getDocs(q));
  });

  test("non-propriétaire tente de lister via offeredBy!=uid → échec", async () => {
    const db = asUser(OTHER);
    // Tente de lire les bookings du conducteur
    const q = query(
      collectionGroup(db, "bookings"),
      where("offeredBy", "==", DRIVER),
    );
    await assertFails(getDocs(q));
  });
});

// ─── BOOKINGS – create ────────────────────────────────────────────────────────

describe("BOOKINGS – create", () => {
  const TRIP = "trip1";

  beforeEach(async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "trips", TRIP), {
        offeredBy: DRIVER,
        availableSeats: 3,
        pricePerSeat: 10,
        origin: "Paris",
        destination: "Lyon",
        details: "",
      });
      // Rôles requis par requesterIsVoyageur()
      await setDoc(doc(db, "users", TRAVELER), { role: "voyageur" });
      await setDoc(doc(db, "users", TRANSPORTER), { role: "transporteur" });
    });
  });

  test("voyageur crée un booking (travelerId==uid, status==pending) → succès", async () => {
    const db = asUser(TRAVELER);
    await assertSucceeds(
      setDoc(doc(db, "trips", TRIP, "bookings", "newB1"), {
        travelerId: TRAVELER,
        offeredBy: DRIVER,
        status: "pending",
      }),
    );
  });

  test("voyageur crée un booking avec status==accepted (auto-acceptation) → échec", async () => {
    const db = asUser(TRAVELER);
    await assertFails(
      setDoc(doc(db, "trips", TRIP, "bookings", "newB2"), {
        travelerId: TRAVELER,
        offeredBy: DRIVER,
        status: "accepted",
      }),
    );
  });

  test("transporteur tente de créer un booking → REFUS", async () => {
    const db = asUser(TRANSPORTER);
    await assertFails(
      setDoc(doc(db, "trips", TRIP, "bookings", "newB3"), {
        travelerId: TRANSPORTER,
        offeredBy: DRIVER,
        status: "pending",
      }),
    );
  });

  test("voyageur crée un booking → succès (régression post-règle rôle)", async () => {
    const db = asUser(TRAVELER);
    await assertSucceeds(
      setDoc(doc(db, "trips", TRIP, "bookings", "newB4"), {
        travelerId: TRAVELER,
        offeredBy: DRIVER,
        status: "pending",
      }),
    );
  });

  test("voyageur crée un booking avec departureTime dénormalisé → succès (règle ne rejette pas le champ)", async () => {
    const db = asUser(TRAVELER);
    await assertSucceeds(
      setDoc(doc(db, "trips", TRIP, "bookings", "newB5"), {
        travelerId: TRAVELER,
        offeredBy: DRIVER,
        status: "pending",
        departureTime: new Date("2026-07-01T10:00:00Z"),
      }),
    );
  });
});

// ─── BOOKINGS – update statut ─────────────────────────────────────────────────

describe("BOOKINGS – update statut", () => {
  const TRIP = "trip1";
  const BOOKING = "booking1";

  beforeEach(async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "trips", TRIP), {
        offeredBy: DRIVER,
        availableSeats: 3,
        pricePerSeat: 10,
        origin: "Paris",
        destination: "Lyon",
        details: "",
      });
      await setDoc(doc(db, "trips", TRIP, "bookings", BOOKING), {
        travelerId: TRAVELER,
        offeredBy: DRIVER,
        status: "pending",
      });
    });
  });

  test("voyageur tente de passer status→accepted → échec", async () => {
    const db = asUser(TRAVELER);
    await assertFails(
      updateDoc(doc(db, "trips", TRIP, "bookings", BOOKING), {
        status: "accepted",
      }),
    );
  });

  test("conducteur accepte un booking (status→accepted) → succès", async () => {
    const db = asUser(DRIVER);
    await assertSucceeds(
      updateDoc(doc(db, "trips", TRIP, "bookings", BOOKING), {
        status: "accepted",
      }),
    );
  });

  test("conducteur refuse un booking (status→rejected) → succès", async () => {
    const db = asUser(DRIVER);
    await assertSucceeds(
      updateDoc(doc(db, "trips", TRIP, "bookings", BOOKING), {
        status: "rejected",
      }),
    );
  });

  test("autre user tente de refuser un booking → échec", async () => {
    const db = asUser(OTHER);
    await assertFails(
      updateDoc(doc(db, "trips", TRIP, "bookings", BOOKING), {
        status: "rejected",
      }),
    );
  });

  test("conducteur accepte + met à jour availableSeats/totalBookings (batch) → succès", async () => {
    const db = asUser(DRIVER);
    const batch = writeBatch(db);
    batch.update(doc(db, "trips", TRIP, "bookings", BOOKING), {
      status: "accepted",
    });
    batch.update(doc(db, "trips", TRIP), {
      availableSeats: increment(-1),
      totalBookings: increment(1),
    });
    await assertSucceeds(batch.commit());
  });
});

// ─── BOOKINGS – dénormalisation prix (anti-spoofing) ─────────────────────────

describe("BOOKINGS – dénormalisation prix (anti-spoofing)", () => {
  const TRIP = "trip1";
  const BOOKING = "booking1";

  beforeEach(async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "trips", TRIP), {
        offeredBy: DRIVER,
        availableSeats: 3,
        pricePerSeat: 25,
        origin: "Montréal",
        destination: "Sherbrooke",
        details: "",
      });
      await setDoc(doc(db, "trips", TRIP, "bookings", BOOKING), {
        travelerId: TRAVELER,
        offeredBy: DRIVER,
        status: "pending",
      });
    });
  });

  test("conducteur accepte avec pricePerSeat==trip.pricePerSeat (25) → succès", async () => {
    const db = asUser(DRIVER);
    await assertSucceeds(
      updateDoc(doc(db, "trips", TRIP, "bookings", BOOKING), {
        status: "accepted",
        pricePerSeat: 25,
        seatsBooked: 1,
      }),
    );
  });

  test("conducteur accepte avec pricePerSeat!=trip.pricePerSeat (99, spoofing) → échec", async () => {
    const db = asUser(DRIVER);
    await assertFails(
      updateDoc(doc(db, "trips", TRIP, "bookings", BOOKING), {
        status: "accepted",
        pricePerSeat: 99,
        seatsBooked: 1,
      }),
    );
  });

  test("conducteur accepte avec distanceKm valide (150) → succès", async () => {
    const db = asUser(DRIVER);
    await assertSucceeds(
      updateDoc(doc(db, "trips", TRIP, "bookings", BOOKING), {
        status: "accepted",
        distanceKm: 150,
      }),
    );
  });

  test("conducteur accepte avec distanceKm négatif → échec", async () => {
    const db = asUser(DRIVER);
    await assertFails(
      updateDoc(doc(db, "trips", TRIP, "bookings", BOOKING), {
        status: "accepted",
        distanceKm: -5,
      }),
    );
  });
});

// ─── TRIPS – update totalBookings par voyageur ────────────────────────────────

describe("TRIPS – voyageur incrémente totalBookings lors d'une réservation", () => {
  const TRIP = "trip1";

  beforeEach(async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "trips", TRIP), {
        offeredBy: DRIVER,
        availableSeats: 3,
        totalBookings: 1,
        pricePerSeat: 10,
        origin: "Paris",
        destination: "Lyon",
        details: "",
      });
    });
  });

  test("voyageur incrémente totalBookings de +1 (place dispo) → succès", async () => {
    const db = asUser(TRAVELER);
    await assertSucceeds(
      updateDoc(doc(db, "trips", TRIP), { totalBookings: increment(1) }),
    );
  });

  test("voyageur incrémente totalBookings sur un trip sans champ totalBookings (première réservation) → succès", async () => {
    await seed(async (db) => {
      // trip sans totalBookings — cas réel à la première réservation
      await setDoc(doc(db, "trips", TRIP), {
        offeredBy: DRIVER,
        availableSeats: 3,
        pricePerSeat: 10,
        origin: "Paris",
        destination: "Lyon",
        details: "",
      });
    });
    const db = asUser(TRAVELER);
    await assertSucceeds(
      updateDoc(doc(db, "trips", TRIP), { totalBookings: increment(1) }),
    );
  });

  test("voyageur tente de modifier un autre champ en même temps → échec", async () => {
    const db = asUser(TRAVELER);
    await assertFails(
      updateDoc(doc(db, "trips", TRIP), {
        totalBookings: increment(1),
        pricePerSeat: 0,
      }),
    );
  });

  test("voyageur incrémente totalBookings sur un trajet complet → échec", async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "trips", TRIP), {
        offeredBy: DRIVER,
        availableSeats: 1,
        totalBookings: 1,
        pricePerSeat: 10,
        origin: "Paris",
        destination: "Lyon",
        details: "",
      });
    });
    const db = asUser(TRAVELER);
    await assertFails(
      updateDoc(doc(db, "trips", TRIP), { totalBookings: increment(1) }),
    );
  });
});

// ─── VEHICLES – /users/{userId}/vehicles/{vehicleId} ─────────────────────────

describe("VEHICLES – lecture par voyageur", () => {
  beforeEach(async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "users", DRIVER, "vehicles", "v1"), {
        make: "Toyota",
        model: "Corolla",
        year: 2022,
        color: "Blanc",
        licensePlate: "ABC-123",
        type: "berline",
        maxSeats: 4,
        ownerId: DRIVER,
      });
    });
  });

  test("propriétaire lit son propre véhicule → succès", async () => {
    await assertSucceeds(
      getDoc(doc(asUser(DRIVER), "users", DRIVER, "vehicles", "v1")),
    );
  });

  test("voyageur authentifié lit le véhicule du conducteur → succès", async () => {
    await assertSucceeds(
      getDoc(doc(asUser(TRAVELER), "users", DRIVER, "vehicles", "v1")),
    );
  });

  test("utilisateur non authentifié lit un véhicule → échec", async () => {
    await assertFails(getDoc(doc(asAnon(), "users", DRIVER, "vehicles", "v1")));
  });

  test("autre user tente d'écrire le véhicule du conducteur → échec", async () => {
    await assertFails(
      setDoc(doc(asUser(TRAVELER), "users", DRIVER, "vehicles", "v2"), {
        make: "Honda",
        model: "Civic",
        year: 2020,
        color: "Rouge",
        licensePlate: "XYZ-999",
        type: "berline",
        maxSeats: 4,
        ownerId: DRIVER,
      }),
    );
  });
});

// ─── PROFIL – /users/{uid} ────────────────────────────────────────────────────

describe("PROFIL – /users/{uid}", () => {
  beforeEach(async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "users", USER), {
        displayName: "Test User",
        email: "test@example.com",
      });
      await setDoc(doc(db, "users", USER, "private", "profile"), {
        phoneNumber: "+33600000000",
        postalCode: "75001",
      });
    });
  });

  test("lecture publique de /users/{uid} (non authentifié) → succès", async () => {
    await assertSucceeds(getDoc(doc(asAnon(), "users", USER)));
  });

  test("propriétaire lit /users/{uid}/private/profile → succès", async () => {
    await assertSucceeds(
      getDoc(doc(asUser(USER), "users", USER, "private", "profile")),
    );
  });

  test("autre user lit /users/{uid}/private/profile → échec", async () => {
    await assertFails(
      getDoc(doc(asUser(OTHER), "users", USER, "private", "profile")),
    );
  });
});

// ─── AVIS – /users/{userId}/reviews/{reviewId} ────────────────────────────────

describe("AVIS – /users/{userId}/reviews", () => {
  beforeEach(async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "users", USER), { displayName: "Test User" });
      await setDoc(doc(db, "users", USER, "reviews", "review0"), {
        reviewerId: REVIEWER,
        rating: 5,
        comment: "Excellent trajet !",
      });
    });
  });

  test("lecture publique des avis (non authentifié) → succès", async () => {
    await assertSucceeds(
      getDoc(doc(asAnon(), "users", USER, "reviews", "review0")),
    );
  });

  test("create avis avec reviewerId==auth.uid → succès", async () => {
    await assertSucceeds(
      setDoc(doc(asUser(REVIEWER), "users", USER, "reviews", "review1"), {
        reviewerId: REVIEWER,
        rating: 4,
        comment: "Très bien",
      }),
    );
  });

  test("create avis avec reviewerId != auth.uid → échec", async () => {
    await assertFails(
      setDoc(doc(asUser(REVIEWER), "users", USER, "reviews", "review2"), {
        reviewerId: OTHER, // spoofing
        rating: 3,
        comment: "Triche",
      }),
    );
  });

  test("auto-avis (reviewerId==userId du profil cible) → échec", async () => {
    await assertFails(
      setDoc(doc(asUser(USER), "users", USER, "reviews", "review3"), {
        reviewerId: USER,
        rating: 5,
        comment: "Je suis génial",
      }),
    );
  });
});

// ─── PROFIL – mise à jour des notes (RatingDialog) ───────────────────────────

describe("PROFIL – mise à jour des notes (RatingDialog)", () => {
  beforeEach(async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "users", DRIVER), {
        displayName: "Conducteur",
        averageRating: 4.0,
        totalRatings: 1,
      });
    });
  });

  test("évaluateur authentifié met à jour averageRating + totalRatings → succès", async () => {
    const db = asUser(TRAVELER);
    await assertSucceeds(
      updateDoc(doc(db, "users", DRIVER), {
        averageRating: 4.5,
        totalRatings: 2,
      }),
    );
  });

  test("évaluateur tente de modifier un autre champ en même temps → échec", async () => {
    const db = asUser(TRAVELER);
    await assertFails(
      updateDoc(doc(db, "users", DRIVER), {
        averageRating: 4.5,
        totalRatings: 2,
        displayName: "Hacked",
      }),
    );
  });

  test("évaluateur met averageRating hors limites (>5) → échec", async () => {
    const db = asUser(TRAVELER);
    await assertFails(
      updateDoc(doc(db, "users", DRIVER), {
        averageRating: 6.0,
        totalRatings: 2,
      }),
    );
  });

  test("non authentifié tente de mettre à jour les notes → échec", async () => {
    const db = asAnon();
    await assertFails(
      updateDoc(doc(db, "users", DRIVER), {
        averageRating: 5.0,
        totalRatings: 2,
      }),
    );
  });
});

// ─── BOOKINGS – champ passengers (multi-passagers) ───────────────────────────

describe("BOOKINGS – mise à jour du champ passengers", () => {
  const TRIP = "trip1";
  const BOOKING = "booking1";

  beforeEach(async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "trips", TRIP), {
        offeredBy: DRIVER,
        availableSeats: 3,
        pricePerSeat: 10,
        origin: "Montréal",
        destination: "Québec",
        details: "",
      });
      await setDoc(doc(db, "trips", TRIP, "bookings", BOOKING), {
        travelerId: TRAVELER,
        offeredBy: DRIVER,
        status: "pending",
      });
    });
  });

  test("voyageur met à jour uniquement passengers → succès", async () => {
    const db = asUser(TRAVELER);
    await assertSucceeds(
      updateDoc(doc(db, "trips", TRIP, "bookings", BOOKING), {
        passengers: ["Alice", "Bob"],
      }),
    );
  });

  test("voyageur tente de modifier passengers + un autre champ → échec", async () => {
    const db = asUser(TRAVELER);
    await assertFails(
      updateDoc(doc(db, "trips", TRIP, "bookings", BOOKING), {
        passengers: ["Alice"],
        status: "accepted",
      }),
    );
  });
});

// ─── FAVORITES – /users/{userId}/favorites/{favId} ───────────────────────────

describe("FAVORITES – /users/{userId}/favorites", () => {
  const FAV = "fav1";

  beforeEach(async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "users", USER, "favorites", FAV), {
        origin: "Montréal, QC, Canada",
        destination: "Sherbrooke, QC, Canada",
        originCoords: { lat: 45.5017, lng: -73.5673 },
        destinationCoords: { lat: 45.4015, lng: -71.8883 },
      });
    });
  });

  test("propriétaire lit ses propres favoris → succès", async () => {
    await assertSucceeds(
      getDoc(doc(asUser(USER), "users", USER, "favorites", FAV)),
    );
  });

  test("autre utilisateur lit les favoris d'autrui → échec", async () => {
    await assertFails(
      getDoc(doc(asUser(OTHER), "users", USER, "favorites", FAV)),
    );
  });

  test("propriétaire crée un favori → succès", async () => {
    await assertSucceeds(
      setDoc(doc(asUser(USER), "users", USER, "favorites", "fav2"), {
        origin: "Québec, QC, Canada",
        destination: "Drummondville, QC, Canada",
      }),
    );
  });

  test("autre utilisateur crée un favori pour un autre → échec", async () => {
    await assertFails(
      setDoc(doc(asUser(OTHER), "users", USER, "favorites", "fav3"), {
        origin: "Québec, QC, Canada",
        destination: "Drummondville, QC, Canada",
      }),
    );
  });
});
