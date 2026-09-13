"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { FLAVORS, type FlavorConfig, type FlavorId } from "../data/flavors";
import styles from "./RealisticCan.module.css";

export interface RealisticCanProps {
  flavorId: FlavorId;
}

/** Quantos segmentos do perfil (raio, altura) vão pra cada trecho da lata.
 * A LatheGeometry do three.js reparte a coordenada V da textura de forma
 * IGUAL entre pontos do perfil, não por distância real percorrida — sem
 * isso, um perfil com muitos pontos no ombro/gargalo e só 2 no corpo faz
 * o rótulo inteiro ficar espremido (e distorcido) ali no ombro, em vez de
 * cobrir o corpo da lata. Por isso o corpo reto ganha vários pontos
 * colineares só pra reservar a fatia de V proporcional ao tanto de altura
 * real que ele ocupa. */
const BASE_SEGMENTS = 2;
const BODY_SEGMENTS = 28;
const TOP_SEGMENTS = 6;
const TOTAL_SEGMENTS = BASE_SEGMENTS + BODY_SEGMENTS + TOP_SEGMENTS;

const BODY_Y_START = 0.09;
const BODY_Y_END = 3.55;
const PROFILE_HEIGHT = 3.93;

function buildCanProfile(): THREE.Vector2[] {
  const points: Array<[number, number]> = [[0, 0], [0.9, 0.02], [1, BODY_Y_START]];
  for (let i = 1; i <= BODY_SEGMENTS; i++) {
    const y = BODY_Y_START + ((BODY_Y_END - BODY_Y_START) * i) / BODY_SEGMENTS;
    points.push([1, y]);
  }
  points.push(
    [0.94, 3.64],
    [0.86, 3.72],
    [0.78, 3.78],
    [0.7, 3.83],
    [0.62, 3.89],
    [0, PROFILE_HEIGHT]
  );
  return points.map(([r, y]) => new THREE.Vector2(r, y - PROFILE_HEIGHT / 2));
}

/** Faixa (fração 0-1 de V) onde a cor do sabor + logo aparecem — derivada
 * direto da contagem de segmentos acima, então nunca fica dessincronizada
 * do formato real da lata. */
const PAINT_BAND_TOP = BASE_SEGMENTS / TOTAL_SEGMENTS;
const PAINT_BAND_HEIGHT = BODY_SEGMENTS / TOTAL_SEGMENTS;

/** Resolução da textura pintada — bem maior que o necessário pra tela, pra o
 * logo sair nítido mesmo bem ampliado (era a causa do "borrado"). */
const TEXTURE_SIZE = 2048;

/** Largura do logo em fração da CIRCUNFERÊNCIA INTEIRA (a textura dá a volta
 * 360° na lata) — não é fração da largura "de frente" como numa arte 2D
 * achatada. Maior/mais proeminente, igual à lata da 1ª seção. */
const LOGO_WIDTH_FRAC = 0.32;
/** Altura do logo em fração da faixa pintada (independente da largura). */
const LOGO_HEIGHT_FRAC = 0.62;

/** Ajusta pra a frente pintada (onde fica o logo) já nascer virada pra câmera. */
const REST_ROTATION_Y = Math.PI;

/** ---- animação de entrada ao rolar a página até a seção ----
 * A lata nasce menor, mais baixa e só levemente girada, e assenta numa
 * pose final em diagonal (inspirada no vídeo de referência: lata inclinada,
 * mostrando o aro de cima, em vez de ficar reta feito soldadinho). */
const ENTRANCE_DURATION = 1.4; // segundos
const START = { rotX: 0.12, rotY: REST_ROTATION_Y - 0.5, rotZ: 0.18, posY: -1.1, scale: 0.5 };
const REST = { rotX: 0.32, rotY: REST_ROTATION_Y - 0.15, rotZ: -0.26, posY: 0, scale: 0.68 };

/** Easing suave (sem "quique"), pra um assentar mais cinematográfico. */
function easeOutExpo(t: number) {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

/** Retângulo do logo dentro da textura — não depende da imagem ter carregado
 * (só de frações fixas), então dá pra usar também no mapa de material. */
function getLogoRect(w: number, h: number) {
  const bandTop = h * PAINT_BAND_TOP;
  const bandH = h * PAINT_BAND_HEIGHT;
  const logoW = w * LOGO_WIDTH_FRAC;
  const logoH = bandH * LOGO_HEIGHT_FRAC;
  return { x: (w - logoW) / 2, y: bandTop + (bandH - logoH) / 2, w: logoW, h: logoH, bandTop, bandH };
}

function paintCanTexture(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  flavor: FlavorConfig,
  dropletsImg: HTMLImageElement | null,
  logoImg: HTMLImageElement | null
) {
  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // alumínio nu (topo/base, onde a lata de verdade não recebe tinta)
  const metal = ctx.createLinearGradient(0, 0, 0, h);
  metal.addColorStop(0, "#dcdcdc");
  metal.addColorStop(0.08, "#c8c8c8");
  metal.addColorStop(0.5, "#f0f0f0");
  metal.addColorStop(0.92, "#c8c8c8");
  metal.addColorStop(1, "#dcdcdc");
  ctx.fillStyle = metal;
  ctx.fillRect(0, 0, w, h);

  // corpo pintado na cor sólida do sabor
  const { x: logoX, y: logoY, w: logoW, h: logoH, bandTop, bandH } = getLogoRect(w, h);
  ctx.fillStyle = flavor.canColor;
  ctx.fillRect(0, bandTop, w, bandH);

  // gotas d'água da mesma foto usada na 1ª seção, esticada na largura toda
  // (dá a volta 360°; a distorção na "parte de trás" nunca aparece já que a
  // lata não gira) — dá o MESMO acabamento fotográfico das duas seções.
  if (dropletsImg && dropletsImg.complete && dropletsImg.naturalWidth > 0) {
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.globalAlpha = 0.55;
    ctx.drawImage(dropletsImg, 0, 0, w, h);
    ctx.restore();
  }

  // logo por cima, nítido — e então "tingido" com a própria cor da lata,
  // pra parecer tinta impressa na superfície em vez de um adesivo branco
  // colado (o branco do rótulo passa a puxar pro tom do sabor, mantendo o
  // desenho/texto legível).
  if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
    ctx.drawImage(logoImg, logoX, logoY, logoW, logoH);

    ctx.save();
    ctx.beginPath();
    ctx.rect(logoX, logoY, logoW, logoH);
    ctx.clip();
    ctx.globalCompositeOperation = "multiply";
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = flavor.canColor;
    ctx.fillRect(logoX, logoY, logoW, logoH);
    ctx.restore();

    // um toque bem sutil das mesmas gotas por cima do rótulo, só pra ele não
    // parecer "seco"/destacado do resto da lata molhada — sem cobrir o texto.
    if (dropletsImg && dropletsImg.complete && dropletsImg.naturalWidth > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(logoX, logoY, logoW, logoH);
      ctx.clip();
      ctx.globalCompositeOperation = "multiply";
      ctx.globalAlpha = 0.15;
      ctx.drawImage(dropletsImg, 0, 0, w, h);
      ctx.restore();
    }
  }
}

/** Mapa de metalness (canal B) / roughness (canal G) — três materiais
 * diferentes na MESMA lata: alumínio nu (bem metálico e liso), corpo
 * pintado (bem menos metálico, mais fosco) e a área impressa do rótulo
 * (quase nada metálico, como tinta/papel). Sem isso a lata inteira reflete
 * luz igual, e nada "lê" como metal exposto vs. tinta vs. impressão. */
function paintMaterialMap(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const encode = (roughness: number, metalness: number) =>
    `rgb(0, ${Math.round(roughness * 255)}, ${Math.round(metalness * 255)})`;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = encode(0.28, 0.9); // alumínio nu: liso e bem metálico
  ctx.fillRect(0, 0, w, h);

  const { x: logoX, y: logoY, w: logoW, h: logoH, bandTop, bandH } = getLogoRect(w, h);
  ctx.fillStyle = encode(0.55, 0.3); // corpo pintado: mais fosco, pouco metálico
  ctx.fillRect(0, bandTop, w, bandH);

  ctx.fillStyle = encode(0.65, 0.08); // rótulo impresso: quase nada metálico
  ctx.fillRect(logoX, logoY, logoW, logoH);
}

export default function RealisticCan({ flavorId }: RealisticCanProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const flavor = FLAVORS[flavorId];

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
    camera.position.set(0, 0.05, 8.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    host.appendChild(renderer.domElement);

    // ambiente de estúdio bem discreto — só o suficiente pra dar volume ao
    // metal sem criar reflexos fortes que lavem o rótulo.
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.09).texture;
    scene.environment = envTexture;

    const key = new THREE.DirectionalLight(0xffffff, 1.15);
    key.position.set(3, 3.5, 5);
    scene.add(key);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
    fillLight.position.set(-4, -1, 2.5);
    scene.add(fillLight);
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));

    // textura pintada num canvas 2D, atualizada conforme as imagens carregam
    const texCanvas = document.createElement("canvas");
    texCanvas.width = TEXTURE_SIZE;
    texCanvas.height = TEXTURE_SIZE;
    const ctx2d = texCanvas.getContext("2d")!;
    paintCanTexture(ctx2d, texCanvas.width, texCanvas.height, flavor, null, null);

    const texture = new THREE.CanvasTexture(texCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;

    let dropletsImg: HTMLImageElement | null = null;
    let logoImg: HTMLImageElement | null = null;
    const redraw = () => {
      paintCanTexture(ctx2d, texCanvas.width, texCanvas.height, flavor, dropletsImg, logoImg);
      texture.needsUpdate = true;
      // não espera o próximo tick do loop pra mostrar assim que a imagem
      // carrega (ex.: aba em segundo plano, onde o rAF fica bem lento).
      renderer.render(scene, camera);
    };

    dropletsImg = new Image();
    dropletsImg.onload = redraw;
    dropletsImg.src = "/can-photo.png";

    logoImg = new Image();
    logoImg.onload = redraw;
    logoImg.src = flavor.labelSrc;

    // mapa de metalness/roughness — três "materiais" na mesma lata (metal
    // nu, corpo pintado, rótulo impresso). É dado (não cor), então fica em
    // espaço linear, não sRGB.
    const materialCanvas = document.createElement("canvas");
    materialCanvas.width = TEXTURE_SIZE;
    materialCanvas.height = TEXTURE_SIZE;
    paintMaterialMap(materialCanvas.getContext("2d")!, materialCanvas.width, materialCanvas.height);
    const materialTexture = new THREE.CanvasTexture(materialCanvas);
    materialTexture.colorSpace = THREE.NoColorSpace;
    materialTexture.needsUpdate = true;

    // corpo da lata: perfil revolucionado (dá o ombro/base curvos de verdade)
    const geometry = new THREE.LatheGeometry(buildCanProfile(), 96);
    geometry.computeVertexNormals();

    const material = new THREE.MeshPhysicalMaterial({
      map: texture,
      metalnessMap: materialTexture,
      roughnessMap: materialTexture,
      metalness: 1,
      roughness: 1,
      clearcoat: 0.12,
      clearcoatRoughness: 0.45,
      envMapIntensity: 0.5,
    });

    const can = new THREE.Mesh(geometry, material);
    can.rotation.set(START.rotX, START.rotY, START.rotZ);
    can.position.y = START.posY;
    can.scale.setScalar(START.scale);
    scene.add(can);

    // ---- redimensiona junto com o container (mantém posição/escala do layout) ----
    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    // ---- animação de entrada: dispara quando a lata entra na tela ao rolar ----
    let entranceStart: number | null = null;
    let entranceDone = false;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && entranceStart === null) {
          entranceStart = performance.now();
          io.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    io.observe(host);

    let rafId = 0;
    const animate = () => {
      if (!entranceDone && entranceStart !== null) {
        const t = Math.min((performance.now() - entranceStart) / 1000 / ENTRANCE_DURATION, 1);
        const e = easeOutExpo(t);
        can.rotation.x = THREE.MathUtils.lerp(START.rotX, REST.rotX, e);
        can.rotation.y = THREE.MathUtils.lerp(START.rotY, REST.rotY, e);
        can.rotation.z = THREE.MathUtils.lerp(START.rotZ, REST.rotZ, e);
        can.position.y = THREE.MathUtils.lerp(START.posY, REST.posY, e);
        can.scale.setScalar(THREE.MathUtils.lerp(START.scale, REST.scale, e));
        if (t >= 1) entranceDone = true;
      }
      renderer.render(scene, camera);
      rafId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      io.disconnect();
      host.removeChild(renderer.domElement);
      geometry.dispose();
      material.dispose();
      texture.dispose();
      materialTexture.dispose();
      envTexture.dispose();
      pmrem.dispose();
      renderer.dispose();
    };
  }, [flavorId]);

  return (
    <div
      ref={hostRef}
      className={styles.host}
      role="img"
      aria-label={`Lata ${FLAVORS[flavorId].label} em 3D`}
    />
  );
}
