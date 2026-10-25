import { fileURLToPath } from "node:url";
export default {
  resolve: {
    alias: [
      {
        find: /^three\/addons\//,
        replacement: fileURLToPath(
          new URL("../../packages/runtime/node_modules/three/examples/jsm/", import.meta.url),
        ),
      },
      {
        find: "three",
        replacement: fileURLToPath(
          new URL(
            "../../packages/runtime/node_modules/three/build/three.module.js",
            import.meta.url,
          ),
        ),
      },
    ],
  },
  test: { include: ["benchmarks/runtime-edit-profile/profile.test.ts"], reporters: ["default"] },
};
