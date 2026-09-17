import { defineProject } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineProject({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    name: "integration",
    include: ["tests/integration/**/*.test.ts"],
  },
});