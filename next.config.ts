import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // BUILD_DIST_DIR : permet d'isoler un build de vérification (ex. agent IA lançant `npm run
  // build` pendant qu'un serveur `next dev`/`next start` tourne déjà sur le `.next` par défaut)
  // sans écraser son BUILD_ID/manifests en cours d'utilisation. Non défini = comportement
  // standard ('.next'), utilisé par le dev local et le déploiement Vercel.
  ...(process.env.BUILD_DIST_DIR ? { distDir: process.env.BUILD_DIST_DIR } : {}),
  experimental: {
    // Vercel impose une limite plateforme non configurable de 4,5 Mo sur le corps d'une requête
    // Server Action — un `bodySizeLimit` Next.js plus haut (ex. l'ancien 20mb) ne sert à rien en
    // production (la requête est déjà rejetée par Vercel avant d'atteindre Next.js) et masquait
    // le vrai problème en local. Alignée ici pour qu'un dépassement produise une erreur Next.js
    // propre plutôt qu'un échec silencieux, cohérent avec la limite client dans CandidateForm.tsx.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    serverActions: { bodySizeLimit: '4.5mb' },
  } as any,
};

export default nextConfig;
