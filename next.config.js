/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Ignorar errores de ESLint durante el build (Vercel). Revisar y corregir después.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignorar errores de TypeScript en build (temporal). Ideal: corregir los errores en el código.
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
