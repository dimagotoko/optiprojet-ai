import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OptiTrajet AI",
    short_name: "OptiTrajet",
    description: "Covoiturage québécois optimisé par l'IA",
    start_url: "/",
    display: "standalone",
    theme_color: "#53C8DF",
    background_color: "#ffffff",
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
