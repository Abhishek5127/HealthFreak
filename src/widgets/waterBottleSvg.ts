/**
 * Generates an SVG string representation of the HealthFreak Water Bottle
 * for the Native Android Home Screen (Phone Desktop) Widget.
 *
 * Dynamically evolves facial expressions across water graduation bars:
 * - < 15%: Sad / Dehydrated
 * - 15% - 44%: Relieved / Sipping
 * - 45% - 74%: Content Gentle Half-Smile (Matches Design Target)
 * - 75% - 99%: Big Cheerful Grin
 * - 100%+: Radiant Ecstatic Smile & Golden Stars
 */
export function generateWaterBottleSvg(
  fillPercentage: number,
  width: number = 85,
  height: number = 140
): string {
  const clampedPercent = Math.min(Math.max(fillPercentage, 0), 100);

  // Geometry for viewBox 0 0 120 200
  const bottleTopY = 38;
  const bottleBottomY = 188;
  const bottleHeight = bottleBottomY - bottleTopY; // 150
  const liquidHeight = (clampedPercent / 100) * bottleHeight;
  const liquidTopY = bottleBottomY - liquidHeight;

  // Face smoothly tracks the water level while staying bounded inside bottle
  const faceCenterY = Math.min(Math.max(liquidTopY, 75), 140);

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
      <g>
        <path d="M 44,${faceCenterY - 7} Q 48,${faceCenterY - 3} 53,${faceCenterY - 5}" stroke="#1C384E" stroke-width="1.8" stroke-linecap="round" fill="none" opacity="0.85" />
        <path d="M 67,${faceCenterY - 5} Q 72,${faceCenterY - 3} 76,${faceCenterY - 7}" stroke="#1C384E" stroke-width="1.8" stroke-linecap="round" fill="none" opacity="0.85" />
        <circle cx="48" cy="${faceCenterY}" r="3" fill="#1C384E" />
        <circle cx="72" cy="${faceCenterY}" r="3" fill="#1C384E" />
        <path d="M 53,${faceCenterY + 14} Q 60,${faceCenterY + 7} 67,${faceCenterY + 14}" stroke="#1C384E" stroke-width="2.8" stroke-linecap="round" fill="none" />
        <path d="M 76,${faceCenterY + 3} C 74,${faceCenterY + 6} 74,${faceCenterY + 9} 76,${faceCenterY + 10} C 78,${faceCenterY + 9} 78,${faceCenterY + 6} 76,${faceCenterY + 3} Z" fill="#64B5F6" opacity="0.9" />
      </g>
    `;
  } else if (clampedPercent < 45) {
    // Level 1: Neutral / Sipping (15% - 44%)
    faceSvg = `
      <g opacity="0.75">
        <circle cx="48" cy="${faceCenterY - 2}" r="3" fill="#1C384E" />
        <circle cx="72" cy="${faceCenterY - 2}" r="3" fill="#1C384E" />
        <line x1="55" y1="${faceCenterY + 9}" x2="65" y2="${faceCenterY + 9}" stroke="#1C384E" stroke-width="2.5" stroke-linecap="round" />
      </g>
    `;
  } else if (clampedPercent < 75) {
    // Level 2: Gentle Half-Smile (45% - 74%) — Exact match to target design
    faceSvg = `
      <g>
        <circle cx="48" cy="${faceCenterY - 3.5}" r="3.2" fill="#1C384E" />
        <circle cx="72" cy="${faceCenterY - 3.5}" r="3.2" fill="#1C384E" />
        <circle cx="41" cy="${faceCenterY + 2.5}" r="3.5" fill="#FF8BA7" opacity="0.55" />
        <circle cx="79" cy="${faceCenterY + 2.5}" r="3.5" fill="#FF8BA7" opacity="0.55" />
        <path d="M 53,${faceCenterY + 6.5} Q 60,${faceCenterY + 14.5} 67,${faceCenterY + 6.5}" stroke="#1C384E" stroke-width="2.6" stroke-linecap="round" fill="none" />
      </g>
    `;
  } else if (clampedPercent < 100) {
    // Level 3: Big Cheerful Grin (75% - 99%)
    faceSvg = `
      <g>
        <path d="M 44,${faceCenterY - 5} Q 49,${faceCenterY - 12} 54,${faceCenterY - 5}" stroke="#0D2E49" stroke-width="3" stroke-linecap="round" fill="none" />
        <path d="M 66,${faceCenterY - 5} Q 71,${faceCenterY - 12} 76,${faceCenterY - 5}" stroke="#0D2E49" stroke-width="3" stroke-linecap="round" fill="none" />
        <circle cx="40" cy="${faceCenterY + 2}" r="4.2" fill="#FF8BA7" opacity="0.75" />
        <circle cx="80" cy="${faceCenterY + 2}" r="4.2" fill="#FF8BA7" opacity="0.75" />
        <path d="M 50,${faceCenterY + 4} Q 60,${faceCenterY + 20} 70,${faceCenterY + 4} Z" fill="#0D2E49" />
        <path d="M 54,${faceCenterY + 11} Q 60,${faceCenterY + 19} 66,${faceCenterY + 11} Z" fill="#FF6B8B" />
      </g>
    `;
  } else {
    // Level 4: Goal Hit (100%+) — Radiant Ecstatic Smile & Golden Stars
    faceSvg = `
      <g>
        <path d="M 43,${faceCenterY - 5} Q 49,${faceCenterY - 13} 55,${faceCenterY - 5}" stroke="#0D2E49" stroke-width="3.6" stroke-linecap="round" fill="none" />
        <path d="M 65,${faceCenterY - 5} Q 71,${faceCenterY - 13} 77,${faceCenterY - 5}" stroke="#0D2E49" stroke-width="3.6" stroke-linecap="round" fill="none" />
        <circle cx="39" cy="${faceCenterY + 3}" r="4.8" fill="#FF8BA7" opacity="0.9" />
        <circle cx="81" cy="${faceCenterY + 3}" r="4.8" fill="#FF8BA7" opacity="0.9" />
        <path d="M 48,${faceCenterY + 4} Q 60,${faceCenterY + 24} 72,${faceCenterY + 4} Z" fill="#0D2E49" />
        <path d="M 53,${faceCenterY + 13} Q 60,${faceCenterY + 23} 67,${faceCenterY + 13} Z" fill="#FF6B8B" />
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
      <linearGradient id="waterGrad_${width}_${height}" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#7AD3FA" stop-opacity="0.95" />
        <stop offset="35%" stop-color="#4FA3E2" stop-opacity="0.95" />
        <stop offset="100%" stop-color="#256EB3" stop-opacity="1" />
      </linearGradient>
      <clipPath id="bottleClip_${width}_${height}">
        <path d="${bottleInnerPath}" />
      </clipPath>
    </defs>

    <!-- Bottle Outer Glass Silhouette with Translucent Substrate -->
    <path d="${bottleInnerPath}" fill="rgba(18, 24, 22, 0.45)" stroke="rgba(122, 211, 250, 0.35)" stroke-width="2.5" />

    <!-- Clipped Water Fill & Reactive Facial Expressions -->
    <g clip-path="url(#bottleClip_${width}_${height})">
      <rect x="10" y="${liquidTopY}" width="100" height="${liquidHeight + 25}" fill="url(#waterGrad_${width}_${height})" />
      ${wavePath}
      ${faceSvg}
    </g>

    <!-- Cap Collar & Thread -->
    <rect x="42" y="27" width="36" height="11" rx="3" fill="#3D4B40" stroke="#546558" stroke-width="1.5" />
    <rect x="47" y="15" width="26" height="12" rx="4" fill="#2B362E" stroke="#546558" stroke-width="1.5" />
    <!-- Cap Loop Handle -->
    <path d="M 54,15 C 54,8 66,8 66,15" stroke="#546558" stroke-width="3" fill="none" stroke-linecap="round" />

    <!-- Graduation Bar Ticks -->
    <line x1="26" y1="140" x2="36" y2="140" stroke="#FFFFFF" stroke-width="1.8" opacity="0.4" />
    <line x1="26" y1="100" x2="39" y2="100" stroke="#FFFFFF" stroke-width="2.2" opacity="0.55" />
    <line x1="26" y1="65" x2="36" y2="65" stroke="#FFFFFF" stroke-width="1.8" opacity="0.4" />
  </svg>`;
}
