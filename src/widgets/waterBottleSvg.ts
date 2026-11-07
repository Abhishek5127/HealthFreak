/**
 * Generates an SVG string representation of the HealthFreak Water Bottle
 * for the Native Android Home Screen Widget.
 *
 * Dynamically evolves facial expressions across water graduation bars:
 * - < 15%: Sad / Dehydrated 🥺
 * - 15% - 44%: Relieved / Sipping 😐
 * - 45% - 74%: Content Half-Smile 🙂
 * - 75% - 99%: Big Cheerful Grin 😄
 * - 100%+: Radiant Ecstatic Smile 🥰✨
 */
export function generateWaterBottleSvg(
  fillPercentage: number,
  width: number = 85,
  height: number = 135,
  addedBadgeText?: string
): string {
  const clampedPercent = Math.min(Math.max(fillPercentage, 0), 100);

  // Geometry for viewBox 0 0 120 200
  const bottleTopY = 38;
  const bottleBottomY = 188;
  const bottleHeight = bottleBottomY - bottleTopY; // 150
  const liquidHeight = (clampedPercent / 100) * bottleHeight;
  const liquidTopY = bottleBottomY - liquidHeight;

  const bottleInnerPath = `
    M 44,38
    L 76,38
    C 80,38 84,42 85,47
    L 94,65
    C 98,72 98,78 98,85
    L 98,176
    C 98,184 91,188 83,188
    L 37,188
    C 29,188 22,184 22,176
    L 22,85
    C 22,78 22,72 26,65
    L 35,47
    C 36,42 40,38 44,38
    Z
  `;

  let faceSvg = '';

  if (clampedPercent < 15) {
    // Level 0: Sad & Dehydrated (< 15%)
    faceSvg = `
      <g transform="translate(0, 10)">
        <path d="M 44,103 Q 48,107 53,105" stroke="#1C384E" stroke-width="1.8" stroke-linecap="round" fill="none" opacity="0.85" />
        <path d="M 67,105 Q 72,107 76,103" stroke="#1C384E" stroke-width="1.8" stroke-linecap="round" fill="none" opacity="0.85" />
        <circle cx="48" cy="110" r="3" fill="#1C384E" />
        <circle cx="72" cy="110" r="3" fill="#1C384E" />
        <path d="M 53,124 Q 60,117 67,124" stroke="#1C384E" stroke-width="2.8" stroke-linecap="round" fill="none" />
        <path d="M 76,113 C 74,116 74,119 76,120 C 78,119 78,116 76,113 Z" fill="#64B5F6" opacity="0.9" />
      </g>
    `;
  } else if (clampedPercent < 45) {
    // Level 1: Reaching Bar 1 (15% - 44%) — Sipping / Neutral
    faceSvg = `
      <g transform="translate(0, 8)" opacity="0.75">
        <circle cx="48" cy="109" r="3" fill="#1C384E" />
        <circle cx="72" cy="109" r="3" fill="#1C384E" />
        <line x1="55" y1="120" x2="65" y2="120" stroke="#1C384E" stroke-width="2.5" stroke-linecap="round" />
      </g>
    `;
  } else if (clampedPercent < 75) {
    // Level 2: Reaching Bar 2 (45% - 74%) — Content Half-Smile
    faceSvg = `
      <g transform="translate(0, 9)">
        <circle cx="48" cy="108" r="3.2" fill="#1C384E" />
        <circle cx="72" cy="108" r="3.2" fill="#1C384E" />
        <circle cx="41" cy="114" r="3.5" fill="#FF8BA7" opacity="0.5" />
        <circle cx="79" cy="114" r="3.5" fill="#FF8BA7" opacity="0.5" />
        <path d="M 53,118 Q 60,126 67,118" stroke="#1C384E" stroke-width="2.6" stroke-linecap="round" fill="none" />
      </g>
    `;
  } else if (clampedPercent < 100) {
    // Level 3: Reaching Bar 3 (75% - 99%) — Big Cheerful Grin
    faceSvg = `
      <g transform="translate(0, 9)">
        <path d="M 44,106 Q 49,99 54,106" stroke="#0D2E49" stroke-width="3" stroke-linecap="round" fill="none" />
        <path d="M 66,106 Q 71,99 76,106" stroke="#0D2E49" stroke-width="3" stroke-linecap="round" fill="none" />
        <circle cx="40" cy="113" r="4.2" fill="#FF8BA7" opacity="0.75" />
        <circle cx="80" cy="113" r="4.2" fill="#FF8BA7" opacity="0.75" />
        <path d="M 50,115 Q 60,131 70,115 Z" fill="#0D2E49" />
        <path d="M 54,122 Q 60,130 66,122 Z" fill="#FF6B8B" />
      </g>
    `;
  } else {
    // Level 4: Goal Hit (100%+) — Radiant Ecstatic Smile & Celebration Stars
    faceSvg = `
      <g transform="translate(0, 9)">
        <path d="M 43,105 Q 49,97 55,105" stroke="#0D2E49" stroke-width="3.6" stroke-linecap="round" fill="none" />
        <path d="M 65,105 Q 71,97 77,105" stroke="#0D2E49" stroke-width="3.6" stroke-linecap="round" fill="none" />
        <circle cx="39" cy="113" r="4.8" fill="#FF8BA7" opacity="0.9" />
        <circle cx="81" cy="113" r="4.8" fill="#FF8BA7" opacity="0.9" />
        <path d="M 48,114 Q 60,134 72,114 Z" fill="#0D2E49" />
        <path d="M 53,123 Q 60,133 67,123 Z" fill="#FF6B8B" />
        <polygon points="35,32 37,37 42,37 38,40 39,45 35,42 31,45 32,40 28,37 33,37" fill="#FFD166" opacity="0.95" />
        <polygon points="85,32 87,37 92,37 88,40 89,45 85,42 81,45 82,40 78,37 83,37" fill="#FFD166" opacity="0.95" />
      </g>
    `;
  }

  const wavePath =
    clampedPercent > 0 && clampedPercent < 100
      ? `
        <path d="
          M 15,${liquidTopY + 2}
          Q 35,${liquidTopY - 4} 60,${liquidTopY}
          Q 85,${liquidTopY + 4} 105,${liquidTopY - 1}
          L 105,${liquidTopY + 14}
          L 15,${liquidTopY + 14}
          Z
        " fill="#98E1FD" opacity="0.85" />
      `
      : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 120 200">
    <defs>
      <linearGradient id="waterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#7AD3FA" stop-opacity="0.95" />
        <stop offset="35%" stop-color="#4FA3E2" stop-opacity="0.95" />
        <stop offset="100%" stop-color="#256EB3" stop-opacity="1" />
      </linearGradient>
      <clipPath id="bottleClip">
        <path d="${bottleInnerPath}" />
      </clipPath>
    </defs>

    <!-- Bottle Empty Background -->
    <path d="${bottleInnerPath}" fill="#142018" stroke="#2D4233" stroke-width="3.5" />

    <!-- Liquid Fill Clipped Inside Bottle -->
    <g clip-path="url(#bottleClip)">
      <rect x="10" y="${liquidTopY}" width="100" height="${liquidHeight + 25}" fill="url(#waterGrad)" />
      ${wavePath}
      ${faceSvg}
    </g>

    <!-- Cap Collar & Outer Thread -->
    <rect x="42" y="27" width="36" height="11" rx="3" fill="#3D4B40" stroke="#546558" stroke-width="1.5" />
    <rect x="47" y="15" width="26" height="12" rx="4" fill="#2B362E" stroke="#546558" stroke-width="1.5" />
    <!-- Cap Loop Handle -->
    <path d="M 54,15 C 54,8 66,8 66,15" stroke="#546558" stroke-width="3" fill="none" stroke-linecap="round" />

    <!-- Measurement Graduation Ticks -->
    <line x1="26" y1="140" x2="36" y2="140" stroke="#FFFFFF" stroke-width="1.8" opacity="0.4" />
    <line x1="26" y1="100" x2="39" y2="100" stroke="#FFFFFF" stroke-width="2.2" opacity="0.55" />
    <line x1="26" y1="65" x2="36" y2="65" stroke="#FFFFFF" stroke-width="1.8" opacity="0.4" />

    ${
      addedBadgeText
        ? `
        <!-- Floating +150ml Luminous Badge -->
        <g transform="translate(60, 48)">
          <rect x="-28" y="-10" width="56" height="20" rx="10" fill="rgba(8, 24, 16, 0.88)" stroke="#4FA3E2" stroke-width="1" />
          <text x="0" y="4" fill="#FFFFFF" font-size="11" font-weight="bold" text-anchor="middle" font-family="sans-serif">${addedBadgeText}</text>
        </g>
      `
        : ''
    }
  </svg>`;
}
