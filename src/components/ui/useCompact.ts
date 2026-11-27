import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

/** True on phones (below the Mantis sm breakpoint, 768 px): filters, actions and rows per page move into drawers. */
export function useCompact() {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.down('sm'));
}
