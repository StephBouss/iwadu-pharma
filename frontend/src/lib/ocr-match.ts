// Rapproche le texte brut lu sur une ordonnance (lecture de texte dans le
// téléphone, sans IA) des médicaments du catalogue. Le texte est bruité :
// lettres mal reconnues, posologie, adresse, signature… On ne garde que les
// lignes où un nom du catalogue est reconnu, à une ou deux lettres près ; en
// cas de doute sur le dosage, la ligne reste « à vérifier » avec des
// propositions, jamais devinée. Le texte n'est ni stocké ni journalisé.

import type { CatalogItem } from './product-match';
import { normalizeSearch } from './products';

export interface OcrMatch {
  /** Nom du médicament reconnu (tel qu'au catalogue). */
  name: string;
  /** Dosage lu sur la ligne, ex. « 500 mg », ou null. */
  dosage: string | null;
  quantity: number;
  /** De 0 à 1 : nom exact et dosage trouvé = haut ; lettres corrigées = plus bas. */
  confidence: number;
  productId: string | null;
  /** Propositions (ids) quand le dosage ne permet pas de choisir. */
  candidates: string[];
}

const MAX_LINES = 20;
const MAX_QTY = 20;
const UNIT = '(mg|g|ml|mcg|µg|ui|%)';
const DOSAGE_RE = new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*${UNIT}(?![a-z])`, 'i');
const QTY_RE =
  /(?:^|\s)(\d{1,2})\s*(?:boites?|bte?s?|bt|flacons?|fl|tubes?|plaquettes?|boite|b)(?![a-z])/i;
const QTY_PREFIX_RE = /(?:^|\s)(?:qte|quantite|nb)\s*:?\s*(\d{1,2})(?!\d)/i;

/** Distance d'édition bornée : renvoie max + 1 dès que la borne est dépassée. */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const v = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + cost);
      cur.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length]!;
}

/** Tolérance selon la longueur du mot : 0 en dessous de 5 lettres. */
function tolerance(word: string): number {
  if (word.length >= 9) return 2;
  if (word.length >= 5) return 1;
  return 0;
}

function words(text: string): string[] {
  return normalizeSearch(text)
    .split(' ')
    .map((w) => w.replace(/[^a-z]/g, ''))
    .filter((w) => w.length >= 3);
}

function dosageKey(text: string | null | undefined): string {
  const m = (text ?? '').match(DOSAGE_RE);
  if (!m) return '';
  const unit = m[2]!.toLowerCase().replace('µg', 'mcg');
  return `${Number(m[1]!.replace(',', '.'))}${unit}`;
}

interface NameGroup {
  name: string;
  tokens: string[];
  products: CatalogItem[];
}

function groupCatalog(catalog: readonly CatalogItem[]): NameGroup[] {
  const groups = new Map<string, NameGroup>();
  for (const p of catalog) {
    const tokens = words(p.name);
    if (tokens.length === 0) continue;
    const key = tokens.join(' ');
    const g = groups.get(key) ?? { name: p.name, tokens, products: [] };
    g.products.push(p);
    groups.set(key, g);
  }
  return [...groups.values()];
}

/** Coût de la reconnaissance du nom dans la ligne, ou null si absent. */
function nameCost(group: NameGroup, lineWords: readonly string[]): number | null {
  let cost = 0;
  for (const token of group.tokens) {
    let best = Infinity;
    for (const w of lineWords) {
      const d = w === token ? 0 : editDistance(w, token, tolerance(token));
      if (d < best) best = d;
      if (best === 0) break;
    }
    if (best > tolerance(token)) return null;
    cost += best;
  }
  return cost;
}

function quantityOf(line: string): number {
  const norm = normalizeSearch(line);
  const m = norm.match(QTY_PREFIX_RE) ?? norm.match(QTY_RE);
  const n = m ? Number(m[1]) : 1;
  return Math.min(Math.max(Number.isFinite(n) ? n : 1, 1), MAX_QTY);
}

export function matchOcrText(text: string, catalog: readonly CatalogItem[]): OcrMatch[] {
  const groups = groupCatalog(catalog);
  const out: OcrMatch[] = [];
  const seen = new Set<string>();

  for (const raw of text.split(/\r?\n/)) {
    if (out.length >= MAX_LINES) break;
    const lineWords = words(raw);
    if (lineWords.length === 0) continue;

    // Le nom le plus long reconnu l'emporte (« acide acétylsalicylique »
    // plutôt qu'« acide ») ; à longueur égale, le moins corrigé.
    let best: { group: NameGroup; cost: number; size: number } | null = null;
    for (const group of groups) {
      const cost = nameCost(group, lineWords);
      if (cost === null) continue;
      const size = group.tokens.join('').length;
      if (!best || size > best.size || (size === best.size && cost < best.cost)) {
        best = { group, cost, size };
      }
    }
    if (!best) continue;

    const wanted = dosageKey(normalizeSearch(raw));
    const dosageMatch = wanted
      ? best.group.products.filter((p) => dosageKey(p.dosage) === wanted)
      : [];
    let productId: string | null = null;
    if (dosageMatch.length === 1) productId = dosageMatch[0]!.id;
    else if (!wanted && best.group.products.length === 1) productId = best.group.products[0]!.id;

    const dedupeKey = productId ?? `${best.group.name}|${wanted}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const candidates = productId
      ? []
      : [...best.group.products]
          .sort(
            (a, b) =>
              Number(dosageKey(b.dosage) === wanted) - Number(dosageKey(a.dosage) === wanted),
          )
          .slice(0, 3)
          .map((p) => p.id);

    const exact = best.cost === 0;
    const confidence = productId
      ? exact && wanted
        ? 0.9
        : exact
          ? 0.8
          : 0.65
      : exact
        ? 0.6
        : 0.45;

    const dosageText = raw.match(DOSAGE_RE);
    out.push({
      name: best.group.name,
      dosage: dosageText ? `${dosageText[1]} ${dosageText[2]!.toLowerCase()}` : null,
      quantity: quantityOf(raw),
      confidence,
      productId,
      candidates,
    });
  }
  return out;
}
