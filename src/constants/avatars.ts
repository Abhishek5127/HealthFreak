import { ImageSourcePropType } from 'react-native';

export interface AvatarPreset {
  id: string;
  name: string;
  tag: string;
  source: ImageSourcePropType;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: 'avatar_1', name: 'Sisyphus Grind', tag: 'Unstoppable', source: require('../../assets/avatars/avatar_1.jpg') },
  { id: 'avatar_2', name: 'Manga Gymrat', tag: 'Demon Back', source: require('../../assets/avatars/avatar_2.jpg') },
  { id: 'avatar_3', name: 'Farnese Hercules', tag: 'Heavy Iron', source: require('../../assets/avatars/avatar_3.jpg') },
  { id: 'avatar_4', name: 'David Aesthetic', tag: 'Golden Ratio', source: require('../../assets/avatars/avatar_4.jpg') },
  { id: 'avatar_5', name: 'Atlas Heavens', tag: 'Max Weight', source: require('../../assets/avatars/avatar_5.jpg') },
  { id: 'avatar_6', name: 'Gladiator Mind', tag: 'Warrior', source: require('../../assets/avatars/avatar_6.jpg') },
  { id: 'avatar_7', name: 'The Thinker', tag: 'Stoic Grit', source: require('../../assets/avatars/avatar_7.jpg') },
  { id: 'avatar_8', name: 'Discobolus', tag: 'Greek God', source: require('../../assets/avatars/avatar_8.jpg') },
  { id: 'avatar_9', name: 'Titan Prometheus', tag: 'Pure Will', source: require('../../assets/avatars/avatar_9.jpg') },
  { id: 'avatar_10', name: 'Riace Spartan', tag: 'Chiseled', source: require('../../assets/avatars/avatar_10.jpg') },
  { id: 'avatar_11', name: 'Chalk & Iron', tag: 'Heavy Pull', source: require('../../assets/avatars/avatar_11.jpg') },
  { id: 'avatar_12', name: 'Dark Squat Rack', tag: 'Leg Day', source: require('../../assets/avatars/avatar_12.jpg') },
  { id: 'avatar_13', name: 'Shadow Shred', tag: 'Conditioned', source: require('../../assets/avatars/avatar_13.jpg') },
  { id: 'avatar_14', name: 'Hooded Beast', tag: 'Focus Mode', source: require('../../assets/avatars/avatar_14.jpg') },
  { id: 'avatar_15', name: 'Heavy Press', tag: 'Hypertrophy', source: require('../../assets/avatars/avatar_15.jpg') },
];

export const DEFAULT_AVATAR = require('../../assets/avatars/avatar_1.jpg');

export function getAvatarSource(avatarUrl?: string | null): ImageSourcePropType {
  if (!avatarUrl) return DEFAULT_AVATAR;
  const match = AVATAR_PRESETS.find((item) => item.id === avatarUrl);
  if (match) return match.source;
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://') || avatarUrl.startsWith('file://')) {
    return { uri: avatarUrl };
  }
  return DEFAULT_AVATAR;
}
