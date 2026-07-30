import { useEffect, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import "./BookShowcase.css";

/* =============================================================================
   3D book showcase.

   Logic ported from https://github.com/thebuggeddev/books (index.html, single
   inline <script>, three.js r128 via CDN) by way of the vasantham-wellness-hub
   port. The scene setup, camera and light values, the Spring physics, the
   slot/state machine, the drag-to-tumble orbit and the per-frame book rig are
   the reference's, unchanged in behavior.

   What was adapted, and why:
   1. VIEWPORT -> CONTAINER. The reference is a full-screen app: it reads
      window.innerWidth/innerHeight and positions its UI with position:fixed.
      Here it is one component in a page, so every measurement comes from the
      stage element's own box and the UI is absolutely positioned inside it.
   2. SLOT COUNT. The reference hardcodes exactly three hero slots. computeSlots()
      derives slots from the reference's three via a normalized u in [-1,1]; at
      n === 3 it reproduces the reference numbers exactly, and it fit-scales the
      root so wider fans still frame.
   3. three.js r185 API (see notes at each call site): sRGBEncoding ->
      SRGBColorSpace, Raycaster.setFromCamera needs a Vector2, and r152+ color
      management means hex material colors are now treated as sRGB.
   4. The "Open" slip is moved with translate3d on a wrapper instead of the
      reference's left/top writes, so the follow motion stays composited.
   5. PORTFOLIO PORT: data shape is a personal reading list, covers come from the
      Open Library covers API, and the palette is this site's gold-on-black
      rather than the source's brand greens. The engine is untouched.
   ========================================================================== */

export type ReadingStatus = "Reading" | "Finished" | "Want to Read";

export interface ShowcaseBook {
  id: string;
  title: string;
  author: string;
  /** Reading / Finished / Want to Read — shown as the pill in the detail panel. */
  status: ReadingStatus;
  /** Personal note: why I picked it up, or what I took from it. */
  desc: string;
  /** Where I track it — powers the single action pill. */
  trackUrl: string;
  /** Printed on the back-cover barcode block. Also what coverURL is derived from. */
  isbn: string | null;
  /** null -> the shared generic placeholder painter draws the cover instead. */
  coverURL: string | null;
  /** Tried once if coverURL fails. Lets a local file in /public win while the
      Open Library cover stays as a net, before falling back to the painter. */
  coverFallbackURL?: string | null;
  edge: string;
  backBg: string;
  /** "r,g,b" — the reference builds rgba() strings from this. */
  backInk: string;
  spineBg: string;
  spineInk: string;
  spineFont: string;
  /** When set, the spine shows only this label (no title + author). */
  spineLabel?: string;
}

/** Open Library covers, no API key. `default=false` 404s on a miss instead of
    serving a 1x1 blank, so the TextureLoader error path fires and the
    procedural placeholder below stays on the mesh. */
export const coverFromISBN = (isbn: string | null) =>
  isbn ? `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false` : null;

interface EngineOptions {
  canvas: HTMLCanvasElement;
  stage: HTMLElement;
  panel: HTMLElement;
  pillAnchor: HTMLElement;
  pill: HTMLElement;
  books: ShowcaseBook[];
  onOpen: (index: number) => void;
  onDetailShown: () => void;
  /** Fires when the fan is coming back and the stage word may show again. */
  onShelfVisible: () => void;
  onClosed: () => void;
}

interface Engine {
  close: () => void;
  dispose: () => void;
}

/* Site fonts, so the painted cover canvases match the surrounding page. */
const FONT_STACK = '"Jost", ui-sans-serif, system-ui, sans-serif';
const SERIF_STACK = '"Cormorant Garamond", ui-serif, Georgia, serif';

/* =========================================================================
   0. Small utilities (reference §0)
   ========================================================================= */
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

class Spring {
  v: number;
  t: number;
  vel: number;
  k: number;
  d: number;
  constructor(v: number, k?: number, d?: number) {
    this.v = v;
    this.t = v;
    this.vel = 0;
    this.k = k || 120;
    this.d = d || 14;
  }
  set(v: number) {
    this.v = v;
    this.t = v;
    this.vel = 0;
    return this;
  }
  update(dt: number) {
    const a = this.k * (this.t - this.v) - this.d * this.vel;
    this.vel += a * dt;
    this.v += this.vel * dt;
    return this.v;
  }
}

function mkCanvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function drawSpaced(x: CanvasRenderingContext2D, text: string, cx: number, y: number, ls: number) {
  const prev = x.textAlign;
  x.textAlign = "left";
  const chars = [...text];
  let tot = 0;
  const ws = chars.map((ch) => {
    const w = x.measureText(ch).width;
    tot += w;
    return w;
  });
  tot += ls * (chars.length - 1);
  let px = cx - tot / 2;
  chars.forEach((ch, i) => {
    x.fillText(ch, px, y);
    px += ws[i] + ls;
  });
  x.textAlign = prev;
}

function rr(x: CanvasRenderingContext2D, px: number, py: number, w: number, h: number, r: number) {
  x.beginPath();
  x.moveTo(px + r, py);
  x.arcTo(px + w, py, px + w, py + h, r);
  x.arcTo(px + w, py + h, px, py + h, r);
  x.arcTo(px, py + h, px, py, r);
  x.arcTo(px, py, px + w, py, r);
  x.closePath();
}

function wrapLines(x: CanvasRenderingContext2D, text: string, maxW: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (x.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/* =========================================================================
   Generic placeholder cover painter.

   The reference paints a bespoke illustration per real book. This is the ONE
   painter every item falls back to: site ground, gold rule, wrapped title.
   Every book here ships a real Open Library cover, so this only renders while
   that image is in flight, or if it 404s / is blocked.
   ========================================================================= */
function paintPlaceholderCover(
  x: CanvasRenderingContext2D,
  w: number,
  h: number,
  cfg: ShowcaseBook,
) {
  const g = x.createLinearGradient(0, 0, w * 0.35, h);
  g.addColorStop(0, "#242018");
  g.addColorStop(0.55, "#16130e");
  g.addColorStop(1, "#0b0a08");
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);

  /* faint gold wash so a flat fill does not read as plastic under the env map */
  const wash = x.createRadialGradient(w * 0.78, h * 0.16, 0, w * 0.78, h * 0.16, w * 0.85);
  wash.addColorStop(0, "rgba(201,168,76,.20)");
  wash.addColorStop(1, "rgba(201,168,76,0)");
  x.fillStyle = wash;
  x.fillRect(0, 0, w, h);

  const M = 110;

  x.fillStyle = "#C9A84C";
  x.fillRect(M, 168, 190, 14);

  x.fillStyle = "rgba(240,237,232,.72)";
  x.font = `500 30px ${FONT_STACK}`;
  x.textAlign = "left";
  drawSpaced(x, cfg.status.toUpperCase(), M + 210, 268, 4);

  const titleSize = cfg.title.length > 44 ? 74 : cfg.title.length > 24 ? 92 : 112;
  x.fillStyle = "#f0ede8";
  x.font = `500 ${titleSize}px ${SERIF_STACK}`;
  const lines = wrapLines(x, cfg.title, w - M * 2);
  const lh = titleSize * 1.08;
  let y = Math.min(560, h - 420 - lines.length * lh) + lh;
  lines.forEach((l) => {
    x.fillText(l, M, y);
    y += lh;
  });

  x.fillStyle = "rgba(201,168,76,.92)";
  x.font = `400 34px ${FONT_STACK}`;
  const aLines = wrapLines(x, cfg.author, w - M * 2);
  let ay = h - 250 - (aLines.length - 1) * 44;
  aLines.forEach((l) => {
    x.fillText(l, M, ay);
    ay += 44;
  });

  x.strokeStyle = "rgba(201,168,76,.22)";
  x.lineWidth = 3;
  x.strokeRect(46, 46, w - 92, h - 92);
}

/* back cover and spine painters — reference, recolored via per-item cfg */
function paintBack(x: CanvasRenderingContext2D, w: number, h: number, cfg: ShowcaseBook) {
  x.fillStyle = cfg.backBg;
  x.fillRect(0, 0, w, h);
  const ink = cfg.backInk;
  x.fillStyle = "rgba(" + ink + ",.5)";
  rr(x, 150, 190, w - 460, 28, 14);
  x.fill();
  for (let i = 0; i < 9; i++) {
    const lw = i === 8 ? w - 560 : w - 300 - Math.random() * 180;
    x.fillStyle = "rgba(" + ink + ",.2)";
    rr(x, 150, 300 + i * 56, lw, 15, 7);
    x.fill();
  }
  x.fillStyle = "rgba(" + ink + ",.45)";
  x.beginPath();
  x.arc(178, h - 186, 26, 0, 6.2832);
  x.fill();
  /* the reference draws a fake barcode here; these are real books, so the block
     carries the item's actual ISBN — the same one the cover is fetched by */
  x.fillStyle = "rgba(" + ink + ",.28)";
  rr(x, w - 330, h - 262, 236, 100, 10);
  x.fill();
  x.fillStyle = "rgba(" + ink + ",.85)";
  x.font = `500 26px ${FONT_STACK}`;
  x.textAlign = "center";
  x.fillText(cfg.isbn ?? "—", w - 212, h - 200);
  x.textAlign = "left";
}

function paintSpine(x: CanvasRenderingContext2D, w: number, h: number, cfg: ShowcaseBook) {
  x.fillStyle = cfg.spineBg;
  x.fillRect(0, 0, w, h);
  x.save();
  x.translate(w / 2, h / 2);
  x.rotate(Math.PI / 2);
  x.fillStyle = cfg.spineInk;
  x.font = cfg.spineFont;
  if (cfg.spineLabel) {
    /* Own Content: one short centre-name line instead of title + author */
    drawSpaced(x, cfg.spineLabel.toUpperCase(), 0, 15, 6);
  } else {
    /* long titles overrun a 1536px spine, so the spine gets a clipped form; the
       full title is always shown in the detail panel */
    const spineTitle = cfg.title.length > 34 ? cfg.title.slice(0, 32).trimEnd() + "…" : cfg.title;
    drawSpaced(x, spineTitle.toUpperCase(), -h * 0.1, 15, 6);
    x.globalAlpha = 0.85;
    x.font = `400 25px ${FONT_STACK}`;
    const spineAuthor = cfg.author.length > 30 ? cfg.author.slice(0, 28).trimEnd() + "…" : cfg.author;
    drawSpaced(x, spineAuthor.toUpperCase(), h * 0.325, 9, 4);
    x.globalAlpha = 1;
  }
  x.restore();
  x.fillStyle = cfg.spineInk;
  x.globalAlpha = 0.6;
  x.fillRect(w / 2 - 26, 92, 52, 3);
  x.fillRect(w / 2 - 26, h - 95, 52, 3);
  x.globalAlpha = 1;
}

/* =========================================================================
   Engine
   ========================================================================= */
function createShowcase(o: EngineOptions): Engine {
  const { canvas, stage, panel, pillAnchor, pill, books: BOOKS } = o;
  const RM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* container box replaces the reference's window dimensions everywhere */
  let VW = Math.max(1, stage.clientWidth);
  let VH = Math.max(1, stage.clientHeight);

  const disposables = new Set<{ dispose: () => void }>();
  const track = <T extends { dispose: () => void }>(x: T) => {
    disposables.add(x);
    return x;
  };

  /* ---------- 1. Renderer, scene, camera, lights (reference §1) ---------- */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(VW, VH, false);
  /* r185: outputEncoding/sRGBEncoding removed -> outputColorSpace. Same result. */
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.shadowMap.enabled = true;
  /* r185: PCFSoftShadowMap is deprecated and silently falls back to PCFShadowMap,
     so it is named explicitly. Shadow edges are a touch harder than the
     reference's; nothing else about the lighting changes. */
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const ANISO = renderer.capabilities.getMaxAnisotropy();

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, VW / VH, 0.1, 100);
  camera.position.set(0, 0.1, 9.6);

  function envBlob(
    x: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    rgb: string,
    a: number,
  ) {
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, "rgba(" + rgb + "," + a + ")");
    g.addColorStop(1, "rgba(" + rgb + ",0)");
    x.fillStyle = g;
    x.beginPath();
    x.arc(cx, cy, r, 0, 6.2832);
    x.fill();
  }
  /* studio environment: painted equirect, prefiltered. Same luminance ramp as
     the reference, hue-shifted off its navy onto this site's warm near-black. */
  (function buildEnv() {
    const c = mkCanvas(512, 256);
    const x = c.getContext("2d")!;
    const g = x.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "#6b5f47");
    g.addColorStop(0.55, "#2b2519");
    g.addColorStop(1, "#0c0b08");
    x.fillStyle = g;
    x.fillRect(0, 0, 512, 256);
    envBlob(x, 140, 66, 95, "255,255,255", 0.95); // key
    envBlob(x, 405, 84, 55, "255,214,168", 0.55); // warm kicker
    envBlob(x, 256, 150, 120, "201,168,76", 0.28); // gold wash (was pink)
    const t = new THREE.CanvasTexture(c);
    t.mapping = THREE.EquirectangularReflectionMapping;
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromEquirectangular(t).texture;
    scene.environment = env;
    track(env);
    t.dispose();
    pmrem.dispose();
  })();

  const hemi = new THREE.HemisphereLight(0xd6c69c, 0x14110c, 0.32);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 0.82);
  key.position.set(3.5, 5, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -4;
  key.shadow.camera.right = 4;
  key.shadow.camera.top = 4;
  key.shadow.camera.bottom = -4;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 20;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x9aa3b2, 0.2); // cool neutral fill
  fill.position.set(-4, 1, 4);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xc9a84c, 0.34); // gold rim (was pink)
  rim.position.set(-2, 3, -5);
  scene.add(rim);

  const bookRoot = new THREE.Group();
  scene.add(bookRoot);

  /* ---------- 2. Shared procedural textures (reference §2) ---------- */
  function tex(c: HTMLCanvasElement) {
    const t = new THREE.CanvasTexture(c);
    /* r185: texture.encoding removed -> colorSpace */
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = ANISO;
    return track(t);
  }

  function noiseTexture(base: number, amp: number, scratches: boolean) {
    const s = 256;
    const c = mkCanvas(s, s);
    const x = c.getContext("2d")!;
    const img = x.createImageData(s, s);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = base + (Math.random() - 0.5) * 2 * amp;
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    if (scratches) {
      x.strokeStyle = "rgba(200,200,200,.25)";
      x.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        x.beginPath();
        const y = Math.random() * s;
        x.moveTo(0, y);
        x.lineTo(s, y + (Math.random() - 0.5) * 22);
        x.stroke();
      }
    }
    return track(new THREE.CanvasTexture(c));
  }
  const laminateBump = noiseTexture(128, 10, true);
  const clothBump = (function () {
    const s = 128;
    const c = mkCanvas(s, s);
    const x = c.getContext("2d")!;
    x.fillStyle = "#808080";
    x.fillRect(0, 0, s, s);
    for (let i = 0; i < s; i += 2) {
      x.fillStyle = i % 4 === 0 ? "rgba(255,255,255,.22)" : "rgba(0,0,0,.22)";
      x.fillRect(i, 0, 1, s);
      x.fillRect(0, i, s, 1);
    }
    return track(new THREE.CanvasTexture(c));
  })();

  function striationTexture(vertical: boolean) {
    const s = 512;
    const c = mkCanvas(s, s);
    const x = c.getContext("2d")!;
    x.fillStyle = "#ece4d2";
    x.fillRect(0, 0, s, s);
    let p = 0;
    while (p < s) {
      const w = 1 + Math.random() * 2.4;
      const tone = Math.random();
      x.fillStyle =
        tone < 0.12
          ? "rgba(140,125,95,.5)"
          : tone < 0.5
            ? "rgba(255,255,252,.55)"
            : "rgba(190,178,150,.45)";
      if (vertical) x.fillRect(p, 0, w, s);
      else x.fillRect(0, p, s, w);
      p += w + 0.6 + Math.random() * 1.6;
    }
    for (let i = 0; i < 2600; i++) {
      x.fillStyle = "rgba(120,108,84," + (Math.random() * 0.1).toFixed(3) + ")";
      x.fillRect(Math.random() * s, Math.random() * s, 1.2, 1.2);
    }
    return tex(c);
  }
  const striV = striationTexture(true);
  const striH = striationTexture(false);

  const endpaperTex = (function () {
    const s = 512;
    const c = mkCanvas(s, s);
    const x = c.getContext("2d")!;
    x.fillStyle = "#f3edde";
    x.fillRect(0, 0, s, s);
    for (let i = 0; i < 1400; i++) {
      x.fillStyle = "rgba(120,105,70," + (0.04 + Math.random() * 0.08).toFixed(3) + ")";
      x.fillRect(Math.random() * s, Math.random() * s, 1.4, 1.4);
    }
    const g = x.createLinearGradient(0, 0, s, 0);
    g.addColorStop(0, "rgba(0,0,0,.07)");
    g.addColorStop(0.12, "rgba(0,0,0,0)");
    g.addColorStop(0.88, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,.07)");
    x.fillStyle = g;
    x.fillRect(0, 0, s, s);
    return tex(c);
  })();

  const blobTex = (function () {
    const s = 256;
    const c = mkCanvas(s, s);
    const x = c.getContext("2d")!;
    const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, "rgba(0,0,0,.85)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, s, s);
    return track(new THREE.CanvasTexture(c));
  })();

  /* ---------- 4. Book construction (reference §4) ---------- */
  const W = 1.42,
    H = 2.14,
    T = 0.34,
    CT = 0.032,
    OV = 0.05;
  const PAGE_N = 12,
    PW = W - 0.02,
    PH = H - 0.02;
  const BLOCK_D = 0.245,
    BLOCK_Z = -0.0205,
    PIVOT_Z = T / 2 + CT / 2,
    BPIVOT_Z = -(T / 2 + CT / 2);

  const coverGeo = track(new THREE.BoxGeometry(W + OV, H + OV * 2, CT));
  const blockGeo = track(new THREE.BoxGeometry(W - 0.015, H, BLOCK_D));
  const pageGeo = track(new THREE.PlaneGeometry(PW, PH));
  const spineGeo = track(new THREE.BoxGeometry(0.028, H + OV * 2, T + CT * 2 + 0.006));
  const hitGeo = track(new THREE.BoxGeometry(1.8, 2.5, 1.15));
  const blobGeo = track(new THREE.PlaneGeometry(1, 1));
  const hitMat = track(new THREE.MeshBasicMaterial({ visible: false }));

  function std(opts: THREE.MeshStandardMaterialParameters) {
    return track(new THREE.MeshStandardMaterial(Object.assign({ metalness: 0.02 }, opts)));
  }

  const paperFlat = std({ color: 0xf2ecdd, roughness: 0.95, envMapIntensity: 0.2 });
  const striMatV = std({
    map: striV,
    bumpMap: striV,
    bumpScale: 0.0025,
    roughness: 0.95,
    envMapIntensity: 0.2,
  });
  const striMatH = std({
    map: striH,
    bumpMap: striH,
    bumpScale: 0.0025,
    roughness: 0.95,
    envMapIntensity: 0.2,
  });
  const endpaperMat = std({ map: endpaperTex, roughness: 0.9, envMapIntensity: 0.25 });
  const pageMats = [0xf4eee0, 0xf1ebdb, 0xf6f0e3].map((c) =>
    std({ color: c, roughness: 0.92, envMapIntensity: 0.22, side: THREE.DoubleSide }),
  );

  interface BookRig {
    cfg: ShowcaseBook;
    index: number;
    root: THREE.Group;
    float: THREE.Group;
    pivot: THREE.Group;
    backPivot: THREE.Group;
    spine: THREE.Mesh;
    block: THREE.Mesh;
    pages: THREE.Group[];
    pageF: number[];
    pagesB: THREE.Group[];
    pageFB: number[];
    hit: THREE.Mesh;
    springs: Record<string, Spring>;
    phase: number;
    slotScale: number;
    hitEdge: number | null;
    scr: { x: number; y: number };
    orbY: number;
    orbYv: number;
    orbPhase: string;
    orbTarget: number;
    orbXs: Spring;
    exit: { segs: YSeg[]; i: number; t: number } | null;
  }

  interface YSeg {
    d: number;
    from: number;
    to: number;
    ease: (t: number) => number;
    end?: () => void;
  }

  const books: BookRig[] = [];
  const hitMeshes: THREE.Mesh[] = [];

  function buildBook(cfg: ShowcaseBook, index: number) {
    const root = new THREE.Group();
    const float = new THREE.Group();
    root.add(float);
    bookRoot.add(root);

    const fc = mkCanvas(1024, 1536);
    paintPlaceholderCover(fc.getContext("2d")!, 1024, 1536, cfg);
    const bc = mkCanvas(1024, 1536);
    paintBack(bc.getContext("2d")!, 1024, 1536, cfg);
    const sc = mkCanvas(220, 1536);
    paintSpine(sc.getContext("2d")!, 220, 1536, cfg);
    const frontTex = tex(fc),
      backTex = tex(bc),
      spineTex = tex(sc);

    const mEdge = std({
      color: cfg.edge,
      bumpMap: laminateBump,
      bumpScale: 0.0035,
      roughness: 0.68,
      envMapIntensity: 0.3,
    });
    const mFront = std({
      map: frontTex,
      bumpMap: laminateBump,
      bumpScale: 0.0035,
      roughness: 0.54,
      envMapIntensity: 0.28,
    });
    const mBack = std({
      map: backTex,
      bumpMap: laminateBump,
      bumpScale: 0.0035,
      roughness: 0.58,
      envMapIntensity: 0.26,
    });
    const mSpine = std({
      map: spineTex,
      bumpMap: clothBump,
      bumpScale: 0.006,
      roughness: 0.78,
      envMapIntensity: 0.22,
    });

    /* Real cover art from Open Library (covers.openlibrary.org sends
       Access-Control-Allow-Origin: *). A missing ISBN leaves coverURL null and
       a 404 / CORS block takes the error path — either way the placeholder
       painted above stays on the mesh. This is the reference's fallback
       pattern, unchanged. */
    if (cfg.coverURL) {
      const loader = new THREE.TextureLoader().setCrossOrigin("anonymous");
      const apply = (t: THREE.Texture) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = ANISO;
        mFront.map = t;
        mFront.needsUpdate = true;
        track(t);
      };
      const give_up = () => console.warn("Cover unavailable, placeholder kept:", cfg.title);
      loader.load(cfg.coverURL, apply, undefined, () => {
        if (!cfg.coverFallbackURL) return give_up();
        loader.load(cfg.coverFallbackURL, apply, undefined, give_up);
      });
    }

    const backPivot = new THREE.Group();
    backPivot.position.set(-W / 2, 0, BPIVOT_Z);
    const backMesh = new THREE.Mesh(coverGeo, [mEdge, mEdge, mEdge, mEdge, endpaperMat, mBack]);
    backMesh.position.x = (W + OV) / 2;
    backMesh.castShadow = backMesh.receiveShadow = true;
    backPivot.add(backMesh);
    float.add(backPivot);

    const pivot = new THREE.Group();
    pivot.position.set(-W / 2, 0, PIVOT_Z);
    const frontMesh = new THREE.Mesh(coverGeo, [mEdge, mEdge, mEdge, mEdge, mFront, endpaperMat]);
    frontMesh.position.x = (W + OV) / 2;
    frontMesh.castShadow = frontMesh.receiveShadow = true;
    pivot.add(frontMesh);
    float.add(pivot);

    const spine = new THREE.Mesh(spineGeo, mSpine);
    spine.position.set(-W / 2 - 0.013, 0, 0);
    spine.castShadow = true;
    float.add(spine);

    const block = new THREE.Mesh(blockGeo, [
      striMatV,
      paperFlat,
      striMatH,
      striMatH,
      paperFlat,
      paperFlat,
    ]);
    block.position.set(-0.0075, 0, BLOCK_Z);
    block.castShadow = block.receiveShadow = true;
    float.add(block);

    const pages: THREE.Group[] = [];
    const pageF: number[] = [];
    for (let i = 0; i < PAGE_N; i++) {
      const pp = new THREE.Group();
      pp.position.set(-W / 2 + 0.01, (Math.random() - 0.5) * 0.006, 0.166 - i * 0.0042);
      const pm = new THREE.Mesh(pageGeo, pageMats[i % 3]);
      pm.position.x = PW / 2;
      pm.rotation.z = (Math.random() - 0.5) * 0.006;
      pp.add(pm);
      float.add(pp);
      pages.push(pp);
      pageF.push(0.3 * Math.pow(1 - i / PAGE_N, 2.6));
    }

    const pagesB: THREE.Group[] = [];
    const pageFB: number[] = [];
    for (let i = 0; i < 6; i++) {
      const pp = new THREE.Group();
      pp.position.set(-W / 2 + 0.01, (Math.random() - 0.5) * 0.006, -0.166 + i * 0.0042);
      const pm = new THREE.Mesh(pageGeo, pageMats[i % 3]);
      pm.position.x = PW / 2;
      pm.rotation.z = (Math.random() - 0.5) * 0.006;
      pp.add(pm);
      float.add(pp);
      pagesB.push(pp);
      pageFB.push(0.3 * Math.pow(1 - i / 6, 2.6));
    }

    const blob = new THREE.Mesh(
      blobGeo,
      track(
        new THREE.MeshBasicMaterial({
          map: blobTex,
          transparent: true,
          opacity: 0.45,
          depthWrite: false,
        }),
      ),
    );
    blob.scale.set(3.1, 3.9, 1);
    blob.position.set(0.1, -0.3, -0.85);
    blob.renderOrder = -5;
    root.add(blob);

    const hit = new THREE.Mesh(hitGeo, hitMat);
    float.add(hit);
    hitMeshes.push(hit);

    const springs: Record<string, Spring> = {
      px: new Spring(0, 17, 6.8),
      py: new Spring(0, 17, 6.8),
      pz: new Spring(0, 17, 6.8),
      rx: new Spring(0, 17, 6.8),
      ry: new Spring(0, 17, 6.8),
      rz: new Spring(0, 17, 6.8),
      sc: new Spring(1, 17, 6.8),
      tiltX: new Spring(0, 120, 13),
      tiltY: new Spring(0, 120, 13),
      lift: new Spring(0, 120, 13),
      cover: new Spring(0, 90, 12),
      coverB: new Spring(0, 90, 12),
      drag: new Spring(0, 160, 16),
    };

    const b: BookRig = {
      cfg,
      index,
      root,
      float,
      pivot,
      backPivot,
      spine,
      block,
      pages,
      pageF,
      pagesB,
      pageFB,
      hit,
      springs,
      phase: Math.random() * 6.28,
      slotScale: 1,
      hitEdge: null,
      scr: { x: 0, y: 0 },
      orbY: 0,
      orbYv: 0,
      orbPhase: "idle",
      orbTarget: 0,
      orbXs: new Spring(0, 60, 12),
      exit: null,
    };
    books.push(b);
    return b;
  }
  BOOKS.forEach(buildBook);
  const bookByHit = (m: THREE.Object3D) => books.find((b) => b.hit === m) || null;

  /* ---------- 5. Floating leaves (reference §5) ----------
     "Leaf" in the bookbinding sense — loose pages drifting around the opened
     book. Same geometry and motion as the reference, recolored gold/cream. */
  interface Leaf {
    mesh: THREE.Mesh;
    hx: number;
    hy: number;
    hz: number;
    sp: number;
    ph: number;
    rv: THREE.Vector3;
    kick: THREE.Vector3;
    size: number;
    s: Spring;
  }
  const leafItems: Leaf[] = [];
  let leafAnchor: BookRig | null = null;
  (function buildLeaves() {
    const shape = new THREE.Shape();
    shape.moveTo(0, -0.5);
    shape.bezierCurveTo(0.3, -0.28, 0.3, 0.22, 0, 0.55);
    shape.bezierCurveTo(-0.3, 0.22, -0.3, -0.28, 0, -0.5);
    const geo = track(new THREE.ShapeGeometry(shape, 10));
    const cols = [0xc9a84c, 0xf0c060, 0x8a6f2a, 0xe8e0d0];
    for (let i = 0; i < 16; i++) {
      const mat = std({
        color: cols[i % 4],
        roughness: 0.55,
        envMapIntensity: 0.3,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      bookRoot.add(mesh);
      let hx = (Math.random() - 0.5) * 4.6;
      if (i % 5 === 0) hx += 2.8 * Math.sign(hx || 1);
      leafItems.push({
        mesh,
        hx,
        hy: (Math.random() - 0.5) * 3.2,
        hz: -0.5 + Math.random() * 1.5,
        sp: 0.25 + Math.random() * 0.5,
        ph: Math.random() * 6.28,
        rv: new THREE.Vector3(
          (Math.random() - 0.5) * 0.8,
          (Math.random() - 0.5) * 0.8,
          (Math.random() - 0.5) * 0.8,
        ),
        kick: new THREE.Vector3(),
        size: 0.14 + Math.random() * 0.16,
        s: new Spring(0, 60, 10),
      });
    }
  })();

  const leaves = {
    activate(book: BookRig) {
      leafAnchor = book;
      leafItems.forEach((l) => {
        l.kick.set(
          -l.hx + (Math.random() - 0.5) * 0.6,
          -l.hy + (Math.random() - 0.5) * 0.6,
          (Math.random() - 0.5) * 0.5,
        );
        l.s.t = l.size;
        l.mesh.visible = true;
      });
    },
    deactivate() {
      leafItems.forEach((l) => {
        l.s.t = 0;
      });
    },
    push(dx: number, dy: number) {
      if (!leafAnchor) return;
      leafItems.forEach((l) => {
        l.kick.x += dx * 2.4 * Math.random();
        l.kick.y += -dy * 2.4 * Math.random();
      });
    },
    update(dt: number, t: number) {
      if (!leafAnchor) return;
      const ap = leafAnchor.root.position;
      const w = RM ? 0.15 : 1;
      leafItems.forEach((l) => {
        l.kick.multiplyScalar(Math.exp(-1.15 * dt));
        l.mesh.position.set(
          ap.x + l.hx + Math.sin(t * l.sp + l.ph) * 0.4 * w + l.kick.x,
          ap.y + l.hy + Math.cos(t * l.sp * 0.83 + l.ph * 1.3) * 0.3 * w + l.kick.y,
          ap.z * 0.4 + l.hz + l.kick.z,
        );
        l.mesh.rotation.x += l.rv.x * dt * (0.3 + w);
        l.mesh.rotation.y += l.rv.y * dt * (0.3 + w);
        l.mesh.rotation.z += l.rv.z * dt * (0.3 + w);
        const s = l.s.update(dt);
        l.mesh.scale.setScalar(Math.max(s, 0.0001));
        if (l.s.t === 0 && s < 0.01) l.mesh.visible = false;
      });
    },
  };

  /* ---------- 6. Layout slots + state machine (reference §6) ---------- */
  interface Slot {
    p: [number, number, number];
    r: [number, number, number];
    s: number;
  }
  const state = {
    mode: "hero" as "hero" | "opening" | "detail" | "closing",
    selected: null as BookRig | null,
    hovered: null as BookRig | null,
    pillLock: null as BookRig | null,
    kbIndex: -1,
  };
  const SLOTS = { hero: [] as Slot[], detail: null as Slot | null, portrait: false };

  const N = books.length;
  /* Reference hero fan, expressed against a normalized u in [-1, 1]. At n === 3
     (u = -1, 0, 1) these reproduce its three hardcoded slots exactly; any other
     count fans along the same curves. Spacing is held at the reference's, so
     wider fans are handled by scaling the root down rather than crowding. */
  const LAND_SPACING = 2.255;
  const PORT_SPACING = 1.49;
  /* A narrow stage cannot hold five books at the reference's portrait spacing
     without shrinking them to nothing, so on phones a longer fan closes up into
     a tighter deck. At n === 3 this is exactly the reference's 1.49. */
  const spacingFor = (portrait: boolean) =>
    portrait ? Math.min(PORT_SPACING, 4.4 / Math.max(1, N - 1)) : LAND_SPACING;

  /* The reference is a phone-ish full-viewport app, so its fixed spacing always
     filled the frame. This stage is now full-bleed and can be very wide, where
     fixed spacing leaves the fan as a narrow strip in the middle of a wide black
     band. `spread` widens the fan with the aspect so it uses the width it has.
     At a === 1.75 (the reference's own fit pivot) it is exactly 1, so nothing
     changes at the aspect the composition was tuned at. Spacing only — slot
     curves, rotations and per-slot scales are untouched. */
  const spreadFor = (portrait: boolean, a: number) =>
    portrait ? 1 : clamp(a / 1.75, 1, 1.45);

  function heroSlot(i: number, portrait: boolean, spread: number): Slot {
    const half = Math.max(1, (N - 1) / 2);
    const u = (i - (N - 1) / 2) / half;
    const au = Math.abs(u);
    const spacing = spacingFor(portrait) * spread;
    const cx = portrait ? 0.2 : 0.3;
    const x = cx + u * spacing * half;
    const y = portrait ? -0.45 - 0.275 * au - 0.05 * u : -1.08 - 0.24 * au - 0.09 * u;
    const z = 0.6 - 0.83 * au - 0.11 * u;
    return {
      p: [x, y, z],
      r: [-0.05 + 0.005 * au, -0.1 + 0.09 * au - 0.41 * u, -0.035 + 0.0425 * au - 0.1775 * u],
      s: 1.52 - 0.13 * au,
    };
  }

  function computeSlots() {
    const a = VW / Math.max(1, VH);
    const portrait = a < 0.85;
    SLOTS.portrait = portrait;
    stage.classList.toggle("is-portrait", portrait);

    SLOTS.hero = books.map((_, i) => heroSlot(i, portrait, spreadFor(portrait, a)));

    /* The reference lets the fan run off every edge of the screen — it is a
       full-viewport app with exactly three books, and there the crop reads as
       books rising into frame. Inside a bounded stage holding a variable number
       of books the same crop reads as a clipping bug, so the reference's aspect
       fit is additionally clamped to whatever actually fits the stage box, and
       the fan is seated above the lower edge. Both tabs then frame the same way
       regardless of how many books they hold. */
    const halfVis = Math.tan((26 * Math.PI) / 360) * 9.6;
    let low = Infinity,
      high = -Infinity,
      halfW = 0;
    SLOTS.hero.forEach((slot) => {
      low = Math.min(low, slot.p[1] - 1.12 * slot.s);
      high = Math.max(high, slot.p[1] + 1.12 * slot.s);
      /* a slot's horizontal reach is not just half a cover: the z-roll swings
         the corners out and the y-yaw turns the board's depth into width */
      const rz = Math.abs(slot.r[2]),
        ry = Math.abs(slot.r[1]);
      const reach = 0.735 * Math.cos(rz) + 1.12 * Math.sin(rz) + 0.2 * Math.sin(ry);
      halfW = Math.max(halfW, Math.abs(slot.p[0]) + reach * slot.s);
    });
    /* WIDTH_USE / HEIGHT_USE: how much of the stage the fan is allowed to take.
       Tuned for a full-viewport stage — the header overlay owns the top of the
       frame, so the fan gets a generous share of the height and sits under it.
       The reference's own aspect fit is still the ceiling, so the books never
       grow past the size it was composed at. */
    /* Portrait is width-limited, so it gets nearly the whole box; landscape
       keeps the reference's margin. */
    const WIDTH_USE = portrait ? 0.99 : 0.94;
    /* The reference held this at 0.62 to keep its stage word readable above the
       fan. There is no stage word any more, so the fan takes the height back. */
    const HEIGHT_USE = 0.72;
    const fitW = (halfVis * a * WIDTH_USE) / halfW;
    const fitH = (halfVis * 2 * HEIGHT_USE) / (high - low);
    const fit = Math.min(clamp(a / 1.75, 0.56, 1), fitW, fitH);
    bookRoot.scale.setScalar(fit);
    /* Fan seated on the lower edge in both orientations, the reference's
       composition. On a narrow stage the fan is width-limited and shorter, and
       the slack above it is where the stage word sits — same as the reference.

       SEAT is the gap between the bottom of the fan and the bottom of the
       stage. The source's 0.35 was tuned for a full-viewport stage; in this
       section-height box it seats the covers hard against the lower edge and
       they read as clipped, so the fan is lifted clear of it.

       Both orientations now derive the seat from the fan's own height so it
       sits centred in the box. Portrait needs this most — the fan is
       width-limited there, so a fixed seat strands it at the bottom — but with
       the stage word gone landscape has no reason to sit high either. The floor
       keeps a margin under the fan: `low` under-measures the real bottom edge
       (rolled corners, contact shadow), so seating tight to it reads as
       clipped. Framing only — no slot, spring or camera value changes. */
    const fanH = (high - low) * fit;
    const SEAT = Math.max(SLOTS.portrait ? 0.6 : 0.75, halfVis - fanH / 2);
    bookRoot.position.y = -halfVis + SEAT - low * fit;

    if (portrait) {
      /* Phone detail composition: the opened book owns the top of the stage and
         the panel owns the bottom, the way the reference app stacks them.

         The reference measured the panel with panel.offsetHeight. That cannot
         work here: computeSlots() runs inside open(), in the same tick as the
         React state update that fills the panel, so the panel is still empty
         and offsetHeight falls through to a guess. The split is therefore a
         fixed fraction of the stage — PANEL_FRAC matches the height the panel
         actually settles at with a four-line clamped note. */
      const PANEL_FRAC = 0.54;
      /* Clears the close button, which is centred at the top of the stage in
         portrait and would otherwise sit on the opened book's cover. */
      const freeTop = VH * 0.11;
      const freeBot = VH * (1 - PANEL_FRAC);
      const midPx = (freeTop + freeBot) / 2;
      const T13 = 0.23087,
        camZp = 9.9,
        zw = 0.8 * fit;
      const yw = 0.1 + (1 - (2 * midPx) / VH) * T13 * (camZp - zw);
      /* 0.84, not the reference's 0.92: the opened book is yawed and rolled and
         sits nearer the camera than the plane this solves against, so its
         projected height overruns a band sized at 0.92 and clips the top. */
      const availW = (((freeBot - freeTop) * 0.84) / VH) * 2 * T13 * (camZp - zw);
      /* The reference capped this at 1.15, which was the real reason the opened
         book stayed small: the cap bound long before the free band did. Raised
         so the book fills the band it was already being sized against. */
      const s = clamp(availW / fit / 2.3, 0.5, 2.4);
      /* uses the lifted root offset, not the reference's raw -(1-fit)*0.55 */
      SLOTS.detail = {
        p: [0, (yw - bookRoot.position.y) / fit, 0.8],
        r: [-0.02, -0.4, 0.06],
        s,
      };
    } else {
      /* The reference's detail slot is expressed in root space, which here
         would inherit the hero fan's fit — so a 5-book tab would open a much
         smaller book than a 3-book tab. Its numbers are restated against the
         reference's own aspect fit and divided back out, so the opened book
         lands at the same world size and place in every tab. */
      const dwf = clamp(a / 1.75, 0.56, 1);
      SLOTS.detail = {
        p: [(-1.95 * dwf) / fit, -bookRoot.position.y / fit, (1.1 * dwf) / fit],
        r: [0.02, -0.52, 0.1],
        s: (1.26 * dwf) / fit,
      };
    }
  }

  function setTargets(b: BookRig, slot: Slot) {
    const s = b.springs;
    s.px.t = slot.p[0];
    s.py.t = slot.p[1];
    s.pz.t = slot.p[2];
    s.rx.t = slot.r[0];
    s.ry.t = slot.r[1];
    s.rz.t = slot.r[2];
    b.slotScale = slot.s;
  }

  const EASE = {
    hold: () => 1,
    outQuad: (t: number) => 1 - (1 - t) * (1 - t),
    outQuint: (t: number) => 1 - Math.pow(1 - t, 5),
    inOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  };

  const LIFT = 0.38,
    CLEAR = 4.2;

  function playY(b: BookRig, segs: YSeg[]) {
    b.exit = { segs, i: 0, t: 0 };
  }

  function stepY(b: BookRig, dt: number) {
    const ex = b.exit!;
    const s = b.springs;
    ex.t += dt;
    let seg = ex.segs[ex.i];
    while (seg && ex.t >= seg.d) {
      ex.t -= seg.d;
      s.py.v = seg.to;
      if (seg.end) seg.end();
      seg = ex.segs[++ex.i];
    }
    if (seg) s.py.v = seg.from + (seg.to - seg.from) * seg.ease(ex.t / seg.d);
    else b.exit = null;
    s.py.t = s.py.v;
    s.py.vel = 0;
  }

  function pinInPlace(b: BookRig) {
    const s = b.springs;
    s.px.t = s.px.v;
    s.pz.t = s.pz.v;
    s.rx.t = s.rx.v;
    s.ry.t = s.ry.v;
    s.rz.t = s.rz.v;
  }

  function sendOut(b: BookRig, i: number, delay: number) {
    const y0 = SLOTS.hero[i].p[1],
      here = b.springs.py.v,
      apex = y0 + LIFT;
    b.root.visible = true;
    pinInPlace(b);
    playY(b, [
      { d: delay, from: here, to: here, ease: EASE.hold },
      { d: 0.28, from: here, to: apex, ease: EASE.outQuad },
      {
        d: 0.9,
        from: apex,
        to: y0 - CLEAR,
        ease: EASE.inOutSine,
        end: () => {
          b.root.visible = false;
        },
      },
    ]);
  }

  function bringBack(b: BookRig, i: number, delay: number) {
    const here = b.springs.py.v;
    b.root.visible = true;
    pinInPlace(b);
    playY(b, [
      { d: delay, from: here, to: here, ease: EASE.hold },
      { d: 1.0, from: here, to: SLOTS.hero[i].p[1], ease: EASE.outQuint },
    ]);
  }

  function applyMode() {
    if (state.mode === "hero" || state.mode === "closing") {
      books.forEach((b, i) => setTargets(b, SLOTS.hero[i]));
    } else if (state.selected && SLOTS.detail) {
      setTargets(state.selected, SLOTS.detail);
    }
  }

  const camX = new Spring(0, 13, 6.5),
    camY = new Spring(0.1, 13, 6.5),
    camZ = new Spring(9.6, 13, 6.5);
  const lookX = new Spring(0, 13, 6.5),
    lookY = new Spring(0, 13, 6.5);
  const parX = new Spring(0, 60, 10),
    parY = new Spring(0, 60, 10);

  function camTo(mode: string) {
    if (mode === "detail") {
      camX.t = SLOTS.portrait ? 0 : -0.4;
      camZ.t = SLOTS.portrait ? 9.9 : 8.9;
      lookX.t = SLOTS.portrait ? 0 : -0.5;
      lookY.t = SLOTS.portrait ? 0 : 0.15;
    } else {
      camX.t = 0;
      camZ.t = 9.6;
      lookX.t = 0;
      lookY.t = 0;
    }
  }

  const pillX = new Spring(0, 190, 23),
    pillY = new Spring(0, 190, 23);
  let pillOn = false;
  function hidePill() {
    pill.classList.remove("is-on");
    pillOn = false;
  }

  const timers: ReturnType<typeof setTimeout>[] = [];
  const later = (fn: () => void, ms: number) => timers.push(setTimeout(fn, ms));

  function open(book: BookRig | null) {
    if (state.mode !== "hero" || !book) return;
    state.mode = "opening";
    state.selected = book;
    state.pillLock = null;
    state.kbIndex = -1;
    hidePill();
    book.exit = null;
    stage.classList.add("is-transit");
    o.onOpen(book.index); // React fills the detail panel
    computeSlots();

    let out = 0;
    books.forEach((b, i) => {
      if (b !== book) sendOut(b, i, out++ * 0.08);
    });

    later(() => {
      if (state.mode !== "opening" && state.mode !== "detail") return;
      book.orbY = RM ? 0 : -6.2832;
      book.orbYv = RM ? 0 : 3;
      book.orbPhase = "return";
      book.orbTarget = 0;
      book.orbXs.set(0);
      applyMode();
      camTo("detail");
    }, 760);
    later(() => leaves.activate(book), 1000);
    later(() => {
      if (state.mode === "opening") {
        stage.classList.add("is-detail");
        state.mode = "detail";
        o.onDetailShown();
      }
    }, 1400);
  }

  function close() {
    if (state.mode !== "detail") return;
    state.mode = "closing";
    stage.classList.remove("is-detail");
    leaves.deactivate();
    orbit.drag = false;
    const b = state.selected;
    if (b) {
      b.orbTarget = Math.round(b.orbY / 6.2832) * 6.2832 + 6.2832;
      b.orbYv = Math.max(b.orbYv, 3);
      b.orbPhase = "return";
      b.orbXs.t = 0;
    }
    later(() => {
      stage.classList.remove("is-transit");
      o.onShelfVisible();
      applyMode();
      camTo("hero");
      let back = 0;
      books.forEach((bk, i) => {
        if (bk !== b) bringBack(bk, i, 0.85 + back++ * 0.1);
      });
    }, 250);
    later(() => {
      if (state.mode === "closing") {
        state.mode = "hero";
        state.selected = null;
        o.onClosed();
      }
    }, 1600);
  }

  /* ---------- 7. Input (reference §7), stage-relative ---------- */
  const ptr = {
    ndcX: 0,
    ndcY: 0,
    cx: VW / 2,
    cy: VH / 2,
    lastX: 0,
    lastY: 0,
    down: false,
    downX: 0,
    downY: 0,
    moved: 0,
    t0: 0,
    type: "mouse",
    seen: false,
    id: null as number | null,
  };
  const isTouch = () => ptr.type === "touch" || ptr.type === "pen";
  let dragBook: BookRig | null = null;
  let rayBook: BookRig | null = null;
  const orbit = { drag: false, dxAcc: 0, dyAcc: 0 };
  const ray = new THREE.Raycaster();
  const tmpV = new THREE.Vector3();
  /* r185: Raycaster.setFromCamera requires a Vector2 (r128 took any {x,y}) */
  const ndc = new THREE.Vector2();

  /* the reference used clientX/clientY against the viewport; here every pointer
     coordinate is first made relative to the canvas box */
  const localX = (e: PointerEvent) => e.clientX - canvas.getBoundingClientRect().left;
  const localY = (e: PointerEvent) => e.clientY - canvas.getBoundingClientRect().top;

  const onContextMenu = (e: Event) => e.preventDefault();
  const onPointerLeave = () => {
    rayBook = null;
    state.pillLock = null;
    state.kbIndex = -1;
  };

  const onPointerMove = (e: PointerEvent) => {
    if (ptr.id !== null && e.pointerId !== ptr.id) return;
    const r = canvas.getBoundingClientRect();
    const lx = e.clientX - r.left,
      ly = e.clientY - r.top;
    const dxN = (lx - ptr.lastX) / VW;
    const dyN = (ly - ptr.lastY) / VH;
    ptr.lastX = lx;
    ptr.lastY = ly;
    ptr.cx = lx;
    ptr.cy = ly;
    ptr.ndcX = (lx / VW) * 2 - 1;
    ptr.ndcY = -(ly / VH) * 2 + 1;
    ptr.type = e.pointerType || "mouse";
    ptr.seen = true;
    if (state.mode === "detail") leaves.push(dxN, dyN);
    if (ptr.down && dragBook) {
      ptr.moved += Math.abs(dxN * VW) + Math.abs(dyN * VH);
      dragBook.springs.drag.t = clamp(((ptr.downX - lx) / VW) * 3.4, 0, 1.0);
    }
    if (ptr.down && orbit.drag) {
      orbit.dxAcc += dxN;
      orbit.dyAcc += dyN;
      ptr.moved += Math.abs(dxN * VW) + Math.abs(dyN * VH);
    }
  };

  /* capture keeps the drag alive when the finger leaves the canvas. It throws
     NotFoundError for a pointer id the browser is not currently tracking, which
     must not take the gesture down with it. */
  const capture = (id: number) => {
    try {
      canvas.setPointerCapture(id);
    } catch {
      /* no capture available; the window-level pointerup still ends the drag */
    }
  };

  const onPointerDown = (e: PointerEvent) => {
    if (ptr.id !== null) return;
    ptr.id = e.pointerId;
    const lx = localX(e),
      ly = localY(e);
    ptr.cx = lx;
    ptr.cy = ly;
    ptr.lastX = lx;
    ptr.lastY = ly;
    ptr.ndcX = (lx / VW) * 2 - 1;
    ptr.ndcY = -(ly / VH) * 2 + 1;
    ptr.type = e.pointerType || "mouse";
    ptr.seen = true;
    castRay();
    if (state.mode === "hero" && rayBook) {
      ptr.down = true;
      dragBook = rayBook;
      ptr.downX = lx;
      ptr.downY = ly;
      ptr.moved = 0;
      ptr.t0 = performance.now();
      capture(e.pointerId);
    } else if (state.mode === "detail" && rayBook === state.selected) {
      ptr.down = true;
      orbit.drag = true;
      orbit.dxAcc = 0;
      orbit.dyAcc = 0;
      ptr.moved = 0;
      ptr.t0 = performance.now();
      capture(e.pointerId);
    } else {
      state.pillLock = null;
      state.kbIndex = -1;
    }
  };

  const onPointerUp = (e: PointerEvent) => {
    if (ptr.id !== null && e.pointerId !== ptr.id) return;
    ptr.id = null;
    orbit.drag = false;
    if (dragBook) {
      const slop = isTouch() ? 26 : 14;
      const limit = isTouch() ? 650 : 450;
      const wasDrag = ptr.moved > slop;
      dragBook.springs.drag.t = 0;
      if (!wasDrag && state.mode === "hero" && performance.now() - ptr.t0 < limit) open(dragBook);
      dragBook = null;
    }
    ptr.down = false;
    if (isTouch()) rayBook = null;
  };

  const cancelPointer = (e?: PointerEvent) => {
    if (e && ptr.id !== null && e.pointerId !== ptr.id) return;
    ptr.id = null;
    ptr.down = false;
    orbit.drag = false;
    if (dragBook) {
      dragBook.springs.drag.t = 0;
      dragBook = null;
    }
    if (isTouch()) rayBook = null;
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") close();
    if (state.mode !== "hero") return;
    if (!stage.contains(document.activeElement)) return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      const d = e.key === "ArrowRight" ? 1 : -1;
      state.kbIndex = ((state.kbIndex < 0 ? (d > 0 ? -1 : 1) : state.kbIndex) + d + N) % N;
      state.pillLock = null;
      e.preventDefault();
    }
    if (e.key === "Enter" && state.hovered) open(state.hovered);
  };

  function castRay() {
    ndc.set(ptr.ndcX, ptr.ndcY);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(hitMeshes, false);
    if (hits.length) {
      rayBook = bookByHit(hits[0].object);
      if (rayBook) {
        const lp = rayBook.hit.worldToLocal(hits[0].point.clone());
        rayBook.hitEdge = clamp((lp.x / 0.9) * 0.5 + 0.5, 0, 1);
      }
    } else {
      rayBook = null;
    }
  }

  canvas.addEventListener("contextmenu", onContextMenu);
  canvas.addEventListener("pointerleave", onPointerLeave);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", cancelPointer);
  canvas.addEventListener("lostpointercapture", cancelPointer as EventListener);
  window.addEventListener("keydown", onKeyDown);

  /* ---------- 8. Frame loop (reference §8) ---------- */
  /* r185: THREE.Clock is deprecated in favour of THREE.Timer. Timer.update()
     then getDelta()/getElapsed() gives the same per-frame numbers the reference
     read off Clock.getDelta()/elapsedTime. */
  const timer = new THREE.Timer();
  timer.connect(document);
  const idle = RM ? 0 : 1;

  function screenPos(b: BookRig) {
    b.root.getWorldPosition(tmpV).project(camera);
    b.scr.x = (tmpV.x * 0.5 + 0.5) * VW;
    b.scr.y = (-tmpV.y * 0.5 + 0.5) * VH;
  }

  function tickBook(b: BookRig, dt: number, t: number) {
    const s = b.springs;
    const isHov = state.hovered === b;
    const inDetail = state.mode === "detail" && state.selected === b;
    const orbitActive = state.selected === b && state.mode !== "hero";

    let activity = 0;
    if (orbitActive) {
      if (orbit.drag && inDetail) {
        const step = orbit.dxAcc * 6.5;
        orbit.dxAcc = 0;
        b.orbY += step;
        b.orbYv = clamp(b.orbYv * 0.5 + (step / Math.max(dt, 0.001)) * 0.5, -14, 14);
        b.orbXs.t = clamp(b.orbXs.t + orbit.dyAcc * 3.2, -0.55, 0.55);
        orbit.dyAcc = 0;
        b.orbPhase = "drag";
      } else {
        b.orbXs.t = 0;
        if (b.orbPhase === "drag") {
          if (Math.abs(b.orbYv) > 0.6) {
            b.orbPhase = "spin";
          } else {
            b.orbPhase = "return";
            b.orbTarget = Math.round((b.orbY + b.orbYv * 1.2) / Math.PI) * Math.PI;
          }
        }
        if (b.orbPhase === "spin") {
          b.orbYv *= Math.exp(-0.9 * dt);
          b.orbY += b.orbYv * dt;
          if (Math.abs(b.orbYv) < 0.5) {
            b.orbPhase = "return";
            b.orbTarget = Math.round((b.orbY + b.orbYv * 1.2) / Math.PI) * Math.PI;
          }
        } else if (b.orbPhase === "return") {
          const acc = 16 * (b.orbTarget - b.orbY) - 8 * b.orbYv;
          b.orbYv += acc * dt;
          b.orbY += b.orbYv * dt;
          if (Math.abs(b.orbTarget - b.orbY) < 0.002 && Math.abs(b.orbYv) < 0.01) {
            b.orbY = b.orbTarget;
            b.orbYv = 0;
            b.orbPhase = "idle";
          }
        }
      }
      const distRest = Math.abs(b.orbY - Math.round(b.orbY / 6.2832) * 6.2832);
      activity = clamp(Math.abs(b.orbYv) * 1.5 + (orbit.drag ? 1 : 0) + distRest * 2, 0, 1);
    }
    b.orbXs.update(dt);

    let coverBase = 0;
    if (inDetail)
      coverBase = 0.02 + (0.13 + Math.sin(t * 0.8 + b.phase) * 0.015 * idle) * (1 - activity);
    const fan = orbitActive ? clamp(b.orbYv * 0.16, 0, 0.75) : 0;
    const fanB = orbitActive ? clamp(-b.orbYv * 0.16, 0, 0.75) : 0;
    let coverBBase = 0;
    if (inDetail) {
      const nearestBack = Math.round((b.orbY - Math.PI) / 6.2832) * 6.2832 + Math.PI;
      const activityB = clamp(
        Math.abs(b.orbYv) * 1.5 + (orbit.drag ? 1 : 0) + Math.abs(b.orbY - nearestBack) * 2,
        0,
        1,
      );
      coverBBase = (0.1 + Math.sin(t * 0.8 + b.phase + 1.7) * 0.012 * idle) * (1 - activityB);
    }

    if (isHov && ptr.seen && state.mode === "hero") {
      const dxN = (ptr.cx - b.scr.x) / (VW * 0.25);
      const dyN = (b.scr.y - ptr.cy) / (VH * 0.3);
      s.tiltY.t = clamp(dxN * 0.28, -0.15, 0.15);
      s.tiltX.t = clamp(-dyN * 0.1, -0.09, 0.1);
      s.lift.t = 0.3;
      const edge = b.hitEdge != null ? b.hitEdge : 0.5;
      coverBase = 0.085 + edge * 0.16 + clamp(dyN, 0, 1) * 0.09;
    } else {
      s.tiltY.t = 0;
      s.tiltX.t = 0;
      s.lift.t = 0;
    }
    s.cover.t = coverBase + fan;
    s.coverB.t = coverBBase + fanB;
    s.sc.t = b.slotScale * (isHov && state.mode === "hero" ? 1.09 : 1);

    s.px.update(dt);
    if (b.exit) stepY(b, dt);
    else s.py.update(dt);
    s.pz.update(dt);
    s.rx.update(dt);
    s.ry.update(dt);
    s.rz.update(dt);
    s.sc.update(dt);
    s.tiltX.update(dt);
    s.tiltY.update(dt);
    s.lift.update(dt);
    s.cover.update(dt);
    s.coverB.update(dt);
    s.drag.update(dt);

    b.float.position.y = Math.sin(t * 0.7 + b.phase) * 0.035 * idle;
    b.float.rotation.z = Math.sin(t * 0.9 + b.phase * 1.7) * 0.006 * idle;

    b.root.position.set(s.px.v, s.py.v, s.pz.v + s.lift.v);
    const sway = inDetail ? Math.sin(t * 0.45 + b.phase) * 0.035 * idle * (1 - activity) : 0;
    const swing = clamp(-s.px.vel * 0.12, -0.5, 0.5);
    b.root.rotation.set(
      s.rx.v + s.tiltX.v + b.orbXs.v,
      s.ry.v + s.tiltY.v + b.orbY + sway + swing,
      s.rz.v,
    );
    b.root.scale.setScalar(Math.max(s.sc.v, 0.001));

    const ang = Math.max(0, s.cover.v + s.drag.v);
    const angB = Math.max(0, s.coverB.v);
    b.pivot.rotation.y = -ang;
    b.pivot.position.z = PIVOT_Z + ang * 0.022;
    b.backPivot.rotation.y = angB;
    b.backPivot.position.z = BPIVOT_Z - angB * 0.022;
    b.spine.rotation.y = -ang * 0.16 + angB * 0.16;
    b.block.scale.z = 1 - (ang + angB) * 0.05;
    b.block.position.z = BLOCK_Z - ang * 0.006 + angB * 0.006;
    for (let i = 0; i < PAGE_N; i++) {
      const fl = idle * Math.sin(t * 1.15 + b.phase + i * 0.6) * 0.006 * (1 - i / PAGE_N);
      b.pages[i].rotation.y = -(ang * b.pageF[i] + Math.max(0, fl));
    }
    for (let i = 0; i < 6; i++) b.pagesB[i].rotation.y = angB * b.pageFB[i];
  }

  let raf = 0;
  function animate() {
    raf = requestAnimationFrame(animate);
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.05);
    const t = timer.getElapsed();

    if (ptr.seen && (ptr.type === "mouse" || ptr.down)) castRay();
    let hov: BookRig | null = null;
    if (state.mode === "hero") {
      hov = rayBook || state.pillLock || (state.kbIndex >= 0 ? books[state.kbIndex] : null);
    } else if (state.mode === "detail") {
      hov = rayBook === state.selected ? rayBook : null;
    }
    state.hovered = hov;
    let cur = "default";
    if (state.mode === "hero" && hov) cur = "pointer";
    else if (state.mode === "detail" && state.selected) {
      if (orbit.drag) cur = "grabbing";
      else if (rayBook === state.selected) cur = "grab";
    }
    canvas.style.cursor = cur;

    books.forEach((b) => screenPos(b));
    books.forEach((b) => tickBook(b, dt, t));
    leaves.update(dt, t);

    parX.t = RM ? 0 : ptr.ndcX * 0.02;
    parY.t = RM ? 0 : -ptr.ndcY * 0.012;
    bookRoot.rotation.y = parX.update(dt);
    bookRoot.rotation.x = parY.update(dt);

    camera.position.set(camX.update(dt), camY.update(dt), camZ.update(dt));
    camera.lookAt(lookX.update(dt), lookY.update(dt), 0);

    if (
      state.mode === "hero" &&
      state.hovered &&
      ptr.seen &&
      !isTouch() &&
      !(ptr.down && ptr.moved > 14)
    ) {
      const tx = ptr.cx,
        ty = ptr.cy + 34;
      if (!pillOn) {
        pillX.set(tx);
        pillY.set(ty);
        pillOn = true;
      }
      pillX.t = tx;
      pillY.t = ty;
      /* composited: the spring drives a translate3d on the anchor, and the
         slip itself only ever animates transform/opacity via .is-on */
      pillAnchor.style.transform = `translate3d(${pillX.update(dt)}px, ${pillY.update(dt)}px, 0)`;
      pill.classList.add("is-on");
    } else {
      hidePill();
    }

    renderer.render(scene, camera);
  }

  /* ---------- 9. Entrance + resize (reference §9) ---------- */
  computeSlots();
  books.forEach((b, i) => {
    const slot = SLOTS.hero[i];
    const s = b.springs;
    s.px.set(slot.p[0]);
    s.py.set(slot.p[1] - 3.9);
    s.pz.set(slot.p[2]);
    s.rx.set(slot.r[0]);
    s.ry.set(slot.r[1]);
    s.rz.set(slot.r[2] + 0.35 * Math.sign(slot.p[0] - 0.3 || -1));
    s.sc.set(slot.s);
    b.slotScale = slot.s;
    later(() => setTargets(b, slot), 240 + i * 150);
  });
  camTo("hero");

  function relayout() {
    VW = Math.max(1, stage.clientWidth);
    VH = Math.max(1, stage.clientHeight);
    renderer.setSize(VW, VH, false);
    camera.aspect = VW / VH;
    camera.updateProjectionMatrix();
    computeSlots();
    applyMode();
    camTo(state.mode === "detail" || state.mode === "opening" ? "detail" : "hero");
  }

  const ro = new ResizeObserver(relayout);
  ro.observe(stage);

  animate();

  return {
    close,
    dispose() {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      timer.disconnect();
      ro.disconnect();
      canvas.removeEventListener("contextmenu", onContextMenu);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", cancelPointer);
      canvas.removeEventListener("lostpointercapture", cancelPointer as EventListener);
      window.removeEventListener("keydown", onKeyDown);
      /* every geometry / material / texture created above was tracked, so the
         scene leaves nothing behind when the route unmounts */
      disposables.forEach((d) => d.dispose());
      disposables.clear();
      scene.environment = null;
      scene.clear();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}

/* =========================================================================
   React wrapper
   ========================================================================= */
interface BookShowcaseProps {
  books: ShowcaseBook[];
  ariaLabel: string;
  /** Extra classes on the stage, e.g. `bs-stage--full` for a full-viewport section. */
  className?: string;
  /** Label on the single action pill. One string to change if the tracker moves. */
  actionLabel?: string;
  /**
   * Chrome drawn over the top of the stage — page title, tab bar. Lives inside
   * the stage so it reads as one unit, the way the reference overlays its nav
   * on the scene rather than stacking a separate band above it.
   */
  overlay?: ReactNode;
}

export default function BookShowcase({
  books,
  ariaLabel,
  className = "",
  actionLabel = "View on Goodreads",
  overlay,
}: BookShowcaseProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pillAnchorRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLButtonElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const [selected, setSelected] = useState<ShowcaseBook | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const stage = stageRef.current,
      canvas = canvasRef.current,
      panel = panelRef.current,
      pillAnchor = pillAnchorRef.current,
      pill = pillRef.current;
    if (!stage || !canvas || !panel || !pillAnchor || !pill) return;

    let cancelled = false;
    /* wait for Jost / Cormorant Garamond before painting cover canvases,
       otherwise the first paint bakes the fallback face into the texture */
    const fontsReady = document.fonts?.ready ?? Promise.resolve();
    fontsReady.then(() => {
      if (cancelled) return;
      try {
        engineRef.current = createShowcase({
          canvas,
          stage,
          panel,
          pillAnchor,
          pill,
          books,
          onOpen: (i) => setSelected(books[i]),
          onDetailShown: () => {},
          /* The reference re-entered its stage word here. There is no stage
             word any more, so nothing to do — the engine still calls it. */
          onShelfVisible: () => {},
          onClosed: () => setSelected(null),
        });
      } catch (err) {
        console.error("BookShowcase: WebGL init failed", err);
        setFailed(true);
      }
    });

    return () => {
      cancelled = true;
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, [books]);

  return (
    <div
      ref={stageRef}
      className={`bs-stage ${className}`.trim()}
      role="group"
      aria-label={ariaLabel}
    >
      <canvas ref={canvasRef} className="bs-canvas" />

      {overlay && <div className="bs-overlay">{overlay}</div>}

      <div ref={pillAnchorRef} className="bs-pill-anchor" aria-hidden="true">
        <button ref={pillRef} type="button" className="bs-pill" tabIndex={-1}>
          Open
        </button>
      </div>

      <p className="bs-hint">Click a book to open · drag to rotate</p>


      <button
        type="button"
        className="bs-back"
        aria-label="Close book"
        onClick={() => engineRef.current?.close()}
      >
        <svg className="bs-back-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18.3 5.71 12 12.01l-6.3-6.3-1.41 1.42 6.3 6.29-6.3 6.29 1.41 1.42 6.3-6.3 6.3 6.3 1.41-1.42-6.29-6.29 6.29-6.29z" />
        </svg>
      </button>

      {/* Five children, in this order — .bs-dp staggers them by :nth-child. */}
      <div ref={panelRef} className="bs-dp" aria-live="polite">
        <h3 className="bs-dp-title">{selected?.title ?? ""}</h3>
        <p className="bs-dp-desc">{selected?.desc ?? ""}</p>
        <div className="bs-dp-meta">
          <span
            className={`bs-dp-status${
              selected ? ` bs-dp-status--${selected.status.toLowerCase().replace(/\s+/g, "-")}` : ""
            }`}
          >
            {selected?.status ?? ""}
          </span>
          <span className="bs-dp-sep" />
          <span className="bs-dp-src">{selected?.author ?? ""}</span>
        </div>
        <div className="bs-dp-rule" />
        <div className="bs-dp-actions">
          {/* Reference had "English" / "Buy Now" / "Buy Audiobook" / save.
              One real action here: where I track the book. */}
          <a
            className="bs-action"
            href={selected?.trackUrl ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            tabIndex={selected ? 0 : -1}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
              <path d="M6 4h9a2 2 0 012 2v14l-6.5-4L4 20V6a2 2 0 012-2z" />
            </svg>
            <span>{actionLabel}</span>
          </a>
        </div>
      </div>

      {failed && (
        <div className="bs-fail">
          This showcase needs WebGL, which your browser blocked or does not support.
        </div>
      )}
    </div>
  );
}
