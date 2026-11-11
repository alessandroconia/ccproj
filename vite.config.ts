import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// GitHub Pages cannot set response headers, so the CSP is injected as a <meta> tag.
// Build only: the dev server needs inline scripts for hot reload.
function contentSecurityPolicy(supabaseUrl: string | undefined): Plugin {
  let origin = "";
  try {
    if (supabaseUrl) origin = new URL(supabaseUrl).origin;
  } catch {
    // invalid URL: no extra origin is allowed
  }
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' https://fonts.googleapis.com",
    "font-src https://fonts.gstatic.com",
    `img-src 'self' data:${origin ? ` ${origin}` : ""}`,
    `connect-src 'self'${origin ? ` ${origin}` : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
  ].join("; ");

  return {
    name: "content-security-policy",
    apply: "build",
    transformIndexHtml: () => [
      {
        tag: "meta",
        attrs: { "http-equiv": "Content-Security-Policy", content: policy },
        injectTo: "head-prepend",
      },
    ],
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  return {
    base: "/ccproj/",
    plugins: [react(), tailwindcss(), contentSecurityPolicy(env.VITE_SUPABASE_URL)],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
