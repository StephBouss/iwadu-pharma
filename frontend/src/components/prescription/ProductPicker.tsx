'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

// Champ de recherche d'un médicament du catalogue, avec suggestions
// (motif « combobox » : flèches, Entrée, Échap ; annonce du nombre de
// résultats aux lecteurs d'écran).

export interface PickedProduct {
  id: string;
  name: string;
  dosage: string | null;
  label: string;
}

export function ProductPicker({
  label,
  hint,
  initialQuery = '',
  onPick,
  autoFocus = false,
  className,
}: {
  label: string;
  hint?: string | undefined;
  initialQuery?: string | undefined;
  onPick: (product: PickedProduct) => void;
  autoFocus?: boolean | undefined;
  className?: string | undefined;
}) {
  const id = useId();
  const listId = `${id}-list`;
  const hintId = `${id}-hint`;
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<PickedProduct[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const requestRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    const current = ++requestRef.current;
    setLoading(true);
    const timer = setTimeout(() => {
      api<{ products: PickedProduct[] }>(`/api/products?q=${encodeURIComponent(q)}`)
        .then((res) => {
          if (current !== requestRef.current) return;
          setResults(res.products);
          setFailed(false);
          setActive(res.products.length > 0 ? 0 : -1);
        })
        .catch(() => {
          if (current === requestRef.current) setFailed(true);
        })
        .finally(() => {
          if (current === requestRef.current) setLoading(false);
        });
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  function pick(product: PickedProduct) {
    onPick(product);
    setQuery('');
    setResults([]);
    setOpen(false);
    setActive(-1);
    inputRef.current?.focus();
  }

  const showList = open && query.trim().length >= 2;
  const status = loading
    ? 'Recherche…'
    : failed
      ? 'La recherche n’a pas abouti. Réessayez.'
      : results.length === 0
        ? 'Aucun médicament ne correspond. Vérifiez l’orthographe.'
        : `${results.length} médicament${results.length > 1 ? 's' : ''} trouvé${results.length > 1 ? 's' : ''}`;

  return (
    <div className={cn('relative flex flex-col gap-2', className)}>
      <label htmlFor={id} className="type-label text-ink">
        {label}
      </label>
      <div className="flex h-12 items-center gap-2 rounded-field border border-outline bg-surface px-4 focus-within:border-action focus-within:ring-2 focus-within:ring-action/25">
        <Search aria-hidden className="size-5 shrink-0 text-ink-muted" />
        <input
          ref={inputRef}
          id={id}
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
          aria-describedby={hint ? hintId : undefined}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="search"
          autoFocus={autoFocus}
          value={query}
          placeholder="Ex. Paracétamol"
          className="type-body h-full min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-ink-muted"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return;
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setOpen(true);
              setActive((a) => (results.length ? (a + 1) % results.length : -1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => (results.length ? (a - 1 + results.length) % results.length : -1));
            } else if (e.key === 'Enter') {
              const product = results[active];
              if (showList && product) {
                e.preventDefault();
                pick(product);
              }
            } else if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
        />
        {loading && <Loader2 aria-hidden className="size-4 shrink-0 animate-spin text-ink-muted" />}
      </div>
      {hint && (
        <p id={hintId} className="type-caption text-ink-muted">
          {hint}
        </p>
      )}
      <p className="sr-only" role="status" aria-live="polite">
        {showList ? status : ''}
      </p>
      {showList && (
        <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-card border border-surface/60 bg-surface/95 shadow-glass supports-backdrop-filter:bg-surface/85 supports-backdrop-filter:backdrop-blur-glass">
          {results.length > 0 ? (
            <ul
              id={listId}
              role="listbox"
              aria-label={label}
              className="max-h-72 overflow-y-auto py-1"
            >
              {results.map((product, i) => (
                <li
                  key={product.id}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  className={cn(
                    'type-body cursor-pointer px-4 py-3 text-ink',
                    i === active ? 'bg-mint-soft' : 'hover:bg-mint-soft/60',
                  )}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(product)}
                  onMouseEnter={() => setActive(i)}
                >
                  {product.label}
                </li>
              ))}
            </ul>
          ) : (
            <p id={listId} className="type-body-small px-4 py-3 text-ink-muted">
              {status}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
