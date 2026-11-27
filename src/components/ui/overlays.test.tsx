import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { Button, ConfirmDialog, Drawer, Modal, Tabs, ToastProvider, useToast } from '.';

function ModalDemo({ Kind }: { Kind: typeof Modal | typeof Drawer }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open it</Button>
      <Kind open={open} onClose={() => setOpen(false)} title="Edit item">
        <label>
          Name <input />
        </label>
      </Kind>
    </>
  );
}

describe.each([
  ['Modal', Modal],
  ['Drawer', Drawer],
])('%s', (_n, Kind) => {
  it('opens as a labelled dialog, traps focus, closes on Escape and returns focus', async () => {
    render(<ModalDemo Kind={Kind} />);
    const opener = screen.getByRole('button', { name: 'Open it' });
    opener.focus();
    fireEvent.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'Edit item' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(await axe(document.body)).toHaveNoViolations();
    // Tab from the last focusable wraps to the first.
    const close = screen.getByRole('button', { name: 'Close' });
    const field = screen.getByLabelText('Name');
    field.focus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(close).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(field).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(opener).toHaveFocus();
  });
  it('closes with the visible Close button', () => {
    render(<ModalDemo Kind={Kind} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open it' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('ConfirmDialog', () => {
  it('is an alertdialog, focuses cancel first, and calls the handlers', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Deactivate user"
        description="They can no longer sign in."
        confirmLabel="Deactivate"
        tone="danger"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    const dialog = screen.getByRole('alertdialog', { name: 'Deactivate user' });
    expect(dialog).toHaveAccessibleDescription('They can no longer sign in.');
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    expect(await axe(document.body)).toHaveNoViolations();
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }));
    expect(onConfirm).toHaveBeenCalledOnce();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledOnce();
  });
});

describe('Toast', () => {
  function Demo() {
    const { toast } = useToast();
    return (
      <>
        <Button onClick={() => toast({ title: 'Saved', tone: 'success' })}>ok</Button>
        <Button
          onClick={() => toast({ title: 'Failed', description: 'Try again', tone: 'danger' })}
        >
          bad
        </Button>
      </>
    );
  }
  it('shows polite and assertive toasts and dismisses on click', async () => {
    const { container } = render(
      <ToastProvider>
        <Demo />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'ok' }));
    fireEvent.click(screen.getByRole('button', { name: 'bad' }));
    expect(screen.getByRole('status', { name: 'Notifications' })).toHaveTextContent('Saved');
    expect(screen.getByRole('alert', { name: 'Errors' })).toHaveTextContent('Failed');
    expect(await axe(container)).toHaveNoViolations();
    fireEvent.click(screen.getAllByRole('button', { name: 'Dismiss' })[0]);
    expect(screen.queryByText('Failed')).toBeNull();
    expect(screen.queryByText('Saved')).not.toBeNull();
  });
  it('goes away by itself after its duration', () => {
    vi.useFakeTimers();
    try {
      render(
        <ToastProvider>
          <Demo />
        </ToastProvider>,
      );
      fireEvent.click(screen.getByRole('button', { name: 'ok' }));
      expect(screen.queryByText('Saved')).not.toBeNull();
      act(() => vi.advanceTimersByTime(6100));
      expect(screen.queryByText('Saved')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
  it('useToast outside the provider throws a clear error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Demo />)).toThrow('ToastProvider');
    spy.mockRestore();
  });
});

describe('Tabs', () => {
  const tabs = [
    { id: 'a', label: 'Stock', panel: <p>stock panel</p>, count: 4 },
    { id: 'b', label: 'Ledger', panel: <p>ledger panel</p> },
    { id: 'c', label: 'Audit', panel: <p>audit panel</p> },
  ];
  it('uses roving tabindex and arrow, Home and End keys', async () => {
    const { container } = render(<Tabs label="Item views" tabs={tabs} />);
    const [a, b, c] = screen.getAllByRole('tab');
    expect(a).toHaveAttribute('aria-selected', 'true');
    expect(b).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('stock panel');
    fireEvent.keyDown(a, { key: 'ArrowRight' });
    expect(b).toHaveAttribute('aria-selected', 'true');
    expect(b).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveTextContent('ledger panel');
    fireEvent.keyDown(b, { key: 'End' });
    expect(c).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(c, { key: 'ArrowRight' });
    expect(a).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(a, { key: 'ArrowLeft' });
    expect(c).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(c, { key: 'Home' });
    expect(a).toHaveAttribute('aria-selected', 'true');
    expect(await axe(container)).toHaveNoViolations();
  });
  it('can be controlled', () => {
    const onValueChange = vi.fn();
    render(<Tabs label="x" tabs={tabs} value="b" onValueChange={onValueChange} />);
    expect(screen.getByRole('tabpanel')).toHaveTextContent('ledger panel');
    fireEvent.click(screen.getByRole('tab', { name: 'Audit' }));
    expect(onValueChange).toHaveBeenCalledWith('c');
  });
});
