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
const TRAVELER2 = "traveler2"; // voyageur sans protocole signé
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
      // TRAVELER2 : voyageur sans protocole signé (pas de private/profile)
      await setDoc(doc(db, "users", TRAVELER2), { role: "voyageur" });
      // Protocole signé pour TRAVELER
      await setDoc(doc(db, "users", TRAVELER, "private", "profile"), {
        protocolSignedAt: new Date(),
      });
    });
  });

  test("voyageur crée un booking (travelerId==uid, status==pending) → succès", async () => {
    const db = asUser(TRAVELER);
    await assertSucceeds(
      setDoc(doc(db, "trips", TRIP, "bookings", "newB1"), {
        travelerId: TRAVELER,
        offeredBy: DRIVER,
        status: "pending",
        seatsBooked: 1,
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
        seatsBooked: 1,
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
        seatsBooked: 1,
        departureTime: new Date("2026-07-01T10:00:00Z"),
      }),
    );
  });

  test("voyageur SANS protocole signé tente de créer un booking → échec", async () => {
    const db = asUser(TRAVELER2);
    await assertFails(
      setDoc(doc(db, "trips", TRIP, "bookings", "newB6"), {
        travelerId: TRAVELER2,
        offeredBy: DRIVER,
        status: "pending",
        seatsBooked: 1,
      }),
    );
  });
});

// ─── TRIPS – create (protocole requis) ───────────────────────────────────────

describe("TRIPS – create (protocole requis)", () => {
  const TRIP_NEW = "tripNew";
  const VEHICLE = "vehicle1";

  const validTripData = {
    offeredBy: DRIVER,
    pricePerSeat: 25,
    availableSeats: 3,
    origin: "Montréal",
    destination: "Québec",
    details: "",
    vehicleId: VEHICLE,
  };

  beforeEach(async () => {
    await seed(async (db) => {
      // Véhicule requis par isValidTrip()
      await setDoc(doc(db, "users", DRIVER, "vehicles", VEHICLE), {
        make: "Toyota",
      });
    });
  });

  test("conducteur avec protocole signé crée un trajet → succès", async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "users", DRIVER, "private", "profile"), {
        protocolSignedAt: new Date(),
      });
    });
    const db = asUser(DRIVER);
    await assertSucceeds(setDoc(doc(db, "trips", TRIP_NEW), validTripData));
  });

  test("conducteur SANS protocole signé tente de créer un trajet → échec", async () => {
    const db = asUser(DRIVER);
    await assertFails(setDoc(doc(db, "trips", TRIP_NEW), validTripData));
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
  // USER est le conducteur, REVIEWER est le voyageur accepté sur ce trajet
  const AVIS_TRIP = "pastTripAvis";

  beforeEach(async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "users", USER), { displayName: "Test User" });
      // Trajet passé dont USER est le conducteur
      await setDoc(doc(db, "trips", AVIS_TRIP), {
        offeredBy: USER,
        departureTime: new Date("2020-01-01T10:00:00Z"),
        availableSeats: 3,
        pricePerSeat: 10,
        origin: "Montréal",
        destination: "Québec",
        details: "",
      });
      // REVIEWER a participé (booking accepté)
      await setDoc(doc(db, "trips", AVIS_TRIP, "participants", REVIEWER), {
        acceptedAt: new Date("2020-01-01T08:00:00Z"),
      });
      // Avis existant (seeded hors règles) pour le test de lecture
      await setDoc(
        doc(db, "users", USER, "reviews", `${AVIS_TRIP}_${REVIEWER}`),
        {
          reviewerId: REVIEWER,
          tripId: AVIS_TRIP,
          rating: 5,
          comment: "Excellent trajet !",
        },
      );
    });
  });

  test("lecture publique des avis (non authentifié) → succès", async () => {
    await assertSucceeds(
      getDoc(
        doc(asAnon(), "users", USER, "reviews", `${AVIS_TRIP}_${REVIEWER}`),
      ),
    );
  });

  test("voyageur légitime note le conducteur (format reviewId correct, trajet passé, participation) → succès", async () => {
    // Nouvel avis sur un trip distinct pour éviter la collision avec le doc seeded
    const TRIP2 = "pastTripAvis2";
    await seed(async (db) => {
      await setDoc(doc(db, "trips", TRIP2), {
        offeredBy: USER,
        departureTime: new Date("2021-06-01T10:00:00Z"),
        availableSeats: 2,
        pricePerSeat: 15,
        origin: "Québec",
        destination: "Montréal",
        details: "",
      });
      await setDoc(doc(db, "trips", TRIP2, "participants", REVIEWER), {
        acceptedAt: new Date("2021-06-01T08:00:00Z"),
      });
    });
    const reviewId = `${TRIP2}_${REVIEWER}`;
    await assertSucceeds(
      setDoc(doc(asUser(REVIEWER), "users", USER, "reviews", reviewId), {
        reviewerId: REVIEWER,
        tripId: TRIP2,
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

// ─── PROFIL – mise à jour isVerified (anti-spoofing) ─────────────────────────

describe("PROFIL – isVerified anti-spoofing", () => {
  const SIGNED_USER = "signedUser1";
  const UNSIGNED_USER = "unsignedUser1";

  beforeEach(async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "users", SIGNED_USER), { name: "Signed User" });
      await setDoc(doc(db, "users", SIGNED_USER, "private", "profile"), {
        protocolSignedAt: new Date(),
      });
      await setDoc(doc(db, "users", UNSIGNED_USER), { name: "Unsigned User" });
    });
  });

  test("propriétaire avec protocolSignedAt peut écrire isVerified:true → succès", async () => {
    const db = asUser(SIGNED_USER);
    await assertSucceeds(
      updateDoc(doc(db, "users", SIGNED_USER), { isVerified: true }),
    );
  });

  test("propriétaire SANS protocolSignedAt tente isVerified:true → échec", async () => {
    const db = asUser(UNSIGNED_USER);
    await assertFails(
      updateDoc(doc(db, "users", UNSIGNED_USER), { isVerified: true }),
    );
  });
});

// ─── TRIPS – plafond légal covoiturage QC ─────────────────────────────────────

describe("TRIPS – plafond légal covoiturage QC", () => {
  const TRIP_CAP = "tripCap";
  const VEHICLE = "vehicle1";

  // prix=10, places=4, distanceKm=100 → total 40 ≤ 0,54×100=54 ✅
  const tripInCap = {
    offeredBy: DRIVER,
    pricePerSeat: 10,
    availableSeats: 4,
    distanceKm: 100,
    origin: "Montréal",
    destination: "Québec",
    details: "",
    vehicleId: VEHICLE,
  };

  beforeEach(async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "users", DRIVER, "vehicles", VEHICLE), {
        make: "Toyota",
      });
      await setDoc(doc(db, "users", DRIVER, "private", "profile"), {
        protocolSignedAt: new Date(),
      });
    });
  });

  test("conducteur publie trajet dans le plafond légal (10 $/place × 4 = 40 ≤ 0.54×100=54) → succès", async () => {
    const db = asUser(DRIVER);
    await assertSucceeds(setDoc(doc(db, "trips", TRIP_CAP), tripInCap));
  });

  // prix=15, places=4, distanceKm=100 → total 60 > 0,54×100=54 ❌
  test("conducteur publie trajet hors plafond légal (15 $/place × 4 = 60 > 0.54×100=54) → refus", async () => {
    const db = asUser(DRIVER);
    await assertFails(
      setDoc(doc(db, "trips", TRIP_CAP), {
        ...tripInCap,
        pricePerSeat: 15,
      }),
    );
  });

  // Vieux trajet sans distanceKm — le plafond ne s'applique pas (rétrocompat)
  test("vieux trajet sans distanceKm → plafond non enforçé (rétrocompatibilité) → succès", async () => {
    const db = asUser(DRIVER);
    const { distanceKm: _omit, ...tripWithoutDistance } = tripInCap;
    await assertSucceeds(
      setDoc(doc(db, "trips", TRIP_CAP), {
        ...tripWithoutDistance,
        pricePerSeat: 50, // hors plafond si distanceKm connu, mais pas de champ → skip
      }),
    );
  });
});

// ─── REVIEWS – vérification participation & anti-abus ─────────────────────────

describe("REVIEWS – vérification participation & anti-abus", () => {
  const PAST_TRIP = "pastTripSec";
  const FUTURE_TRIP = "futureTripSec";

  beforeEach(async () => {
    await seed(async (db) => {
      // Trajet passé — DRIVER est conducteur, TRAVELER est voyageur accepté
      await setDoc(doc(db, "trips", PAST_TRIP), {
        offeredBy: DRIVER,
        departureTime: new Date("2020-06-15T10:00:00Z"),
        availableSeats: 3,
        pricePerSeat: 10,
        origin: "Montréal",
        destination: "Québec",
        details: "",
      });
      await setDoc(doc(db, "trips", PAST_TRIP, "participants", TRAVELER), {
        acceptedAt: new Date("2020-06-15T08:00:00Z"),
      });
      // Trajet futur — mêmes acteurs, departure dans le futur
      await setDoc(doc(db, "trips", FUTURE_TRIP), {
        offeredBy: DRIVER,
        departureTime: new Date("2099-01-01T10:00:00Z"),
        availableSeats: 3,
        pricePerSeat: 10,
        origin: "Montréal",
        destination: "Québec",
        details: "",
      });
      await setDoc(doc(db, "trips", FUTURE_TRIP, "participants", TRAVELER), {
        acceptedAt: new Date("2099-01-01T08:00:00Z"),
      });
      // Profils
      await setDoc(doc(db, "users", DRIVER), { displayName: "Conducteur" });
      await setDoc(doc(db, "users", TRAVELER), { displayName: "Voyageur" });
    });
  });

  // T1 : voyageur légitime note le conducteur (sens A) → succès
  test("T1 : voyageur légitime note le conducteur après trajet passé → succès", async () => {
    const reviewId = `${PAST_TRIP}_${TRAVELER}`;
    await assertSucceeds(
      setDoc(doc(asUser(TRAVELER), "users", DRIVER, "reviews", reviewId), {
        reviewerId: TRAVELER,
        tripId: PAST_TRIP,
        rating: 5,
        comment: "Super conducteur !",
      }),
    );
  });

  // T2 : conducteur légitime note le voyageur (sens B) → succès
  test("T2 : conducteur légitime note le voyageur après trajet passé → succès", async () => {
    const reviewId = `${PAST_TRIP}_${DRIVER}`;
    await assertSucceeds(
      setDoc(doc(asUser(DRIVER), "users", TRAVELER, "reviews", reviewId), {
        reviewerId: DRIVER,
        tripId: PAST_TRIP,
        rating: 4,
        comment: "Bon voyageur.",
      }),
    );
  });

  // T3 : tiers sans participation tente de noter le conducteur → refus
  test("T3 : tiers sans participation note le conducteur → refus", async () => {
    const reviewId = `${PAST_TRIP}_${OTHER}`;
    await assertFails(
      setDoc(doc(asUser(OTHER), "users", DRIVER, "reviews", reviewId), {
        reviewerId: OTHER,
        tripId: PAST_TRIP,
        rating: 1,
        comment: "Je n'ai jamais voyagé avec lui",
      }),
    );
  });

  // T4 : tiers sans participation tente de noter le voyageur (sens B) → refus
  test("T4 : tiers sans participation note le voyageur → refus", async () => {
    const reviewId = `${PAST_TRIP}_${OTHER}`;
    await assertFails(
      setDoc(doc(asUser(OTHER), "users", TRAVELER, "reviews", reviewId), {
        reviewerId: OTHER,
        tripId: PAST_TRIP,
        rating: 1,
        comment: "Je n'ai pas voyagé avec ce voyageur",
      }),
    );
  });

  // T5 : doublon — 2ème avis même trajet/même auteur (reviewId déjà existant) → refus
  test("T5 : doublon — avis déjà existant pour ce trajet et cet auteur → refus", async () => {
    const reviewId = `${PAST_TRIP}_${TRAVELER}`;
    // Pré-semer un premier avis
    await seed(async (db) => {
      await setDoc(doc(db, "users", DRIVER, "reviews", reviewId), {
        reviewerId: TRAVELER,
        tripId: PAST_TRIP,
        rating: 5,
        comment: "Premier avis",
      });
    });
    // Tenter de réécrire le même reviewId → update sur doc existant → refusé
    await assertFails(
      setDoc(doc(asUser(TRAVELER), "users", DRIVER, "reviews", reviewId), {
        reviewerId: TRAVELER,
        tripId: PAST_TRIP,
        rating: 3,
        comment: "Deuxième tentative",
      }),
    );
  });

  // T6 : avis sur trajet futur → refus
  test("T6 : avis sur trajet futur (departureTime > now) → refus", async () => {
    const reviewId = `${FUTURE_TRIP}_${TRAVELER}`;
    await assertFails(
      setDoc(doc(asUser(TRAVELER), "users", DRIVER, "reviews", reviewId), {
        reviewerId: TRAVELER,
        tripId: FUTURE_TRIP,
        rating: 5,
        comment: "Trajet pas encore eu lieu",
      }),
    );
  });

  // T7 : reviewId malformaté (pas tripId_uid) → refus
  test("T7 : reviewId malformaté (format libre, pas tripId_uid) → refus", async () => {
    await assertFails(
      setDoc(
        doc(asUser(TRAVELER), "users", DRIVER, "reviews", "un-id-quelconque"),
        {
          reviewerId: TRAVELER,
          tripId: PAST_TRIP,
          rating: 5,
          comment: "ID libre",
        },
      ),
    );
  });

  // T8 : tripId absent du document → refus
  test("T8 : tripId absent du document review → refus", async () => {
    await assertFails(
      setDoc(doc(asUser(TRAVELER), "users", DRIVER, "reviews", "anyId"), {
        reviewerId: TRAVELER,
        rating: 5,
        comment: "Pas de tripId",
      }),
    );
  });

  // T9 : auto-avis → refus
  test("T9 : auto-avis (reviewer == cible) avec données par ailleurs valides → refus", async () => {
    // DRIVER tente de se noter lui-même
    const reviewId = `${PAST_TRIP}_${DRIVER}`;
    await assertFails(
      setDoc(doc(asUser(DRIVER), "users", DRIVER, "reviews", reviewId), {
        reviewerId: DRIVER,
        tripId: PAST_TRIP,
        rating: 5,
        comment: "Je suis super",
      }),
    );
  });

  // T10 : spoofing reviewerId → refus
  test("T10 : spoofing reviewerId (reviewerId != auth.uid) → refus", async () => {
    // OTHER authentifié mais usurpe l'identité de TRAVELER dans reviewerId
    const reviewId = `${PAST_TRIP}_${OTHER}`;
    await assertFails(
      setDoc(doc(asUser(OTHER), "users", DRIVER, "reviews", reviewId), {
        reviewerId: TRAVELER, // spoofing
        tripId: PAST_TRIP,
        rating: 5,
        comment: "Usurpation",
      }),
    );
  });
});

// ─── PARTICIPANTS – /trips/{tripId}/participants/{travelerId} ──────────────────

describe("PARTICIPANTS – règle create (write-only conducteur)", () => {
  const TRIP = "tripParticipants";

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
    });
  });

  test("conducteur crée un doc participants pour son voyageur → succès", async () => {
    await assertSucceeds(
      setDoc(doc(asUser(DRIVER), "trips", TRIP, "participants", TRAVELER), {
        acceptedAt: new Date(),
      }),
    );
  });

  test("voyageur tente de s'inscrire lui-même dans participants → refus", async () => {
    await assertFails(
      setDoc(doc(asUser(TRAVELER), "trips", TRIP, "participants", TRAVELER), {
        acceptedAt: new Date(),
      }),
    );
  });

  test("tiers (non conducteur) tente de créer un doc participants → refus", async () => {
    await assertFails(
      setDoc(doc(asUser(OTHER), "trips", TRIP, "participants", TRAVELER), {
        acceptedAt: new Date(),
      }),
    );
  });

  test("conducteur tente de s'inscrire lui-même dans participants → refus", async () => {
    await assertFails(
      setDoc(doc(asUser(DRIVER), "trips", TRIP, "participants", DRIVER), {
        acceptedAt: new Date(),
      }),
    );
  });
});
