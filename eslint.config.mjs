import next from "eslint-config-next";
import tseslint from "typescript-eslint";

const config = [
  ...next,
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: { "@typescript-eslint": tseslint.plugin },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "error",

      // Generated assets come from arbitrary CDN hosts, which `images.remotePatterns` cannot
      // enumerate, so remote media is a plain <img>. See UI-10 in UI-SPEC.md.
      "@next/next/no-img-element": "off",
    },
  },
  { ignores: [".next/**", "node_modules/**", "src/contracts/**"] },
];

export default config;
