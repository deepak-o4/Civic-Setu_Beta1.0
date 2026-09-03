import React from 'react';

/**
 * A deliberately understated background: a faint dot-grid (representing a
 * city map) with a few soft "signal" pulses (representing complaints being
 * detected and routed) drifting in and out. Pure CSS keyframe animations —
 * no SVG filters or SMIL, so it renders identically in Safari, Firefox, and
 * Chrome (the previous waving-flag version relied on feTurbulence +
 * feDisplacementMap, which Safari renders unreliably or not at all).
 *
 * Intentionally very low-opacity and slow-moving: it should read as "this
 * page has a bit of texture" rather than as an animation someone consciously
 * notices. Respects prefers-reduced-motion via the site-wide rule in
 * index.css (which zeroes out all animation durations for that setting),
 * so no extra JS-based detection is needed here.
 */
const SubtleCivicBackground = () => {
  const pulses = [
    { top: '18%', left: '12%', size: 10, delay: '0s', duration: '9s' },
    { top: '62%', left: '78%', size: 14, delay: '2.4s', duration: '11s' },
    { top: '38%', left: '52%', size: 8, delay: '4.8s', duration: '10s' },
    { top: '80%', left: '22%', size: 12, delay: '1.2s', duration: '12s' },
  ];

  return (
    <div className="pointer-events-none select-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {/* Faint dot-grid, evoking a map without literally being one */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: 'radial-gradient(#149a58 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* A handful of slow, soft "signal" pulses — complaints being picked up */}
      {pulses.map((p, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-primary-500"
          style={{
            top: p.top,
            left: p.left,
            width: p.size,
            height: p.size,
            opacity: 0.12,
            animation: `civicPulse ${p.duration} ease-in-out ${p.delay} infinite`,
          }}
        />
      ))}
    </div>
  );
};

export default SubtleCivicBackground;
