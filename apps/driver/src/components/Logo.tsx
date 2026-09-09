import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '../theme';

/**
 * Marka işareti: rota çizgisi + düğümler.
 *
 * <p>Web'deki Logo.tsx ile aynı çizim (apps/web/src/components/site/Logo.tsx).
 * Karınca metaforu figüratif değil yapısal — küçük noktaların bir hat üzerinde
 * birleşip tek bir sistem oluşturması.
 */
export function Logo({ size = 28, ink = '#ffffff' }: { size?: number; ink?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <Path
        d="M4 20.5c3.4 0 4.6-5.2 8-5.2s4.6 5.2 8 5.2"
        stroke={colors.route}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      <Circle cx={4} cy={20.5} r={2.6} fill={colors.route} />
      <Circle cx={12} cy={15.3} r={2.2} fill={ink} />
      <Circle cx={20} cy={20.5} r={2.6} fill={colors.route} />
      <Circle cx={16.4} cy={8.4} r={1.7} fill={ink} opacity={0.45} />
      <Circle cx={23.4} cy={11.4} r={1.4} fill={ink} opacity={0.28} />
    </Svg>
  );
}
