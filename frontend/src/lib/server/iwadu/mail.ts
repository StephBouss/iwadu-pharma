import 'server-only';
import type { Prisma } from '@prisma/client';
import { getEmailQueue } from '@/lib/server/queues/email-queue-singleton';

// E-mails en français d'Iwadu Pharma (reçus, réservations). La ligne
// EmailJob est écrite DANS la transaction métier (atomique avec le paiement
// ou la réservation) ; le pointeur de travail est poussé après validation.
// Sans Resend + Upstash configurés, les lignes restent en attente.

type MailClient = Pick<Prisma.TransactionClient, 'emailJob'>;

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}

export function emailHtml(title: string, paragraphs: string[]): string {
  const body = paragraphs.map((p) => `<p style="margin:0 0 12px">${escapeHtml(p)}</p>`).join('');
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#f5f7f3;font-family:Arial,sans-serif;color:#021916">
<div style="max-width:480px;margin:0 auto;padding:24px">
<p style="margin:0 0 16px;font-weight:700;color:#0f927c;font-size:18px">Iwadu Pharma</p>
<div style="background:#ffffff;border-radius:16px;padding:20px">
<h1 style="margin:0 0 12px;font-size:20px">${escapeHtml(title)}</h1>${body}
</div>
<p style="margin:16px 0 0;font-size:13px;color:#4e5f5a">Trouver. Comparer. Réserver.</p>
</div></body></html>`;
}

export async function queueEmail(
  tx: MailClient,
  mail: { to: string; subject: string; title: string; paragraphs: string[] },
): Promise<string> {
  const row = await tx.emailJob.create({
    data: {
      to: mail.to,
      subject: mail.subject,
      html: emailHtml(mail.title, mail.paragraphs),
      text: [mail.title, ...mail.paragraphs].join('\n\n'),
      status: 'PENDING',
    },
  });
  return row.id;
}

/** Après validation de la transaction : signale les e-mails à la file d'envoi. */
export async function pushEmailPointers(ids: readonly string[]): Promise<void> {
  const queue = getEmailQueue();
  if (!queue) return;
  for (const id of ids) {
    await queue.push({ emailJobId: id }).catch(() => undefined);
  }
}
