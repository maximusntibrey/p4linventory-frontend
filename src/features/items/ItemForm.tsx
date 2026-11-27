import { useForm, useWatch } from 'react-hook-form';
import Box from '@mui/material/Box';
import type { UseFormRegister } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { Save } from 'components/icons';
import { api, ApiError } from '../../api';
import { useCurrentMe } from '../../auth/guards';
import type { components } from '../../api';
import { QueryGate } from '../../components/QueryGate';
import { twoDecimals } from '../../lib/money';
import { conditionCodes, conditionLabels } from './labels';
import { Button, SelectField, TextField, CheckField } from '../../components/ui';

type S = components['schemas'];
type Def = S['ItemFieldDefinition'];
type Loose = Record<string, string | boolean>;
type Values = {
  name: string;
  category: string;
  subtype: string;
  brand: string;
  model_name: string;
  mpn: string;
  condition: string;
  price: string;
  spec: Loose;
  common: Loose;
};

/** Fields the form always shows itself. Price and SKU are not part of this screen (price list and SKU rules come later). */
const fixedKeys = new Set([
  'name',
  'category_id',
  'subtype_id',
  'brand_id',
  'model_name',
  'mpn',
  'condition',
  'sku',
  'selling_price',
]);

type Props = {
  /** Present when editing. */
  item?: S['Item'];
  pending: boolean;
  error: unknown;
  onSubmit: (body: S['ItemWrite']) => void;
  submitLabel: string;
};

const asText = (v: unknown) => (typeof v === 'boolean' ? v : v == null ? '' : String(v));

/** Format checks only. What is needed to activate is the server's decision. */
const formatRule = (def: Def) => ({
  validate: (v: unknown) => {
    if (typeof v !== 'string' || v.trim() === '') return true;
    if (def.type === 'integer' && !/^-?\d+$/.test(v.trim())) return 'Enter a whole number.';
    if (def.type === 'decimal' && !/^-?\d+(\.\d+)?$/.test(v.trim())) {
      return 'Enter a number, for example 15.6.';
    }
    return true;
  },
});

/**
 * Category-driven item form. Choosing a category loads that category's field definitions from the
 * API and shows only those fields, in collapsible sections. Saving always makes or keeps a Draft;
 * activating is a separate action on the item page.
 */
export function ItemForm({ item, pending, error, onSubmit, submitLabel }: Props) {
  // The price field exists only when /me lists prices.manage; without it selling_price is never sent.
  const canPrice = useCurrentMe().permissions.includes('prices.manage');
  const categories = useQuery({
    queryKey: ['items', 'categories'],
    queryFn: () => api('get', '/api/v1/item-categories/'),
  });
  const brands = useQuery({
    queryKey: ['items', 'brands'],
    queryFn: () => api('get', '/api/v1/brands/'),
  });
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<Values>({
    defaultValues: {
      name: item?.name ?? '',
      category: item?.category_id.toString() ?? '',
      subtype: item?.subtype_id.toString() ?? '',
      brand: item?.brand_id.toString() ?? '',
      model_name: item?.model_name ?? '',
      mpn: item?.mpn ?? '',
      condition: item?.condition ?? '',
      price: item?.selling_price ?? '',
      spec: Object.fromEntries(
        Object.entries(item?.key_specs ?? {}).map(([k, v]) => [k, asText(v)]),
      ),
      common: {
        grade: item?.grade ?? '',
        description: item?.description ?? '',
        search_keywords: item?.search_keywords ?? '',
        show_on_website: item?.show_on_website ?? false,
      },
    },
  });
  const categoryId = useWatch({ control, name: 'category' });
  const defs = useQuery({
    enabled: categoryId !== '',
    queryKey: ['items', 'fields', categoryId],
    queryFn: () =>
      api('get', '/api/v1/item-field-definitions/', { query: { category_id: Number(categoryId) } }),
  });
  const server = error instanceof ApiError ? error : undefined;
  const subtypes = categories.data?.find((c) => String(c.id) === categoryId)?.subtypes ?? [];
  const ready = categories.isSuccess && brands.isSuccess ? 'ready' : 'loading';

  const submit = handleSubmit((v) => {
    const keySpecs: Record<string, unknown> = {};
    const body: Record<string, unknown> = {
      name: v.name.trim(),
      category_id: Number(v.category),
      subtype_id: Number(v.subtype),
      brand_id: Number(v.brand),
      model_name: v.model_name.trim(),
      mpn: v.mpn.trim(),
      condition: v.condition,
    };
    for (const def of defs.data ?? []) {
      if (fixedKeys.has(def.key)) continue;
      const raw = (def.in_key_specs ? v.spec : v.common)[def.key];
      if (def.in_key_specs) {
        if (typeof raw === 'boolean') {
          // An unticked box is sent only if the item already had that spec.
          if (raw || item?.key_specs[def.key] !== undefined) keySpecs[def.key] = raw;
        } else if (raw !== undefined && raw.trim() !== '') {
          keySpecs[def.key] =
            def.type === 'integer' || def.type === 'decimal' ? Number(raw) : raw.trim();
        }
      } else if (typeof raw === 'boolean') {
        body[def.key] = raw;
      } else if (raw !== undefined && raw.trim() !== '') {
        body[def.key] = raw.trim();
      } else if (item) {
        body[def.key] = def.key === 'grade' ? null : ''; // editing may clear a value
      }
    }
    if (canPrice && v.price.trim() !== '') body.selling_price = twoDecimals(v.price);
    body.key_specs = keySpecs;
    onSubmit(body as S['ItemWrite']);
  });

  const sections = new Map<string, Def[]>();
  for (const def of defs.data ?? []) {
    if (fixedKeys.has(def.key)) continue;
    const g = def.group ?? 'More details';
    sections.set(g, [...(sections.get(g) ?? []), def]);
  }

  const dynamic = (def: Def) => {
    const ns = def.in_key_specs ? 'spec' : 'common';
    const name = `${ns}.${def.key}` as `spec.${string}`;
    const bag = errors[ns] as Record<string, { message?: string }> | undefined;
    const message =
      bag?.[def.key]?.message ??
      server?.fieldError(`key_specs.${def.key}`) ??
      server?.fieldError(def.key);
    const hint = def.required ? 'Needed to activate this item.' : undefined;
    const reg = (register as UseFormRegister<Values>)(name, formatRule(def));
    if (def.type === 'boolean') {
      return (
        <Box key={def.key} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <CheckField label={def.label} {...reg} />
          {hint && (
            <Box component="p" sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
              {hint}
            </Box>
          )}
          {message && (
            <Box component="p" sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'error.main' }}>
              {message}
            </Box>
          )}
        </Box>
      );
    }
    if (def.type === 'choice') {
      return (
        <SelectField key={def.key} label={def.label} hint={hint} error={message} {...reg}>
          <option value="">Not set</option>
          {(def.choices ?? []).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </SelectField>
      );
    }
    return (
      <TextField
        key={def.key}
        label={def.label}
        hint={hint}
        error={message}
        autoComplete="off"
        inputMode={def.type === 'integer' ? 'numeric' : def.type === 'decimal' ? 'decimal' : 'text'}
        {...reg}
      />
    );
  };

  return (
    <Box
      component="form"
      noValidate
      sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
      onSubmit={(e) => void submit(e)}
    >
      <TextField
        label="Name"
        autoComplete="off"
        error={errors.name?.message ?? server?.fieldError('name')}
        {...register('name', { required: 'Enter the item name.' })}
      />
      <SelectField
        key={`category-${ready}`}
        label="Category"
        error={errors.category?.message ?? server?.fieldError('category_id')}
        {...register('category', {
          required: 'Choose a category.',
          onChange: () => setValue('subtype', ''),
        })}
      >
        <option value="">Choose…</option>
        {(categories.data ?? []).map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </SelectField>
      <SelectField
        key={`subtype-${ready}-${categoryId}`}
        label="Type"
        error={errors.subtype?.message ?? server?.fieldError('subtype_id')}
        {...register('subtype', { required: 'Choose a type.' })}
      >
        <option value="">Choose…</option>
        {subtypes.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </SelectField>
      <SelectField
        key={`brand-${ready}`}
        label="Brand"
        error={errors.brand?.message ?? server?.fieldError('brand_id')}
        {...register('brand', { required: 'Choose a brand.' })}
      >
        <option value="">Choose…</option>
        {(brands.data ?? [])
          // Only active brands are offered; an item keeps its own brand even if it was deactivated since.
          .filter((b) => b.is_active || b.id === item?.brand_id)
          .map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
              {b.is_active ? '' : ' (deactivated)'}
            </option>
          ))}
      </SelectField>
      <TextField
        label="Model"
        autoComplete="off"
        error={errors.model_name?.message ?? server?.fieldError('model_name')}
        {...register('model_name', { required: 'Enter the model.' })}
      />
      <TextField
        label="Part number (MPN)"
        autoComplete="off"
        error={errors.mpn?.message ?? server?.fieldError('mpn')}
        {...register('mpn', { required: 'Enter the part number.' })}
      />
      <SelectField
        label="Condition"
        error={errors.condition?.message ?? server?.fieldError('condition')}
        {...register('condition', { required: 'Choose the condition.' })}
      >
        <option value="">Choose…</option>
        {conditionCodes.map((c) => (
          <option key={c} value={c}>
            {conditionLabels[c]}
          </option>
        ))}
      </SelectField>
      {canPrice && (
        <TextField
          label="Selling price (GHS)"
          hint={
            item?.selling_price
              ? 'A price can be changed but not removed. Leaving this empty keeps the current price.'
              : 'Optional. An item cannot be sold until it has a price.'
          }
          inputMode="decimal"
          autoComplete="off"
          error={errors.price?.message ?? server?.fieldError('selling_price')}
          {...register('price', {
            validate: (v) =>
              v.trim() === '' ||
              /^\d+(\.\d{1,2})?$/.test(v.trim()) ||
              'Enter a price such as 1250.00. It cannot be negative.',
          })}
        />
      )}
      {categoryId !== '' && (
        <QueryGate query={defs} inline>
          {() =>
            [...sections].map(([group, list]) => (
              <Box
                component="details"
                key={group}
                open
                sx={{ borderRadius: 1, border: '1px solid', borderColor: 'divider', p: 1.5 }}
              >
                <Box
                  component="summary"
                  sx={{
                    display: 'flex',
                    minHeight: 44,
                    cursor: 'pointer',
                    alignItems: 'center',
                    typography: 'h4',
                  }}
                >
                  {group}
                </Box>
                <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {list.map(dynamic)}
                </Box>
              </Box>
            ))
          }
        </QueryGate>
      )}
      {(categories.isError || brands.isError) && (
        <Box component="p" role="alert" sx={{ m: 0, fontWeight: 600, color: 'error.main' }}>
          The categories or brands could not be loaded. Reload the page to try again.
        </Box>
      )}
      <Button type="submit" icon={Save} disabled={pending || ready === 'loading'}>
        {pending ? 'Saving…' : submitLabel}
      </Button>
    </Box>
  );
}
