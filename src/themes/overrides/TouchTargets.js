// ==============================|| OVERRIDES - TOUCH TARGETS ||============================== //
// Workspace rule: every tappable control is at least 44 px (Mantis defaults are about 40 px).

const MIN = 44;

export default function TouchTargets() {
  return {
    MuiButton: { styleOverrides: { root: { minHeight: MIN, minWidth: MIN } } },
    MuiIconButton: { styleOverrides: { root: { minHeight: MIN, minWidth: MIN } } },
    MuiOutlinedInput: { styleOverrides: { root: { minHeight: MIN }, input: { minHeight: MIN, boxSizing: 'border-box' } } },
    MuiListItemButton: { styleOverrides: { root: { minHeight: MIN } } },
    MuiMenuItem: { styleOverrides: { root: { minHeight: MIN } } },
    MuiTab: { styleOverrides: { root: { minHeight: MIN } } },
    MuiCheckbox: { styleOverrides: { root: { padding: 10 } } },
    MuiRadio: { styleOverrides: { root: { padding: 10 } } },
    MuiSwitch: { styleOverrides: { root: { padding: 10, minHeight: MIN } } }
  };
}
