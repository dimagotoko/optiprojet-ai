import type { Metadata } from "next";
import { getAdminDb } from "@/lib/firebase-admin";
import PublicProfilePage from "./UserProfileClient";

type Props = { params: Promise<{ userId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { userId } = await params;
  const noindex = { robots: { index: false, follow: false } } as const;
  try {
    const db = getAdminDb();
    const snap = await db.collection("users").doc(userId).get();
    if (!snap.exists) {
      return { title: "Profil introuvable", ...noindex };
    }
    const user = snap.data()!;

    const name: string = user.name ?? "Conducteur";
    const title = `${name} — Conducteur`;

    let description = `Profil de ${name} sur KamGo`;
    if (user.city) description += `, basé à ${user.city}`;
    if (user.totalRatings > 0 && user.averageRating != null) {
      description += `. Note : ${(user.averageRating as number).toFixed(1)}/5`;
    }
    description += ".";

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "profile",
        ...(typeof user.profilePictureUrl === "string" && user.profilePictureUrl
          ? { images: [{ url: user.profilePictureUrl }] }
          : {}),
      },
      ...noindex,
    };
  } catch {
    return { title: "Profil", ...noindex };
  }
}

export default function Page() {
  return <PublicProfilePage />;
}
