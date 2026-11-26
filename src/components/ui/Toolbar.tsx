import { Download, Filter, Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './Button';
import { SearchInput } from './SearchInput';
import { SegmentedControl } from './SegmentedControl';
import type { SegmentOption } from './SegmentedControl';
import { Select } from './Select';
import { FormField } from './FormField';
import { Switch } from './Switch';

export type ToolbarProps<V extends string = string> = {
  search?: { label: string; value: string; onChange: (v: string) => void };
  onFilter?: () => void;
  sort?: {
    value: string;
    options: { value: string; label: string }[];
    onChange: (v: string) => void;
  };
  onExport?: () => void;
  view?: { label: string; value: V; options: SegmentOption<V>[]; onChange: (v: V) => void };
  statistics?: { checked: boolean; onChange: (v: boolean) => void };
  primary?: { label: string; onClick: () => void };
  /** Extra controls (for example the column-visibility menu). */
  children?: ReactNode;
};

/** Every control is optional: pass only what the screen allows. The primary action carries a leading +. */
export function Toolbar<V extends string = string>({
  search,
  onFilter,
  sort,
  onExport,
  view,
  statistics,
  primary,
  children,
}: ToolbarProps<V>) {
  return (
    <div role="toolbar" aria-label="Table tools" className="flex flex-wrap items-end gap-2">
      {search && (
        <SearchInput
          label={search.label}
          value={search.value}
          onValueChange={search.onChange}
          className="min-w-0 flex-1 basis-56"
        />
      )}
      {onFilter && (
        <Button variant="secondary" icon={Filter} onClick={onFilter}>
          Filter
        </Button>
      )}
      {sort && (
        <div className="w-40">
          <FormField label="Sort by">
            {(c) => (
              <Select {...c} value={sort.value} onChange={(e) => sort.onChange(e.target.value)}>
                {sort.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            )}
          </FormField>
        </div>
      )}
      {onExport && (
        <Button variant="secondary" icon={Download} onClick={onExport}>
          Export
        </Button>
      )}
      {view && (
        <SegmentedControl
          label={view.label}
          value={view.value}
          onValueChange={view.onChange}
          options={view.options}
        />
      )}
      {statistics && (
        <Switch
          label="Show Statistics"
          checked={statistics.checked}
          onCheckedChange={statistics.onChange}
        />
      )}
      {children}
      {primary && (
        <Button icon={Plus} onClick={primary.onClick} className="ml-auto">
          {primary.label}
        </Button>
      )}
    </div>
  );
}
