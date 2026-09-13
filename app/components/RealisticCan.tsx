"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { FLAVORS, type FlavorConfig, type FlavorId } from "../data/flavors";
import styles from "./RealisticCan.module.css";

export interface RealisticCanProps {
  flavorId: FlavorId;
}

/** Perfil da lata (raio, altura), de baixo pra cima — revolucionado vira o corpo 3D. */
const CAN_PROFILE: Array<[number, number]> = [
  [0.0, 0.0],
  [0.88, 0.0],
  [0.92, 0.03],
  [1.0, 0.09],
  [1.0, 3.55],
  [0.94, 3.64],
  [0.78, 3.75],
  [0.7, 3.8],
  [0.7, 3.86],
  [0.6, 3.9],
  [0.0, 3.93],
];
const PROFILE_HEIGHT = 3.93;

/** Faixa (fração 0-1 da altura) onde a cor do sabor + logo aparecem; fora disso é alumínio nu. */
const PAINT_BAND_TOP = 0.08;
const PAINT_BAND_HEIGHT = 0.78;
/** Largura do logo em fração da CIRCUNFERÊNCIA INTEIRA (textura dá a volta 360° na lata) —
 * não é fração da largura "de frente" como seria numa arte 2D achatada. ~80° de arco. */
const LOGO_WIDTH_FRAC = 0.24;
/** Altura do logo em fração da faixa pintada (independente da largura, pra não esticar
 * o rótulo inteiro só porque ele agora ocupa bem menos largura da textura). */
const LOGO_HEIGHT_FRAC = 0.44;

const DRAG_SENSITIVITY = 0.01;
const INERTIA_DECAY = 0.94;
/** Ajuste pra a frente pintada (onde fica o logo) já nascer virada pra câmera. */
const INITIAL_ROTATION = Math.PI;

function paintCanTexture(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  flavor: FlavorConfig,
  logoImg: HTMLImageElement | null
) {
  ctx.clearRect(0, 0, w, h);

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
  const bandTop = h * PAINT_BAND_TOP;
  const bandH = h * PAINT_BAND_HEIGHT;
  ctx.fillStyle = flavor.canColor;
  ctx.fillRect(0, bandTop, w, bandH);

  // logo centralizado, impresso por cima — largura em fração da volta inteira,
  // altura em fração da faixa pintada (os dois são independentes em 3D).
  if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
    const logoW = w * LOGO_WIDTH_FRAC;
    const logoH = bandH * LOGO_HEIGHT_FRAC;
    const logoX = (w - logoW) / 2;
    const logoY = bandTop + (bandH - logoH) / 2;
    ctx.drawImage(logoImg, logoX, logoY, logoW, logoH);
  }
}

export default function RealisticCan({ flavorId }: RealisticCanProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const flavor = FLAVORS[flavorId];

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 20);
    camera.position.set(0, 0.05, 7.4);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    host.appendChild(renderer.domElement);

    // ambiente de estúdio (dá reflexo/realce metálico sem precisar de um HDRI externo)
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;

    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(3.5, 4, 5);
    scene.add(key);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.7);
    fillLight.position.set(-4, -1.5, 2.5);
    scene.add(fillLight);
    const rim = new THREE.DirectionalLight(0xffffff, 0.9);
    rim.position.set(-2, 2, -4);
    scene.add(rim);
    scene.add(new THREE.AmbientLight(0xffffff, 0.28));

    // textura pintada num canvas 2D, atualizada quando o rótulo carregar
    const texCanvas = document.createElement("canvas");
    texCanvas.width = 1024;
    texCanvas.height = 1024;
    const ctx2d = texCanvas.getContext("2d")!;
    paintCanTexture(ctx2d, texCanvas.width, texCanvas.height, flavor, null);

    const texture = new THREE.CanvasTexture(texCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    texture.needsUpdate = true;

    const logoImg = new Image();
    logoImg.onload = () => {
      paintCanTexture(ctx2d, texCanvas.width, texCanvas.height, flavor, logoImg);
      texture.needsUpdate = true;
      // não espera o próximo tick do loop pra mostrar o rótulo assim que a
      // imagem carrega (ex.: aba em segundo plano, onde o rAF fica bem lento).
      renderer.render(scene, camera);
    };
    logoImg.src = flavor.labelSrc;

    // corpo da lata: perfil revolucionado (dá o ombro/base curvos de verdade)
    const profile = CAN_PROFILE.map(
      ([r, y]) => new THREE.Vector2(r, y - PROFILE_HEIGHT / 2)
    );
    const geometry = new THREE.LatheGeometry(profile, 96);
    geometry.computeVertexNormals();

    const material = new THREE.MeshPhysicalMaterial({
      map: texture,
      metalness: 0.75,
      roughness: 0.32,
      clearcoat: 0.3,
      clearcoatRoughness: 0.25,
      envMapIntensity: 1.1,
    });

    const can = new THREE.Mesh(geometry, material);
    can.rotation.y = INITIAL_ROTATION;
    can.scale.setScalar(0.62);
    scene.add(can);

    // ---- interação: arrastar gira só no eixo vertical (sem auto-giro, sem tilt) ----
    let dragging = false;
    let lastX = 0;
    let velocity = 0;

    const setDragging = (v: boolean) => setIsDragging(v);

    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      velocity = 0;
      host.setPointerCapture(e.pointerId);
      setDragging(true);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      const delta = dx * DRAG_SENSITIVITY;
      can.rotation.y += delta;
      velocity = delta;
    };
    const endDrag = () => {
      dragging = false;
      setDragging(false);
    };

    host.addEventListener("pointerdown", onPointerDown);
    host.addEventListener("pointermove", onPointerMove);
    host.addEventListener("pointerup", endDrag);
    host.addEventListener("pointercancel", endDrag);

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

    let rafId = 0;
    const animate = () => {
      if (!dragging) {
        if (Math.abs(velocity) > 0.0001) {
          can.rotation.y += velocity;
          velocity *= INERTIA_DECAY;
        } else {
          velocity = 0;
        }
      }
      renderer.render(scene, camera);
      rafId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      host.removeEventListener("pointerdown", onPointerDown);
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerup", endDrag);
      host.removeEventListener("pointercancel", endDrag);
      host.removeChild(renderer.domElement);
      geometry.dispose();
      material.dispose();
      texture.dispose();
      envTexture.dispose();
      pmrem.dispose();
      renderer.dispose();
    };
  }, [flavorId]);

  return (
    <div
      ref={hostRef}
      className={styles.host}
      data-dragging={isDragging}
      role="img"
      aria-label={`Lata ${FLAVORS[flavorId].label} em 3D — arraste para girar`}
    />
  );
}
