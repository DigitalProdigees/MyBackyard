/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import useColorScheme from './useColorScheme';
import { colors } from '../theme';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof colors
) {
  const theme = useColorScheme();
  const colorFromProps = props[theme ?? 'light'];
  
  if (colorFromProps) {
    return colorFromProps;
  }
  return colors[colorName];
}

export default useThemeColor;
