import React from 'react';
import { View, StyleSheet, Image, StyleProp, ViewStyle } from 'react-native';
import { CartoonAvatarView } from '../illustrations/CartoonAvatar';

export interface AppAvatarProps {
  avatarId?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
  bgColor?: string;
  borderColor?: string;
  borderWidth?: number;
}

export const AppAvatar: React.FC<AppAvatarProps> = ({
  avatarId,
  size = 64,
  style,
  bgColor = '#355544',
  borderColor,
  borderWidth = 0,
}) => {
  const isRemote =
    typeof avatarId === 'string' &&
    (avatarId.startsWith('http://') ||
      avatarId.startsWith('https://') ||
      avatarId.startsWith('file://'));

  return (
    <View
      style={[
        styles.wrapper,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth,
          borderColor: borderColor || 'transparent',
        },
        style,
      ]}
    >
      {isRemote ? (
        <Image
          source={{ uri: avatarId as string }}
          style={{ width: size - borderWidth * 2, height: size - borderWidth * 2, borderRadius: (size - borderWidth * 2) / 2 }}
        />
      ) : (
        <CartoonAvatarView
          id={avatarId}
          size={size - borderWidth * 2}
          bgColor={bgColor}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});

