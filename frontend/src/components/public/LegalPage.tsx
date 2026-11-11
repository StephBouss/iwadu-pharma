import type { ReactNode } from 'react';
import { PageTitle } from '@/components/layout/PageTitle';
import { PublicShell } from '@/components/layout/PublicShell';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Message } from '@/components/ui/Message';

// Gabarit des pages juridiques. Les textes sont des versions de travail :
// ils doivent être relus par un juriste avant l'ouverture au public.

export interface LegalSection {
  title: string;
  body: ReactNode;
}

export function LegalPage({
  title,
  lead,
  sections,
}: {
  title: string;
  lead: string;
  sections: LegalSection[];
}) {
  return (
    <PublicShell width="reading">
      <PageTitle title={title} lead={lead} />
      <Message tone="info" title="Version provisoire, en cours de validation juridique." />
      <GlassPanel as="article" className="flex flex-col gap-6 p-5 sm:p-8">
        {sections.map((s) => (
          <section key={s.title} className="flex flex-col gap-2">
            <h2 className="type-title-3 text-ink">{s.title}</h2>
            <div className="type-body flex flex-col gap-2 text-ink">{s.body}</div>
          </section>
        ))}
      </GlassPanel>
    </PublicShell>
  );
}
