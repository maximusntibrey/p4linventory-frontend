import '@mui/material/styles';
import '@mui/material/Chip';

// Brand palette keys added in src/themes/theme/index.js, typed for our TypeScript code.
declare module '@mui/material/styles' {
  interface PaletteColor {
    400?: string;
  }
  interface Palette {
    navy: PaletteColor & { lighter: string; 400: string };
  }
  interface PaletteOptions {
    navy?: Partial<PaletteColor> & { lighter?: string; 400?: string };
  }
}
declare module '@mui/material/Chip' {
  interface ChipPropsVariantOverrides {
    light: true;
    combined: true;
  }
}
