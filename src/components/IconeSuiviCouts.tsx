import React from "react";

/* Icône « Suivi des coûts » : barres de coûts croissantes, flèche de progression, pièce €.
 * Usage : <IconeSuiviCouts size={40} /> */
export default function IconeSuiviCouts({ size = 40 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label="Suivi des coûts"
    >
      {/* barres de coûts croissantes */}
      <rect x="9" y="40" width="11" height="15" rx="2.5" fill="#93c5fd" />
      <rect x="24" y="30" width="11" height="25" rx="2.5" fill="#3b82f6" />
      <rect x="39" y="17" width="11" height="38" rx="2.5" fill="#1d4ed8" />
      {/* ligne de base */}
      <path d="M6 58h52" stroke="#0f2d6b" strokeWidth="3" strokeLinecap="round" />
      {/* flèche de progression */}
      <path d="M10 33 L26 22 L36 27 L54 9" fill="none" stroke="#16a34a" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M45 8.5 H54.5 V18" fill="none" stroke="#16a34a" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      {/* pièce € */}
      <circle cx="14" cy="14" r="9.5" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
      <path d="M17.6 10.4a5 5 0 1 0 0 7.2M9.4 12.6h6.2M9.4 15.4h6.2" fill="none" stroke="#ffffff" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}
