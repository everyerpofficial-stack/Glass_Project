import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig, loadEnv, type PluginOption } from "vite";

const srcDir = fileURLToPath(new URL("./src", import.meta.url));

// Plugin order matters: tailwind first, then TanStack Start (which owns the
// router/SSR build), then nitro, and React last.
export default defineConfig(({ command, mode }) => {
  // Inline VITE_* vars explicitly. Vite replaces `import.meta.env.VITE_*` in the
  // client bundle on its own, but the nitro/SSR bundle does not get that pass.
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const define = Object.fromEntries(
    Object.entries(env).map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)]),
  );

  const plugins: PluginOption[] = [
    tailwindcss(),
    tanstackStart({
      // Fail the build if client code pulls in a server-only module.
      importProtection: {
        behavior: "error",
        client: { files: ["**/server/**"], specifiers: ["server-only"] },
      },
      // Redirect TanStack Start's bundled server entry to src/server.ts, our SSR
      // error wrapper. nitro builds from this.
      server: { entry: "server" },
    }),
    viteReact(),
  ];

  // nitro packages the production server. Dev runs on Vite's own server, so it
  // is only needed for `vite build`. Set NITRO_PRESET to target another host.
  if (command === "build") {
    plugins.splice(2, 0, nitro({ defaultPreset: "cloudflare-module" }));
  }

  return {
    plugins,
    define,
    resolve: {
      // Vite 8 reads the `@/*` -> `./src/*` mapping straight from tsconfig.json.
      tsconfigPaths: true,
      alias: { "@": srcDir },
      // A duplicated React or Query copy breaks hooks and cache identity.
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
      ],
    },
    server: { host: "::", port: 8080 },
    preview: { host: "::", port: 8080 },
  };
});
