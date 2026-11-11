import type { Metadata } from 'next';
import { PageTitle } from '@/components/layout/PageTitle';
import { StockManager } from '@/components/pro/StockManager';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Message } from '@/components/ui/Message';
import { formatDateTime } from '@/lib/format';
import { proStock } from '@/lib/server/iwadu/pro';
import { requirePagePharmacist } from '@/lib/server/iwadu/viewer';

export const metadata: Metadata = { title: 'Stock' };

export default async function ProStockPage() {
  const user = await requirePagePharmacist('/pro/stock');
  const stock = await proStock(user.pharmacyId);
  return (
    <>
      <PageTitle
        title="Stock"
        lead="Les patients voient la disponibilité et l’heure de mise à jour de chaque médicament."
      />
      {stock.softwareId ? (
        <Message
          tone="info"
          title={
            stock.lastSyncAt
              ? `Stock synchronisé avec votre logiciel. Dernière synchronisation : ${formatDateTime(stock.lastSyncAt)}.`
              : 'Votre logiciel sera relié à Iwadu Pharma. En attendant, saisissez votre stock ici.'
          }
        />
      ) : (
        <Message tone="info" title="Pas de logiciel relié : saisissez votre stock ici.">
          Pensez à le mettre à jour chaque jour. Un stock ancien s’affiche « Disponibilité à
          vérifier ».
        </Message>
      )}
      <GlassPanel className="p-5">
        <StockManager rows={stock.items} lowMax={stock.lowMax} />
      </GlassPanel>
    </>
  );
}
