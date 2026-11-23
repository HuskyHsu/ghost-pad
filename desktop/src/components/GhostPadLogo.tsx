import React from "react";

interface GhostPadLogoProps {
  className?: string;
  active?: boolean;
}

/**
 * Crisp inline Ghost-Pad brand mark optimized for light tinted surfaces.
 * Uses the exact geometry from desktop/public/icon.svg with enhanced edge
 * definition and high-contrast sky-blue signal waves.
 */
export const GhostPadLogo: React.FC<GhostPadLogoProps> = ({
  className = "w-full h-full",
  active = false,
}) => {
  return (
    <svg
      viewBox="16 8 168 168"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Wireless signal waves */}
      <path
        d="M146 28.4681C154.308 28.4681 161.164 34.9075 161.271 44"
        stroke="#0EA5E9"
        strokeWidth="7"
        strokeLinecap="round"
        className={active ? "animate-signal-arc-inner" : undefined}
      />
      <path
        d="M146.042 15.0017C160.75 14.8393 174.021 26.6648 174 43.9218"
        stroke="#38BDF8"
        strokeWidth="7"
        strokeLinecap="round"
        className={active ? "animate-signal-arc-outer" : undefined}
      />
      {/* Creamy ghost body with subtle ocean-navy outline for light surfaces */}
      <path
        d="M96.6437 21.0062C62.8517 21.0062 34.4854 44.7057 28.3995 74.9323C27.3433 80.362 27 86.2117 27 91.8535V147.571C27 150.048 27.0792 152.21 27.3433 153.843C28.7164 163.489 37.3241 169.998 46.3559 169.998C54.0138 169.998 61.0899 165.227 64.0214 158.506C65.5002 155.266 68.3001 153.657 71.7845 153.657C75.1637 153.657 78.2004 155.502 79.4423 158.719C82.1366 165.466 89.1859 169.998 95.9464 169.998C103.154 169.998 110.02 165.149 112.504 158.719C113.824 155.424 116.834 153.606 120.03 153.606C123.541 153.606 126.235 155.24 127.661 158.404C130.776 165.202 138.091 170 145.326 170C154.911 170 163.361 162.752 164.657 153.054C164.921 151.157 165 149.154 165 147.178V90.9248C165 85.2316 164.472 79.5919 163.284 74.4525C156.391 44.7819 129.636 21 96.628 21L96.6437 21.0062Z"
        fill="#FFFFFF"
        stroke="#033157"
        strokeOpacity="0.2"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      {/* Left D-Pad Eye */}
      <rect x="52.0244" y="81.5619" width="31.5388" height="10.5129" rx="5" fill="#033157" />
      <rect
        width="31.5388"
        height="10.5129"
        rx="5"
        transform="matrix(0 -1 -1 0 73.0503 102.167)"
        fill="#033157"
      />
      {/* Left Blush */}
      <rect
        width="10.5608"
        height="4.30668"
        rx="2.15334"
        transform="matrix(0.5 -0.866025 -0.866025 -0.5 55.7539 121.036)"
        fill="#BCB6D7"
      />
      <rect
        width="10.5608"
        height="4.30668"
        rx="2.15334"
        transform="matrix(0.5 -0.866025 -0.866025 -0.5 64.5845 121.036)"
        fill="#BCB6D7"
      />
      <rect
        width="10.5608"
        height="4.30668"
        rx="2.15334"
        transform="matrix(0.5 -0.866025 -0.866025 -0.5 73.4155 121.036)"
        fill="#BCB6D7"
      />
      {/* Right Analog Stick Eye */}
      <circle cx="124.564" cy="86.3979" r="15.7694" fill="#033157" />
      <circle cx="124.774" cy="86.6083" r="10.5129" fill="#AFDDF5" />
      {/* Right Blush */}
      <rect
        width="10.5608"
        height="4.30668"
        rx="2.15334"
        transform="matrix(0.5 -0.866025 -0.866025 -0.5 117.57 121.036)"
        fill="#BCB6D7"
      />
      <rect
        width="10.5608"
        height="4.30668"
        rx="2.15334"
        transform="matrix(0.5 -0.866025 -0.866025 -0.5 126.401 121.036)"
        fill="#BCB6D7"
      />
      <rect
        width="10.5608"
        height="4.30668"
        rx="2.15334"
        transform="matrix(0.5 -0.866025 -0.866025 -0.5 135.231 121.036)"
        fill="#BCB6D7"
      />
      {/* Friendly Smile */}
      <path
        d="M85 104C85 104 87.8243 110 96 110C104.176 110 107 104 107 104"
        strokeWidth="9"
        strokeLinecap="round"
        stroke="#033157"
      />
    </svg>
  );
};
