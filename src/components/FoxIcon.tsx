export function FoxIcon({ size = 32 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
    >
      <defs>
        <linearGradient id="foxGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFD45C" />
          <stop offset="100%" stopColor="#E89A12" />
        </linearGradient>
      </defs>
      <path d="M8 6 L14 18 L4 18 Z" fill="url(#foxGrad)" />
      <path d="M32 6 L36 18 L26 18 Z" fill="url(#foxGrad)" />
      <path d="M9 8 L13 16 L7 16 Z" fill="#1a0e00" opacity=".4" />
      <path d="M31 8 L33 16 L27 16 Z" fill="#1a0e00" opacity=".4" />
      <ellipse cx="20" cy="22" rx="14" ry="13" fill="url(#foxGrad)" />
      <path d="M5 22 Q8 18 14 19 L14 28 Q8 29 5 24 Z" fill="#fff" opacity=".95" />
      <path d="M35 22 Q32 18 26 19 L26 28 Q32 29 35 24 Z" fill="#fff" opacity=".95" />
      <ellipse cx="14.5" cy="22" rx="1.8" ry="2.4" fill="#0a0a0a" />
      <ellipse cx="25.5" cy="22" rx="1.8" ry="2.4" fill="#0a0a0a" />
      <ellipse cx="14.8" cy="21.2" rx=".6" ry=".8" fill="#fff" />
      <ellipse cx="25.8" cy="21.2" rx=".6" ry=".8" fill="#fff" />
      <path d="M16 27 Q20 30 24 27 L22 30 Q20 31.5 18 30 Z" fill="#fff" opacity=".95" />
      <ellipse cx="20" cy="27" rx="1.4" ry="1" fill="#0a0a0a" />
    </svg>
  );
}
