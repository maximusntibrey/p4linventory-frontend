import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { Inbox } from 'lucide-react';
import {
  Avatar,
  Button,
  EmptyState,
  Logo,
  PageHeader,
  Skeleton,
  SkeletonText,
  StatCard,
  StatsStrip,
  StatusBadge,
  initials,
  widthStyle,
} from '.';

describe('StatusBadge', () => {
  it.each(['success', 'warning', 'danger', 'info', 'neutral', 'brand'] as const)(
    '%s tone has an icon and text in both variants',
    async (tone) => {
      const { container } = render(
        <div>
          <StatusBadge tone={tone}>Soft</StatusBadge>
          <StatusBadge tone={tone} variant="outline">
            Outlined
          </StatusBadge>
        </div>,
      );
      expect(screen.getByText('Soft')).toBeInTheDocument();
      expect(container.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(2);
      expect(await axe(container)).toHaveNoViolations();
    },
  );
});

describe('Avatar', () => {
  it('shows initials and a name, or hides when decorative', async () => {
    expect(initials('  ama  boateng mensah ')).toBe('AB');
    const { container } = render(
      <div>
        <Avatar name="Ama Boateng" />
        <Avatar name="Kofi Annan" decorative />
      </div>,
    );
    expect(screen.getByRole('img', { name: 'Ama Boateng' })).toHaveTextContent('AB');
    expect(screen.getAllByRole('img')).toHaveLength(1);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('Skeleton and EmptyState', () => {
  it('skeletons are hidden from assistive tech', async () => {
    const { container } = render(
      <div aria-busy="true">
        <Skeleton className="h-6 w-20" />
        <SkeletonText lines={2} />
      </div>,
    );
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0);
    expect(await axe(container)).toHaveNoViolations();
  });
  it('EmptyState shows title, description and an action', async () => {
    const { container } = render(
      <EmptyState
        icon={Inbox}
        title="No items yet"
        description="Add the first item."
        action={<Button>Add item</Button>}
      />,
    );
    expect(screen.getByRole('heading', { name: 'No items yet' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add item' })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('PageHeader', () => {
  it('has a level-one title, subtitle and actions', async () => {
    const { container } = render(
      <PageHeader title="Items" subtitle="Everything we sell" actions={<Button>New</Button>} />,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Items' })).toBeInTheDocument();
    expect(screen.getByText('Everything we sell')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('StatsStrip and StatCard', () => {
  it('shows label, big number, info and delta with direction in words', async () => {
    const { container } = render(
      <StatsStrip label="Key figures">
        <StatCard
          label="Total stock"
          value="1,204"
          info="Units on hand"
          delta={{ value: '+4.2%', direction: 'up' }}
        />
        <StatCard
          label="Returns"
          value="12"
          delta={{ value: '-3%', direction: 'down', good: true }}
        />
        <StatCard
          label="Low stock"
          value="7"
          delta={{ value: '+2', direction: 'up', good: false }}
        />
        <StatCard label="In transit" value="31" />
      </StatsStrip>,
    );
    expect(screen.getByText('Total stock')).toBeInTheDocument();
    expect(screen.getAllByText('Up')).toHaveLength(2);
    expect(screen.getByText('+4.2%')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /About Total stock/ })).toBeInTheDocument();
    expect(container.querySelectorAll('dt')).toHaveLength(4);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('Logo', () => {
  it('renders full and mark variants with an alt', () => {
    render(
      <>
        <Logo />
        <Logo variant="mark" />
      </>,
    );
    expect(screen.getAllByRole('img', { name: 'payless4laptop' })).toHaveLength(2);
  });
});

describe('widthStyle', () => {
  it('clamps to 0..100', () => {
    expect(widthStyle(40)).toEqual({ width: '40%' });
    expect(widthStyle(140)).toEqual({ width: '100%' });
    expect(widthStyle(-5)).toEqual({ width: '0%' });
  });
});
