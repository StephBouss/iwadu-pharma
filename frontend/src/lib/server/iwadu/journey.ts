import 'server-only';
import { formatFcfa } from '@/lib/format';
import { productLabel } from '@/lib/products';
import { prisma } from '@/lib/server/prisma';
import { isAiReadingEnabled, readerKind } from './ai-prescription';
import { activePass, passState, previewAllowance } from './entitlements';
import { getSettings } from './settings';
import { getViewer } from './viewer';

// Données de départ du parcours « Votre ordonnance » : lecture par l'IA
// disponible ou non, ordonnance du carnet à relancer, et ce que montrera
// le résultat (aperçu gratuit restant, Pass, prix du déblocage).

export async function loadJourney(
  options: { savedId?: string | undefined; relaunchToken?: string | undefined } = {},
) {
  const [viewer, settings] = await Promise.all([getViewer(), getSettings()]);
  const now = new Date();
  const pass = viewer.user ? await activePass(viewer.user.id, now) : null;
  const state = pass ? await passState(pass, settings, now) : null;
  const preview = await previewAllowance(viewer, settings, now);
  const price = settings['price.unlock'];

  let offer: string | null;
  let submitLabel = 'Voir le résultat gratuit';
  if (state?.allowed) {
    offer =
      state.remaining === null
        ? 'Votre Pass couvre cette recherche : noms et prix inclus.'
        : `Votre Pass couvre cette recherche : il vous en reste ${state.remaining}.`;
    submitLabel = 'Voir les pharmacies';
  } else if (preview.remaining > 0) {
    offer = `Aperçu gratuit : il vous en reste ${preview.remaining} sur ${preview.total}${
      preview.windowDays ? ` sur ${preview.windowDays} jours` : ''
    }. Noms et prix${price ? ` : ${formatFcfa(price)}` : ''}.`;
  } else {
    offer = `Vous avez utilisé vos aperçus gratuits. Vous pourrez débloquer cette ordonnance${
      price ? ` pour ${formatFcfa(price)}` : ''
    } ou prendre un Pass.`;
    submitLabel = 'Chercher les pharmacies';
  }

  let initialItems: { productId: string; label: string; quantity: number }[] = [];
  let items: { productId: string; quantity: number }[] = [];
  if (options.relaunchToken && viewer.user) {
    // Ancienne ordonnance du carnet relancée : mêmes médicaments, sans photo.
    const session = await prisma.searchSession.findFirst({
      where: { token: options.relaunchToken, userId: viewer.user.id },
      select: { items: true },
    });
    items = (session?.items ?? []) as { productId: string; quantity: number }[];
  } else if (options.savedId && viewer.user) {
    const saved = await prisma.savedPrescription.findFirst({
      where: { id: options.savedId, userId: viewer.user.id },
    });
    items = (saved?.items ?? []) as { productId: string; quantity: number }[];
  }
  if (items.length > 0) {
    const products = await prisma.product.findMany({
      where: { id: { in: items.map((i) => i.productId) } },
      select: { id: true, name: true, dosage: true },
    });
    initialItems = items.flatMap((it) => {
      const p = products.find((x) => x.id === it.productId);
      return p ? [{ productId: p.id, label: productLabel(p), quantity: it.quantity }] : [];
    });
  }

  return {
    aiEnabled: isAiReadingEnabled(),
    simulatedReader: readerKind() === 'simulated',
    loggedIn: Boolean(viewer.user),
    initialItems,
    relaunch: initialItems.length > 0,
    offer,
    submitLabel,
  };
}
