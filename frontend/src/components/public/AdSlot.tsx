import { after } from 'next/server';
import { ExternalLink } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { activePass } from '@/lib/server/iwadu/entitlements';
import { getSettings } from '@/lib/server/iwadu/settings';
import { getViewer } from '@/lib/server/iwadu/viewer';
import { prisma } from '@/lib/server/prisma';

// Emplacement d'annonce (1 : gardes et autour de moi ; 2 : fiches des
// pharmacies). Jamais pour les patients qui ont un Pass. Marqué « Annonce ».
// Une vue est comptée à l'affichage ; le clic passe par /api/ads/<id>/click.

export async function AdSlot({
  slot,
  districtId,
}: {
  slot: 1 | 2;
  districtId?: string | null | undefined;
}) {
  const settings = await getSettings();
  if (!settings['ads.enabled']) return null;
  const viewer = await getViewer();
  if (viewer.user && (await activePass(viewer.user.id))) return null;

  const now = new Date();
  const candidates = await prisma.adCampaign.findMany({
    where: { slot, active: true, startsAt: { lte: now }, endsAt: { gt: now } },
    take: 20,
  });
  const eligible = candidates.filter((c) => {
    const ids = (c.districtIds as string[] | null) ?? [];
    return ids.length === 0 || (districtId ? ids.includes(districtId) : false);
  });
  const ad = eligible[Math.floor(Math.random() * eligible.length)];
  if (!ad) return null;
  after(() =>
    prisma.adEvent.create({ data: { campaignId: ad.id, kind: 'VIEW' } }).catch(() => undefined),
  );

  return (
    <GlassPanel as="aside" aria-label="Annonce" className="flex items-center gap-4 p-4">
      {ad.imageUrl && (
        <img
          src={ad.imageUrl}
          alt=""
          className="size-14 shrink-0 rounded-field object-cover"
          loading="lazy"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="type-overline text-ink-muted">Annonce · {ad.advertiser}</span>
        <a
          href={`/api/ads/${ad.id}/click`}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="type-body-strong flex items-center gap-1 text-ink hover:text-action hover:underline"
        >
          {ad.title}
          <ExternalLink aria-hidden className="size-4 shrink-0" />
        </a>
      </div>
    </GlassPanel>
  );
}
