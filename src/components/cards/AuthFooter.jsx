// material-ui
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';

// project imports
import ContainerWrapper from 'components/ContainerWrapper';

// ==============================|| FOOTER - AUTHENTICATION ||============================== //

export default function AuthFooter() {
  return (
    <ContainerWrapper>
      <Stack sx={{ justifyContent: 'center', textAlign: 'center', py: 2 }}>
        <Typography variant="subtitle2" component="p" sx={{ color: 'secondary.main' }}>
          &copy; Payless4Laptops
        </Typography>
      </Stack>
    </ContainerWrapper>
  );
}
