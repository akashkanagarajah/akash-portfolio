# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Next.js dev server at http://localhost:3000
- `npm run build` — production build (also the type-check gate; there is no separate `tsc` script)
- `npm run start` — serve the production build
- `npm run lint` — `next lint` (config extends `next/core-web-vitals`)

There is no test runner configured.

Both `package-lock.json` and `pnpm-lock.yaml` are checked in, but the README documents `npm` — prefer `npm install` to keep `package-lock.json` authoritative.

## Architecture

Next.js 14 App Router site (single-page portfolio plus an MDX blog). TypeScript with the `@/*` → `src/*` path alias. Styling is TailwindCSS + shadcn/ui (New York style, `neutral` base, components live in `src/components/ui`). Animations come from `framer-motion`/`motion` and a small set of custom Magic UI components in `src/components/magicui`.

Two pieces are load-bearing for the whole site:

- **`src/data/resume.tsx`** is the single source of truth for portfolio content (name, summary, skills, work history, education, projects, hackathons, contact/socials, and the navbar dock items). `src/app/page.tsx` and `src/app/layout.tsx` (metadata) both read from it via the `DATA` export. Editing this file is how you change what the homepage shows — the page is structured around its keys (`work`, `education`, `skills`, `projects`, `hackathons`, `contact`).
- **`src/components/icons.tsx`** is a large hand-rolled icon registry that `resume.tsx` references by name (for skills, social links, dock items). Adding a new social or skill icon usually means extending `Icons` here first.

The blog is file-system driven from `content/*.mdx`:

- `src/data/blog.ts` reads MDX files, parses frontmatter with `gray-matter`, and runs them through a `unified` pipeline: `remark-parse` → `remark-gfm` → `remark-rehype` → `rehype-pretty-code` (Shiki, `min-light`/`min-dark` themes, `keepBackground: false`) → `rehype-stringify`. Output is raw HTML.
- `src/app/blog/page.tsx` lists posts via `getBlogPosts()`; `src/app/blog/[slug]/page.tsx` renders one via `getPost(slug)` and `dangerouslySetInnerHTML`s the HTML. Adding a post = drop a new `.mdx` file in `content/` with `title`, `publishedAt`, `summary` (and optional `image`) frontmatter.

Theming uses `next-themes` via `ThemeProvider` in `src/app/layout.tsx` (`defaultTheme="light"`, `attribute="class"`). The layout also constrains the whole app to `max-w-2xl` centered — keep that in mind when adding sections.
