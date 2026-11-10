/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.js"],
    // URL fixe pour les tests, indépendante de frontend/.env
    env: { VITE_API_URL: "http://api.test" },
    restoreMocks: true,
  },
});
