import { Overlay } from './Overlay';
import type { OverlayProps } from './Overlay';

export type ModalProps = Omit<OverlayProps, 'placement' | 'alert'>;

/** Centered dialog (bottom sheet on phones). Escape and the Close button dismiss it; focus is trapped and returned. */
export function Modal(props: ModalProps) {
  return <Overlay {...props} placement="center" />;
}
