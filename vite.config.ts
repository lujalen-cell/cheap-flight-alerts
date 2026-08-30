import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Plain Vite + React SPA. Build output is a static `dist/` folder — no SSR,
// no server entry, no Cloudflare/wrangler target. Deploy `dist/` as a static
// site (see vercel.json for the SPA fallback rewrite that makes deep links
// like /app resolve client-side).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    tsconfigPaths: true,
  },
  build: {
    outDir: "dist",
  },
});
