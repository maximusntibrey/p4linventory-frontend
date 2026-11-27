// third-party
import { presetPalettes } from '@ant-design/colors';

// project imports
import ThemeOption from './theme';
import { extendPaletteWithChannels } from 'utils/colorUtils';

// Cool slate-tinted neutrals (brand): index 8 is the navy used for primary text.
const greyAscent = ['#F8FAFC', '#CBD5E1', '#3A4A5F', '#1E2A3A'];

// ==============================|| GREY COLORS BUILDER ||============================== //

function buildGrey() {
  let greyPrimary = [
    '#ffffff',
    '#F8FAFC',
    '#F1F4F8',
    '#E6EBF1',
    '#D5DCE5',
    '#CBD5E1',
    '#64748B',
    '#475569',
    '#1E2A3A',
    '#18222F',
    '#0F1620'
  ];
  let greyConstant = ['#F8FAFC', '#E6EBF1'];

  return [...greyPrimary, ...greyAscent, ...greyConstant];
}

// ==============================|| DEFAULT THEME - PALETTE ||============================== //

export function buildPalette(presetColor) {
  const lightColors = { ...presetPalettes, grey: buildGrey() };
  const lightPaletteColor = ThemeOption(lightColors, presetColor);

  const commonColor = { common: { black: '#000', white: '#fff' } };

  const extendedLight = extendPaletteWithChannels(lightPaletteColor);
  const extendedCommon = extendPaletteWithChannels(commonColor);

  return {
    light: {
      mode: 'light',
      ...extendedCommon,
      ...extendedLight,
      text: {
        primary: extendedLight.grey[700],
        secondary: extendedLight.grey[500],
        disabled: extendedLight.grey[400]
      },
      action: { disabled: extendedLight.grey[300] },
      divider: extendedLight.grey[200],
      background: {
        paper: extendedLight.grey[0],
        default: extendedLight.grey.A50
      }
    }
  };
}
