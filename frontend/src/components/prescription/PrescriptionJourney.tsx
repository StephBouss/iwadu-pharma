'use client';

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
  type SubmitEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Minus, Pill, Plus, Search, ShieldCheck, Trash2 } from 'lucide-react';
import { LocationPicker } from '@/components/location/LocationPicker';
import { useLocation } from '@/components/location/LocationProvider';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Message } from '@/components/ui/Message';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ApiError } from '@/lib/api';
import {
  DEFAULT_BAND,
  PhotoFormatError,
  cropAndCompress,
  decodeImage,
  previewUrl,
  releaseSource,
  renderPdf,
  type CropRect,
  type Source,
} from '@/lib/client/image';
import { takePendingFile } from '@/lib/client/pending-file';
import { errorMessage, postForm, publicApi } from '@/lib/client/session';
import { cn } from '@/lib/utils';
import { CameraCapture } from './CameraCapture';
import { PhotoReview } from './PhotoReview';
import { ProductPicker, type PickedProduct } from './ProductPicker';

// Parcours « Votre ordonnance », sur une seule page (règle produit) :
//   1. la photo : consigne, cadre de visée, écran « Vérifiez votre photo »
//      (recadrer, refaire, envoyer) — seule la zone gardée est envoyée ;
//   2. la liste lue par l'IA, à corriger, puis la position (ou le quartier).
// Un seul bouton principal visible à la fois. Si la connexion se coupe, la
// liste est gardée dans l'onglet et le parcours reprend où il s'est arrêté.

export interface InitialItem {
  productId: string;
  label: string;
  quantity: number;
}

interface Candidate {
  id: string;
  label: string;
}

interface Line {
  key: string;
  productId: string | null;
  label: string | null;
  /** Texte lu sur l'ordonnance par l'IA (null : saisi par le patient). */
  readName: string | null;
  quantity: number;
  confidence: number | null;
  candidates: Candidate[];
  toCheck: boolean;
  changing: boolean;
  corrected: boolean;
}

interface ReadLine {
  name: string;
  dosage: string | null;
  quantity: number;
  confidence: number;
  productId: string | null;
  productLabel: string | null;
  candidates: Candidate[];
  toCheck: boolean;
}

type PhotoStep =
  | { kind: 'capture' }
  | { kind: 'review'; source: Source; url: string; note: string | null }
  | { kind: 'done' };

const MAX_QTY = 20;
const MAX_LINES = 20;
const STORE_KEY = 'iwadu:ordonnance:v1';

function newKey(): string {
  return crypto.randomUUID();
}

function fromInitial(items: InitialItem[]): Line[] {
  return items.map((it) => ({
    key: newKey(),
    productId: it.productId,
    label: it.label,
    readName: null,
    quantity: it.quantity,
    confidence: null,
    candidates: [],
    toCheck: false,
    changing: false,
    corrected: false,
  }));
}

export interface PrescriptionJourneyProps {
  aiEnabled: boolean;
  simulatedReader: boolean;
  loggedIn: boolean;
  initialItems: InitialItem[];
  /** D'où vient le patient : photo, import de fichier, fichier déposé, saisie. */
  depart: 'photo' | 'fichier' | 'fichier-depose' | 'saisie' | null;
  relaunch: boolean;
  /** Phrase sur ce qu'offrira le résultat (aperçu gratuit, Pass…). */
  offer: string | null;
  submitLabel: string;
}

export function PrescriptionJourney({
  aiEnabled,
  simulatedReader,
  loggedIn,
  initialItems,
  depart,
  relaunch,
  offer,
  submitLabel,
}: PrescriptionJourneyProps) {
  const router = useRouter();
  const { position } = useLocation();

  const [lines, setLines] = useState<Line[]>(() => fromInitial(initialItems));
  const [manual, setManual] = useState(
    !aiEnabled || depart === 'saisie' || initialItems.length > 0,
  );
  const [photo, setPhoto] = useState<PhotoStep>({ kind: 'capture' });
  const [reading, setReading] = useState(false);
  const [readMessage, setReadMessage] = useState<{ tone: 'info' | 'warning'; text: string } | null>(
    aiEnabled
      ? null
      : {
          tone: 'info',
          text: 'La lecture par photo n’est pas disponible pour le moment. Saisissez vos médicaments.',
        },
  );
  const [readId, setReadId] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [errors, setErrors] = useState<Partial<Record<'lines' | 'position', string | undefined>>>(
    {},
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const linesRef = useRef<HTMLHeadingElement>(null);
  const positionRef = useRef<HTMLHeadingElement>(null);
  const restored = useRef(false);

  const hasList = lines.length > 0;
  const showList = hasList || manual;

  // Reprise après une coupure : la liste vit dans l'onglet.
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    if (initialItems.length > 0) return;
    try {
      const raw = sessionStorage.getItem(STORE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { lines: Line[]; readId: string | null; label: string };
      if (Array.isArray(saved.lines) && saved.lines.length > 0) {
        setLines(saved.lines.map((l) => ({ ...l, changing: false })));
        setReadId(saved.readId ?? null);
        setLabel(saved.label ?? '');
        setPhoto({ kind: 'done' });
        setReadMessage({
          tone: 'info',
          text: 'Votre liste a été retrouvée. Vérifiez-la puis continuez.',
        });
      }
    } catch {
      /* stockage indisponible : on repart de zéro */
    }
  }, [initialItems.length]);

  useEffect(() => {
    try {
      if (lines.length > 0) {
        sessionStorage.setItem(STORE_KEY, JSON.stringify({ lines, readId, label }));
      } else {
        sessionStorage.removeItem(STORE_KEY);
      }
    } catch {
      /* stockage indisponible */
    }
  }, [lines, readId, label]);

  // Fichier déposé sur l'accueil (ordinateur).
  useEffect(() => {
    if (depart !== 'fichier-depose') return;
    void takePendingFile().then((f) => f && void handleFile(f));
    // Volontairement lancé une seule fois par valeur de « depart ».
  }, [depart]);

  // La photo n'est jamais gardée : libérée dès qu'elle n'est plus affichée.
  useEffect(() => {
    if (photo.kind !== 'review') return;
    return () => {
      URL.revokeObjectURL(photo.url);
      releaseSource(photo.source);
    };
  }, [photo]);

  async function openSource(source: Source, note: string | null) {
    try {
      const url = await previewUrl(source);
      setPhoto({ kind: 'review', source, url, note });
    } catch {
      releaseSource(source);
      setReadMessage({
        tone: 'warning',
        text: 'Cette image n’a pas pu être ouverte. Reprenez la photo, ou choisissez une image JPG ou PNG.',
      });
    }
  }

  async function handleFile(file: File) {
    setReadMessage(null);
    try {
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const { canvas, pages } = await renderPdf(file);
        await openSource(
          canvas,
          pages > 1
            ? `Ce PDF a ${pages} pages : seule la première est lue. Importez les autres pages une par une si besoin.`
            : null,
        );
      } else {
        await openSource(await decodeImage(file), null);
      }
    } catch (err) {
      setReadMessage({
        tone: 'warning',
        text:
          err instanceof PhotoFormatError && err.message === 'pdf'
            ? 'Ce PDF n’a pas pu être ouvert. Prenez plutôt la liste en photo.'
            : 'Ce fichier n’a pas pu être ouvert. Choisissez une image JPG, PNG ou WebP, ou un PDF.',
      });
    }
  }

  async function send(rect: CropRect) {
    if (photo.kind !== 'review' || reading) return;
    setReading(true);
    setReadMessage(null);
    let blob: Blob;
    try {
      blob = await cropAndCompress(photo.source, rect);
    } catch {
      setReading(false);
      setReadMessage({
        tone: 'warning',
        text: 'La photo n’a pas pu être préparée. Refaites-la, plus près de la liste.',
      });
      return;
    }
    const form = new FormData();
    form.append('photos', blob, 'ordonnance.jpg');
    try {
      const res = await postForm<{
        readId: string;
        lines: ReadLine[];
        simulated: boolean;
      }>('/api/prescriptions/read', form);
      const next: Line[] = res.lines.map((l) => ({
        key: newKey(),
        productId: l.productId,
        label: l.productLabel,
        readName: [l.name, l.dosage].filter(Boolean).join(' '),
        quantity: l.quantity,
        confidence: l.confidence,
        candidates: l.candidates,
        toCheck: l.toCheck,
        changing: false,
        corrected: false,
      }));
      setLines((ls) => [...ls, ...next].slice(0, MAX_LINES));
      setReadId(res.readId);
      setPhoto({ kind: 'done' });
      setReadMessage({
        tone: 'info',
        text: `${res.simulated ? 'Lecture de démonstration. ' : ''}${
          next.some((l) => l.toCheck)
            ? 'Vérifiez la liste : corrigez les lignes « À vérifier » et les quantités.'
            : 'Vérifiez la liste et les quantités avant de continuer.'
        }`,
      });
      requestAnimationFrame(() => linesRef.current?.focus());
    } catch (err) {
      const code = err instanceof ApiError ? err.code : '';
      // La photo est effacée dans tous les cas d'échec.
      setPhoto({ kind: 'capture' });
      if (code === 'AI_UNAVAILABLE' || code === 'AI_QUOTA_REACHED') setManual(true);
      setReadMessage({
        tone: 'warning',
        text: errorMessage(
          err,
          'Nous n’arrivons pas à lire la photo. Rapprochez-vous et refaites-la en pleine lumière.',
        ),
      });
    } finally {
      setReading(false);
    }
  }

  function updateLine(key: string, patch: Partial<Line>) {
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
    setErrors((e) => ({ ...e, lines: undefined }));
  }

  function addProduct(product: PickedProduct) {
    setErrors((e) => ({ ...e, lines: undefined }));
    setLines((ls) => {
      const existing = ls.find((l) => l.productId === product.id);
      if (existing) {
        return ls.map((l) =>
          l.key === existing.key ? { ...l, quantity: Math.min(l.quantity + 1, MAX_QTY) } : l,
        );
      }
      if (ls.length >= MAX_LINES) return ls;
      return [
        ...ls,
        {
          key: newKey(),
          productId: product.id,
          label: product.label,
          readName: null,
          quantity: 1,
          confidence: null,
          candidates: [],
          toCheck: false,
          changing: false,
          corrected: readId !== null,
        },
      ];
    });
  }

  async function submit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setSubmitError(null);
    const next: typeof errors = {};
    if (lines.length === 0) next.lines = 'Ajoutez au moins un médicament.';
    else if (lines.some((l) => !l.productId))
      next.lines = 'Choisissez le bon médicament pour chaque ligne « À vérifier », ou retirez-la.';
    if (!position) next.position = 'Indiquez où vous êtes, ou choisissez votre quartier.';
    setErrors(next);
    const firstInvalid = next.lines ? linesRef : next.position ? positionRef : null;
    if (firstInvalid) {
      firstInvalid.current?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const res = await publicApi<{ token: string }>('/api/searches', {
        method: 'POST',
        body: {
          items: lines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            readText: l.readName,
            confidence: l.confidence,
            corrected: l.corrected,
          })),
          source: relaunch ? 'RELAUNCH' : readId ? 'PHOTO' : 'MANUAL',
          position,
          label: loggedIn && label.trim() ? label.trim() : null,
          readId,
          linesCorrected: readId ? lines.filter((l) => l.corrected).length : null,
        },
      });
      try {
        sessionStorage.removeItem(STORE_KEY);
      } catch {
        /* rien */
      }
      router.push(`/resultat/${res.token}`);
    } catch (err) {
      const code = err instanceof ApiError ? err.code : '';
      setSubmitError(
        code === 'DAILY_LIMIT'
          ? 'Vous avez atteint le nombre de recherches du jour. Revenez demain ou contactez-nous.'
          : errorMessage(err, 'La recherche n’a pas pu être lancée. Réessayez.'),
      );
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {/* Bloc 1 : la photo */}
      {aiEnabled && manual && !hasList && (
        <button
          type="button"
          className="type-label flex min-h-11 items-center gap-2 self-start text-action hover:underline"
          onClick={() => setManual(false)}
        >
          <Camera aria-hidden className="size-4" />
          Prendre plutôt la liste en photo
        </button>
      )}
      {/* En saisie manuelle, la photo ne revient que si le patient la demande. */}
      {aiEnabled && (!manual || photo.kind !== 'capture') && (
        <Block n={1} title="La photo">
          {photo.kind === 'capture' && (
            <>
              <p className="type-body flex gap-2 rounded-field bg-mint-soft/60 p-4 text-ink">
                <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-action" />
                <span>
                  Photographiez uniquement la liste des médicaments et les quantités. Le nom du
                  patient et celui du médecin ne doivent pas apparaître.
                </span>
              </p>
              {readMessage && readMessage.tone === 'warning' && (
                <Message tone="warning" title={readMessage.text} />
              )}
              <CameraCapture
                autoStart={depart === 'photo'}
                onCapture={(canvas) => void openSource(canvas, null)}
                onFile={(f) => void handleFile(f)}
              />
            </>
          )}
          {photo.kind === 'review' && (
            <PhotoReview
              imageUrl={photo.url}
              initialRect={DEFAULT_BAND}
              sending={reading}
              note={photo.note}
              onConfirm={(rect) => void send(rect)}
              onRetake={() => setPhoto({ kind: 'capture' })}
            />
          )}
          {photo.kind === 'done' && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="type-body-small text-ink-muted">
                Photo lue puis effacée : elle n’est pas conservée.
              </p>
              <button
                type="button"
                className="type-label flex min-h-11 items-center gap-2 text-action hover:underline"
                onClick={() => setPhoto({ kind: 'capture' })}
              >
                <Camera aria-hidden className="size-4" />
                Ajouter une autre photo
              </button>
            </div>
          )}
          {photo.kind === 'capture' && !hasList && (
            <button
              type="button"
              className="type-label min-h-11 self-start text-action hover:underline"
              onClick={() => setManual(true)}
            >
              Saisir mes médicaments à la main
            </button>
          )}
        </Block>
      )}

      {/* Bloc 2 : la liste, puis la position */}
      {showList && (
        <Block
          n={aiEnabled ? 2 : 1}
          title="Vos médicaments"
          headingRef={linesRef}
          error={errors.lines}
        >
          {readMessage && (readMessage.tone === 'info' || !aiEnabled) && (
            <Message tone={readMessage.tone} title={readMessage.text} />
          )}
          {simulatedReader && readId && (
            <p className="type-caption text-ink-muted">
              Démonstration · lecture simulée, lignes d’exemple.
            </p>
          )}
          {hasList && (
            <ul
              className="flex flex-col divide-y divide-hairline"
              aria-label="Liste des médicaments"
            >
              {lines.map((line) => (
                <LineRow
                  key={line.key}
                  line={line}
                  onChange={(patch) =>
                    updateLine(line.key, {
                      ...patch,
                      corrected: line.readName !== null || line.corrected,
                    })
                  }
                  onRemove={() => setLines((ls) => ls.filter((l) => l.key !== line.key))}
                />
              ))}
            </ul>
          )}
          {lines.length < MAX_LINES && (
            <ProductPicker
              label={hasList ? 'Ajouter un médicament' : 'Nom du médicament'}
              hint={
                hasList ? undefined : 'Tapez au moins deux lettres, puis choisissez dans la liste.'
              }
              onPick={addProduct}
            />
          )}
          {readId && (
            <p className="type-caption text-ink-muted">
              L’IA aide à lire l’ordonnance ; votre pharmacien la valide.
            </p>
          )}

          {hasList && (
            <>
              <h3
                ref={positionRef}
                tabIndex={-1}
                className="type-title-3 mt-2 text-ink outline-none"
              >
                Où êtes-vous ?
              </h3>
              {errors.position && <Message tone="error" title={errors.position} />}
              <LocationPicker className="border-hairline bg-surface/60 shadow-none" />
              <p className="type-caption text-ink-muted">
                Votre position sert à classer les pharmacies. Seul le quartier est enregistré.
              </p>
              {loggedIn && (
                <Field
                  label="Pour qui ? (facultatif)"
                  name="label"
                  autoComplete="off"
                  maxLength={40}
                  placeholder="Prénom"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  hint="Classe l’ordonnance dans votre carnet."
                />
              )}
            </>
          )}
        </Block>
      )}

      {hasList && (
        <div className="flex flex-col gap-3">
          {submitError && <Message tone="error" title={submitError} />}
          <Button type="submit" fullWidth loading={submitting} leadingIcon={<Search aria-hidden />}>
            {submitLabel}
          </Button>
          {offer && <p className="type-caption text-center text-ink-muted">{offer}</p>}
        </div>
      )}
    </form>
  );
}

function Block({
  n,
  title,
  headingRef,
  error,
  children,
}: {
  n: number;
  title: string;
  headingRef?: RefObject<HTMLHeadingElement | null>;
  error?: string | undefined;
  children: ReactNode;
}) {
  const id = `bloc-${n}`;
  return (
    <GlassPanel as="section" aria-labelledby={id} className="flex flex-col gap-4 p-4 sm:p-6">
      <h2 id={id} ref={headingRef} tabIndex={-1} className="flex items-center gap-3 outline-none">
        <span
          aria-hidden
          className="type-label flex size-8 shrink-0 items-center justify-center rounded-full bg-action text-surface"
        >
          {n}
        </span>
        <span className="type-title-2 text-ink">{title}</span>
      </h2>
      {error && <Message tone="error" title={error} />}
      {children}
    </GlassPanel>
  );
}

function LineRow({
  line,
  onChange,
  onRemove,
}: {
  line: Line;
  onChange: (patch: Partial<Line>) => void;
  onRemove: () => void;
}) {
  const name = line.label ?? line.readName ?? 'Médicament';
  const unmatched = !line.productId;
  return (
    <li className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-field',
            line.toCheck ? 'bg-verify-soft text-verify' : 'bg-mint-soft text-action',
          )}
        >
          <Pill className="size-4" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p
            className={cn(
              'type-body-strong wrap-break-word',
              unmatched ? 'text-ink-muted' : 'text-ink',
            )}
          >
            {unmatched ? `« ${line.readName ?? ''} »` : name}
          </p>
          {line.readName && !unmatched && line.readName !== line.label && (
            <p className="type-caption text-ink-muted">Lu sur l’ordonnance : « {line.readName} »</p>
          )}
          {line.toCheck && (
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status="verify">À vérifier</StatusBadge>
              {!unmatched && (
                <button
                  type="button"
                  className="type-label min-h-11 text-action hover:underline"
                  onClick={() => onChange({ toCheck: false })}
                >
                  C’est le bon
                </button>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Retirer ${name}`}
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-error-soft hover:text-error"
        >
          <Trash2 aria-hidden className="size-5" />
        </button>
      </div>

      {unmatched && line.candidates.length > 0 && (
        <fieldset className="flex flex-col gap-2 pl-12">
          <legend className="type-label mb-2 text-ink">Voulez-vous dire :</legend>
          <div className="flex flex-wrap gap-2">
            {line.candidates.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onChange({ productId: c.id, label: c.label, toCheck: false })}
                className="type-body-small min-h-11 rounded-full border border-outline bg-surface px-4 text-ink hover:border-action hover:text-action"
              >
                {c.label}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {(unmatched || line.changing) && (
        <ProductPicker
          label={unmatched ? 'Ou cherchez le bon médicament' : `Remplacer ${name}`}
          initialQuery={line.readName ?? ''}
          onPick={(p) =>
            onChange({ productId: p.id, label: p.label, toCheck: false, changing: false })
          }
        />
      )}

      <div className="flex items-center justify-between gap-3 pl-12">
        <div
          className="flex items-center gap-1"
          role="group"
          aria-label={`Nombre de boîtes de ${name}`}
        >
          <button
            type="button"
            aria-label="Une boîte de moins"
            disabled={line.quantity <= 1}
            onClick={() => onChange({ quantity: line.quantity - 1 })}
            className="flex size-11 items-center justify-center rounded-full border border-outline text-ink hover:border-action disabled:opacity-40"
          >
            <Minus aria-hidden className="size-4" />
          </button>
          <output className="type-body-strong w-20 text-center text-ink" aria-live="polite">
            {line.quantity} {line.quantity > 1 ? 'boîtes' : 'boîte'}
          </output>
          <button
            type="button"
            aria-label="Une boîte de plus"
            disabled={line.quantity >= MAX_QTY}
            onClick={() => onChange({ quantity: line.quantity + 1 })}
            className="flex size-11 items-center justify-center rounded-full border border-outline text-ink hover:border-action disabled:opacity-40"
          >
            <Plus aria-hidden className="size-4" />
          </button>
        </div>
        {!unmatched && !line.changing && (
          <button
            type="button"
            className="type-label min-h-11 text-action hover:underline"
            onClick={() => onChange({ changing: true })}
          >
            Changer
          </button>
        )}
      </div>
    </li>
  );
}
