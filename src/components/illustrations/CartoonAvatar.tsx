import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Svg, {
  Path,
  Circle,
  G,
  Ellipse,
  Polygon,
  Rect,
} from 'react-native-svg';

export interface CartoonAvatarProps {
  id?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
  bgColor?: string;
}

export const CartoonAvatarView: React.FC<CartoonAvatarProps> = ({
  id = 'avatar_1',
  size = 80,
  style,
  bgColor = '#355544',
}) => {
  const normalizedId = id && id.startsWith('avatar_') ? id : 'avatar_1';

  const renderCharacter = () => {
    switch (normalizedId) {
      // 1. Sunny - The Energized Star with Peace Sign & Running Legs
      case 'avatar_1':
        return (
          <G>
            {/* Left Arm: Waving Peace Sign */}
            <Path
              d="M 45 80 C 25 75 18 55 24 45 C 26 40 32 42 30 48 C 28 54 36 65 52 72"
              stroke="#191C1A"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M 24 45 L 20 32 M 24 45 L 30 34"
              stroke="#191C1A"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            {/* Right Arm: Trailing dynamic arm */}
            <Path
              d="M 115 88 C 135 90 148 105 140 120 C 136 126 128 122 132 115 C 135 110 130 98 112 85"
              stroke="#191C1A"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            {/* Left Leg: Running step */}
            <Path
              d="M 68 115 C 60 130 45 140 38 135 C 34 132 38 124 45 126"
              stroke="#191C1A"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <Ellipse cx="38" cy="135" rx="8" ry="4.5" fill="#191C1A" transform="rotate(-15 38 135)" />
            {/* Right Leg */}
            <Path
              d="M 92 118 C 105 130 125 125 134 116"
              stroke="#191C1A"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <Ellipse cx="134" cy="116" rx="8" ry="4.5" fill="#191C1A" transform="rotate(25 134 116)" />
            {/* Main Star Body */}
            <Polygon
              points="80,30 94,48 116,42 120,64 140,75 130,95 138,118 116,118 106,138 85,128 70,140 58,122 36,124 42,102 24,90 38,72 32,50 54,52 64,32"
              fill="#F5C542"
              stroke="#E5B22E"
              strokeWidth="1.5"
            />
            {/* Face */}
            <Circle cx="68" cy="78" r="4" fill="#191C1A" />
            <Circle cx="96" cy="78" r="4" fill="#191C1A" />
            <Path d="M 66 90 Q 82 108 98 90" stroke="#191C1A" strokeWidth="3.8" strokeLinecap="round" />
          </G>
        );

      // 2. Blush - The Calm Pink Hexagon with Folded Arms
      case 'avatar_2':
        return (
          <G>
            {/* Legs */}
            <Path d="M 72 120 L 70 148 L 62 148" stroke="#191C1A" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M 88 120 L 90 148 L 98 148" stroke="#191C1A" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            {/* Arms folded */}
            <Path
              d="M 52 100 C 44 112 55 125 80 125 C 105 125 116 112 108 100 C 102 92 58 92 52 100 Z"
              fill="#2C4837"
              stroke="#191C1A"
              strokeWidth="2.5"
            />
            <Path d="M 58 105 C 70 115 88 115 102 105" stroke="#191C1A" strokeWidth="2.2" strokeLinecap="round" />
            <Path d="M 64 102 C 68 112 76 116 82 116" stroke="#191C1A" strokeWidth="1.8" strokeLinecap="round" />
            <Path d="M 96 102 C 92 112 84 116 78 116" stroke="#191C1A" strokeWidth="1.8" strokeLinecap="round" />
            {/* Hexagon Head */}
            <Polygon
              points="80,24 118,44 118,88 80,108 42,88 42,44"
              fill="#E891BA"
              stroke="#D878A6"
              strokeWidth="1.5"
            />
            {/* Peaceful Sleeping Eyes */}
            <Path d="M 62 60 Q 68 55 74 60" stroke="#191C1A" strokeWidth="3" strokeLinecap="round" />
            <Path d="M 86 60 Q 92 55 98 60" stroke="#191C1A" strokeWidth="3" strokeLinecap="round" />
            <Path d="M 80 62 L 80 69" stroke="#191C1A" strokeWidth="2.5" strokeLinecap="round" />
            <Ellipse cx="80" cy="76" rx="3.5" ry="2.5" fill="#191C1A" />
          </G>
        );

      // 3. Clover - The 4-Petal Green Yoga Tree Pose
      case 'avatar_3':
        return (
          <G>
            {/* Standing Leg */}
            <Path d="M 82 118 L 84 150 L 92 150" stroke="#191C1A" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            {/* Bent Tree Leg */}
            <Path d="M 82 118 L 60 130 L 82 134" stroke="#191C1A" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            {/* Prayer Arms */}
            <Path d="M 52 82 C 40 50 55 28 78 20 M 108 82 C 120 50 105 28 82 20" stroke="#191C1A" strokeWidth="3.2" strokeLinecap="round" />
            <Path d="M 78 20 C 76 12 84 12 82 20" stroke="#191C1A" strokeWidth="3.5" strokeLinecap="round" />
            {/* Clover Petals */}
            <G fill="#68BF7B" stroke="#52A865" strokeWidth="1.5">
              <Circle cx="64" cy="62" r="22" />
              <Circle cx="96" cy="62" r="22" />
              <Circle cx="64" cy="92" r="22" />
              <Circle cx="96" cy="92" r="22" />
              <Rect x="64" y="62" width="32" height="30" strokeWidth="0" />
            </G>
            {/* Zen Eyes & Smile */}
            <Path d="M 68 76 Q 74 72 78 76" stroke="#191C1A" strokeWidth="3" strokeLinecap="round" />
            <Path d="M 82 76 Q 86 72 92 76" stroke="#191C1A" strokeWidth="3" strokeLinecap="round" />
            <Path d="M 80 77 L 80 83" stroke="#191C1A" strokeWidth="2.5" strokeLinecap="round" />
            <Ellipse cx="80" cy="88" rx="3.5" ry="2.2" fill="#191C1A" />
          </G>
        );

      // 4. Pebble - The Cozy Sleep Pill with Zzz
      case 'avatar_4':
        return (
          <G>
            <Ellipse cx="80" cy="92" rx="48" ry="32" fill="#A3B4A6" stroke="#8A9D8D" strokeWidth="1.5" />
            <Path d="M 62 88 Q 70 94 76 88" stroke="#191C1A" strokeWidth="3" strokeLinecap="round" />
            <Path d="M 84 88 Q 90 94 98 88" stroke="#191C1A" strokeWidth="3" strokeLinecap="round" />
            <Path d="M 78 94 Q 80 97 82 94" stroke="#191C1A" strokeWidth="2" strokeLinecap="round" />
            {/* Floating zzz */}
            <Path d="M 112 55 L 122 55 L 112 65 L 122 65" stroke="#F4F2EC" strokeWidth="2.4" strokeLinecap="round" opacity={0.85} />
            <Path d="M 126 38 L 134 38 L 126 46 L 134 46" stroke="#F4F2EC" strokeWidth="2.2" strokeLinecap="round" opacity={0.65} />
            {/* Feet */}
            <Ellipse cx="50" cy="116" rx="10" ry="6" fill="#191C1A" />
            <Ellipse cx="110" cy="116" rx="10" ry="6" fill="#191C1A" />
          </G>
        );

      // 5. Flexy - The Smiling Dumbbell Bicep Flex
      case 'avatar_5':
        return (
          <G>
            {/* Legs */}
            <Path d="M 66 94 L 62 136 L 52 136" stroke="#191C1A" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M 94 94 L 98 136 L 108 136" stroke="#191C1A" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            {/* Flexing Arms */}
            <Path d="M 46 76 C 24 70 18 46 28 42 C 36 38 42 54 48 70" stroke="#191C1A" strokeWidth="3.8" strokeLinecap="round" />
            <Path d="M 114 76 C 136 70 142 46 132 42 C 124 38 118 54 112 70" stroke="#191C1A" strokeWidth="3.8" strokeLinecap="round" />
            {/* Weights & Bar */}
            <Rect x="42" y="66" width="76" height="26" rx="13" fill="#4FA3E2" stroke="#3585C2" strokeWidth="1.5" />
            <Rect x="26" y="50" width="18" height="58" rx="8" fill="#3585C2" />
            <Rect x="116" y="50" width="18" height="58" rx="8" fill="#3585C2" />
            {/* Face on Barbell */}
            <Circle cx="72" cy="78" r="3.5" fill="#191C1A" />
            <Path d="M 85 76 Q 90 82 95 76" stroke="#191C1A" strokeWidth="2.5" strokeLinecap="round" />
            <Path d="M 74 84 Q 80 91 86 84" stroke="#191C1A" strokeWidth="2.5" strokeLinecap="round" />
          </G>
        );

      // 6. Sprout - Plant Teardrop with Leaves
      case 'avatar_6':
        return (
          <G>
            {/* Legs */}
            <Path d="M 70 128 L 66 148 L 56 148" stroke="#191C1A" strokeWidth="4" strokeLinecap="round" />
            <Path d="M 90 128 L 94 148 L 104 148" stroke="#191C1A" strokeWidth="4" strokeLinecap="round" />
            {/* Body */}
            <Path
              d="M 80 40 C 112 40 126 78 120 108 C 114 132 98 136 80 136 C 62 136 46 132 40 108 C 34 78 48 40 80 40 Z"
              fill="#52C480"
              stroke="#3BAE69"
              strokeWidth="1.5"
            />
            {/* Sprout Leaves on Top */}
            <Path d="M 80 40 C 68 20 48 24 56 38 C 64 42 74 40 80 40" fill="#75E2A0" stroke="#3BAE69" strokeWidth="1.5" />
            <Path d="M 80 40 C 92 20 112 24 104 38 C 96 42 86 40 80 40" fill="#75E2A0" stroke="#3BAE69" strokeWidth="1.5" />
            {/* Cheerful Eyes & Cheeks */}
            <Circle cx="66" cy="84" r="4.2" fill="#191C1A" />
            <Circle cx="94" cy="84" r="4.2" fill="#191C1A" />
            <Circle cx="58" cy="94" r="5" fill="#FF8E8A" opacity={0.65} />
            <Circle cx="102" cy="94" r="5" fill="#FF8E8A" opacity={0.65} />
            <Path d="M 72 94 Q 80 104 88 94" stroke="#191C1A" strokeWidth="3" strokeLinecap="round" />
            {/* Waving Arms */}
            <Path d="M 44 92 C 30 84 25 72 32 66" stroke="#191C1A" strokeWidth="3.5" strokeLinecap="round" />
            <Path d="M 116 92 C 130 84 135 72 128 66" stroke="#191C1A" strokeWidth="3.5" strokeLinecap="round" />
          </G>
        );

      // 7. Sparky - Energetic Cardio Flame
      case 'avatar_7':
        return (
          <G>
            {/* Running Legs */}
            <Path d="M 68 125 C 55 135 45 142 36 136" stroke="#191C1A" strokeWidth="4" strokeLinecap="round" />
            <Ellipse cx="36" cy="136" rx="8" ry="4.5" fill="#191C1A" transform="rotate(-15 36 136)" />
            <Path d="M 92 125 C 105 135 120 130 130 120" stroke="#191C1A" strokeWidth="4" strokeLinecap="round" />
            <Ellipse cx="130" cy="120" rx="8" ry="4.5" fill="#191C1A" transform="rotate(25 130 120)" />
            {/* Outer Flame */}
            <Path
              d="M 80 20 C 105 45 125 70 122 100 C 118 128 98 136 80 136 C 62 136 42 128 38 100 C 35 70 55 45 80 20 Z"
              fill="#FF715F"
              stroke="#E85846"
              strokeWidth="1.5"
            />
            {/* Inner Flame */}
            <Path
              d="M 80 55 C 96 75 106 90 102 110 C 98 122 90 128 80 128 C 70 128 62 122 58 110 C 54 90 64 75 80 55 Z"
              fill="#FFAA5A"
            />
            {/* Face */}
            <Circle cx="68" cy="88" r="4" fill="#191C1A" />
            <Circle cx="92" cy="88" r="4" fill="#191C1A" />
            <Path d="M 68 100 Q 80 114 92 100 Z" fill="#191C1A" />
            {/* Dynamic Arms */}
            <Path d="M 40 92 C 22 90 18 78 26 70" stroke="#191C1A" strokeWidth="3.5" strokeLinecap="round" />
            <Path d="M 120 92 C 138 90 142 78 134 70" stroke="#191C1A" strokeWidth="3.5" strokeLinecap="round" />
          </G>
        );

      // 8. Berry - Lavender Jogger with Headband
      case 'avatar_8':
        return (
          <G>
            {/* Running legs */}
            <Path d="M 68 116 L 56 144 L 46 144" stroke="#191C1A" strokeWidth="4.2" strokeLinecap="round" />
            <Path d="M 92 116 L 106 142 L 118 136" stroke="#191C1A" strokeWidth="4.2" strokeLinecap="round" />
            {/* Berry Body */}
            <Circle cx="80" cy="80" r="42" fill="#A288E3" stroke="#8A6ECF" strokeWidth="1.5" />
            {/* Headband */}
            <Rect x="40" y="52" width="80" height="15" rx="7.5" fill="#FFFFFF" />
            <Rect x="44" y="57" width="72" height="5" rx="2.5" fill="#52C480" />
            {/* Sweat Drop */}
            <Path d="M 116 72 C 120 78 120 83 116 85 C 112 87 108 83 112 77 Z" fill="#5CE1E6" />
            {/* Eyes & Mouth */}
            <Circle cx="68" cy="82" r="3.8" fill="#191C1A" />
            <Circle cx="92" cy="82" r="3.8" fill="#191C1A" />
            <Path d="M 74 92 Q 80 98 86 92" stroke="#191C1A" strokeWidth="2.8" strokeLinecap="round" />
            {/* Pumping Arms */}
            <Path d="M 44 86 L 32 98 L 26 90" stroke="#191C1A" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M 116 86 L 128 76 L 136 82" stroke="#191C1A" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          </G>
        );

      // 9. Kettle - The Grinning Teal Kettlebell
      case 'avatar_9':
        return (
          <G>
            {/* Top Loop Handle */}
            <Path d="M 58 55 C 58 26 102 26 102 55" stroke="#1B6D63" strokeWidth="12" strokeLinecap="round" fill="none" />
            {/* Kettlebell Body */}
            <Circle cx="80" cy="94" r="38" fill="#2A9D8F" stroke="#1F7D72" strokeWidth="1.5" />
            <Rect x="60" y="124" width="40" height="8" rx="4" fill="#1F7D72" />
            {/* Wide Grin */}
            <Circle cx="68" cy="84" r="4" fill="#191C1A" />
            <Circle cx="92" cy="84" r="4" fill="#191C1A" />
            <Path d="M 66 94 Q 80 114 94 94 Z" fill="#191C1A" />
            {/* Stick Hands on Hips */}
            <Path d="M 46 94 C 34 100 36 112 48 114" stroke="#191C1A" strokeWidth="3.5" strokeLinecap="round" />
            <Path d="M 114 94 C 126 100 124 112 112 114" stroke="#191C1A" strokeWidth="3.5" strokeLinecap="round" />
          </G>
        );

      // 10. Acrobat - Handstand Peach Star
      case 'avatar_10':
        return (
          <G>
            {/* Ground Handstand Arms */}
            <Path d="M 64 95 L 50 144 L 42 144" stroke="#191C1A" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M 96 95 L 110 144 L 118 144" stroke="#191C1A" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
            {/* Inverted Star Body */}
            <Polygon
              points="80,125 94,107 116,113 120,91 140,80 130,60 138,37 116,37 106,17 85,27 70,15 58,33 36,31 42,53 24,65 38,83 32,105 54,103 64,123"
              fill="#FFA07A"
              stroke="#E88A64"
              strokeWidth="1.5"
            />
            {/* Upside-down playful face */}
            <Circle cx="70" cy="72" r="3.8" fill="#191C1A" />
            <Circle cx="90" cy="72" r="3.8" fill="#191C1A" />
            <Path d="M 72 62 Q 80 54 88 62" stroke="#191C1A" strokeWidth="2.8" strokeLinecap="round" />
          </G>
        );

      // 11. Splash - Swimmer Droplet with Goggles
      case 'avatar_11':
        return (
          <G>
            {/* Droplet Body */}
            <Path
              d="M 80 25 C 115 75 125 105 116 125 C 106 142 80 142 80 142 C 80 142 54 142 44 125 C 35 105 45 75 80 25 Z"
              fill="#38B6FF"
              stroke="#2098DF"
              strokeWidth="1.5"
            />
            {/* Goggles on Forehead */}
            <Rect x="46" y="58" width="68" height="16" rx="8" fill="#191C1A" />
            <Ellipse cx="62" cy="66" rx="9" ry="6" fill="#FFFFFF" />
            <Ellipse cx="98" cy="66" rx="9" ry="6" fill="#FFFFFF" />
            {/* Eyes & Big Beaming Mouth */}
            <Circle cx="68" cy="90" r="3.8" fill="#191C1A" />
            <Circle cx="92" cy="90" r="3.8" fill="#191C1A" />
            <Path d="M 68 98 Q 80 114 92 98 Z" fill="#191C1A" />
            {/* Splash Arms */}
            <Path d="M 44 105 C 28 100 22 88 30 80" stroke="#191C1A" strokeWidth="3.5" strokeLinecap="round" />
            <Path d="M 116 105 C 132 100 138 88 130 80" stroke="#191C1A" strokeWidth="3.5" strokeLinecap="round" />
            {/* Mini droplet dots */}
            <Circle cx="24" cy="68" r="3.5" fill="#38B6FF" />
            <Circle cx="136" cy="68" r="3.5" fill="#38B6FF" />
          </G>
        );

      // 12. Luna - Sleeping Moon in Nightcap
      case 'avatar_12':
        return (
          <G>
            {/* Crescent Moon */}
            <Path
              d="M 90 28 C 50 38 42 110 96 132 C 60 126 52 56 94 36 Z"
              fill="#FFD166"
              stroke="#E8BC4C"
              strokeWidth="1.5"
            />
            {/* Nightcap */}
            <Path d="M 94 34 C 110 24 128 32 136 48 C 130 46 112 40 96 46 Z" fill="#FF6B6B" />
            <Circle cx="136" cy="48" r="6" fill="#FFFFFF" />
            {/* Sleeping Face */}
            <Path d="M 66 78 Q 72 84 78 78" stroke="#191C1A" strokeWidth="2.8" strokeLinecap="round" />
            <Path d="M 72 88 Q 76 92 80 88" stroke="#191C1A" strokeWidth="2.4" strokeLinecap="round" />
            {/* Little Cloud Hugged */}
            <Ellipse cx="90" cy="104" rx="18" ry="10" fill="#FFFFFF" opacity={0.9} />
            <Circle cx="80" cy="98" r="8" fill="#FFFFFF" opacity={0.9} />
            <Circle cx="98" cy="100" r="8" fill="#FFFFFF" opacity={0.9} />
          </G>
        );

      // 13. Zippy - Lightning Bolt with Sunglasses
      case 'avatar_13':
        return (
          <G>
            {/* Running legs */}
            <Path d="M 68 116 L 56 144 L 46 144" stroke="#191C1A" strokeWidth="4.2" strokeLinecap="round" />
            <Path d="M 90 116 L 106 142 L 118 136" stroke="#191C1A" strokeWidth="4.2" strokeLinecap="round" />
            {/* Lightning Bolt */}
            <Polygon
              points="94,18 52,78 78,78 66,138 116,68 88,68 104,18"
              fill="#FFE042"
              stroke="#E5C725"
              strokeWidth="1.5"
            />
            {/* Cool Sunglasses */}
            <Path d="M 60 64 L 98 64 L 94 74 L 64 74 Z" fill="#191C1A" />
            <Path d="M 70 82 Q 80 89 90 82" stroke="#191C1A" strokeWidth="2.8" strokeLinecap="round" />
            {/* Speed lines */}
            <Path d="M 28 60 L 44 60 M 22 75 L 38 75 M 30 90 L 46 90" stroke="#FFE042" strokeWidth="2.5" strokeLinecap="round" opacity={0.8} />
          </G>
        );

      // 14. Hearty - Cardio Boxing Heart Champion
      case 'avatar_14':
        return (
          <G>
            {/* Legs */}
            <Path d="M 68 114 L 62 144 L 52 144" stroke="#191C1A" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M 92 114 L 98 144 L 108 144" stroke="#191C1A" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            {/* Heart Body */}
            <Path
              d="M 80 48 C 68 26 38 30 38 58 C 38 88 75 112 80 120 C 85 112 122 88 122 58 C 122 30 92 26 80 48 Z"
              fill="#FF5A5F"
              stroke="#DE3F44"
              strokeWidth="1.5"
            />
            {/* Boxing Gloves */}
            <Path d="M 44 78 L 30 84" stroke="#191C1A" strokeWidth="3.5" strokeLinecap="round" />
            <Circle cx="24" cy="85" r="11" fill="#C2181D" stroke="#191C1A" strokeWidth="2" />
            <Path d="M 116 78 L 130 84" stroke="#191C1A" strokeWidth="3.5" strokeLinecap="round" />
            <Circle cx="136" cy="85" r="11" fill="#C2181D" stroke="#191C1A" strokeWidth="2" />
            {/* Determined Eyebrows & Face */}
            <Path d="M 60 62 L 72 67" stroke="#191C1A" strokeWidth="2.5" strokeLinecap="round" />
            <Path d="M 100 62 L 88 67" stroke="#191C1A" strokeWidth="2.5" strokeLinecap="round" />
            <Circle cx="66" cy="74" r="3.5" fill="#191C1A" />
            <Circle cx="94" cy="74" r="3.5" fill="#191C1A" />
            <Path d="M 72 84 Q 80 90 88 84" stroke="#191C1A" strokeWidth="2.5" strokeLinecap="round" />
          </G>
        );

      // 15. Zenny - Lotus River Stone Stack
      case 'avatar_15':
      default:
        return (
          <G>
            {/* Bottom Stone */}
            <Ellipse cx="80" cy="120" rx="42" ry="16" fill="#6C7A8E" stroke="#5B687C" strokeWidth="1.5" />
            {/* Middle Stone */}
            <Ellipse cx="80" cy="98" rx="34" ry="14" fill="#8D99AE" stroke="#758296" strokeWidth="1.5" />
            {/* Top Stone */}
            <Ellipse cx="80" cy="72" rx="26" ry="18" fill="#A8B2C1" stroke="#8D99AE" strokeWidth="1.5" />
            {/* Floating Sprout on Top */}
            <Path d="M 80 54 C 74 40 88 36 90 44 Z" fill="#52C480" />
            <Path d="M 80 54 L 84 46" stroke="#191C1A" strokeWidth="1.8" strokeLinecap="round" />
            {/* Meditating Closed Eyes */}
            <Path d="M 68 70 Q 74 66 78 70" stroke="#191C1A" strokeWidth="2.5" strokeLinecap="round" />
            <Path d="M 82 70 Q 86 66 92 70" stroke="#191C1A" strokeWidth="2.5" strokeLinecap="round" />
            <Path d="M 80 73 L 80 77" stroke="#191C1A" strokeWidth="2" strokeLinecap="round" />
            <Ellipse cx="80" cy="80" rx="3" ry="1.8" fill="#191C1A" />
          </G>
        );
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bgColor,
        },
        style,
      ]}
    >
      <Svg width={size} height={size} viewBox="0 0 160 160">
        {renderCharacter()}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});

