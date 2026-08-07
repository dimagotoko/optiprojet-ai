import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
  const { idToken } = await request.json();

  if (!idToken) {
    return NextResponse.json(
      { error: "ID token is required" },
      { status: 400 },
    );
  }

  const expiresIn = 60 * 60 * 24 * 14 * 1000;

  try {
    // verifyIdToken() vérifie déjà la validité/révocation du token — c'est suffisant
    // pour un renouvellement de routine (appelé à chaque montage de l'app par
    // FirebaseProvider). Exiger en plus un auth_time récent (<5 min) casserait ce
    // renouvellement pour toute session ouverte depuis plus de 5 minutes, puisque
    // auth_time reste figé à la connexion initiale même après un refresh de token.
    await getAdminAuth().verifyIdToken(idToken);
    const sessionCookie = await getAdminAuth().createSessionCookie(idToken, {
      expiresIn,
    });

    const response = NextResponse.json({ status: "success" });
    response.cookies.set("__session", sessionCookie, {
      maxAge: expiresIn,
      httpOnly: true,
      secure: true,
      path: "/",
      sameSite: "lax",
    });
    return response;
  } catch (error) {
    console.error("Error creating session cookie:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    const response = NextResponse.json({ status: "success" });
    response.cookies.set("__session", "", { maxAge: 0 });
    return response;
  } catch (error) {
    console.error("Error deleting session cookie:", error);
    return NextResponse.json(
      { error: "Failed to delete session" },
      { status: 500 },
    );
  }
}
