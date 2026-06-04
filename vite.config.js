import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export default defineConfig({
    plugins: [
      laravel({
        input: ["resources/css/app.css", "resources/js/main.tsx"],
        refresh: true,
      }),
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        "@": resolve(__dirname, "resources/js"),
      },
    },
    server: {
      watch: {
        ignored: ["**/storage/framework/views/**"],
      },
    },
  }); 