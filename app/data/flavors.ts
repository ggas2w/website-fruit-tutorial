// Configuração de cada sabor da cidra.
// Ajuste posições, cores, blur e rotação aqui — a lógica de animação
// (em CidraLanding.tsx) não precisa ser tocada para mudar o visual.

import type { Transition } from "framer-motion";

/** Largura nativa de cada rótulo plano, em px. */
export const LABEL_WIDTH_PX = 636;

/** Spring compartilhada por todas as transições de troca de sabor
 * (progresso do rótulo/fundo/palavra, reposicionamento das folhas,
 * entrada/saída das frutas). */
export const MAIN_SPRING: Transition = {
  type: "spring",
  duration: 1.2,
  bounce: 0.24,
};

export type FlavorId = "pear" | "apple" | "exotic";

/** Ordem física dos sabores na faixa contínua do rótulo (e no fundo/palavra). */
export const FLAVOR_ORDER: FlavorId[] = ["pear", "apple", "exotic"];

export interface FruitConfig {
  /** Identificador único dentro do sabor (usado como key). */
  id: string;
  /** Caminho do PNG a partir de /public. */
  src: string;
  /** Posição horizontal, em % da tela (centro da fruta). */
  xPct: number;
  /** Posição vertical, em % da tela (centro da fruta). */
  yPct: number;
  /** Largura renderizada, em px. */
  widthPx: number;
  /** Rotação base, em graus. */
  rotationDeg: number;
  /** "front" = na frente da lata (geralmente com blur); "back" = atrás. */
  depth: "front" | "back";
  /** Desfoque em px, para frutas fora de foco em primeiro plano. */
  blurPx?: number;
  /** Duração do loop de flutuação, em segundos (varia por fruta). */
  floatDuration: number;
  /** Atraso do loop de flutuação, em segundos, pra dessincronizar. */
  floatDelay?: number;
  /** Distância vertical do "flutuar", em px (default 13). */
  floatDistance?: number;
}

export interface LeafSlot {
  xPct: number;
  yPct: number;
  widthPx: number;
  rotationDeg: number;
  mirrored: boolean;
}

export interface FlavorConfig {
  id: FlavorId;
  /** Palavra gigante exibida atrás da lata. */
  label: string;
  /** Cor de fundo do painel deste sabor. */
  background: string;
  /** Rótulo plano (636px) usado na faixa do canvas. */
  labelSrc: string;
  fruits: FruitConfig[];
  /** As duas folhas grudadas na lata para este sabor. */
  leaves: [LeafSlot, LeafSlot];
}

export const FLAVORS: Record<FlavorId, FlavorConfig> = {
  pear: {
    id: "pear",
    label: "Pear",
    background: "#c9e78a",
    labelSrc: "/label-pear.png",
    fruits: [
      {
        id: "pear-big-left",
        src: "/pear-big.png",
        xPct: 12,
        yPct: 20,
        widthPx: 240,
        rotationDeg: -10,
        depth: "back",
        floatDuration: 5.4,
      },
      {
        id: "pear-small-left",
        src: "/pear-small.png",
        xPct: 18,
        yPct: 74,
        widthPx: 120,
        rotationDeg: 16,
        depth: "back",
        floatDuration: 4.6,
        floatDelay: 0.4,
      },
      {
        id: "pear-big-front-right",
        src: "/pear-big.png",
        xPct: 84,
        yPct: 66,
        widthPx: 200,
        rotationDeg: 12,
        depth: "front",
        blurPx: 5,
        floatDuration: 6.1,
      },
      {
        id: "pear-small-right",
        src: "/pear-small.png",
        xPct: 88,
        yPct: 16,
        widthPx: 100,
        rotationDeg: -18,
        depth: "back",
        floatDuration: 5.0,
        floatDelay: 0.8,
      },
    ],
    leaves: [
      { xPct: 38, yPct: 10, widthPx: 130, rotationDeg: -20, mirrored: false },
      { xPct: 64, yPct: 84, widthPx: 150, rotationDeg: 205, mirrored: true },
    ],
  },

  apple: {
    id: "apple",
    label: "Apple",
    background: "#ffa3be",
    labelSrc: "/label-apple.png",
    fruits: [
      {
        id: "apple-tl-a",
        src: "/apple-slice-tl.png",
        xPct: 13,
        yPct: 22,
        widthPx: 210,
        rotationDeg: -6,
        depth: "back",
        floatDuration: 5.0,
      },
      {
        id: "apple-tr-a",
        src: "/apple-slice-tr.png",
        xPct: 87,
        yPct: 24,
        widthPx: 190,
        rotationDeg: 8,
        depth: "back",
        floatDuration: 4.4,
        floatDelay: 0.5,
      },
      {
        id: "apple-tl-front",
        src: "/apple-slice-tl.png",
        xPct: 80,
        yPct: 70,
        widthPx: 170,
        rotationDeg: -14,
        depth: "front",
        blurPx: 6,
        floatDuration: 6.6,
      },
      {
        id: "apple-tr-b",
        src: "/apple-slice-tr.png",
        xPct: 16,
        yPct: 72,
        widthPx: 140,
        rotationDeg: 20,
        depth: "back",
        floatDuration: 5.8,
        floatDelay: 0.2,
      },
    ],
    leaves: [
      { xPct: 42, yPct: 8, widthPx: 120, rotationDeg: 10, mirrored: true },
      { xPct: 60, yPct: 82, widthPx: 150, rotationDeg: 180, mirrored: false },
    ],
  },

  exotic: {
    id: "exotic",
    label: "Exotic",
    background: "#c1beff",
    labelSrc: "/label-exotic.png",
    fruits: [
      {
        id: "passion-big-a",
        src: "/passion-big-l.png",
        xPct: 11,
        yPct: 26,
        widthPx: 230,
        rotationDeg: -4,
        depth: "back",
        floatDuration: 5.6,
      },
      {
        id: "passion-half-a",
        src: "/passion-half-tl.png",
        xPct: 88,
        yPct: 18,
        widthPx: 150,
        rotationDeg: 14,
        depth: "back",
        floatDuration: 4.8,
        floatDelay: 0.6,
      },
      {
        id: "passion-big-front",
        src: "/passion-big-l.png",
        xPct: 82,
        yPct: 68,
        widthPx: 190,
        rotationDeg: 18,
        depth: "front",
        blurPx: 5,
        floatDuration: 6.3,
      },
      {
        id: "passion-half-b",
        src: "/passion-half-tl.png",
        xPct: 15,
        yPct: 72,
        widthPx: 120,
        rotationDeg: -22,
        depth: "back",
        floatDuration: 5.2,
        floatDelay: 0.3,
      },
    ],
    leaves: [
      { xPct: 36, yPct: 12, widthPx: 140, rotationDeg: -30, mirrored: false },
      { xPct: 66, yPct: 80, widthPx: 130, rotationDeg: 150, mirrored: true },
    ],
  },
};
