import { cn } from '@/lib/utils';

/**
 * Decorative concentric open loops, echoing the logo mark. Inherits colour from `currentColor`;
 * `spark` adds a Volt dot that slowly orbits the outer ring.
 */
export function LoopPattern({ rings = 7, spark = false, className }) {
  const outer = 40 + (rings - 1) * 26;
  return (
    <svg
      viewBox="-200 -200 400 400"
      fill="none"
      aria-hidden="true"
      className={cn('pointer-events-none', className)}
    >
      {Array.from({ length: rings }, (_, i) => {
        const r = 40 + i * 26;
        const c = 2 * Math.PI * r;
        return (
          <circle
            key={r}
            r={r}
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeDasharray={`${c * 0.74} ${c * 0.26}`}
            transform={`rotate(${-20 - i * 22})`}
            opacity={1 - i * 0.1}
          />
        );
      })}
      {spark && (
        <g className="animate-orbit" style={{ transformOrigin: '0 0', transformBox: 'view-box' }}>
          <circle cx={outer} cy="0" r="5" fill="var(--color-volt-300)" />
          <circle cx={outer} cy="0" r="12" fill="var(--color-volt-300)" opacity="0.18" />
        </g>
      )}
    </svg>
  );
}
