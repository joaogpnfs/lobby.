import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // SWC instead of esbuild: Nest DI needs emitDecoratorMetadata.
  plugins: [swc.vite({ module: { type: "es6" } })],
  test: {
    include: ["test/**/*.spec.ts"],
    setupFiles: ["test/setup.ts"],
  },
});
