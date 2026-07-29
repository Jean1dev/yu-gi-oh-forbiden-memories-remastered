/** @type {import('next').NextConfig} */
const nextConfig = {
  // The workspace packages publish TypeScript source directly (their `exports`
  // point at `./src/index.ts`), so Next has to compile them like app code
  // instead of treating them as pre-built dependencies.
  transpilePackages: ["@yugioh/shared", "@yugioh/data", "@yugioh/rules"],
};

export default nextConfig;
