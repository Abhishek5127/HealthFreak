import React from 'react';
import { HealthFreakLogo, HealthFreakWordmark } from '../common/HealthFreakLogo';

interface LogoProps {
  size?: number;
  showWordmark?: boolean;
}

/**
 * DishaLogoEmblem now renders the official HealthFreak Logo.
 * Maintained for backward compatibility across existing features.
 */
export const DishaLogoEmblem: React.FC<LogoProps> = ({ size = 48 }) => {
  return <HealthFreakLogo size={size} animated={false} withGlow={false} />;
};

/**
 * DishaWordmark now renders the official HealthFreak Wordmark.
 * Maintained for backward compatibility across existing features.
 */
export const DishaWordmark: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  return <HealthFreakWordmark size={size} />;
};
