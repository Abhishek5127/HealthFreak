import { Platform } from 'react-native';

export const SPECULAR_LEFT = require('../../assets/liquidGlass/specular-map-left.png');
export const SPECULAR_RIGHT = require('../../assets/liquidGlass/specular-map-right.png');
export const GRAIN_TEXTURE = require('../../assets/images/glass_grain_texture.png');

export interface GlassTheme {
  isWhite: boolean;
  substrateColor: string;
  tintOverlayColor: string;
  borderColor: string;
  borderTopColor: string;
  borderBottomColor: string;
  textColor: string;
  textShadowColor: string;
  topSheenColor: string;
  shadowColor: string;
}

/**
 * Parses any color format (hex, rgb, rgba, color name) into RGB components
 * and determines if it should be treated as white.
 */
export function parseGlassColor(color?: string): { r: number; g: number; b: number; isWhite: boolean } {
  if (!color) {
    return { r: 255, g: 255, b: 255, isWhite: true };
  }

  const c = color.trim().toLowerCase();

  if (c === 'white' || c === '#fff' || c === '#ffffff' || c === '#fffdf9' || c === '#fafafa' || c === '#f5f5f5') {
    return { r: 255, g: 255, b: 255, isWhite: true };
  }

  if (c.startsWith('#')) {
    const hex = c.slice(1);
    let r = 255;
    let g = 255;
    let b = 255;

    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16) || 255;
      g = parseInt(hex[1] + hex[1], 16) || 255;
      b = parseInt(hex[2] + hex[2], 16) || 255;
    } else if (hex.length >= 6) {
      r = parseInt(hex.slice(0, 2), 16) || 255;
      g = parseInt(hex.slice(2, 4), 16) || 255;
      b = parseInt(hex.slice(4, 6), 16) || 255;
    }

    const isWhite = r >= 238 && g >= 238 && b >= 238;
    return { r, g, b, isWhite };
  }

  const match = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (match) {
    const r = parseInt(match[1], 10);
    const g = parseInt(match[2], 10);
    const b = parseInt(match[3], 10);
    const isWhite = r >= 238 && g >= 238 && b >= 238;
    return { r, g, b, isWhite };
  }

  return { r: 255, g: 255, b: 255, isWhite: true };
}

/**
 * Generates the authentic frosted glass theme according to the strict rule:
 * - If title is white -> Transparent frosted glass (exact style of login screen button & bottom bar)
 * - If title is colored -> Non-transparent lighter shade of that color with frosted blur, specular rims, and sheen
 */
export function getGlassTheme(titleColor?: string): GlassTheme {
  const { r, g, b, isWhite } = parseGlassColor(titleColor);

  if (isWhite) {
    return {
      isWhite: true,
      substrateColor: Platform.select({
        ios: 'rgba(18, 22, 20, 0.35)',
        android: 'rgba(20, 26, 22, 0.88)',
        default: 'rgba(18, 22, 20, 0.45)',
      }) as string,
      tintOverlayColor: Platform.select({
        ios: 'rgba(14, 18, 16, 0.55)',
        android: 'rgba(18, 24, 20, 0.82)',
        default: 'rgba(14, 18, 16, 0.60)',
      }) as string,
      borderColor: 'rgba(255, 255, 255, 0.28)',
      borderTopColor: 'rgba(255, 255, 255, 0.68)',
      borderBottomColor: 'rgba(255, 255, 255, 0.16)',
      textColor: '#FFFDF9',
      textShadowColor: 'rgba(0, 0, 0, 0.45)',
      topSheenColor: 'rgba(255, 255, 255, 0.48)',
      shadowColor: '#000000',
    };
  }

  const rLight = Math.min(255, r + 45);
  const gLight = Math.min(255, g + 45);
  const bLight = Math.min(255, b + 45);

  const rTint = Math.floor(r * 0.4);
  const gTint = Math.floor(g * 0.4);
  const bTint = Math.floor(b * 0.4);

  return {
    isWhite: false,
    substrateColor: Platform.select({
      ios: `rgba(${r}, ${g}, ${b}, 0.22)`,
      android: `rgba(${r}, ${g}, ${b}, 0.35)`,
      default: `rgba(${r}, ${g}, ${b}, 0.25)`,
    }) as string,
    tintOverlayColor: Platform.select({
      ios: `rgba(${rTint}, ${gTint}, ${bTint}, 0.45)`,
      android: `rgba(${rTint}, ${gTint}, ${bTint}, 0.70)`,
      default: `rgba(${rTint}, ${gTint}, ${bTint}, 0.50)`,
    }) as string,
    borderColor: `rgba(${r}, ${g}, ${b}, 0.42)`,
    borderTopColor: `rgba(${rLight}, ${gLight}, ${bLight}, 0.82)`,
    borderBottomColor: `rgba(${r}, ${g}, ${b}, 0.20)`,
    textColor: titleColor || `rgb(${r}, ${g}, ${b})`,
    textShadowColor: 'rgba(0, 0, 0, 0.50)',
    topSheenColor: `rgba(${rLight}, ${gLight}, ${bLight}, 0.55)`,
    shadowColor: '#000000',
  };
}

