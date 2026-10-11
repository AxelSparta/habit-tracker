import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Hábitos",
    short_name: "Hábitos",
    description:
      "Registrá tus hábitos, mantené la racha y mirá tus estadísticas.",
    lang: "es",
    start_url: "/",
    scope: "/",
    display: "standalone",
    // Mismo fondo que el modo claro de globals.css: es el color de la
    // pantalla de carga al abrir la app instalada.
    background_color: "#f3f4f7",
    theme_color: "#f3f4f7",
    categories: ["productivity", "health", "lifestyle"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
