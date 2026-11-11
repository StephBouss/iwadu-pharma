// Données de DÉMONSTRATION d'Iwadu Pharma (toutes fictives, « Exemple
// fictif ») : quartiers de Libreville, pharmacies « Démo / Exemple »,
// médicaments courants, stocks, gardes des 14 prochains jours, assurances,
// et trois comptes de test (patient, pharmacien, administrateur).
//
// Les paramètres métier (prix, quotas, délais) sont lus dans
// `settings.local.json`, fichier exclu du dépôt : aucune valeur métier ici.
//
// Usage : pnpm seed:iwadu            (idempotent)
//         pnpm seed:iwadu --reset-passwords
//
// Refuse de tourner en production.
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PrismaClient, type Pharmacy, type Product } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { productSearchKey } from '../src/lib/products';
import { isSettingKey, parseSettingValue } from '../src/lib/settings-registry';

const DISTRICTS = [
  { slug: 'centre-ville', name: 'Centre-ville', lat: 0.3925, lng: 9.4536 },
  { slug: 'louis', name: 'Louis', lat: 0.4135, lng: 9.438 },
  { slug: 'glass', name: 'Glass', lat: 0.377, lng: 9.447 },
  { slug: 'nombakele', name: 'Nombakélé', lat: 0.388, lng: 9.462 },
  { slug: 'akebe', name: 'Akébé', lat: 0.377, lng: 9.469 },
  { slug: 'oloumi', name: 'Oloumi', lat: 0.37, lng: 9.456 },
  { slug: 'lalala', name: 'Lalala', lat: 0.356, lng: 9.482 },
  { slug: 'nzeng-ayong', name: 'Nzeng-Ayong', lat: 0.408, lng: 9.492 },
  { slug: 'pk8', name: 'PK 8', lat: 0.401, lng: 9.518 },
  { slug: 'batterie-iv', name: 'Batterie IV', lat: 0.43, lng: 9.44 },
  { slug: 'charbonnages', name: 'Charbonnages', lat: 0.445, lng: 9.431 },
  { slug: 'okala', name: 'Okala', lat: 0.47, lng: 9.453 },
  { slug: 'akanda', name: 'Akanda', lat: 0.505, lng: 9.42 },
  { slug: 'owendo', name: 'Owendo', lat: 0.29, lng: 9.5 },
] as const;

const INSURANCES = [
  'Assurance Démo',
  'Mutuelle Exemple',
  'Assurance Fictive Santé',
  'Mutuelle Démo des Agents',
  'Assurance Exemple Plus',
  'Mutuelle Fictive Libreville',
];

// [nom, dosage, forme, prix de base fictif en FCFA, remboursable]
const PRODUCTS: [string, string | null, string, number, boolean][] = [
  ['Paracétamol', '500 mg', 'comprimé', 600, true],
  ['Paracétamol', '1 g', 'comprimé', 900, true],
  ['Amoxicilline', '500 mg', 'gélule', 1800, true],
  ['Amoxicilline', '1 g', 'comprimé', 2900, true],
  ['Ibuprofène', '200 mg', 'comprimé', 800, true],
  ['Ibuprofène', '400 mg', 'comprimé', 1200, true],
  ['Artéméther-Luméfantrine', '20/120 mg', 'comprimé', 3500, true],
  ['Artésunate-Amodiaquine', '100/270 mg', 'comprimé', 3200, true],
  ['Quinine', '300 mg', 'comprimé', 2200, true],
  ['Métronidazole', '250 mg', 'comprimé', 900, true],
  ['Oméprazole', '20 mg', 'gélule', 2500, true],
  ['Amlodipine', '5 mg', 'comprimé', 3000, true],
  ['Losartan', '50 mg', 'comprimé', 4200, true],
  ['Hydrochlorothiazide', '25 mg', 'comprimé', 1500, true],
  ['Captopril', '25 mg', 'comprimé', 1400, true],
  ['Metformine', '500 mg', 'comprimé', 1600, true],
  ['Metformine', '850 mg', 'comprimé', 2100, true],
  ['Glibenclamide', '5 mg', 'comprimé', 1300, true],
  ['Salbutamol', '100 µg/dose', 'inhalateur', 3800, true],
  ['Cotrimoxazole', '480 mg', 'comprimé', 1000, true],
  ['Ciprofloxacine', '500 mg', 'comprimé', 2600, true],
  ['Doxycycline', '100 mg', 'gélule', 1700, true],
  ['Azithromycine', '250 mg', 'comprimé', 3300, true],
  ['Fer et acide folique', '60 mg/0,4 mg', 'comprimé', 1200, true],
  ['Acide folique', '5 mg', 'comprimé', 700, true],
  ['Vitamine C', '500 mg', 'comprimé', 900, false],
  ['Sels de réhydratation orale', null, 'sachet', 300, true],
  ['Zinc', '20 mg', 'comprimé', 1100, true],
  ['Loratadine', '10 mg', 'comprimé', 1500, true],
  ['Cétirizine', '10 mg', 'comprimé', 1400, true],
  ['Diclofénac', '50 mg', 'comprimé', 1300, true],
  ['Prednisolone', '20 mg', 'comprimé', 1800, true],
  ['Albendazole', '400 mg', 'comprimé', 800, true],
  ['Mébendazole', '100 mg', 'comprimé', 900, true],
  ['Phloroglucinol', '80 mg', 'comprimé', 2000, true],
  ['Dompéridone', '10 mg', 'comprimé', 1900, true],
  ['Lopéramide', '2 mg', 'gélule', 1200, true],
  ['Fluconazole', '150 mg', 'gélule', 2400, true],
  ['Clotrimazole', '1 %', 'crème', 2300, true],
  ['Ceftriaxone', '1 g', 'injectable', 3500, true],
];

const HOURS = {
  A: {
    '1': [['08:00', '20:00']],
    '2': [['08:00', '20:00']],
    '3': [['08:00', '20:00']],
    '4': [['08:00', '20:00']],
    '5': [['08:00', '20:00']],
    '6': [['08:00', '14:00']],
    '7': [],
  },
  B: {
    '1': [['07:30', '21:00']],
    '2': [['07:30', '21:00']],
    '3': [['07:30', '21:00']],
    '4': [['07:30', '21:00']],
    '5': [['07:30', '21:00']],
    '6': [['07:30', '21:00']],
    '7': [['09:00', '13:00']],
  },
  C: {
    '1': [
      ['08:00', '12:30'],
      ['15:00', '19:30'],
    ],
    '2': [
      ['08:00', '12:30'],
      ['15:00', '19:30'],
    ],
    '3': [
      ['08:00', '12:30'],
      ['15:00', '19:30'],
    ],
    '4': [
      ['08:00', '12:30'],
      ['15:00', '19:30'],
    ],
    '5': [
      ['08:00', '12:30'],
      ['15:00', '19:30'],
    ],
    '6': [['08:00', '13:00']],
    '7': [],
  },
} as const;

// [slug, nom, quartier, horaires, prix affichés, statut, synchro ancienne]
const PHARMACIES: [string, string, string, keyof typeof HOURS, boolean, string, boolean][] = [
  ['pharmacie-demo-louis', 'Pharmacie Démo Louis', 'louis', 'B', true, 'ACTIVE', false],
  ['pharmacie-exemple-glass', 'Pharmacie Exemple Glass', 'glass', 'A', true, 'ACTIVE', false],
  [
    'pharmacie-demo-centre',
    'Pharmacie Démo Centre-ville',
    'centre-ville',
    'B',
    true,
    'ACTIVE',
    false,
  ],
  [
    'pharmacie-exemple-nombakele',
    'Pharmacie Exemple Nombakélé',
    'nombakele',
    'C',
    true,
    'ACTIVE',
    false,
  ],
  ['pharmacie-demo-akebe', 'Pharmacie Démo Akébé', 'akebe', 'A', true, 'ACTIVE', false],
  ['pharmacie-exemple-oloumi', 'Pharmacie Exemple Oloumi', 'oloumi', 'A', false, 'ACTIVE', false],
  ['pharmacie-demo-lalala', 'Pharmacie Démo Lalala', 'lalala', 'C', true, 'ACTIVE', false],
  [
    'pharmacie-exemple-nzeng-ayong',
    'Pharmacie Exemple Nzeng-Ayong',
    'nzeng-ayong',
    'B',
    true,
    'ACTIVE',
    false,
  ],
  ['pharmacie-demo-pk8', 'Pharmacie Démo PK 8', 'pk8', 'A', true, 'ACTIVE', true],
  ['pharmacie-exemple-okala', 'Pharmacie Exemple Okala', 'okala', 'C', true, 'ACTIVE', false],
  ['pharmacie-demo-akanda', 'Pharmacie Démo Akanda', 'akanda', 'B', true, 'ACTIVE', false],
  ['pharmacie-exemple-owendo', 'Pharmacie Exemple Owendo', 'owendo', 'A', true, 'ACTIVE', false],
  [
    'pharmacie-demo-batterie-iv',
    'Pharmacie Démo Batterie IV',
    'batterie-iv',
    'C',
    true,
    'PENDING',
    false,
  ],
  [
    'pharmacie-exemple-charbonnages',
    'Pharmacie Exemple Charbonnages',
    'charbonnages',
    'B',
    true,
    'PENDING',
    true,
  ],
  [
    'pharmacie-fictive-louis-nord',
    'Pharmacie Fictive Louis-Nord',
    'louis',
    'A',
    true,
    'PENDING',
    false,
  ],
];

/** Générateur pseudo-aléatoire reproductible (mulberry32). */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Date du jour à Libreville (UTC+1, sans heure d'été). */
function librevilleToday(): { y: number; m: number; d: number } {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Libreville' })
    .format(new Date())
    .split('-')
    .map(Number);
  return { y: y!, m: m!, d: d! };
}

/** Instant UTC d'une heure de Libreville, `dayOffset` jours après aujourd'hui. */
function libreville(dayOffset: number, hour: number): Date {
  const { y, m, d } = librevilleToday();
  return new Date(Date.UTC(y, m - 1, d + dayOffset, hour - 1));
}

const DEMO_ACCOUNTS = [
  { email: 'patient.demo@iwadu.test', name: 'Patient Démo', role: 'USER', pharmacy: null },
  {
    email: 'pharmacie.demo@iwadu.test',
    name: 'Pharmacien Démo',
    role: 'USER',
    pharmacy: 'pharmacie-demo-louis',
  },
  { email: 'admin.demo@iwadu.test', name: 'Admin Démo', role: 'SUPERADMIN', pharmacy: null },
] as const;

export async function main(argv: string[], prisma: PrismaClient): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('seed-iwadu refuse de tourner en production.');
  }
  const resetPasswords = argv.includes('--reset-passwords');
  const now = new Date();

  // Paramètres métier depuis le fichier local, exclu du dépôt.
  const settingsPath = resolve(process.cwd(), 'settings.local.json');
  if (existsSync(settingsPath)) {
    const raw = JSON.parse(readFileSync(settingsPath, 'utf8')) as Record<string, unknown>;
    let count = 0;
    for (const [key, value] of Object.entries(raw)) {
      if (!isSettingKey(key)) {
        console.warn(`  paramètre inconnu ignoré : ${key}`);
        continue;
      }
      const parsed = parseSettingValue(key, value);
      if (parsed === null) {
        console.warn(`  valeur invalide ignorée : ${key}`);
        continue;
      }
      await prisma.setting.upsert({
        where: { key },
        create: { key, value: parsed },
        update: { value: parsed },
      });
      count += 1;
    }
    console.log(`Paramètres : ${count} valeurs chargées depuis settings.local.json`);
  } else {
    console.log('Paramètres : settings.local.json absent, à saisir dans /admin/parametres');
  }

  const districts = new Map<string, { id: string; lat: number; lng: number }>();
  for (const d of DISTRICTS) {
    const row = await prisma.district.upsert({
      where: { slug: d.slug },
      create: { ...d, city: 'Libreville' },
      update: { name: d.name, lat: d.lat, lng: d.lng },
    });
    districts.set(d.slug, row);
  }

  const insurances = [];
  for (const name of INSURANCES) {
    insurances.push(
      await prisma.insurance.upsert({ where: { name }, create: { name }, update: {} }),
    );
  }

  const products: (Product & { basePrice: number })[] = [];
  for (const [j, [name, dosage, form, price, reimbursable]] of PRODUCTS.entries()) {
    const searchKey = productSearchKey(name, dosage);
    // Code produit fictif, au format de l’import CSV (P0001…).
    const code = `P${String(j + 1).padStart(4, '0')}`;
    await prisma.product.updateMany({ where: { code, NOT: { searchKey } }, data: { code: null } });
    const row = await prisma.product.upsert({
      where: { searchKey },
      create: { name, dosage, form, searchKey, reimbursable, code },
      update: { name, dosage, form, reimbursable, code },
    });
    products.push({ ...row, basePrice: price });
  }
  const bySearch = (name: string, dosage: string) =>
    products.find((p) => p.searchKey === productSearchKey(name, dosage))!;
  const demoPrescription = [
    { product: bySearch('Paracétamol', '500 mg'), min: 5 },
    { product: bySearch('Amoxicilline', '1 g'), min: 3 },
    { product: bySearch('Ibuprofène', '400 mg'), min: 3 },
  ];

  const pharmacies: (Pharmacy & { index: number })[] = [];
  for (const [
    i,
    [slug, name, districtSlug, hours, showPrices, status, stale],
  ] of PHARMACIES.entries()) {
    const district = districts.get(districtSlug)!;
    const r = rng(1000 + i);
    const lastSyncAt = new Date(
      now.getTime() - (stale ? 3 * 60 : 5 + Math.floor(r() * 20)) * 60_000,
    );
    const data = {
      name,
      districtId: district.id,
      address: `Rue fictive n° ${10 + i}, ${name.replace(/^Pharmacie (Démo|Exemple|Fictive) /, '')}`,
      phone: `+2410100${String(i + 10).padStart(4, '0')}`,
      lat: district.lat + (r() - 0.5) * 0.008,
      lng: district.lng + (r() - 0.5) * 0.008,
      openingHours: HOURS[hours],
      showPrices,
      status,
      launchPricing: i % 3 !== 0,
      plan: status === 'ACTIVE' ? (i % 4 === 0 ? 'ANNUAL' : 'MONTHLY') : null,
      subscriptionEndsAt: status === 'ACTIVE' ? libreville(10 + i * 3, 23) : null,
      softwareId: `DEMO-${String(i + 1).padStart(3, '0')}`,
      // Code fictif au format de l’import CSV (PH001…).
      code: `PH${String(i + 1).padStart(3, '0')}`,
      lastSyncAt: status === 'ACTIVE' ? lastSyncAt : null,
      isDemo: true,
    };
    const row = await prisma.pharmacy.upsert({
      where: { slug },
      create: { slug, ...data },
      update: data,
    });
    pharmacies.push({ ...row, index: i });

    await prisma.pharmacyInsurance.deleteMany({ where: { pharmacyId: row.id } });
    const accepted = insurances.filter((_, k) => (i + k) % 3 !== 2);
    await prisma.pharmacyInsurance.createMany({
      data: accepted.map((ins) => ({ pharmacyId: row.id, insuranceId: ins.id })),
    });

    // Stocks : ~70 % du catalogue ; l'ordonnance de démonstration est
    // complète dans les 3 premières pharmacies, partielle dans les 2 suivantes.
    await prisma.stock.deleteMany({ where: { pharmacyId: row.id } });
    const stocks = [];
    for (const p of products) {
      const demo = demoPrescription.find((d) => d.product.id === p.id);
      let present = r() < 0.7;
      let quantity = 1 + Math.floor(r() * 30);
      if (demo && i < 3) {
        present = true;
        quantity = Math.max(quantity, demo.min + 2);
      }
      if (demo && (i === 3 || i === 4)) {
        present = demo.product.name !== 'Amoxicilline';
        quantity = Math.max(quantity, demo.min + 2);
      }
      if (!present) continue;
      // De vrais écarts de prix entre pharmacies (fictifs).
      const price = Math.round((p.basePrice * (0.85 + r() * 0.4)) / 25) * 25;
      stocks.push({
        pharmacyId: row.id,
        productId: p.id,
        quantity,
        priceFcfa: price,
        updatedAt: lastSyncAt,
      });
    }
    await prisma.stock.createMany({ data: stocks });
  }

  // Gardes : 3 pharmacies chaque nuit (19 h – 8 h) et 2 le dimanche (8 h – 19 h).
  const active = pharmacies.filter((p) => p.status === 'ACTIVE');
  await prisma.dutyShift.deleteMany({
    where: { pharmacyId: { in: pharmacies.map((p) => p.id) }, endsAt: { gte: libreville(-2, 0) } },
  });
  const shifts = [];
  for (let day = -1; day <= 13; day += 1) {
    for (let k = 0; k < 3; k += 1) {
      const p = active[(day * 3 + k + 30) % active.length]!;
      shifts.push({
        pharmacyId: p.id,
        startsAt: libreville(day, 19),
        endsAt: libreville(day + 1, 8),
      });
    }
    const weekday = libreville(day, 12).getUTCDay();
    if (weekday === 0) {
      for (let k = 0; k < 2; k += 1) {
        const p = active[(day * 2 + k + 7 + 30) % active.length]!;
        shifts.push({
          pharmacyId: p.id,
          startsAt: libreville(day, 8),
          endsAt: libreville(day, 19),
        });
      }
    }
  }
  await prisma.dutyShift.createMany({ data: shifts });

  // Comptes de test : mot de passe aléatoire, affiché une seule fois.
  const created: { email: string; password: string }[] = [];
  for (const account of DEMO_ACCOUNTS) {
    const existing = await prisma.user.findUnique({ where: { email: account.email } });
    let password: string | null = null;
    if (!existing || resetPasswords) password = randomBytes(9).toString('base64url');
    const passwordHash = password ? await bcrypt.hash(password, 12) : undefined;
    const user = await prisma.user.upsert({
      where: { email: account.email },
      create: {
        email: account.email,
        name: account.name,
        role: account.role,
        passwordHash: passwordHash!,
        emailVerifiedAt: now,
      },
      update: { name: account.name, role: account.role, ...(passwordHash ? { passwordHash } : {}) },
    });
    if (account.pharmacy) {
      const pharmacy = pharmacies.find((p) => p.slug === account.pharmacy)!;
      await prisma.pharmacyMember.upsert({
        where: { userId: user.id },
        create: { userId: user.id, pharmacyId: pharmacy.id },
        update: { pharmacyId: pharmacy.id },
      });
    }
    if (password) created.push({ email: account.email, password });
  }

  console.log(
    `Démo : ${DISTRICTS.length} quartiers, ${pharmacies.length} pharmacies, ${products.length} médicaments, ${shifts.length} gardes, ${insurances.length} assurances.`,
  );
  if (created.length > 0) {
    console.log('Comptes de test (notez les mots de passe, ils ne seront plus affichés) :');
    for (const c of created) console.log(`  ${c.email}  ${c.password}`);
  } else {
    console.log(
      'Comptes de test déjà créés (mots de passe inchangés ; --reset-passwords pour en générer).',
    );
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const prisma = new PrismaClient();
  main(process.argv.slice(2), prisma)
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
