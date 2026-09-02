"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import {
  Activity, Binary, Box, Boxes, Braces, Cloud, Cpu, Database, GitBranch, Globe2,
  HardDrive, Layers, Lock, Orbit, Radio, Satellite, Server, Share2, Shield,
  Sparkles, Terminal, Wifi, Zap,
} from "lucide-react";
import { Camera, Geometry, Mesh, Program, Renderer, Transform } from "ogl";

const orbitBelts = [
  {
    speed: 9,
    radius: "min(clamp(96px, 17vh, 190px), 24vw)",
    icons: [Cpu, Database, Zap, Lock, Share2, Terminal],
  },
  {
    speed: -6,
    radius: "min(clamp(150px, 26vh, 300px), 34vw)",
    icons: [Globe2, Server, Cloud, Box, Radio, Wifi, Layers, Shield],
  },
  {
    speed: 4,
    radius: "min(clamp(205px, 35vh, 410px), 44vw)",
    icons: [Activity, HardDrive, GitBranch, Orbit, Satellite, Binary, Braces, Sparkles, Boxes],
  },
];

const iconPalette = [
  "#f7c948", "#8b5cf6", "#3b82f6", "#22c55e", "#f97316", "#38bdf8",
  "#ec4899", "#a3e635", "#2dd4bf", "#818cf8", "#fb7185", "#f5f9ff",
];

const vertexShader = /* glsl */ `
  precision highp float;

  attribute vec3 position;
  attribute float seed;

  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
  uniform float uTime;
  uniform float uPointScale;
  uniform float uDensity;
  uniform vec2 uMouse;
  uniform float uPointerActive;

  varying vec3 vColor;
  varying float vAlpha;

  float hash(float value) {
    return fract(sin(value * 91.3458) * 47453.5453);
  }

  float noise(vec3 point) {
    vec3 cell = floor(point);
    vec3 local = fract(point);
    local = local * local * (3.0 - 2.0 * local);

    float index = cell.x + cell.y * 57.0 + cell.z * 113.0;
    return mix(
      mix(mix(hash(index), hash(index + 1.0), local.x), mix(hash(index + 57.0), hash(index + 58.0), local.x), local.y),
      mix(mix(hash(index + 113.0), hash(index + 114.0), local.x), mix(hash(index + 170.0), hash(index + 171.0), local.x), local.y),
      local.z
    );
  }

  void main() {
    vec4 clipPosition = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = clipPosition;

    vec2 screenPosition = clipPosition.xy / clipPosition.w;
    float mouseDistance = distance(screenPosition, uMouse);
    float hover = (1.0 - smoothstep(0.0, 0.24, mouseDistance)) * uPointerActive;
    float depthScale = clamp(5.0 / clipPosition.w, 0.65, 1.5);
    float visible = step(seed, uDensity);
    float twinkle = 0.5 + 0.5 * sin(uTime * (2.0 + seed * 7.0) + seed * 121.0);
    gl_PointSize = (1.25 + seed * 1.9) * uPointScale * depthScale * (1.0 + hover * 1.8) * (0.8 + twinkle * 0.45) * visible;

    float cloudA = noise(position * 4.4 + vec3(uTime * 0.08, 0.0, -uTime * 0.06));
    float cloudB = noise(position * 8.0 + vec3(-uTime * 0.04, uTime * 0.05, 0.0));
    vec3 deepBlue = vec3(0.035, 0.25, 0.48);
    vec3 electricBlue = vec3(0.18, 0.61, 0.95);
    vec3 ice = vec3(0.72, 0.94, 1.0);
    vColor = mix(deepBlue, electricBlue, smoothstep(0.18, 0.78, cloudA));
    vColor = mix(vColor, ice, smoothstep(0.68, 0.98, cloudB));

    float centerVoid = smoothstep(0.08, 0.56, length(position.xy));
    float rearFade = smoothstep(-1.1, 0.55, position.z);
    vAlpha = visible * centerVoid * mix(0.22, 1.0, rearFade) * (0.5 + cloudA * 0.65) * (0.55 + twinkle * 0.75);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float distanceToCenter = length(gl_PointCoord - 0.5);
    float circle = 1.0 - smoothstep(0.36, 0.5, distanceToCenter);
    float alpha = circle * vAlpha;
    if (alpha < 0.02) discard;
    gl_FragColor = vec4(vColor, alpha);
  }
`;

type ParticleState = {
  theta: Float32Array;
  phi: Float32Array;
  radius: Float32Array;
  launch: Float32Array;
  scatterDist: Float32Array;
  introDelay: Float32Array;
  introDuration: Float32Array;
  radialOffset: Float32Array;
  radialVelocity: Float32Array;
  tangentOffset: Float32Array;
  tangentVelocity: Float32Array;
};

function createParticles(count: number) {
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const state: ParticleState = {
    theta: new Float32Array(count),
    phi: new Float32Array(count),
    radius: new Float32Array(count),
    launch: new Float32Array(count),
    scatterDist: new Float32Array(count),
    introDelay: new Float32Array(count),
    introDuration: new Float32Array(count),
    radialOffset: new Float32Array(count),
    radialVelocity: new Float32Array(count),
    tangentOffset: new Float32Array(count),
    tangentVelocity: new Float32Array(count),
  };

  for (let index = 0; index < count; index += 1) {
    const distributed = (index + 0.5) / count;
    state.theta[index] = Math.PI * (1 + Math.sqrt(5)) * index;
    state.phi[index] = Math.acos(1 - 2 * distributed);
    state.radius[index] = 0.96 + Math.random() * 0.08;
    state.scatterDist[index] = 0.5 + Math.random() * 1.8;
    const fast = Math.random() < 0.55;
    if (fast) {
      state.launch[index] = 0.4 + Math.random() * 1.2;
      state.introDelay[index] = Math.random() * 0.15;
      state.introDuration[index] = 0.6 + Math.random() * 0.5;
    } else {
      state.launch[index] = 2 + Math.random() * 5;
      state.introDelay[index] = 0.25 + Math.random() * 1.1;
      state.introDuration[index] = 1.1 + Math.random() * 1.7;
    }
    seeds[index] = Math.random();
  }

  return { positions, seeds, state };
}

export function ParticleGlobe() {
  const mountRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    const core = coreRef.current;
    const orbit = orbitRef.current;
    if (!mount || !core || !orbit) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    const particleCount = window.innerWidth < 720 ? 7000 : 12000;
    const dpr = Math.min(window.devicePixelRatio, 2);
    const renderer = new Renderer({ dpr, alpha: false, antialias: false });
    const gl = renderer.gl;
    gl.clearColor(0.008, 0.012, 0.018, 1);

    const camera = new Camera(gl, { fov: 44, near: 0.1, far: 100 });
    camera.position.z = 4.4;

    const scene = new Transform();
    const { positions, seeds, state } = createParticles(particleCount);
    const geometry = new Geometry(gl, {
      position: { size: 3, data: positions },
      seed: { size: 1, data: seeds },
    });
    const program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uPointScale: { value: dpr },
        uDensity: { value: 1 },
        uMouse: { value: [2, 2] },
        uPointerActive: { value: 0 },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      cullFace: null,
    });
    program.setBlendFunc(gl.SRC_ALPHA, gl.ONE);

    const points = new Mesh(gl, { mode: gl.POINTS, geometry, program });
    points.position.y = -0.65;
    points.rotation.x = -0.08;
    points.setParent(scene);

    gl.canvas.className = "globeCanvas";
    gl.canvas.setAttribute("aria-hidden", "true");
    mount.appendChild(gl.canvas);

    const pointer = { x: 2, y: 2, targetX: 2, targetY: 2, dx: 0, dy: 0, active: 0 };
    let scrollProgress = 0;
    let scatter = 0;
    let animationFrame = 0;
    let previousTime = performance.now();
    const startTime = previousTime;

    const resize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      renderer.setSize(width, height);
      camera.perspective({ aspect: width / height });
      program.uniforms.uPointScale.value = dpr * Math.min(1.18, Math.max(0.82, height / 820));
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (coarsePointer) return;
      const nextX = (event.clientX / window.innerWidth) * 2 - 1;
      const nextY = 1 - (event.clientY / window.innerHeight) * 2;
      pointer.dx = nextX - pointer.targetX;
      pointer.dy = nextY - pointer.targetY;
      pointer.targetX = nextX;
      pointer.targetY = nextY;
      pointer.active = 1;
    };

    const handlePointerLeave = () => {
      pointer.active = 0;
      pointer.targetX = 2;
      pointer.targetY = 2;
    };

    const handleScroll = () => {
      scrollProgress = Math.min(window.scrollY / window.innerHeight, 2);
    };

    const render = (time: number) => {
      const frameScale = Math.min((time - previousTime) / (1000 / 60), 2);
      const elapsed = (time - startTime) / 1000;
      previousTime = time;

      pointer.x += (pointer.targetX - pointer.x) * 0.08 * frameScale;
      pointer.y += (pointer.targetY - pointer.y) * 0.08 * frameScale;
      pointer.dx *= 0.9;
      pointer.dy *= 0.9;

      const introActive = !reducedMotion && elapsed < 3.2;
      scatter += (Math.min(scrollProgress, 1) - scatter) * 0.06 * frameScale;
      const cameraTarget = 4.4 + scatter * 0.55;
      camera.position.z += (cameraTarget - camera.position.z) * 0.045 * frameScale;
      camera.position.x += ((pointer.active ? -pointer.x * 0.12 : 0) - camera.position.x) * 0.035 * frameScale;
      camera.position.y += ((pointer.active ? -pointer.y * 0.08 : 0) - camera.position.y) * 0.035 * frameScale;
      camera.lookAt([0, -0.16, 0]);

      const aspect = window.innerWidth / window.innerHeight;
      const projectionScale = Math.tan((camera.fov * Math.PI) / 360);
      const spin = reducedMotion ? 0 : elapsed * 0.045;

      for (let index = 0; index < particleCount; index += 1) {
        const seed = seeds[index];
        let theta = state.theta[index] + spin + state.tangentOffset[index];
        let phi = state.phi[index];
        if (!reducedMotion) {
          theta += Math.sin(elapsed * (0.5 + seed * 1.3) + index * 1.7) * 0.02;
          phi += Math.cos(elapsed * (0.4 + seed * 1.1) + index * 2.3) * 0.014;
        }
        const sinPhi = Math.sin(phi);
        const unitX = sinPhi * Math.cos(theta);
        const unitY = Math.cos(phi);
        const unitZ = sinPhi * Math.sin(theta);
        const distanceFromCamera = camera.position.z - unitZ;
        const screenX = unitX / (distanceFromCamera * projectionScale * aspect);
        const screenY = (unitY - 0.49) / (distanceFromCamera * projectionScale);
        const deltaX = screenX - pointer.x;
        const deltaY = screenY - pointer.y;
        const pointerDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (pointer.active && unitZ > -0.1 && pointerDistance < 0.23) {
          const influence = 1 - pointerDistance / 0.23;
          state.radialVelocity[index] += influence * 0.0038 * frameScale;
          state.tangentVelocity[index] += (pointer.dx * deltaY - pointer.dy * deltaX) * influence * 0.22;
        }

        state.radialVelocity[index] += -state.radialOffset[index] * 0.035 * frameScale;
        state.radialVelocity[index] *= Math.pow(0.88, frameScale);
        state.radialOffset[index] += state.radialVelocity[index] * frameScale;
        state.tangentVelocity[index] += -state.tangentOffset[index] * 0.018 * frameScale;
        state.tangentVelocity[index] *= Math.pow(0.91, frameScale);
        state.tangentOffset[index] += state.tangentVelocity[index] * frameScale;

        let introOut = 0;
        if (introActive) {
          const t = (elapsed - state.introDelay[index]) / state.introDuration[index];
          const eased = t <= 0 ? 0 : t >= 1 ? 1 : 1 - (1 - t) * (1 - t) * (1 - t);
          introOut = 1 - eased;
        }
        const radius =
          state.radius[index] +
          state.radialOffset[index] +
          introOut * state.launch[index] +
          scatter * 1.7 * state.scatterDist[index];
        positions[index * 3] = unitX * radius;
        positions[index * 3 + 1] = unitY * radius;
        positions[index * 3 + 2] = unitZ * radius;
      }

      geometry.attributes.position.needsUpdate = true;
      program.uniforms.uTime.value = elapsed;
      program.uniforms.uMouse.value = [pointer.x, pointer.y];
      program.uniforms.uPointerActive.value = pointer.active;
      program.uniforms.uDensity.value = 1 - scatter * 0.72;
      points.rotation.z = scrollProgress * 0.2;
      core.style.opacity = String(Math.max(0, 1 - scrollProgress * 1.6));
      core.style.transform = `translate(-50%, -50%) scale(${1 + scrollProgress * 0.45})`;

      const reveal = Math.min(Math.max((scatter - 0.15) / 0.6, 0), 1);
      const hide = Math.min(Math.max((scrollProgress - 1.4) / 0.45, 0), 1);
      orbit.style.opacity = String(reveal * (1 - hide));
      orbit.style.transform = `translate(-50%, -50%) scale(${0.72 + reveal * 0.28})`;
      for (const belt of orbit.children) {
        const el = belt as HTMLElement;
        el.style.setProperty("--ring", `${reducedMotion ? 0 : elapsed * Number(el.dataset.speed)}deg`);
      }

      renderer.render({ scene, camera });
      animationFrame = window.requestAnimationFrame(render);
    };

    resize();
    handleScroll();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", handlePointerLeave);
    window.addEventListener("scroll", handleScroll, { passive: true });
    animationFrame = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handlePointerMove);
      document.documentElement.removeEventListener("pointerleave", handlePointerLeave);
      window.removeEventListener("scroll", handleScroll);
      geometry.remove();
      gl.canvas.remove();
    };
  }, []);

  return (
    <div ref={mountRef} className="globeMount">
      <div ref={coreRef} className="globeCore" aria-hidden="true">
        <span />
        <span />
      </div>
      <div ref={orbitRef} className="orbitRing" aria-hidden="true">
        {orbitBelts.map((belt, beltIndex) => (
          <div
            key={beltIndex}
            className="orbitBelt"
            data-speed={belt.speed}
            style={{ "--r": belt.radius } as CSSProperties}
          >
            {belt.icons.map((Icon, iconIndex) => (
              <span
                key={iconIndex}
                className="orbitItem"
                style={
                  {
                    "--a": `${(iconIndex / belt.icons.length) * 360 + beltIndex * 24}deg`,
                    "--c": iconPalette[(beltIndex * 5 + iconIndex) % iconPalette.length],
                  } as CSSProperties
                }
              >
                <Icon size={17} strokeWidth={1.9} />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}