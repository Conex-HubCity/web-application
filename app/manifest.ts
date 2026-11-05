import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CNX - Le lien nous eleve",
    short_name: "CNX",
    description:
      "L'espace de rencontre et de transmission entre entrepreneurs africains et professionnels de la diaspora.",
    start_url: "/fr",
    display: "standalone",
    background_color: "#14342b",
    theme_color: "#14342b",
    icons: [
      {
        src: "/assets/conex/cnx-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/assets/conex/cnx-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
