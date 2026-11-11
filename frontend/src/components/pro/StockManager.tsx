'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { ProductPicker, type PickedProduct } from '@/components/prescription/ProductPicker';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { errorMessage, publicApi } from '@/lib/client/session';
import { formatClock } from '@/lib/format';
import { stockStatus } from '@/lib/products';

// Saisie manuelle du stock (pharmacies sans connecteur) : quantité et prix
// par médicament. Chaque enregistrement met à jour l'heure affichée aux
// patients.

export interface StockRow {
  productId: string;
  label: string;
  quantity: number;
  priceFcfa: number;
  updatedAt: string;
  stale: boolean;
}

function Row({ row, lowMax }: { row: StockRow; lowMax: number }) {
  const router = useRouter();
  const [qty, setQty] = useState(String(row.quantity));
  const [price, setPrice] = useState(String(row.priceFcfa));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = qty !== String(row.quantity) || price !== String(row.priceFcfa);
  const status = stockStatus(row.quantity, 1, lowMax);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await publicApi('/api/pro/stock', {
        method: 'PUT',
        body: {
          productId: row.productId,
          quantity: Number(qty) || 0,
          priceFcfa: Number(price) || 0,
        },
      });
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Retirer ${row.label} du stock ?`)) return;
    setBusy(true);
    try {
      await publicApi('/api/pro/stock', { method: 'DELETE', body: { productId: row.productId } });
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <li className="flex flex-col gap-2 py-3 md:grid md:grid-cols-[minmax(0,1fr)_110px_130px_auto] md:items-center md:gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="type-body-strong text-ink">{row.label}</span>
        <span className="flex flex-wrap items-center gap-2">
          <StatusBadge status={row.stale ? 'verify' : status}>
            {row.stale ? 'À mettre à jour' : undefined}
          </StatusBadge>
          <span className="type-caption text-ink-muted">
            Mis à jour à {formatClock(new Date(row.updatedAt))}
          </span>
        </span>
      </div>
      <label className="flex flex-col gap-1">
        <span className="type-caption text-ink-muted">Boîtes</span>
        <input
          inputMode="numeric"
          value={qty}
          onChange={(e) => setQty(e.target.value.replace(/\D+/g, ''))}
          className="type-body h-11 rounded-field border border-outline bg-surface px-3 text-ink"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="type-caption text-ink-muted">Prix (FCFA)</span>
        <input
          inputMode="numeric"
          value={price}
          onChange={(e) => setPrice(e.target.value.replace(/\D+/g, ''))}
          className="type-body h-11 rounded-field border border-outline bg-surface px-3 text-ink"
        />
      </label>
      <div className="flex items-center gap-2 md:self-end">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          loading={busy && dirty}
          disabled={!dirty}
          onClick={() => void save()}
        >
          Enregistrer
        </Button>
        <button
          type="button"
          onClick={() => void remove()}
          aria-label={`Retirer ${row.label}`}
          className="flex size-11 items-center justify-center rounded-full text-ink-muted hover:bg-error-soft hover:text-error"
        >
          <Trash2 aria-hidden className="size-5" />
        </button>
      </div>
      {error && (
        <p role="alert" className="type-body-small text-error md:col-span-4">
          {error}
        </p>
      )}
    </li>
  );
}

export function StockManager({ rows, lowMax }: { rows: StockRow[]; lowMax: number }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function add(p: PickedProduct) {
    setError(null);
    if (rows.some((r) => r.productId === p.id)) {
      setError(`${p.label} est déjà dans votre stock.`);
      return;
    }
    try {
      await publicApi('/api/pro/stock', {
        method: 'PUT',
        body: { productId: p.id, quantity: 0, priceFcfa: 0 },
      });
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <ProductPicker label="Ajouter un médicament au stock" onPick={(p) => void add(p)} />
      {error && (
        <p role="alert" className="type-body-small text-error">
          {error}
        </p>
      )}
      {rows.length === 0 ? (
        <p className="type-body-small text-ink-muted">Aucun médicament en stock.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-hairline">
          {rows.map((r) => (
            <Row key={`${r.productId}-${r.updatedAt}`} row={r} lowMax={lowMax} />
          ))}
        </ul>
      )}
    </div>
  );
}
