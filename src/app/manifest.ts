import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KamGo",
    short_name: "KamGo",
    description: "Covoiturage optimisé par l'IA",
    start_url: "/",
    display: "standalone",
    theme_color: "#53C8DF",
    background_color: "#53C8DF",
    lang: "fr-CA",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
