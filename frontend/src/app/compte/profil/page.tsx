import type { Metadata } from 'next';
import {
  ChangePasswordForm,
  DeleteAccountForm,
  ProfileForm,
} from '@/components/account/AccountForms';
import { LogoutButton } from '@/components/account/LogoutButton';
import { KpiPanel } from '@/components/admin/KpiBlocks';
import { PageHeading } from '@/components/dashboard/PageHeading';
import { isAdminRole, requirePageUser } from '@/lib/server/iwadu/viewer';
import { prisma } from '@/lib/server/prisma';

export const metadata: Metadata = { title: 'Profil' };

export default async function ProfilePage() {
  const user = await requirePageUser('/compte/profil');
  const insurances = await prisma.insurance.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });
  return (
    <>
      <PageHeading title="Mon profil" subtitle={user.email} />
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start xl:gap-8">
        <KpiPanel title="Mes informations">
          <ProfileForm
            initial={{
              name: user.name,
              phone: user.phone,
              insuranceId: user.insuranceId,
              coverageRate: user.coverageRate,
            }}
            insurances={insurances}
          />
        </KpiPanel>
        <div className="flex flex-col gap-6 xl:gap-8">
          <KpiPanel title="Mot de passe">
            <ChangePasswordForm />
          </KpiPanel>
          <KpiPanel title="Session">
            <LogoutButton />
          </KpiPanel>
          {!isAdminRole(user.role) && (
            <KpiPanel title="Supprimer mon compte">
              <DeleteAccountForm />
            </KpiPanel>
          )}
        </div>
      </div>
    </>
  );
}
