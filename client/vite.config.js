import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Backend http://localhost:5432 da ishlaydi.
// Dev rejimda /api va /uploads so'rovlari shu yerga yo'naltiriladi.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:5432",
      "/uploads": "http://localhost:5432",
    },
  },
});
