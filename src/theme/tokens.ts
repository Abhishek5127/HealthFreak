import { Colors } from './colors';
import { Typography } from './typography';
import { Spacing } from './spacing';

export const Theme = {
  colors: Colors,
  typography: Typography,
  spacing: Spacing,
  animation: {
    micro: 180,
    normal: 280,
    modal: 380,
    spring: {
      damping: 18,
      stiffness: 140,
    },
    bouncySpring: {
      damping: 12,
      stiffness: 160,
    },
  },
};

export { Colors, Typography, Spacing };

