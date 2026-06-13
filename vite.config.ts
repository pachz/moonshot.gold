import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const appRoutePrefixes = ["/login", "/home"];

function isAppRoute(url: string): boolean {
  return appRoutePrefixes.some(
    (prefix) => url === prefix || url.startsWith(`${prefix}/`),
  );
}

function appRouteFallback(): Plugin {
  return {
    name: "app-route-fallback",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = req.url?.split("?")[0] ?? "";
        if (isAppRoute(url)) {
          req.url = "/app.html";
        }
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = req.url?.split("?")[0] ?? "";
        if (isAppRoute(url)) {
          req.url = "/app.html";
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), appRouteFallback()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        app: path.resolve(__dirname, "app.html"),
      },
    },
  },
});
