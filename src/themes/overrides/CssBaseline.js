// ==============================|| OVERRIDES - CSS BASELINE ||============================== //
// Plain HTML text elements start flat: spacing comes from MUI components and sx, never from browser defaults.

export default function CssBaseline() {
  return {
    MuiCssBaseline: {
      styleOverrides: {
        'p, h1, h2, h3, h4, h5, h6, ul, ol, dl, dd, figure, blockquote, pre': { margin: 0 },
        'button, input, select, textarea': { font: 'inherit' },
        img: { display: 'block', maxWidth: '100%' }
      }
    }
  };
}
