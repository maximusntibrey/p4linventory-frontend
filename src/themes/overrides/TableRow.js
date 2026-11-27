// ==============================|| OVERRIDES - TABLE ROW ||============================== //

export default function TableRow(theme) {
  return {
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&.Mui-selected, &.Mui-selected:hover': {
            backgroundColor: theme.vars.palette.primary.lighter
          },
          '&:last-of-type': {
            '& .MuiTableCell-root': {
              borderBottom: 'none'
            }
          },
          '& .MuiTableCell-root': {
            '&:last-of-type': {
              paddingRight: 24
            },
            '&:first-of-type': {
              paddingLeft: 24
            }
          }
        }
      }
    }
  };
}
