// material-ui
import useMediaQuery from '@mui/material/useMediaQuery';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';

// project imports
import Search from './Search';
import Profile from './Profile';
import Notification from './Notification';
import MobileSection from './MobileSection';
import { useShell } from '../../shellContext';

// assets
import EnvironmentOutlined from '@ant-design/icons/EnvironmentOutlined';
import SwapOutlined from '@ant-design/icons/SwapOutlined';

// ==============================|| HEADER - CONTENT ||============================== //

export default function HeaderContent() {
  const downLG = useMediaQuery((theme) => theme.breakpoints.down('lg'));
  const downMD = useMediaQuery((theme) => theme.breakpoints.down('md'));
  const { branchName, branchFilter, onSwitchBranch } = useShell();

  return (
    <>
      {!downLG && <Search />}
      {downLG && <Box sx={{ width: '100%', ml: 1 }} />}
      <Chip
        icon={<EnvironmentOutlined aria-hidden />}
        label={branchName}
        color="primary"
        variant="light"
        size="small"
        aria-label={`Working branch: ${branchName}`}
        sx={{ flexShrink: 1, minWidth: 0, maxWidth: { xs: 140, sm: 260 }, mr: 0.5 }}
      />
      {/* From md up the branch controls sit in the header; on phones they live in the profile menu. */}
      {!downMD && branchFilter}
      {!downMD && onSwitchBranch && (
        <Button size="small" variant="outlined" color="secondary" startIcon={<SwapOutlined aria-hidden />} onClick={onSwitchBranch} sx={{ flexShrink: 0, mr: 0.5 }}>
          Switch branch
        </Button>
      )}
      <Notification />
      {!downLG && <Profile />}
      {downLG && <MobileSection />}
    </>
  );
}
