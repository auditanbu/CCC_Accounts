import type { MetadataRoute } from "next";

import { TEAM_NAME } from "@/lib/constants";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${TEAM_NAME} — Match & Accounts`,
    short_name: "Super Kings",
    description:
      "Match schedule, player collections and team finances for the Eleven Super Kings cricket team.",
    start_url: "/",
    display: "standalone",
    // Matches the app's canvas colour (globals.css) and viewport.themeColor —
    // the design is deliberately light-only, so no dark variant here.
    background_color: "#F2F2F7",
    theme_color: "#F2F2F7",
    icons: [
      { src: "/icons/192.png", type: "image/png", sizes: "192x192" },
      { src: "/icons/512.png", type: "image/png", sizes: "512x512" },
    ],
  };
}
