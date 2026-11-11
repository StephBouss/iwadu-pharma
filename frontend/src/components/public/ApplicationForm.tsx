'use client';

import { useState, type SubmitEvent } from 'react';
import { CircleCheck, Send } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Message } from '@/components/ui/Message';
import { errorMessage, publicApi } from '@/lib/client/session';

// Demande d'inscription d'une pharmacie. L'équipe rappelle pour vérifier
// l'officine, activer la fiche et brancher le logiciel de stock.

const EMPTY = {
  pharmacyName: '',
  districtName: '',
  contactName: '',
  phone: '',
  email: '',
  softwareId: '',
  message: '',
  website: '',
};

export function ApplicationForm() {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const set = (key: keyof typeof EMPTY) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (
      !form.pharmacyName.trim() ||
      !form.districtName.trim() ||
      !form.contactName.trim() ||
      !form.phone.trim()
    ) {
      setError('Remplissez le nom de la pharmacie, le quartier, votre nom et votre téléphone.');
      return;
    }
    setBusy(true);
    try {
      await publicApi('/api/pharmacy-applications', { method: 'POST', body: form });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div role="status" className="flex gap-3 rounded-field bg-available-soft p-4">
        <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-available" />
        <p className="type-body text-ink">
          Demande envoyée. Nous vous rappelons pour vérifier votre officine et l’activer.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {error && <Message tone="error" title={error} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Nom de la pharmacie"
          autoComplete="organization"
          value={form.pharmacyName}
          onChange={set('pharmacyName')}
          required
        />
        <Field
          label="Quartier"
          autoComplete="address-level3"
          value={form.districtName}
          onChange={set('districtName')}
          required
        />
        <Field
          label="Votre nom"
          autoComplete="name"
          value={form.contactName}
          onChange={set('contactName')}
          required
        />
        <Field
          label="Téléphone"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="074 82 60 61"
          value={form.phone}
          onChange={set('phone')}
          required
        />
        <Field
          label="E-mail (facultatif)"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={set('email')}
        />
        <Field
          label="Logiciel de gestion (facultatif)"
          autoComplete="off"
          value={form.softwareId}
          onChange={set('softwareId')}
          hint="Celui qui gère votre stock, s’il y en a un."
        />
      </div>
      <label className="flex flex-col gap-2">
        <span className="type-label text-ink">Message (facultatif)</span>
        <textarea
          rows={3}
          maxLength={1000}
          value={form.message}
          onChange={set('message')}
          className="type-body rounded-field border border-outline bg-surface px-4 py-3 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action"
        />
      </label>
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Site web
          <input tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
        </label>
      </div>
      <Button type="submit" fullWidth loading={busy} leadingIcon={<Send aria-hidden />}>
        Envoyer ma demande
      </Button>
    </form>
  );
}
