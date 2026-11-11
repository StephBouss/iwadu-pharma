import type { Metadata } from 'next';
import { AdminForm, type AdminField } from '@/components/admin/AdminForm';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { KpiPanel } from '@/components/admin/KpiBlocks';
import { Message } from '@/components/ui/Message';
import {
  SETTING_UNITS,
  SETTINGS,
  VISIBLE_SETTING_KEYS,
  type SettingGroup,
} from '@/lib/settings-registry';
import { getSettings, missingRequired } from '@/lib/server/iwadu/settings';
import { requirePageAdmin } from '@/lib/server/iwadu/viewer';

export const metadata: Metadata = { title: 'Paramètres' };

export default async function AdminSettingsPage() {
  await requirePageAdmin('/admin/parametres');
  const values = await getSettings();
  const missing = missingRequired(values);
  const groups = [...new Set(VISIBLE_SETTING_KEYS.map((k) => SETTINGS[k].group))] as SettingGroup[];

  return (
    <>
      <AdminHeader title="Paramètres" />
      <p className="type-body-small text-ink-muted">
        Ces valeurs s’appliquent tout de suite, sans republier le site. Chaque changement est
        inscrit au journal avec l’ancienne valeur.
      </p>
      {missing.length > 0 && (
        <Message tone="error" title="Paramètres obligatoires à renseigner">
          {missing.map((k) => SETTINGS[k].label).join(', ')}. Les fonctions qui en dépendent restent
          fermées.
        </Message>
      )}
      {groups.map((group) => {
        const keys = VISIBLE_SETTING_KEYS.filter((k) => SETTINGS[k].group === group);
        const fields: AdminField[] = keys.map((k) => {
          const def = SETTINGS[k] as (typeof SETTINGS)[typeof k] & {
            help?: string;
            optional?: boolean;
          };
          const value = values[k];
          const unit = SETTING_UNITS[def.type];
          const hint =
            [def.help, def.optional ? 'Laisser vide pour désactiver.' : null]
              .filter(Boolean)
              .join(' ') || undefined;
          if (def.type === 'boolean') {
            return {
              name: k,
              label: def.label,
              type: 'checkbox',
              defaultValue: value === true,
              ...(hint ? { hint } : {}),
            };
          }
          return {
            name: k,
            label: unit ? `${def.label} (${unit})` : def.label,
            type: def.type === 'text' ? 'text' : 'number',
            required: !def.optional && value !== null,
            nullable: Boolean(def.optional),
            defaultValue: value === null ? null : (value as string | number),
            ...(hint ? { hint } : {}),
          };
        });
        return (
          <KpiPanel key={group} title={group}>
            <AdminForm
              action="settings.update"
              wrap="values"
              fields={fields}
              submitLabel="Enregistrer"
              successMessage="Paramètres enregistrés."
              variant="secondary"
            />
          </KpiPanel>
        );
      })}
    </>
  );
}
