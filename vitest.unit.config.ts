import { defineProject } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineProject({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    name: "unit",
    include: ["tests/unit/**/*.test.ts"],
  },
});