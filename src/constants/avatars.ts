import { ImageSourcePropType } from 'react-native';

export interface AvatarPreset {
  id: string;
  name: string;
  tag: string;
  color: string;
  description: string;
}

export const CARTOON_AVATARS: AvatarPreset[] = [
  { id: 'avatar_1', name: 'Sunny', tag: 'High Energy', color: '#F5C542', description: 'Energetic running star' },
  { id: 'avatar_2', name: 'Blush', tag: 'Calm & Zen', color: '#E891BA', description: 'Peaceful folded-arms hexagon' },
  { id: 'avatar_3', name: 'Clover', tag: 'Balance', color: '#68BF7B', description: 'Tree pose yoga clover' },
  { id: 'avatar_4', name: 'Pebble', tag: 'Recovery', color: '#A3B4A6', description: 'Cozy resting pill' },
  { id: 'avatar_5', name: 'Flexy', tag: 'Hypertrophy', color: '#4FA3E2', description: 'Smiling flexing dumbbell' },
  { id: 'avatar_6', name: 'Sprout', tag: 'Nutrition', color: '#52C480', description: 'Joyful sprouting bulb' },
  { id: 'avatar_7', name: 'Sparky', tag: 'Calorie Burn', color: '#FF715F', description: 'Dancing cardio flame' },
  { id: 'avatar_8', name: 'Berry', tag: 'Endurance', color: '#A288E3', description: 'Sweatband jogger berry' },
  { id: 'avatar_9', name: 'Kettle', tag: 'Strength', color: '#2A9D8F', description: 'Grinning iron kettlebell' },
  { id: 'avatar_10', name: 'Acrobat', tag: 'Agility', color: '#FFA07A', description: 'Handstand gymnast star' },
  { id: 'avatar_11', name: 'Splash', tag: 'Hydration', color: '#38B6FF', description: 'Goggles swimmer droplet' },
  { id: 'avatar_12', name: 'Luna', tag: 'Circadian', color: '#FFD166', description: 'Nightcap sleeping moon' },
  { id: 'avatar_13', name: 'Zippy', tag: 'Sprint Speed', color: '#FFE042', description: 'Sunglasses lightning bolt' },
  { id: 'avatar_14', name: 'Hearty', tag: 'Cardio Boxing', color: '#FF5A5F', description: 'Boxing gloves champion' },
  { id: 'avatar_15', name: 'Zenny', tag: 'Mindfulness', color: '#8D99AE', description: 'Lotus meditating stone' },
];

export const AVATAR_PRESETS = CARTOON_AVATARS;

export const DEFAULT_AVATAR = require('../../assets/avatars/avatar_1.jpg');

export function getAvatarSource(avatarUrl?: string | null): ImageSourcePropType {
  if (
    typeof avatarUrl === 'string' &&
    (avatarUrl.startsWith('http://') ||
      avatarUrl.startsWith('https://') ||
      avatarUrl.startsWith('file://'))
  ) {
    return { uri: avatarUrl };
  }
  return DEFAULT_AVATAR;
}
