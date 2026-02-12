import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@app/common": path.resolve(__dirname, "libs/common/src/index.ts"),
      "@app/common/*": path.resolve(__dirname, "libs/common/src/*")
    }
  },
  test: {
    environment: "node"
  }
});
