import { useRef, useState } from 'react';

// material-ui
import ButtonBase from '@mui/material/ButtonBase';
import CardContent from '@mui/material/CardContent';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports
import Avatar from 'components/@extended/Avatar';
import MainCard from 'components/MainCard';
import Transitions from 'components/@extended/Transitions';
import { useShell } from '../../../shellContext';

// assets
import KeyOutlined from '@ant-design/icons/KeyOutlined';
import LogoutOutlined from '@ant-design/icons/LogoutOutlined';
import SwapOutlined from '@ant-design/icons/SwapOutlined';

const initials = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

// ==============================|| HEADER CONTENT - PROFILE ||============================== //
// The user menu: who is signed in, the working branch (with switch), change password, log out.

export default function Profile() {
  const { user, branchName, onSwitchBranch, onChangePassword, onLogout, loggingOut, onProfileOpenChange } = useShell();

  const anchorRef = useRef(null);
  const [open, setOpenState] = useState(false);
  const setOpen = (value) => {
    setOpenState(value);
    onProfileOpenChange(value);
  };

  const handleClose = (event) => {
    if (anchorRef.current && anchorRef.current.contains(event.target)) {
      return;
    }
    setOpen(false);
  };

  const run = (fn) => () => {
    setOpen(false);
    fn();
  };

  return (
    <Box sx={{ flexShrink: 0, ml: 'auto' }}>
      <Tooltip title="Profile" disableInteractive>
        <ButtonBase
          sx={(theme) => ({
            p: 0.25,
            borderRadius: 1,
            '&:focus-visible': { outline: `2px solid ${theme.vars.palette.primary.main}`, outlineOffset: 2 }
          })}
          aria-label="Open profile menu"
          ref={anchorRef}
          aria-controls={open ? 'profile-grow' : undefined}
          aria-haspopup="true"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <Avatar alt={user.name} size="sm" color="primary" type="filled" sx={{ '&:hover': { outline: '1px solid', outlineColor: 'primary.main' } }}>
            {initials(user.name)}
          </Avatar>
        </ButtonBase>
      </Tooltip>
      <Popper
        placement="bottom-end"
        open={open}
        anchorEl={anchorRef.current}
        role={undefined}
        transition
        disablePortal
        popperOptions={{ modifiers: [{ name: 'offset', options: { offset: [0, 9] } }] }}
      >
        {({ TransitionProps }) => (
          <Transitions type="grow" position="top-right" in={open} {...TransitionProps}>
            <Paper sx={(theme) => ({ boxShadow: theme.vars.customShadows.z1, width: 290, minWidth: 240, maxWidth: { xs: 250, md: 290 } })}>
              <ClickAwayListener onClickAway={handleClose}>
                <MainCard elevation={0} border={false} content={false}>
                  <CardContent sx={{ px: 2.5, pt: 3 }}>
                    <Stack direction="row" sx={{ gap: 1.25, alignItems: 'center' }}>
                      <Avatar alt={user.name} color="primary" type="filled" sx={{ width: 32, height: 32 }}>
                        {initials(user.name)}
                      </Avatar>
                      <Stack sx={{ minWidth: 0 }}>
                        <Typography variant="h6" noWrap>
                          {user.name}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
                          {user.loginId}
                        </Typography>
                      </Stack>
                    </Stack>
                    <Stack sx={{ mt: 2, gap: 0.5 }}>
                      <Typography variant="body2">
                        Role: <strong>{user.role}</strong>
                      </Typography>
                      <Typography variant="body2">
                        Home location: <strong>{user.location}</strong>
                      </Typography>
                      <Typography variant="body2">
                        Working branch: <strong>{branchName}</strong>
                      </Typography>
                    </Stack>
                  </CardContent>
                  <Divider />
                  <List component="nav" aria-label="Account" sx={{ p: 0, '& .MuiListItemIcon-root': { minWidth: 32 } }}>
                    {onSwitchBranch && (
                      <ListItemButton onClick={run(onSwitchBranch)}>
                        <ListItemIcon>
                          <SwapOutlined aria-hidden />
                        </ListItemIcon>
                        <ListItemText primary="Switch working branch" />
                      </ListItemButton>
                    )}
                    <ListItemButton onClick={run(onChangePassword)}>
                      <ListItemIcon>
                        <KeyOutlined aria-hidden />
                      </ListItemIcon>
                      <ListItemText primary="Change password" />
                    </ListItemButton>
                    <ListItemButton onClick={onLogout} disabled={loggingOut}>
                      <ListItemIcon>
                        <LogoutOutlined aria-hidden />
                      </ListItemIcon>
                      <ListItemText primary="Log out" />
                    </ListItemButton>
                  </List>
                </MainCard>
              </ClickAwayListener>
            </Paper>
          </Transitions>
        )}
      </Popper>
    </Box>
  );
}
