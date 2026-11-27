import type { ComponentType } from 'react';
import type { SxProps } from '@mui/material/styles';

// Types for the Mantis template component (JS), added for our own TS callers.
type MainCardProps = {
  title?: React.ReactNode;
  secondary?: React.ReactNode;
  subheader?: React.ReactNode;
  content?: boolean;
  border?: boolean;
  divider?: boolean;
  elevation?: number;
  boxShadow?: boolean;
  shadow?: string;
  sx?: SxProps;
  contentSX?: SxProps;
  children?: React.ReactNode;
};
declare const MainCard: ComponentType<MainCardProps>;
export default MainCard;
