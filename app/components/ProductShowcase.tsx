import type { CSSProperties } from "react";
import { FLAVORS, type FlavorId } from "../data/flavors";
import RealisticCan from "./RealisticCan";
import styles from "./ProductShowcase.module.css";

/** Ordem das 3 seções de produto que essa vitrine vai ganhar (só "apple" existe por enquanto). */
const SHOWCASE_ORDER: FlavorId[] = ["apple", "exotic", "pear"];

export interface ProductShowcaseProps {
  flavorId: FlavorId;
  /** Título grande em fonte cursiva (ex: "Sweet Apple"). */
  title: string;
  description: string;
  ctaLabel?: string;
}

export default function ProductShowcase({
  flavorId,
  title,
  description,
  ctaLabel = "Saiba mais",
}: ProductShowcaseProps) {
  const flavor = FLAVORS[flavorId];
  const activeIndex = SHOWCASE_ORDER.indexOf(flavorId);

  return (
    <section
      id={`produto-${flavorId}`}
      className={styles.section}
      style={{ "--accent": flavor.canColor } as CSSProperties}
    >
      <div className={styles.content}>
        <div className={styles.copy}>
          <h2 className={styles.wordmark}>{title}</h2>
          <div className={styles.descRow}>
            <p className={styles.description}>{description}</p>
            <span className={styles.descLine} />
          </div>
          <button type="button" className={styles.cta}>
            {ctaLabel}
            <ArrowIcon />
          </button>
        </div>

        <div className={styles.visual}>
          <span className={styles.canGlow} aria-hidden="true" />
          <div className={styles.canImage}>
            <RealisticCan flavorId={flavorId} />
          </div>
        </div>
      </div>

      <div className={styles.dots}>
        {SHOWCASE_ORDER.map((id) => (
          <span key={id} className={styles.dot} data-active={id === flavorId} />
        ))}
      </div>

      <div className={styles.arrows}>
        <button type="button" className={styles.arrowBtn} aria-label="Sabor anterior" disabled={activeIndex <= 0}>
          <ChevronIcon direction="left" />
        </button>
        <button
          type="button"
          className={styles.arrowBtn}
          aria-label="Próximo sabor"
          disabled={activeIndex >= SHOWCASE_ORDER.length - 1}
        >
          <ChevronIcon direction="right" />
        </button>
      </div>

      <p className={styles.footer}>
        © 2025 Fruity
        <br />
        Todos os direitos reservados.
      </p>
    </section>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13.06 4.94a1 1 0 0 0 0 1.41L18.17 11.5H4a1 1 0 1 0 0 2h14.17l-5.11 5.15a1 1 0 1 0 1.41 1.42l6.83-6.88a1 1 0 0 0 0-1.42l-6.83-6.87a1 1 0 0 0-1.41 0Z" />
    </svg>
  );
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={direction === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
