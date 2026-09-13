"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { FLAVORS, type FlavorId } from "../data/flavors";
import styles from "./RealisticCan.module.css";

export interface RealisticCanProps {
  flavorId: FlavorId;
}

/** Onde, dentro da altura da lata, o rótulo aparece (fração 0-1) — os mesmos
 * números usados na composição plana (CSS) que já estava aprovada: o rótulo
 * cobre do "ombro" até perto da base, deixando metal nu acima/abaixo. */
const LABEL_TOP_FRAC = 0.09;
const LABEL_HEIGHT_FRAC = 0.78;

/** Segmentos do perfil da lata (raio, altura) — a LatheGeometry do three.js
 * reparte a coordenada V da textura em fatias IGUAIS por ponto do perfil,
 * não por distância real percorrida. As contagens abaixo foram escolhidas
 * pra que a fração de V reservada pro "corpo reto" bata com LABEL_TOP/
 * HEIGHT_FRAC acima — senão o rótulo (que é a MESMA arte da versão plana)
 * sai espremido/deslocado do lugar onde ele deveria ficar na malha 3D. */
const BASE_SEGMENTS = 4;
const BODY_SEGMENTS = 36;
const TOP_SEGMENTS = 6;
const TOTAL_SEGMENTS = BASE_SEGMENTS + BODY_SEGMENTS + TOP_SEGMENTS;

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

/** ---- animação de entrada ao rolar a página até a seção ----
 * Mesmo comportamento de antes: a lata nasce um pouco menor/mais baixa e
 * levemente girada, e assenta na pose final em diagonal — sem quique, sem
 * giro contínuo. */
const REST_ROTATION_Y = Math.PI;
const ENTRANCE_DURATION = 1.3;
const START = { rotX: 0.12, rotY: REST_ROTATION_Y - 0.4, rotZ: 0.15, posY: -0.9, scale: 0.82 };
const REST = { rotX: 0.32, rotY: REST_ROTATION_Y - 0.15, rotZ: -0.26, posY: 0, scale: 1 };

function easeOutExpo(t: number) {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

/** Recria, num canvas 2D, exatamente a mesma composição usada na versão
 * plana (a "fonte da verdade" visual): foto da lata como base, o MESMO
 * rótulo recortado pela silhueta da lata e posicionado na mesma faixa, e a
 * mesma foto de novo por cima em multiply pro brilho/gotas — a arte não
 * muda em nada, só passa a ser a textura de uma malha 3D de verdade em vez
 * de uma imagem plana. */
function compositeCanTexture(
  canPhoto: HTMLImageElement,
  labelImg: HTMLImageElement | null,
  w: number,
  h: number
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // base: a foto da lata (metal, sombra, gotas, aros)
  ctx.drawImage(canPhoto, 0, 0, w, h);

  if (labelImg && labelImg.complete && labelImg.naturalWidth > 0) {
    // rótulo desenhado numa camada separada, depois recortado pela
    // silhueta (alpha) da própria foto da lata — igual ao mask-image usado
    // na versão em CSS.
    const labelLayer = document.createElement("canvas");
    labelLayer.width = w;
    labelLayer.height = h;
    const lctx = labelLayer.getContext("2d")!;
    lctx.imageSmoothingEnabled = true;
    lctx.imageSmoothingQuality = "high";
    lctx.drawImage(labelImg, 0, h * LABEL_TOP_FRAC, w, h * LABEL_HEIGHT_FRAC);
    lctx.globalCompositeOperation = "destination-in";
    lctx.drawImage(canPhoto, 0, 0, w, h);

    ctx.drawImage(labelLayer, 0, 0);
  }

  // a mesma foto de novo, em multiply, pro brilho/sombra/gotas (canShade)
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = 0.85;
  ctx.drawImage(canPhoto, 0, 0, w, h);
  ctx.restore();

  return canvas;
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

    // ambiente bem discreto — só o suficiente pra um leve realce metálico
    // nos aros, sem competir com a foto original (que já tem o próprio
    // brilho/gotas "assados" na imagem).
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.12).texture;
    scene.environment = envTexture;

    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(3, 3.5, 5);
    scene.add(key);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.55);
    fillLight.position.set(-4, -1, 2.5);
    scene.add(fillLight);
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    // corpo da lata: perfil revolucionado (ombro/base curvos de verdade)
    const geometry = new THREE.LatheGeometry(buildCanProfile(), 96);
    geometry.computeVertexNormals();

    const material = new THREE.MeshPhysicalMaterial({
      metalness: 0.3,
      roughness: 0.55,
      clearcoat: 0.15,
      clearcoatRoughness: 0.4,
      envMapIntensity: 0.5,
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
      const w = 1024;
      const h = Math.round((w * canPhoto.naturalHeight) / canPhoto.naturalWidth);
      const composed = compositeCanTexture(canPhoto, labelImg, w, h);
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
