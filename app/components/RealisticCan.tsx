"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { FLAVORS, type FlavorId } from "../data/flavors";
import styles from "./RealisticCan.module.css";

export interface RealisticCanProps {
  flavorId: FlavorId;
}

/** Segmentos do perfil da lata (raio, altura) — a LatheGeometry do three.js
 * reparte a coordenada V da textura em fatias IGUAIS por ponto do perfil,
 * não por distância real percorrida. As contagens abaixo definem quanto de
 * V é reservado pro "corpo reto" (onde o rótulo vai). */
const BASE_SEGMENTS = 4;
const BODY_SEGMENTS = 36;
const TOP_SEGMENTS = 4;
const TOTAL_SEGMENTS = BASE_SEGMENTS + BODY_SEGMENTS + TOP_SEGMENTS;

/** Faixa (em V, 0=base/1=topo) onde o corpo reto vive — é aqui que o rótulo
 * precisa cair, senão parte dele escorrega pro ombro/gargalo (raio
 * encolhendo) e sai espremido/distorcido. */
const PAINT_BAND_TOP_V = BASE_SEGMENTS / TOTAL_SEGMENTS;
const PAINT_BAND_HEIGHT_V = BODY_SEGMENTS / TOTAL_SEGMENTS;

/** A textura dá a volta 360° na lata — só uma fatia dela fica de frente pra
 * câmera de cada vez. Na versão plana o rótulo cobria a largura toda da
 * lata (é uma imagem só de frente, sem "resto do cilindro"); aqui ele
 * precisa ocupar só a fração da circunferência que realmente aparece de
 * frente, senão fica esticado pelas 360° e a câmera só mostra um pedaço
 * ampliado/cortado dele (era o bug do "logo grande demais/cortado"). */
const LOGO_WIDTH_FRAC = 0.3;
/** Esticão extra na altura por cima da proporção natural da imagem. */
const LOGO_HEIGHT_BOOST = 1.25;

/** A foto do corpo (can-photo.png) é uma foto de FRENTE só, não uma textura
 * feita pra dar a volta 360° — se ela cobrir a largura toda, o "resto" da
 * volta (que aparece quando a lata gira) mostra a mesma foto espremida/
 * esticada de um jeito que não bate com nada, e vira um borrão visível na
 * parte de trás. Por isso o brilho/gotas do CORPO só aparece numa faixa
 * central de frente, esmaecendo pras bordas — fora dela fica só a cor
 * sólida do sabor (as tampas continuam cobrindo a volta toda, isso já
 * estava certo). */
const PHOTO_BAND_WIDTH_FRAC = 0.56;
const PHOTO_BAND_FEATHER_FRAC = 0.16;

const BODY_Y_START = 0.09;
const BODY_Y_END = 3.55;
const PROFILE_HEIGHT = 3.93;

function buildCanProfile(): THREE.Vector2[] {
  const points: Array<[number, number]> = [[0, 0]];
  // base: raio sobe de 0 até 1 com uma leve curva de arredondamento
  for (let i = 1; i <= BASE_SEGMENTS; i++) {
    const t = i / BASE_SEGMENTS;
    points.push([Math.sin((t * Math.PI) / 2), BODY_Y_START * t]);
  }
  for (let i = 1; i <= BODY_SEGMENTS; i++) {
    const y = BODY_Y_START + ((BODY_Y_END - BODY_Y_START) * i) / BODY_SEGMENTS;
    points.push([1, y]);
  }
  points.push([0.85, 3.65], [0.62, 3.78], [0.28, 3.88], [0, PROFILE_HEIGHT]);
  return points.map(([r, y]) => new THREE.Vector2(r, y - PROFILE_HEIGHT / 2));
}

/** ---- animação de entrada ao rolar a página até a seção ----
 * Mesmo comportamento de antes: a lata nasce um pouco menor/mais baixa e
 * levemente girada, e assenta na pose final em diagonal — sem quique, sem
 * giro contínuo. */
const REST_ROTATION_Y = Math.PI;
const ENTRANCE_DURATION = 1.0;
const START = { rotX: 0.12, rotY: REST_ROTATION_Y - 0.4, rotZ: 0.15, posY: -0.8, scale: 0.46 };
const REST = { rotX: 0.32, rotY: REST_ROTATION_Y - 0.15, rotZ: -0.26, posY: 0, scale: 0.62 };

function easeOutExpo(t: number) {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

/** Recria, num canvas 2D, a mesma composição visual da versão plana (a
 * "fonte da verdade"): foto da lata pro metal/aros/gotas, corpo pintado na
 * cor do sabor, e o MESMO rótulo por cima — só que agora ocupando a fração
 * de circunferência que fica de frente pra câmera, não a volta 360° toda
 * (a arte em si não muda, só a largura que ela ocupa no "embrulho" 3D). */
function compositeCanTexture(
  canPhoto: HTMLImageElement,
  labelImg: HTMLImageElement | null,
  canColor: string,
  w: number,
  h: number
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // base: a foto da lata (metal, sombra, gotas, aros de cima/baixo)
  ctx.drawImage(canPhoto, 0, 0, w, h);

  // corpo pintado na cor sólida do sabor, na faixa correspondente ao corpo
  // reto do perfil (CanvasTexture usa flipY por padrão: V=0 lê a ÚLTIMA
  // linha do canvas, V=1 lê a PRIMEIRA — por isso a conta abaixo espelha a
  // fração de V em vez de usar ela direto como um "top" de CSS).
  const bandTop = h * (1 - (PAINT_BAND_TOP_V + PAINT_BAND_HEIGHT_V));
  const bandH = h * PAINT_BAND_HEIGHT_V;
  ctx.fillStyle = canColor;
  ctx.fillRect(0, bandTop, w, bandH);

  // rótulo centralizado numa faixa estreita da largura (a fração da volta
  // inteira que fica de frente pra câmera) — partindo da proporção NATURAL
  // da própria imagem, com um leve "esticão" extra na altura (LOGO_HEIGHT_
  // BOOST) pra compensar o achatamento que a inclinação da lata (rotationX)
  // causa por perspectiva, já que ainda parecia achatado mesmo com a
  // proporção 1:1 correta.
  if (labelImg && labelImg.complete && labelImg.naturalWidth > 0) {
    const logoW = w * LOGO_WIDTH_FRAC;
    const logoH = logoW * (labelImg.naturalHeight / labelImg.naturalWidth) * LOGO_HEIGHT_BOOST;
    const logoX = (w - logoW) / 2;
    const logoY = bandTop + (bandH - logoH) / 2;
    ctx.drawImage(labelImg, logoX, logoY, logoW, logoH);
  }

  // a mesma foto de novo, em multiply, pro brilho/sombra/gotas (canShade).
  // Nas TAMPAS (fora da faixa do corpo) cobre a volta toda, como sempre —
  // ali já estava certo. No CORPO, porém, essa foto é de frente só (não foi
  // feita pra dar 360°): se cobrir a largura toda, o "resto" da volta (que
  // aparece ao girar, ou até de cara se o ângulo de repouso cair perto da
  // costura) mostra a mesma foto espremida/repetida e vira um borrão. Por
  // isso, no corpo, ela só aparece numa faixa central de frente, esmaecendo
  // pras bordas — fora dela fica só a cor sólida do sabor.
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.rect(0, 0, w, bandTop);
  ctx.rect(0, bandTop + bandH, w, h - (bandTop + bandH));
  ctx.clip();
  ctx.drawImage(canPhoto, 0, 0, w, h);
  ctx.restore();

  const photoW = w * PHOTO_BAND_WIDTH_FRAC;
  const featherW = w * PHOTO_BAND_FEATHER_FRAC;
  const bandLeft = (w - photoW) / 2;
  const bandRight = bandLeft + photoW;

  const bodyPhoto = document.createElement("canvas");
  bodyPhoto.width = w;
  bodyPhoto.height = bandH;
  const bpCtx = bodyPhoto.getContext("2d")!;
  bpCtx.imageSmoothingEnabled = true;
  bpCtx.imageSmoothingQuality = "high";
  // recorta do canPhoto só a faixa vertical correspondente ao corpo (canPhoto
  // é desenhado 1:1 no canvas w×h, então a mesma proporção vale na fonte)
  const srcScale = canPhoto.naturalHeight / h;
  bpCtx.drawImage(
    canPhoto,
    0,
    bandTop * srcScale,
    canPhoto.naturalWidth,
    bandH * srcScale,
    0,
    0,
    w,
    bandH
  );
  // máscara: opaca só na faixa central de frente, esmaecendo pras bordas
  bpCtx.globalCompositeOperation = "destination-in";
  const mask = bpCtx.createLinearGradient(0, 0, w, 0);
  const stops: Array<[number, number]> = [
    [0, 0],
    [Math.max(0, (bandLeft - featherW) / w), 0],
    [bandLeft / w, 1],
    [bandRight / w, 1],
    [Math.min(1, (bandRight + featherW) / w), 0],
    [1, 0],
  ];
  let prevOffset = -1;
  for (const [offset, alpha] of stops) {
    const safeOffset = Math.max(prevOffset + 0.0001, Math.min(1, offset));
    mask.addColorStop(safeOffset, `rgba(0,0,0,${alpha})`);
    prevOffset = safeOffset;
  }
  bpCtx.fillStyle = mask;
  bpCtx.fillRect(0, 0, w, bandH);

  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = 0.85;
  ctx.drawImage(bodyPhoto, 0, bandTop);
  ctx.restore();

  return canvas;
}

/** Mapa de metalness (canal B) / roughness (canal G): alumínio nu (liso e
 * bem metálico, pra refletir o ambiente de verdade — é isso que lê como
 * "metal", não só brilho) no topo/base, e corpo pintado quase nada
 * metálico (fosco, cor vívida — metalness demais lava a cor da tinta). */
function paintMaterialMap(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const encode = (roughness: number, metalness: number) =>
    `rgb(0, ${Math.round(roughness * 255)}, ${Math.round(metalness * 255)})`;

  ctx.fillStyle = encode(0.25, 0.9); // alumínio nu: liso e bem metálico
  ctx.fillRect(0, 0, w, h);

  const bandTop = h * (1 - (PAINT_BAND_TOP_V + PAINT_BAND_HEIGHT_V));
  const bandH = h * PAINT_BAND_HEIGHT_V;
  ctx.fillStyle = encode(0.55, 0.04); // corpo pintado: fosco, quase nada metálico
  ctx.fillRect(0, bandTop, w, bandH);
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
    renderer.toneMappingExposure = 1;
    host.appendChild(renderer.domElement);

    // ambiente de estúdio — dá aos aros de alumínio nu um reflexo de
    // verdade (é isso que faz "ler" como metal, não só brilho/branco).
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.1).texture;
    scene.environment = envTexture;

    const key = new THREE.DirectionalLight(0xffffff, 0.8);
    key.position.set(3, 3.5, 5);
    scene.add(key);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-4, -1, 2.5);
    scene.add(fillLight);
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    // corpo da lata: perfil revolucionado (ombro/base curvos de verdade)
    const geometry = new THREE.LatheGeometry(buildCanProfile(), 96);
    geometry.computeVertexNormals();

    // mapa de metalness/roughness próprio, em espaço linear (é dado, não
    // cor) — separa o alumínio nu (reflexivo) do corpo pintado (fosco, cor
    // vívida). Sem isso, um metalness único deixa a lata inteira ou "lavada"
    // (metal alto demais) ou sem cara de metal nenhuma (metal baixo demais).
    const materialCanvas = document.createElement("canvas");
    materialCanvas.width = 512;
    materialCanvas.height = 512;
    paintMaterialMap(materialCanvas.getContext("2d")!, materialCanvas.width, materialCanvas.height);
    const materialTexture = new THREE.CanvasTexture(materialCanvas);
    materialTexture.colorSpace = THREE.NoColorSpace;
    materialTexture.needsUpdate = true;

    const material = new THREE.MeshPhysicalMaterial({
      metalnessMap: materialTexture,
      roughnessMap: materialTexture,
      metalness: 1,
      roughness: 1,
      clearcoat: 0.1,
      clearcoatRoughness: 0.4,
      envMapIntensity: 0.9,
    });

    const can = new THREE.Mesh(geometry, material);
    can.rotation.set(START.rotX, START.rotY, START.rotZ);
    can.position.y = START.posY;
    can.scale.setScalar(START.scale);
    scene.add(can);

    // textura = a MESMA arte da versão plana, composta num canvas 2D e
    // aplicada na malha 3D — só troca "imagem plana" por "superfície real".
    const canPhoto = new Image();
    const labelImg = new Image();
    let texture: THREE.CanvasTexture | null = null;

    const rebuildTexture = () => {
      if (!canPhoto.complete || canPhoto.naturalWidth === 0) return;
      const w = 1536;
      const h = Math.round((w * canPhoto.naturalHeight) / canPhoto.naturalWidth);
      const composed = compositeCanTexture(canPhoto, labelImg, flavor.canColor, w, h);
      if (texture) texture.dispose();
      texture = new THREE.CanvasTexture(composed);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.needsUpdate = true;
      material.map = texture;
      material.needsUpdate = true;
      // não espera o próximo tick do loop pra mostrar assim que a imagem
      // carrega (ex.: aba em segundo plano, onde o rAF fica bem lento).
      renderer.render(scene, camera);
    };

    canPhoto.onload = rebuildTexture;
    canPhoto.src = "/can-photo.png";
    labelImg.onload = rebuildTexture;
    labelImg.src = flavor.labelSrc;

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
      texture?.dispose();
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
