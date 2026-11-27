// ==============================|| OVERRIDES - DRAWER ||============================== //
// Brand: the drawer is navy with light text.

export default function Drawer(theme) {
  return {
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundImage: 'none',
          backgroundColor: theme.vars.palette.navy.main,
          color: theme.vars.palette.navy.lighter
        }
      }
    }
  };
}
