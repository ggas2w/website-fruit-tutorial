"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useSpring,
  useTransform,
  type PanInfo,
  type Variants,
} from "framer-motion";
import {
  FLAVOR_ORDER,
  FLAVORS,
  LABEL_WIDTH_PX,
  MAIN_SPRING,
  type FruitConfig,
  type LeafSlot,
} from "../data/flavors";
import styles from "./CidraLanding.module.css";

/** Onde, dentro da altura da lata, o rótulo é desenhado (fração 0-1). */
const LABEL_BAND_TOP = 0.3;
const LABEL_BAND_HEIGHT = 0.46;
/** Largura de cada fatia desenhada no canvas. */
const SLICE_PX = 4;
/** Fade nas bordas esquerda/direita do canvas, em px. */
const EDGE_FADE_PX = 30;
/** Spring (mais leve/rápida) usada só pro parallax do mouse. */
const PARALLAX_SPRING = { stiffness: 55, damping: 14, mass: 0.6 };
/** Distância de arraste, em px, pra trocar de sabor. */
const DRAG_THRESHOLD = 70;
const DRAG_VELOCITY_THRESHOLD = 500;

function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}

/** Menor deslocamento (em número de sabores) entre dois índices num ciclo de tamanho n. */
function shortestDelta(fromMod: number, toIndex: number, n: number) {
  let diff = mod(toIndex - fromMod, n);
  if (diff > n / 2) diff -= n;
  return diff;
}

const fruitVariants: Variants = {
  enter: (direction: number) => ({
    y: direction >= 0 ? "-70vh" : "70vh",
    opacity: 0,
  }),
  center: { y: "0vh", opacity: 1 },
  exit: (direction: number) => ({
    y: direction >= 0 ? "70vh" : "-70vh",
    opacity: 0,
  }),
};

function Fruit({ fruit }: { fruit: FruitConfig }) {
  const floatDistance = fruit.floatDistance ?? 13;
  return (
    <motion.div
      className={styles.fruitOuter}
      style={{
        left: `${fruit.xPct}%`,
        top: `${fruit.yPct}%`,
        width: fruit.widthPx,
        zIndex: fruit.depth === "front" ? 30 : 5,
      }}
      variants={fruitVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={MAIN_SPRING}
    >
      <motion.img
        src={fruit.src}
        alt=""
        draggable={false}
        className={styles.fruitImg}
        style={{
          filter: fruit.blurPx ? `blur(${fruit.blurPx}px)` : undefined,
        }}
        initial={{ y: 0, rotate: fruit.rotationDeg }}
        animate={{
          y: [0, -floatDistance, 0],
          rotate: [fruit.rotationDeg, fruit.rotationDeg + 6, fruit.rotationDeg],
        }}
        transition={{
          duration: fruit.floatDuration,
          delay: fruit.floatDelay ?? 0,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </motion.div>
  );
}

function Leaf({ slot }: { slot: LeafSlot }) {
  return (
    <motion.img
      src="/leaf.png"
      alt=""
      draggable={false}
      className={styles.leaf}
      animate={{
        left: `${slot.xPct}%`,
        top: `${slot.yPct}%`,
        rotate: slot.rotationDeg,
        width: slot.widthPx,
        scaleX: slot.mirrored ? -1 : 1,
      }}
      transition={MAIN_SPRING}
    />
  );
}

export default function CidraLanding() {
  const flavorIndexRef = useRef(0);
  const [flavorIndex, setFlavorIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const currentFlavorId = FLAVOR_ORDER[mod(flavorIndex, FLAVOR_ORDER.length)];
  const flavor = FLAVORS[currentFlavorId];

  const goTo = useCallback((next: number) => {
    setDirection(next > flavorIndexRef.current ? 1 : next < flavorIndexRef.current ? -1 : 1);
    flavorIndexRef.current = next;
    setFlavorIndex(next);
  }, []);
  const goNext = useCallback(() => goTo(flavorIndexRef.current + 1), [goTo]);
  const goPrev = useCallback(() => goTo(flavorIndexRef.current - 1), [goTo]);

  // ---- teclado ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

  // ---- spring principal: dirige rótulo, fundo e palavra na mesma proporção ----
  const progress = useSpring(0, MAIN_SPRING);
  useEffect(() => {
    progress.set(flavorIndex);
  }, [flavorIndex, progress]);

  const stripX = useTransform(progress, (v) => `${-v * 100}%`);

  // ---- parallax de mouse ----
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const px = useSpring(mouseX, PARALLAX_SPRING);
  const py = useSpring(mouseY, PARALLAX_SPRING);
  const fruitParallaxX = useTransform(px, (v) => v * 18);
  const fruitParallaxY = useTransform(py, (v) => v * 12);
  const canParallaxX = useTransform(px, (v) => v * -10);
  const canParallaxY = useTransform(py, (v) => v * -6);

  const onPointerMoveStage = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      mouseX.set((e.clientX / w - 0.5) * 2);
      mouseY.set((e.clientY / h - 0.5) * 2);
    },
    [mouseX, mouseY]
  );

  // ---- pré-carrega lata e rótulos com new Image() ----
  const labelImgsRef = useRef<HTMLImageElement[]>([]);
  const [imagesReady, setImagesReady] = useState(false);
  const [canNatural, setCanNatural] = useState({ w: 9, h: 16 });

  useEffect(() => {
    let cancelled = false;
    let loaded = 0;
    const total = 1 + FLAVOR_ORDER.length;
    const check = () => {
      loaded += 1;
      if (loaded === total && !cancelled) setImagesReady(true);
    };

    const can = new Image();
    can.onload = () => {
      if (!cancelled) {
        setCanNatural({ w: can.naturalWidth, h: can.naturalHeight });
      }
      check();
    };
    can.src = "/can-photo.png";

    labelImgsRef.current = FLAVOR_ORDER.map((id) => {
      const img = new Image();
      img.onload = check;
      img.src = FLAVORS[id].labelSrc;
      return img;
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // ---- canvas ----
  const canWrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canSize, setCanSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = canWrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const box = entries[0].contentRect;
      setCanSize({ width: box.width, height: box.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !imagesReady || canSize.width === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const { width, height } = canSize;
    const pxW = Math.max(1, Math.round(width * dpr));
    const pxH = Math.max(1, Math.round(height * dpr));
    if (canvas.width !== pxW) canvas.width = pxW;
    if (canvas.height !== pxH) canvas.height = pxH;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const bandTop = height * LABEL_BAND_TOP;
    const bandH = height * LABEL_BAND_HEIGHT;
    const totalStripW = LABEL_WIDTH_PX * FLAVOR_ORDER.length;
    const centerShift = (LABEL_WIDTH_PX - width) / 2;
    const offsetPx = progress.get() * LABEL_WIDTH_PX;

    for (let x = 0; x < width; x += SLICE_PX) {
      const raw = offsetPx + x - centerShift;
      const stripPos = mod(raw, totalStripW);
      const idx = Math.floor(stripPos / LABEL_WIDTH_PX);
      const img = labelImgsRef.current[idx];
      if (!img || !img.complete || img.naturalWidth === 0) continue;

      const localX = stripPos - idx * LABEL_WIDTH_PX;
      const scale = img.naturalWidth / LABEL_WIDTH_PX;
      const sx = localX * scale;
      const sw = Math.max(1, SLICE_PX * scale);
      const dw = Math.min(SLICE_PX, width - x);

      ctx.drawImage(img, sx, 0, sw, img.naturalHeight, x, bandTop, dw, bandH);
    }

    // fade nas bordas: some com o rótulo revelando a sombra natural da lata
    ctx.globalCompositeOperation = "destination-out";

    const gl = ctx.createLinearGradient(0, 0, EDGE_FADE_PX, 0);
    gl.addColorStop(0, "rgba(0,0,0,1)");
    gl.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gl;
    ctx.fillRect(0, bandTop, EDGE_FADE_PX, bandH);

    const gr = ctx.createLinearGradient(width - EDGE_FADE_PX, 0, width, 0);
    gr.addColorStop(0, "rgba(0,0,0,0)");
    gr.addColorStop(1, "rgba(0,0,0,1)");
    ctx.fillStyle = gr;
    ctx.fillRect(width - EDGE_FADE_PX, bandTop, EDGE_FADE_PX, bandH);

    ctx.globalCompositeOperation = "source-over";
  }, [imagesReady, canSize, progress]);

  useMotionValueEvent(progress, "change", draw);
  useEffect(() => {
    draw();
  }, [draw]);

  // ---- arrastar a lata pra trocar de sabor ----
  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      if (info.offset.x < -DRAG_THRESHOLD || info.velocity.x < -DRAG_VELOCITY_THRESHOLD) {
        goNext();
      } else if (info.offset.x > DRAG_THRESHOLD || info.velocity.x > DRAG_VELOCITY_THRESHOLD) {
        goPrev();
      }
    },
    [goNext, goPrev]
  );

  const currentMod = mod(flavorIndex, FLAVOR_ORDER.length);
  const backFruits = useMemo(() => flavor.fruits.filter((f) => f.depth === "back"), [flavor]);
  const frontFruits = useMemo(() => flavor.fruits.filter((f) => f.depth === "front"), [flavor]);

  return (
    <div
      className={styles.stage}
      style={{ backgroundColor: flavor.background }}
      onPointerMove={onPointerMoveStage}
    >
      <h1 className={styles.srOnly}>{flavor.label} cider</h1>

      {/* fundo em painéis, com transição de cor */}
      <motion.div className={styles.bgStrip} style={{ x: stripX }}>
        {FLAVOR_ORDER.map((id, i) => (
          <div
            key={id}
            className={styles.bgPanel}
            style={{ left: `${i * 100}%`, backgroundColor: FLAVORS[id].background }}
          />
        ))}
      </motion.div>

      {/* palavra gigante, na mesma proporção da faixa do rótulo */}
      <motion.div className={styles.wordStrip} style={{ x: stripX }}>
        {FLAVOR_ORDER.map((id, i) => (
          <div key={id} className={styles.wordPanel} style={{ left: `${i * 100}%` }}>
            <span className={styles.word}>{FLAVORS[id].label}</span>
          </div>
        ))}
      </motion.div>

      {/* frutas atrás da lata */}
      <motion.div className={styles.fruitLayer} style={{ x: fruitParallaxX, y: fruitParallaxY }}>
        <AnimatePresence custom={direction} initial={false}>
          {backFruits.map((f) => (
            <Fruit key={`${currentFlavorId}-${f.id}`} fruit={f} />
          ))}
        </AnimatePresence>
      </motion.div>

      {/* folhas + lata, com parallax contrário */}
      <motion.div className={styles.canParallax} style={{ x: canParallaxX, y: canParallaxY }}>
        <Leaf slot={flavor.leaves[0]} />

        <motion.div
          ref={canWrapRef}
          className={styles.canWrap}
          style={{ aspectRatio: `${canNatural.w} / ${canNatural.h}` }}
          drag="x"
          dragElastic={0.2}
          dragConstraints={{ left: 0, right: 0 }}
          dragMomentum={false}
          onDragEnd={handleDragEnd}
          onTap={() => goNext()}
          whileTap={{ scale: 0.97 }}
        >
          <img src="/can-photo.png" alt="" className={styles.canBase} draggable={false} />
          <canvas ref={canvasRef} className={styles.canCanvas} />
          <img src="/can-photo.png" alt="" className={styles.canShade} draggable={false} />
        </motion.div>

        <Leaf slot={flavor.leaves[1]} />
      </motion.div>

      {/* frutas na frente da lata, fora de foco */}
      <div className={styles.fruitLayerFront}>
        <AnimatePresence custom={direction} initial={false}>
          {frontFruits.map((f) => (
            <Fruit key={`${currentFlavorId}-${f.id}`} fruit={f} />
          ))}
        </AnimatePresence>
      </div>

      <p className={styles.hint}>Arraste, clique na lata ou use as setas</p>

      <div className={styles.dots}>
        {FLAVOR_ORDER.map((id, i) => (
          <button
            key={id}
            type="button"
            aria-label={`Ir para ${FLAVORS[id].label}`}
            className={styles.dot}
            data-active={id === currentFlavorId}
            onClick={() => goTo(flavorIndexRef.current + shortestDelta(currentMod, i, FLAVOR_ORDER.length))}
          />
        ))}
      </div>
    </div>
  );
}
