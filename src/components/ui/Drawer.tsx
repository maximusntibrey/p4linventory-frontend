import { Overlay } from './Overlay';
import type { OverlayProps } from './Overlay';

export type DrawerProps = Omit<OverlayProps, 'placement' | 'alert'>;

/** Side panel from the right for detail views and filters. Same behaviour as Modal. */
export function Drawer(props: DrawerProps) {
  return <Overlay {...props} placement="right" />;
}
