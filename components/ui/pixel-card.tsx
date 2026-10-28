/*
 * 友链置顶卡片的像素动画。移植自 React Bits 的 PixelCard
 * （https://github.com/DavidHDev/react-bits，MIT + Commons Clause License Condition v1.0，
 * Copyright (c) 2026 David Haz），经由 thinkreally114/website 的二次改版取参数。
 * 按该许可证要求保留原始版权与许可声明；改动：去掉 variant/shape/trigger 等未用分支，
 * 收敛为本站单一暗色主题；动效裁成「常亮金色颗粒 + 左往右流动 + 颗粒闪烁」，
 * 悬停只加速流动，不叠聚光与入场动画。
 */
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import './pixel-card.css';

const DEFAULT_COLORS = ['#efd39a', '#dcae52', '#b8801f'];
// rich 模式常驻的像素亮度：颗粒常亮不暗（去掉入场/聚光后，颗粒稳定在常亮亮度）
const AMBIENT_PRESENCE = 0.85;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function easeOutBack(t: number) {
  const c = 1.9;
  const u = t - 1;
  return 1 + (c + 1) * u * u * u + c * u * u;
}

export interface PixelCardProps {
  colors?: string[];
  glowColor?: string;
  gap?: number;
  pixelSize?: number;
  speed?: number;
  opacity?: number;
  glow?: number;
  intro?: boolean;
  rich?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export function PixelCard({
  colors = DEFAULT_COLORS,
  glowColor,
  gap = 5,
  pixelSize = 3,
  speed = 100,
  opacity = 0.45,
  glow = 0.35,
  intro = true,
  rich = false,
  className,
  style,
  children,
}: PixelCardProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const configRef = useRef({ colors, gap, pixelSize, speed, opacity, rich });

  configRef.current = {
    colors,
    gap: Math.max(2, gap),
    pixelSize: Math.max(0.5, pixelSize),
    speed: clamp(speed, 0, 100),
    opacity: clamp(opacity, 0, 1),
    rich,
  };

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    const state = {
      alive: true,
      raf: 0,
      last: 0,
      time: 0,
      dt: 1 / 60,
      width: 0,
      height: 0,
      ratio: 1,
      key: '',
      count: 0,
      x: new Float32Array(0),
      y: new Float32Array(0),
      tint: new Uint8Array(0),
      size: new Float32Array(0),
      phase: new Float32Array(0),
      rate: new Float32Array(0),
      jitter: new Float32Array(0),
      presence: new Float32Array(0),
      pointerX: 0,
      pointerY: 0,
      hovering: false,
      active: false,
      visible: true,
      started: false,
      flowPhase: 0,
      pointerOver: false,
    };

    const wake = () => {
      if (!state.raf && state.alive && state.visible) state.raf = requestAnimationFrame(frame);
    };

    const build = () => {
      const cfg = configRef.current;
      const rect = host.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const key = [width, height, ratio, cfg.gap, cfg.pixelSize, cfg.colors.join(',')].join('|');
      if (key === state.key) return;
      state.key = key;
      state.width = width;
      state.height = height;
      state.ratio = ratio;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);

      const columns = Math.floor((width - 1) / cfg.gap) + 1;
      const rows = Math.floor((height - 1) / cfg.gap) + 1;
      const offsetX = (width - (columns - 1) * cfg.gap) / 2;
      const offsetY = (height - (rows - 1) * cfg.gap) / 2;
      const count = columns * rows;
      const previous = state.presence;
      state.count = count;
      state.x = new Float32Array(count);
      state.y = new Float32Array(count);
      state.tint = new Uint8Array(count);
      state.size = new Float32Array(count);
      state.phase = new Float32Array(count);
      state.rate = new Float32Array(count);
      state.presence = new Float32Array(count);

      let i = 0;
      for (let column = 0; column < columns; column++) {
        for (let row = 0; row < rows; row++) {
          state.x[i] = offsetX + column * cfg.gap;
          state.y[i] = offsetY + row * cfg.gap;
          state.tint[i] = Math.floor(Math.random() * cfg.colors.length);
          state.size[i] = cfg.pixelSize * (0.25 + Math.random() * 0.75);
          state.phase[i] = Math.random() * Math.PI * 2;
          state.rate[i] = 0.55 + Math.random() * 0.9;
          if (previous.length) state.presence[i] = previous[Math.min(i, previous.length - 1)];
          i++;
        }
      }
      state.pointerX = width / 2;
      state.pointerY = height / 2;
      wake();
    };

    const draw = () => {
      const cfg = configRef.current;
      const { width, height, ratio } = state;
      const rich = cfg.rich && !reduce;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, width, height);

      // 常亮模式：颗粒直接保持在 AMBIENT_PRESENCE，不做入场扩散/退出（去掉入场动画）
      let presenceSum = 0;
      for (let i = 0; i < state.count; i++) {
        const target = rich ? AMBIENT_PRESENCE : 0;
        state.presence[i] = target;
        presenceSum += state.presence[i];
      }
      const average = state.count ? presenceSum / state.count : 0;

      const frequency = (cfg.speed / 35) * 1.35;
      // 金色尘光从左往右的流动：整层颗粒在卡片宽度内缓慢向右滚动，
      // 右缘的颗粒绕回左缘（% width），密度恒定、无缝循环。
      // 相位由 frame 累积（悬停 3s/趟，平时 8s/趟），这里只取余数。
      const flow = cfg.rich && !reduce ? state.flowPhase % 1 : 0;

      for (let color = 0; color < cfg.colors.length; color++) {
        ctx.fillStyle = cfg.colors[color];
        for (let i = 0; i < state.count; i++) {
          if (state.tint[i] !== color) continue;
          const presence = state.presence[i];
          if (presence <= 0.002) continue;
          const x = (state.x[i] + flow * width) % width;
          const y = state.y[i];
          let size = state.size[i];
          let alpha = 0.5 + presence * 0.38;
          if (!reduce) {
            const wave = Math.sin(state.phase[i] + state.time * frequency * state.rate[i]);
            size *= 0.62 + 0.38 * wave;
            alpha += 0.12 * wave;
          }
          size *= easeOutBack(presence);
          alpha = Math.min(1, alpha) * cfg.opacity;
          if (alpha <= 0.004 || size <= 0.05) continue;
          ctx.globalAlpha = alpha;
          ctx.fillRect(x - size * 0.5, y - size * 0.5, size, size);
        }
      }
      ctx.globalAlpha = 1;
      return presenceSum;
    };

    function frame(now: number) {
      state.raf = 0;
      if (!state.alive) return;
      const cfg = configRef.current;
      const dt = state.last ? Math.min(0.05, (now - state.last) / 1000) : 1 / 60;
      state.last = now;
      state.dt = dt;
      state.time += dt;
      build();

      // 流动相位累积：指针在卡片上（悬停/触摸按压）流速快（3s/趟），平时慢（8s/趟），连续不跳变
      const cfgNow = configRef.current;
      if (cfgNow.rich && !reduce) {
        const flowRate = state.pointerOver ? 1 / 3 : 1 / 8;
        state.flowPhase += flowRate * dt;
      }

      const presence = draw();
      const settling = !reduce && presence > 0.002;
      if (settling && state.visible) state.raf = requestAnimationFrame(frame);
      else state.last = 0;
    }

    const local = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      return [event.clientX - rect.left, event.clientY - rect.top];
    };

    const onEnter = (event: PointerEvent) => {
      const [x, y] = local(event);
      const touch = event.pointerType === 'touch';
      state.hovering = !touch;
      state.pointerOver = true;
      state.pointerX = x;
      state.pointerY = y;
      wake();
    };

    const onMove = (event: PointerEvent) => {
      const [x, y] = local(event);
      state.pointerX = x;
      state.pointerY = y;
      if (event.pointerType === 'touch') {
        wake();
        return;
      }
      state.hovering = true;
      wake();
    };

    const onLeave = (event: PointerEvent) => {
      state.hovering = false;
      state.pointerOver = false;
      wake();
    };

    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerType === 'touch') {
        state.pointerOver = false;
      }
      wake();
    };

    host.addEventListener('pointerenter', onEnter);
    host.addEventListener('pointermove', onMove);
    host.addEventListener('pointerleave', onLeave);
    host.addEventListener('pointerup', onPointerUp);

    const resizeObserver = new ResizeObserver(() => {
      build();
      wake();
    });
    resizeObserver.observe(host);

    const visibility = new IntersectionObserver(
      (entries) => {
        state.visible = entries.some((entry) => entry.isIntersecting);
        if (state.visible) wake();
      },
      { threshold: 0.25 },
    );
    visibility.observe(host);

    build();

    return () => {
      state.alive = false;
      cancelAnimationFrame(state.raf);
      resizeObserver.disconnect();
      visibility.disconnect();
      host.removeEventListener('pointerenter', onEnter);
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerleave', onLeave);
      host.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

  return (
    <div ref={hostRef} className={cn('pixel-card', className)} style={style}>
      <canvas ref={canvasRef} className="pixel-card-canvas" aria-hidden="true" />
      <div className="pixel-card-content">{children}</div>
    </div>
  );
}
