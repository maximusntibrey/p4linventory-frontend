import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { Plus } from 'lucide-react';
import {
  Button,
  Checkbox,
  FormField,
  IconButton,
  Input,
  SearchInput,
  SegmentedControl,
  Select,
  Switch,
} from '.';

describe('Button', () => {
  it('renders each variant and size with a visible label and no axe violations', async () => {
    const { container } = render(
      <div>
        {(['primary', 'secondary', 'ghost', 'danger'] as const).map((v) =>
          (['sm', 'md', 'lg'] as const).map((s) => (
            <Button key={v + s} variant={v} size={s} icon={Plus}>
              {`${v} ${s}`}
            </Button>
          )),
        )}
      </div>,
    );
    expect(screen.getAllByRole('button')).toHaveLength(12);
    expect(await axe(container)).toHaveNoViolations();
  });
  it('loading disables, sets aria-busy and keeps the label', () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    );
    const b = screen.getByRole('button', { name: 'Save' });
    expect(b).toBeDisabled();
    expect(b).toHaveAttribute('aria-busy', 'true');
    fireEvent.click(b);
    expect(onClick).not.toHaveBeenCalled();
  });
  it('has a 44 px touch target class', () => {
    render(<Button>Go</Button>);
    expect(screen.getByRole('button').className).toMatch(/min-h-(11|target)/);
  });
});

describe('IconButton', () => {
  it('is named by its label, shows the tooltip text and a badge count', async () => {
    const { container } = render(<IconButton icon={Plus} label="Notifications" badge={3} />);
    expect(screen.getByRole('button', { name: 'Notifications, 3 new' })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
  it('can show the label as text', () => {
    render(<IconButton icon={Plus} label="Add" showLabel />);
    expect(screen.getByText('Add')).toBeInTheDocument();
  });
});

describe('FormField with Input, Select', () => {
  it('wires label, help and error to the control', async () => {
    const { container } = render(
      <FormField label="Name" help="As on the invoice" error="Name is required">
        {(c) => <Input {...c} />}
      </FormField>,
    );
    const input = screen.getByLabelText('Name');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('As on the invoice Name is required');
    expect(await axe(container)).toHaveNoViolations();
  });
  it('works with Select', async () => {
    const { container } = render(
      <FormField label="Branch">
        {(c) => (
          <Select {...c} defaultValue="a">
            <option value="a">Accra</option>
            <option value="b">Kumasi</option>
          </Select>
        )}
      </FormField>,
    );
    expect(screen.getByLabelText('Branch')).toHaveValue('a');
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('SearchInput', () => {
  it('is a labelled search box that reports typing and shows the shortcut hint', async () => {
    const onValueChange = vi.fn();
    const { container } = render(
      <SearchInput label="Search items" value="" onValueChange={onValueChange} shortcutHint="⌘K" />,
    );
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search items' }), {
      target: { value: 'dell' },
    });
    expect(onValueChange).toHaveBeenCalledWith('dell');
    expect(screen.getByText('⌘K')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('Checkbox', () => {
  it('toggles and supports indeterminate', async () => {
    const onChange = vi.fn();
    const { container } = render(
      <Checkbox label="Remember me" indeterminate onChange={onChange} />,
    );
    const box = screen.getByLabelText('Remember me') as HTMLInputElement;
    expect(box.indeterminate).toBe(true);
    fireEvent.click(box);
    expect(onChange).toHaveBeenCalled();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('Switch', () => {
  it('has role switch, text state, and Space toggles via click', async () => {
    function Demo() {
      const [on, setOn] = useState(false);
      return <Switch label="Show Statistics" checked={on} onCheckedChange={setOn} />;
    }
    const { container } = render(<Demo />);
    const sw = screen.getByRole('switch', { name: /Show Statistics/ });
    expect(sw).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByText('Off')).toBeInTheDocument();
    fireEvent.click(sw);
    expect(sw).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('On')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('SegmentedControl', () => {
  const options = [
    { value: 'list', label: 'List', description: 'Rows' },
    { value: 'grid', label: 'Grid', description: 'Cards' },
  ];
  it.each(['segments', 'cards'] as const)(
    'selects with radios in the %s variant',
    async (variant) => {
      function Demo() {
        const [v, setV] = useState('list');
        return (
          <SegmentedControl
            label="View"
            value={v}
            onValueChange={setV}
            options={options}
            variant={variant}
          />
        );
      }
      const { container } = render(<Demo />);
      expect(screen.getByRole('radiogroup', { name: 'View' })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /List/ })).toBeChecked();
      fireEvent.click(screen.getByRole('radio', { name: /Grid/ }));
      expect(screen.getByRole('radio', { name: /Grid/ })).toBeChecked();
      expect(await axe(container)).toHaveNoViolations();
    },
  );
});
