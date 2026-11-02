import React from "react";

/* Icône du « Tableau de bord PADDI+ » : jauge d'avancement, barres d'indicateurs, feuille (environnement).
 * Usage : <IconeTableauBord size={40} /> */
export default function IconeTableauBord({ size = 40 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label="Tableau de bord PADDI+"
      style={{ display: "block", flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="paddi-fond" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#22c55e" />
          <stop offset="1" stopColor="#14532d" />
        </linearGradient>
      </defs>
      {/* fond */}
      <rect x="2" y="2" width="60" height="60" rx="15" fill="url(#paddi-fond)" />
      {/* jauge d'avancement */}
      <path d="M13 38 A19 19 0 0 1 51 38" fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="6" strokeLinecap="round" />
      <path d="M13 38 A19 19 0 0 1 40.4 21" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
      <circle cx="32" cy="38" r="3.2" fill="#ffffff" />
      <path d="M32 38 L40 28" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" />
      {/* barres d'indicateurs */}
      <rect x="15" y="47" width="7" height="9" rx="2" fill="#bbf7d0" />
      <rect x="25.5" y="44" width="7" height="12" rx="2" fill="#86efac" />
      <rect x="36" y="41" width="7" height="15" rx="2" fill="#ffffff" />
      {/* feuille (environnement) */}
      <path d="M47 55 C47 47 51 43 57 42 C57 49 53 54 47 55 Z" fill="#fde68a" />
      <path d="M48 54 C50 50 52.5 47.5 55.5 45" fill="none" stroke="#14532d" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
