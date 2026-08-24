import * as React from 'react';
import { cn } from '@/lib/utils';

interface PulsatingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  pulseColor?: string;
  duration?: string;
  distance?: string;
}

/**
 * Shell 风格的强调按钮：以 pulseColor 描边，并带一个闪烁的块状光标。
 * （保留原 magicui API：pulseColor / duration / distance）
 */
export const PulsatingButton = React.forwardRef<HTMLButtonElement, PulsatingButtonProps>(
  ({ className, children, pulseColor, duration = '1.5s', ...props }, ref) => {
    const accent = pulseColor || 'var(--foreground)';
    return (
      <button
        ref={ref}
        className={cn(
          'relative flex cursor-pointer items-center justify-center border bg-transparent px-4 py-2 text-center font-mono text-sm font-medium transition-colors duration-75',
          className,
        )}
        style={{ borderColor: accent, color: accent }}
        {...props}
      >
        <span className="inline-flex items-center gap-2">{children}</span>
        <span
          aria-hidden="true"
          className="ml-2 inline-block h-[1em] w-[0.55em]"
          style={{
            background: accent,
            animation: `shell-blink ${duration} step-end infinite`,
          }}
        />
      </button>
    );
  },
);
PulsatingButton.displayName = 'PulsatingButton';
