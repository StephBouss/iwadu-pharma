'use client';

import { useRef, useState, type SubmitEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Message } from '@/components/ui/Message';
import { errorMessage, publicApi } from '@/lib/client/session';
import { cn } from '@/lib/utils';

// Formulaire du back-office décrit par une liste de champs ; il envoie une
// action à /api/admin/iwadu/<action>, recharge la page et confirme.
// Les libellés sont toujours visibles, au-dessus des champs.

export type AdminField =
  | {
      name: string;
      label: string;
      type:
        | 'text'
        | 'email'
        | 'url'
        | 'tel'
        | 'number'
        | 'datetime-local'
        | 'date'
        | 'month'
        | 'textarea';
      required?: boolean;
      nullable?: boolean;
      placeholder?: string;
      hint?: string;
      defaultValue?: string | number | null;
      step?: string;
      wide?: boolean;
    }
  | {
      name: string;
      label: string;
      type: 'select';
      options: { value: string; label: string }[];
      required?: boolean;
      nullable?: boolean;
      hint?: string;
      defaultValue?: string | null;
      wide?: boolean;
    }
  | {
      name: string;
      label: string;
      type: 'checkbox';
      hint?: string;
      defaultValue?: boolean;
      wide?: boolean;
    }
  | {
      name: string;
      label: string;
      type: 'multiselect';
      options: { value: string; label: string }[];
      hint?: string;
      defaultValue?: string[];
      wide?: boolean;
    };

const inputClass =
  'type-body w-full rounded-field border border-outline bg-surface px-3 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action';

export function AdminForm({
  action,
  fields,
  hidden,
  submitLabel,
  successMessage = 'Enregistré.',
  resetOnSuccess = false,
  columns = 2,
  variant = 'primary',
  wrap,
  className,
}: {
  action: string;
  fields: AdminField[];
  hidden?: Record<string, unknown>;
  submitLabel: string;
  successMessage?: string;
  resetOnSuccess?: boolean;
  columns?: 1 | 2 | 3;
  variant?: 'primary' | 'secondary';
  /** Regroupe les valeurs des champs sous cette clé du corps envoyé. */
  wrap?: string;
  className?: string | undefined;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function submit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = e.currentTarget;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const values: Record<string, unknown> = {};
    for (const f of fields) {
      if (f.type === 'checkbox') {
        values[f.name] = data.get(f.name) === 'on';
      } else if (f.type === 'multiselect') {
        values[f.name] = data.getAll(f.name).map(String);
      } else {
        const raw = String(data.get(f.name) ?? '').trim();
        if (raw === '') {
          if (f.nullable) values[f.name] = null;
          continue;
        }
        values[f.name] = f.type === 'number' ? Number(raw.replace(',', '.')) : raw;
      }
    }
    const body = wrap ? { ...hidden, [wrap]: values } : { ...hidden, ...values };
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const res = await publicApi<Record<string, unknown>>(`/api/admin/iwadu/${action}`, {
        method: 'POST',
        body,
      });
      const count = typeof res.imported === 'number' ? ` (${res.imported})` : '';
      setDone(`${successMessage}${count}`);
      if (resetOnSuccess) formRef.current?.reset();
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={submit} className={cn('flex flex-col gap-4', className)}>
      {error && <Message tone="error" title={error} />}
      <div
        className={cn(
          'grid gap-4',
          columns === 2 && 'md:grid-cols-2',
          columns === 3 && 'md:grid-cols-2 xl:grid-cols-3',
        )}
      >
        {fields.map((f) => {
          const fieldId = `${action}-${f.name}`;
          const span = f.wide || f.type === 'textarea' ? 'md:col-span-full' : undefined;
          if (f.type === 'checkbox') {
            return (
              <label
                key={f.name}
                className={cn('flex min-h-11 cursor-pointer items-start gap-3', span)}
              >
                <input
                  type="checkbox"
                  name={f.name}
                  defaultChecked={f.defaultValue ?? false}
                  className="mt-1 size-5 accent-action"
                />
                <span className="flex flex-col">
                  <span className="type-body text-ink">{f.label}</span>
                  {f.hint && <span className="type-caption text-ink-muted">{f.hint}</span>}
                </span>
              </label>
            );
          }
          if (f.type === 'multiselect') {
            return (
              <fieldset
                key={f.name}
                className={cn('flex flex-col gap-2', span ?? 'md:col-span-full')}
              >
                <legend className="type-label mb-1 text-ink">{f.label}</legend>
                {f.hint && <p className="type-caption text-ink-muted">{f.hint}</p>}
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {f.options.map((o) => (
                    <label
                      key={o.value}
                      className="type-body-small flex min-h-10 items-center gap-2 text-ink"
                    >
                      <input
                        type="checkbox"
                        name={f.name}
                        value={o.value}
                        defaultChecked={f.defaultValue?.includes(o.value)}
                        className="size-4 accent-action"
                      />
                      {o.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            );
          }
          return (
            <div key={f.name} className={cn('flex flex-col gap-2', span)}>
              <label htmlFor={fieldId} className="type-label text-ink">
                {f.label}
                {'required' in f && f.required ? '' : ' (facultatif)'}
              </label>
              {f.type === 'select' ? (
                <select
                  id={fieldId}
                  name={f.name}
                  required={f.required}
                  defaultValue={f.defaultValue ?? ''}
                  className={cn(inputClass, 'h-12')}
                >
                  {!f.required && <option value="">·</option>}
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : f.type === 'textarea' ? (
                <textarea
                  id={fieldId}
                  name={f.name}
                  required={f.required}
                  placeholder={f.placeholder}
                  defaultValue={f.defaultValue ?? ''}
                  rows={6}
                  className={cn(inputClass, 'py-2 font-mono text-sm')}
                />
              ) : (
                <input
                  id={fieldId}
                  name={f.name}
                  type={f.type === 'number' ? 'text' : f.type}
                  inputMode={f.type === 'number' ? 'decimal' : undefined}
                  required={f.required}
                  placeholder={f.placeholder}
                  defaultValue={f.defaultValue ?? ''}
                  autoComplete="off"
                  className={cn(inputClass, 'h-12')}
                />
              )}
              {f.hint && <p className="type-caption text-ink-muted">{f.hint}</p>}
            </div>
          );
        })}
      </div>
      {done && (
        <p role="status" className="type-body-small text-available">
          {done}
        </p>
      )}
      <Button type="submit" variant={variant} loading={busy} className="self-start">
        {submitLabel}
      </Button>
    </form>
  );
}

/** Bouton d'action simple du back-office (valider, suspendre, supprimer…). */
export function AdminActionButton({
  action,
  body,
  label,
  confirm,
  variant = 'secondary',
}: {
  action: string;
  body: Record<string, unknown>;
  label: string;
  confirm?: string;
  variant?: 'secondary' | 'ghost';
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col gap-1">
      <Button
        type="button"
        size="sm"
        variant={variant}
        loading={busy}
        onClick={async () => {
          if (confirm && !window.confirm(confirm)) return;
          setBusy(true);
          setError(null);
          try {
            await publicApi(`/api/admin/iwadu/${action}`, { method: 'POST', body });
            router.refresh();
          } catch (err) {
            setError(errorMessage(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        {label}
      </Button>
      {error && (
        <span role="alert" className="type-caption text-error">
          {error}
        </span>
      )}
    </span>
  );
}
