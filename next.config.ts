import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // BUILD_DIST_DIR : permet d'isoler un build de vérification (ex. agent IA lançant `npm run
  // build` pendant qu'un serveur `next dev`/`next start` tourne déjà sur le `.next` par défaut)
  // sans écraser son BUILD_ID/manifests en cours d'utilisation. Non défini = comportement
  // standard ('.next'), utilisé par le dev local et le déploiement Vercel.
  ...(process.env.BUILD_DIST_DIR ? { distDir: process.env.BUILD_DIST_DIR } : {}),
  experimental: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    serverActions: { bodySizeLimit: '20mb' },
  } as any,
};

export default nextConfig;
