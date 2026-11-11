import { describe, expect, it } from 'vitest';
import { parseStockCsv } from './stock-csv';

const SAMPLE = `pharmacie_code,produit_code,designation,dosage,forme,quantite,prix_xaf,mis_a_jour
PH001,P0001,Paracétamol,500 mg,comprimé,120,1250,2026-11-10T08:30:00+01:00
PH001,P0002,Amoxicilline,1 g,comprimé,0,3400,2026-11-10T08:30:00+01:00
PH002,P0001,Paracétamol,500 mg,comprimé,45,1400,2026-11-10T08:45:00+01:00`;

describe('parseStockCsv', () => {
  it('lit l’exemple fictif du format prévu', () => {
    const { rows, errors } = parseStockCsv(SAMPLE);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      pharmacyCode: 'PH001',
      productCode: 'P0001',
      name: 'Paracétamol',
      dosage: '500 mg',
      quantity: 120,
      priceXaf: 1250,
    });
    expect(rows[0]!.updatedAt.toISOString()).toBe('2026-11-10T07:30:00.000Z');
  });
  it('accepte le point-virgule et les guillemets', () => {
    const { rows } = parseStockCsv(
      'pharmacie_code;produit_code;designation;dosage;forme;quantite;prix_xaf;mis_a_jour\nPH001;P9;"Fer; acide folique";60 mg;comprimé;3;1200;2026-11-10',
    );
    expect(rows[0]!.name).toBe('Fer; acide folique');
  });
  it('signale les colonnes manquantes et les lignes invalides', () => {
    expect(parseStockCsv('a,b\n1,2').errors[0]).toMatch(/Colonnes manquantes/);
    const { rows, errors } = parseStockCsv(
      `${SAMPLE.split('\n')[0]}\nPH001,P1,Test,,,-3,12.5,demain`,
    );
    expect(rows).toHaveLength(0);
    expect(errors[0]).toMatch(/Ligne 2 : .*quantité invalide.*prix invalide.*date/);
  });
});
