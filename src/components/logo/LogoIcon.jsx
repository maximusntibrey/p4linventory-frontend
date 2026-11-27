// material-ui
import Box from '@mui/material/Box';

// assets
import logoMark from 'assets/logo-mark.png';

// ==============================|| LOGO ICON (laptop mark) ||============================== //

export default function LogoIcon() {
  return <Box component="img" src={logoMark} alt="Payless4Laptops" sx={{ height: 28, width: 'auto', display: 'block' }} />;
}
