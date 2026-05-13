/**
 * Portfolio image URLs — single place these paths are defined.
 * Vite serves files from `public/` at the site root (e.g. `public/akash-main.webp` → `/akash-main.webp`).
 *
 * Wired from:
 * - Primary profile / hover: `src/components/sections.jsx` → `Hero` → `PixelTransition` (`firstContent` / `secondContent`)
 * - Badminton: `src/components/sections.jsx` → `BentoSection` → `bento-bad` card → `.bad-thumb` `<img>`
 */
export const HERO_PROFILE_PRIMARY_PATH = '/akash-main.webp'
export const HERO_PROFILE_HOVER_PATH = '/akash-alt.webp'
export const BENTO_BADMINTON_IMAGE_PATH = '/badminton.webp'

if (import.meta.env.DEV) {
  console.info(
    '[portfolio images] Paths defined in src/constants/imageAssets.js',
    { HERO_PROFILE_PRIMARY_PATH, HERO_PROFILE_HOVER_PATH, BENTO_BADMINTON_IMAGE_PATH },
  )
}
