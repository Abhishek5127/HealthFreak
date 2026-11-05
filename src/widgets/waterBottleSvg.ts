/**
 * Generates an SVG string representation of the HealthFreak Water Bottle
 * for the Native Android Home Screen Widget.
 */
export function generateWaterBottleSvg(
  fillPercentage: number,
  width: number = 80,
  height: number = 140
): string {
  const isGoalReached = fillPercentage >= 100;
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

  const smileFaceElements = isGoalReached
    ? `
      <g transform="translate(0, 10)">
        <!-- Joyful curved arc eyes ^ ^ -->
        <path d="M 43,105 Q 49,97 55,105" stroke="#0D2E49" stroke-width="3.5" stroke-linecap="round" fill="none" />
        <path d="M 65,105 Q 71,97 77,105" stroke="#0D2E49" stroke-width="3.5" stroke-linecap="round" fill="none" />
        <!-- Rosy Cheeks -->
        <circle cx="39" cy="113" r="4.5" fill="#FF8BA7" opacity="0.85" />
        <circle cx="81" cy="113" r="4.5" fill="#FF8BA7" opacity="0.85" />
        <!-- Big Smiling Mouth -->
        <path d="M 48,114 Q 60,134 72,114 Z" fill="#0D2E49" />
        <path d="M 53,123 Q 60,133 67,123 Z" fill="#FF6B8B" />
      </g>
    `
    : `
      <!-- Focused/Determined Neutral Expression before goal -->
      <g transform="translate(0, 8)" opacity="${clampedPercent > 30 ? '0.75' : '0.4'}">
        <circle cx="48" cy="108" r="3" fill="#1C384E" />
        <circle cx="72" cy="108" r="3" fill="#1C384E" />
        <path d="M 54,118 Q 60,123 66,118" stroke="#1C384E" stroke-width="2.5" stroke-linecap="round" fill="none" />
      </g>
    `;

  const wavePath =
    clampedPercent > 0 && clampedPercent < 100
      ? `
        <path d="
          M 15,${liquidTopY + 2}
          Q 35,${liquidTopY - 4} 60,${liquidTopY}
          Q 85,${liquidTopY + 4} 105,${liquidTopY - 1}
          L 105,${liquidTopY + 12}
          L 15,${liquidTopY + 12}
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
      ${smileFaceElements}
    </g>

    <!-- Cap Collar & Outer Thread -->
    <rect x="42" y="27" width="36" height="11" rx="3" fill="#3D4B40" stroke="#546558" stroke-width="1.5" />
    <rect x="47" y="15" width="26" height="12" rx="4" fill="#2B362E" stroke="#546558" stroke-width="1.5" />
    <!-- Cap Loop Handle -->
    <path d="M 54,15 C 54,8 66,8 66,15" stroke="#546558" stroke-width="3" fill="none" stroke-linecap="round" />

    <!-- Measurement Graduation Ticks -->
    <line x1="26" y1="140" x2="35" y2="140" stroke="#FFFFFF" stroke-width="1.5" opacity="0.4" />
    <line x1="26" y1="100" x2="38" y2="100" stroke="#FFFFFF" stroke-width="2" opacity="0.5" />
    <line x1="26" y1="65" x2="35" y2="65" stroke="#FFFFFF" stroke-width="1.5" opacity="0.4" />
  </svg>`;
}
