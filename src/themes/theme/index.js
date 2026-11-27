// ==============================|| PRESET THEME - DEFAULT ||============================== //

// Brand scales (sampled from the logo). Index order matches the Ant presets used by the template:
// 0 lighter, 1..2 tints, 3 light, 4 accent, 5 main, 6 dark, 7, 8 darker, 9.
// Orange: main (#C2410C) is the AA fill for white text; accent (#FF6A00) is for bars, icons, charts, focus.
export const brandOrange = [
  '#FFF7ED',
  '#FFEDD5',
  '#FED7AA',
  '#FDBA74',
  '#FF6A00',
  '#C2410C',
  '#9A3412',
  '#7C2D12',
  '#6B2410',
  '#431407'
];
// Navy: structural colour (drawer, headings). Index 5 is the brand navy.
export const brandNavy = [
  '#F1F4F8',
  '#E2E8F0',
  '#CBD5E1',
  '#94A3B8',
  '#2F3F54',
  '#1E2A3A',
  '#18222F',
  '#141C27',
  '#0F1620',
  '#0A0F16'
];

// Status colours use the Ant presets but one step darker than the template (main = index 6/7) so white text on `main`
// and `main` text on `lighter` both pass WCAG AA (checked in themes/palette.test.ts). Orange is never a status colour.
export default function Default(colors) {
  const { red, gold, blue, green, grey } = colors;
  const orange = brandOrange;
  const greyColors = {
    0: grey[0],
    50: grey[1],
    100: grey[2],
    200: grey[3],
    300: grey[4],
    400: grey[5],
    500: grey[6],
    600: grey[7],
    700: grey[8],
    800: grey[9],
    900: grey[10],
    A50: grey[15],
    A100: grey[11],
    A200: grey[12],
    A400: grey[13],
    A700: grey[14],
    A800: grey[16]
  };
  const contrastText = '#fff';

  return {
    primary: {
      lighter: orange[0],
      100: orange[1],
      200: orange[2],
      light: orange[3],
      400: orange[4],
      main: orange[5],
      dark: orange[6],
      700: orange[7],
      darker: orange[8],
      900: orange[9],
      contrastText
    },
    secondary: {
      lighter: greyColors[100],
      100: greyColors[100],
      200: greyColors[200],
      light: greyColors[300],
      400: greyColors[400],
      main: greyColors[500],
      600: greyColors[600],
      dark: greyColors[700],
      800: greyColors[800],
      darker: greyColors[900],
      A100: greyColors[0],
      A200: greyColors.A400,
      A300: greyColors.A700,
      contrastText: greyColors[0]
    },
    error: {
      lighter: red[0],
      light: red[2],
      main: red[6],
      dark: red[7],
      darker: red[9],
      contrastText
    },
    warning: {
      lighter: gold[0],
      light: gold[3],
      main: gold[8],
      dark: gold[9],
      darker: gold[9],
      contrastText
    },
    info: {
      lighter: blue[0],
      light: blue[3],
      main: blue[6],
      dark: blue[7],
      darker: blue[9],
      contrastText
    },
    success: {
      lighter: green[0],
      light: green[3],
      main: green[7],
      dark: green[8],
      darker: green[9],
      contrastText
    },
    navy: {
      lighter: brandNavy[0],
      light: brandNavy[3],
      400: brandNavy[4],
      main: brandNavy[5],
      dark: brandNavy[7],
      darker: brandNavy[9],
      contrastText
    },
    grey: greyColors
  };
}
