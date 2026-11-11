// Import des stocks au format CSV prévu pour l'export du logiciel de gestion
// des officines (adaptable dès que l'export réel sera connu) :
//   pharmacie_code,produit_code,designation,dosage,forme,quantite,prix_xaf,mis_a_jour
// Séparateur virgule ou point-virgule ; première ligne d'en-tête obligatoire.

export const STOCK_CSV_COLUMNS = [
  'pharmacie_code',
  'produit_code',
  'designation',
  'dosage',
  'forme',
  'quantite',
  'prix_xaf',
  'mis_a_jour',
] as const;

export interface StockCsvRow {
  pharmacyCode: string;
  productCode: string;
  name: string;
  dosage: string | null;
  form: string | null;
  quantity: number;
  priceXaf: number;
  updatedAt: Date;
}

export interface StockCsvResult {
  rows: StockCsvRow[];
  errors: string[];
}

function split(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (c === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === sep && !quoted) {
      out.push(cur.trim());
      cur = '';
    } else cur += c;
  }
  out.push(cur.trim());
  return out;
}

export function parseStockCsv(text: string): StockCsvResult {
  // Marque d'ordre des octets (BOM) en t\u00EAte des exports Excel : retir\u00E9e.
  const clean = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const lines = clean
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));
  const errors: string[] = [];
  if (lines.length === 0) return { rows: [], errors: ['Fichier vide.'] };
  const first = lines[0]!;
  const sep = first.split(';').length > first.split(',').length ? ';' : ',';
  const header = split(first, sep).map((h) => h.toLowerCase());
  const index = STOCK_CSV_COLUMNS.map((c) => header.indexOf(c));
  const missing = STOCK_CSV_COLUMNS.filter((_, i) => index[i] === -1);
  if (missing.length > 0) {
    return { rows: [], errors: [`Colonnes manquantes : ${missing.join(', ')}.`] };
  }
  const rows: StockCsvRow[] = [];
  lines.slice(1).forEach((line, i) => {
    const cells = split(line, sep);
    const get = (c: (typeof STOCK_CSV_COLUMNS)[number]) =>
      cells[index[STOCK_CSV_COLUMNS.indexOf(c)]!] ?? '';
    const n = i + 2;
    const quantity = Number(get('quantite'));
    const price = Number(get('prix_xaf').replace(/\s+/g, ''));
    const date = new Date(get('mis_a_jour'));
    const problems: string[] = [];
    if (!get('pharmacie_code')) problems.push('code pharmacie vide');
    if (!get('produit_code')) problems.push('code produit vide');
    if (!get('designation')) problems.push('désignation vide');
    if (!Number.isSafeInteger(quantity) || quantity < 0) problems.push('quantité invalide');
    if (!Number.isSafeInteger(price) || price < 0) problems.push('prix invalide (entier en XAF)');
    if (Number.isNaN(date.getTime())) problems.push('date de mise à jour invalide');
    if (problems.length > 0) {
      errors.push(`Ligne ${n} : ${problems.join(', ')}.`);
      return;
    }
    rows.push({
      pharmacyCode: get('pharmacie_code'),
      productCode: get('produit_code'),
      name: get('designation'),
      dosage: get('dosage') || null,
      form: get('forme') || null,
      quantity,
      priceXaf: price,
      updatedAt: date,
    });
  });
  return { rows, errors };
}
