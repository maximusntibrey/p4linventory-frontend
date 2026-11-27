import { createContext, useContext, type ReactNode } from 'react';

/** What the Mantis header needs from our app: the signed-in user, the working branch and the account actions. */
export type ShellState = {
  user: { name: string; loginId: string; role: string; location: string };
  branchName: string;
  /** Super Admin: all-branches view with an optional filter (rendered inside the profile menu). */
  branchFilter?: ReactNode;
  /** Present only when the server lets this user switch the working branch. */
  onSwitchBranch?: () => void;
  onChangePassword: () => void;
  onLogout: () => void;
  loggingOut: boolean;
  logoutError?: string;
  /** Lets the shell load the home location only while the profile menu is open. */
  onProfileOpenChange: (open: boolean) => void;
};

export const ShellContext = createContext<ShellState | null>(null);

export function useShell(): ShellState {
  const v = useContext(ShellContext);
  if (!v) throw new Error('useShell must be used inside the app shell');
  return v;
}
