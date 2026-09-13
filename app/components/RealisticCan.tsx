"use client";

import { motion } from "framer-motion";
import { FLAVORS, type FlavorId } from "../data/flavors";
import styles from "./RealisticCan.module.css";

export interface RealisticCanProps {
  flavorId: FlavorId;
}

/** Onde, dentro da altura da lata, o rótulo é desenhado (fração 0-1) —
 * mesma faixa usada na lata da 1ª seção, pra ser exatamente o mesmo
 * acabamento (mesma foto, mesmo rótulo, mesma máscara). */
const LABEL_TOP = "9%";
const LABEL_HEIGHT = "78%";

/** ---- animação de entrada ao rolar a página até a seção ----
 * A lata nasce menor, mais baixa e bem tombada, e assenta numa pose final
 * em diagonal (inspirada no vídeo de referência) usando transform 3D em
 * CSS — a imagem em si é a mesma foto+rótulo da 1ª seção, só o "objeto"
 * gira/entra em perspectiva. */
const START = { rotateX: 10, rotateY: -32, rotateZ: 14, y: 90, scale: 0.72 };
const REST = { rotateX: 20, rotateY: -14, rotateZ: -16, y: 0, scale: 1 };

export default function RealisticCan({ flavorId }: RealisticCanProps) {
  const flavor = FLAVORS[flavorId];

  return (
    <div className={styles.stage}>
      <motion.div
        className={styles.canWrap}
        style={{ transformPerspective: 1300 }}
        initial={START}
        whileInView={REST}
        viewport={{ once: true, amount: 0.35 }}
        transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <img src="/can-photo.png" alt="" className={styles.canBase} draggable={false} />
        <div className={styles.labelMask}>
          <img
            src={flavor.labelSrc}
            alt={`Lata ${flavor.label}`}
            className={styles.labelImg}
            style={{ top: LABEL_TOP, height: LABEL_HEIGHT }}
            draggable={false}
          />
        </div>
        <img src="/can-photo.png" alt="" className={styles.canShade} draggable={false} />
      </motion.div>
    </div>
  );
}
