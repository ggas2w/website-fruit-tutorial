import type { CSSProperties } from "react";
import { FLAVORS, type FlavorId } from "../data/flavors";
import styles from "./ProductShowcase.module.css";

const NAV_LINKS = ["Início", "Nossos Sabores", "Nossa História", "Sobre", "Contato"];

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
      <nav className={styles.nav}>
        <div className={styles.brandBadge}>F</div>
        <ul className={styles.navLinks}>
          {NAV_LINKS.map((label) => (
            <li key={label}>{label}</li>
          ))}
        </ul>
        <div className={styles.socials}>
          <FacebookIcon />
          <InstagramIcon />
          <TwitterIcon />
        </div>
      </nav>

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
            <div className={styles.canFill} />
            <img src="/can-photo.png" alt="" className={styles.canShade} draggable={false} />
            <img
              src={flavor.labelSrc}
              alt={`Lata ${flavor.label}`}
              className={styles.canLogo}
              draggable={false}
            />
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

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14C17.17 2.1 15.95 2 14.66 2 11.99 2 10 3.66 10 6.7v2.8H7v4h3V22h4v-8.5Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2c2.72 0 3.06.01 4.12.06 1.06.05 1.79.22 2.43.47.66.26 1.21.6 1.76 1.15.55.55.9 1.1 1.15 1.76.25.64.42 1.37.47 2.43.05 1.06.06 1.4.06 4.13s-.01 3.06-.06 4.12c-.05 1.06-.22 1.79-.47 2.43a4.9 4.9 0 0 1-1.15 1.76c-.55.55-1.1.9-1.76 1.15-.64.25-1.37.42-2.43.47-1.06.05-1.4.06-4.12.06s-3.06-.01-4.13-.06c-1.06-.05-1.79-.22-2.43-.47a4.9 4.9 0 0 1-1.76-1.15 4.9 4.9 0 0 1-1.15-1.76c-.25-.64-.42-1.37-.47-2.43C2.01 15.06 2 14.72 2 12s.01-3.06.06-4.12c.05-1.06.22-1.79.47-2.43.26-.66.6-1.21 1.15-1.76a4.9 4.9 0 0 1 1.76-1.15c.64-.25 1.37-.42 2.43-.47C8.94 2.01 9.28 2 12 2Zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4Zm5.2-8.4a1.17 1.17 0 1 0 0-2.34 1.17 1.17 0 0 0 0 2.34Z" />
    </svg>
  );
}

function TwitterIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22 5.9c-.7.32-1.46.53-2.25.63a3.93 3.93 0 0 0 1.72-2.17c-.76.45-1.6.78-2.5.96A3.9 3.9 0 0 0 12.14 9c0 .31.03.6.1.89A11.07 11.07 0 0 1 4 5.8a3.9 3.9 0 0 0 1.21 5.2 3.87 3.87 0 0 1-1.77-.49v.05a3.9 3.9 0 0 0 3.13 3.83c-.55.15-1.13.17-1.7.06a3.9 3.9 0 0 0 3.64 2.71A7.83 7.83 0 0 1 2 18.9a11.05 11.05 0 0 0 5.98 1.75c7.18 0 11.1-5.95 11.1-11.1l-.01-.5A7.9 7.9 0 0 0 22 5.9Z" />
    </svg>
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
