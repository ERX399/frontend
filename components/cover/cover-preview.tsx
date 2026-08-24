'use client';

import { forwardRef } from 'react';
import type { Ratio, ShadowConfig } from './types';

interface CoverPreviewProps {
  canvasWidth: number;
  canvasHeight: number;
  scale: number;
  visualRatios: Ratio[];
  bgImage: string | null;
  bgImageX: number;
  bgImageY: number;
  bgImageScale: number;
  bgBlur: number;
  bgOpacity: number;
  bgColor: string;
  bgColorOpacity: number;
  leftText: string;
  rightText: string;
  fontSize: number;
  fontWeight: number;
  customFontName: string;
  color: string;
  textShadow: ShadowConfig;
  gap: number;
  showIcon: boolean;
  iconSvg: string;
  localIcon: string | null;
  iconSize: number;
  iconBgPadding: number;
  iconBgEnabled: boolean;
  iconBgColor: string;
  iconBgOpacity: number;
  iconBgBlur: number;
  iconBgRadius: number;
  useOriginalIconColor: boolean;
  iconColor: string;
  iconShadow: ShadowConfig;
  iconRadius: number;
  isDragging: boolean;
  hexToRgba: (hex: string, alpha: number) => string;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onWheel: (e: React.WheelEvent) => void;
}

const CoverPreview = forwardRef<SVGSVGElement, CoverPreviewProps>(function CoverPreview(
  {
    canvasWidth,
    canvasHeight,
    scale,
    visualRatios,
    bgImage,
    bgImageX,
    bgImageY,
    bgImageScale,
    bgBlur,
    bgOpacity,
    bgColor,
    bgColorOpacity,
    leftText,
    rightText,
    fontSize,
    fontWeight,
    customFontName,
    color,
    textShadow,
    gap,
    showIcon,
    iconSvg,
    localIcon,
    iconSize,
    iconBgPadding,
    iconBgEnabled,
    iconBgColor,
    iconBgOpacity,
    iconBgBlur,
    iconBgRadius,
    useOriginalIconColor,
    iconColor,
    iconShadow,
    iconRadius,
    isDragging,
    hexToRgba,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onWheel,
  },
  ref
) {
  const BASE_HEIGHT = 600;
  const cursorStyle = bgImage ? (isDragging ? 'grabbing' : 'grab') : 'default';

  return (
    <div
      className="w-full overflow-hidden flex justify-center bg-card py-4 sm:p-4 select-none touch-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <svg
        ref={ref}
        width={canvasWidth}
        height={canvasHeight}
        viewBox={`0 0 ${canvasWidth / scale} ${canvasHeight / scale}`}
        xmlns="http://www.w3.org/2000/svg"
        style={{
          maxWidth: '100%',
          height: 'auto',
          cursor: cursorStyle,
        }}
        onWheel={onWheel}
      >
        <defs>
          <pattern id="checkerboard" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="10" height="10" fill="#e0e0e0" />
            <rect x="10" y="0" width="10" height="10" fill="#ffffff" />
            <rect x="0" y="10" width="10" height="10" fill="#ffffff" />
            <rect x="10" y="10" width="10" height="10" fill="#e0e0e0" />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#checkerboard)" className="checkerboard-bg" />
        <rect width="100%" height="100%" fill={hexToRgba(bgColor, bgColorOpacity)} className="color-bg" />

        {bgImage && (
          <image
            href={bgImage}
            x={bgImageX}
            y={bgImageY}
            width={canvasWidth}
            height={canvasHeight}
            transform={`scale(${bgImageScale})`}
            style={{
              transformOrigin: '50% 50%',
              filter: `blur(${bgBlur}px)`,
              opacity: bgOpacity,
            }}
            preserveAspectRatio="xMidYMid meet"
          />
        )}

        <foreignObject x="0" y="0" width="100%" height="100%" style={{ pointerEvents: 'none' as const }}>
          <div
            {...{ xmlns: 'http://www.w3.org/1999/xhtml' } as React.HTMLAttributes<HTMLDivElement> & Record<string, string>}
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: `${gap}px`,
              fontFamily: customFontName || 'sans-serif',
              fontWeight: fontWeight,
              userSelect: 'none',
              WebkitUserSelect: 'none',
            }}
          >
            <span
              style={{
                fontSize: `${fontSize}px`,
                color: color,
                textShadow: `${textShadow.x}px ${textShadow.y}px ${textShadow.blur}px ${hexToRgba(textShadow.color, textShadow.alpha)}`,
                lineHeight: 1,
                whiteSpace: 'nowrap',
                userSelect: 'none',
                WebkitUserSelect: 'none',
              }}
            >
              {leftText}
            </span>

            {showIcon && (iconSvg || localIcon) && (
              <div
                style={{
                  width: `${iconSize + iconBgPadding * 2}px`,
                  height: `${iconSize + iconBgPadding * 2}px`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: iconBgEnabled
                    ? hexToRgba(iconBgColor, iconBgOpacity)
                    : 'transparent',
                  backdropFilter: iconBgEnabled && iconBgBlur > 0 ? `blur(${iconBgBlur}px)` : 'none',
                  WebkitBackdropFilter:
                    iconBgEnabled && iconBgBlur > 0 ? `blur(${iconBgBlur}px)` : 'none',
                  borderRadius: iconBgEnabled ? `${iconBgRadius}%` : '0',
                }}
              >
                <div
                  style={{
                    maxWidth: `${iconSize}px`,
                    maxHeight: `${iconSize}px`,
                    flexShrink: 0,
                    color: useOriginalIconColor ? 'inherit' : iconColor,
                    filter: `drop-shadow(${iconShadow.x}px ${iconShadow.y}px ${iconShadow.blur}px ${hexToRgba(iconShadow.color, iconShadow.alpha)})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: `${iconRadius}%`,
                    overflow: 'hidden',
                  }}
                >
                  {localIcon ? (
                    <img
                      src={localIcon}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      alt="Local Icon"
                      draggable={false}
                    />
                  ) : (
                    <div
                      className="icon-svg-box"
                      style={{ width: '100%', height: '100%' }}
                      dangerouslySetInnerHTML={{ __html: iconSvg }}
                    />
                  )}
                </div>
              </div>
            )}

            <span
              style={{
                fontSize: `${fontSize}px`,
                color: color,
                textShadow: `${textShadow.x}px ${textShadow.y}px ${textShadow.blur}px ${hexToRgba(textShadow.color, textShadow.alpha)}`,
                lineHeight: 1,
                whiteSpace: 'nowrap',
                userSelect: 'none',
                WebkitUserSelect: 'none',
              }}
            >
              {rightText}
            </span>
          </div>
        </foreignObject>

        <rect
          x="0"
          y="0"
          width={canvasWidth}
          height={canvasHeight}
          fill="none"
          stroke="rgba(255, 0, 0, 0.8)"
          strokeWidth="2"
          className="canvas-border"
        />

        {visualRatios.map((ratio) => {
          const ratioWidth = BASE_HEIGHT * (ratio.w / ratio.h);
          if (ratioWidth >= canvasWidth) return null;
          const xOffset = (canvasWidth - ratioWidth) / 2;
          return (
            <g key={ratio.label} className="ratio-guide">
              <rect
                x={xOffset}
                y="0"
                width={ratioWidth}
                height={BASE_HEIGHT}
                fill="none"
                stroke="rgba(255, 0, 0, 0.5)"
                strokeWidth="2"
                strokeDasharray="10 5"
              />
              <text x={xOffset + 10} y={30} fill="rgba(255, 0, 0, 0.5)" fontSize="20">
                {ratio.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
});

export { CoverPreview };
