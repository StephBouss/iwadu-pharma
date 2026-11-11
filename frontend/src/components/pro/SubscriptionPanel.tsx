'use client';

import { useState } from 'react';
import { PaymentPanel } from '@/components/payment/PaymentPanel';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { formatFcfa } from '@/lib/format';

/** Choix mensuel / annuel puis paiement Mobile Money de l'abonnement. */
export function SubscriptionPanel({
  monthly,
  annual,
  defaultPhone,
}: {
  monthly: number | null;
  annual: number | null;
  defaultPhone: string | null;
}) {
  const options = [
    ...(monthly ? [{ value: 'MONTHLY' as const, label: `1 mois · ${formatFcfa(monthly)}` }] : []),
    ...(annual ? [{ value: 'ANNUAL' as const, label: `1 an · ${formatFcfa(annual)}` }] : []),
  ];
  const [plan, setPlan] = useState<'MONTHLY' | 'ANNUAL'>(options[0]?.value ?? 'MONTHLY');
  const amount = plan === 'ANNUAL' ? annual : monthly;
  if (!amount) return null;
  return (
    <div className="flex flex-col gap-4">
      {options.length > 1 && (
        <ChoiceChips legend="Durée" name="plan" options={options} value={plan} onChange={setPlan} />
      )}
      <PaymentPanel
        key={plan}
        purpose="PHARMACY_SUBSCRIPTION"
        plan={plan}
        amount={amount}
        defaultPhone={defaultPhone}
      />
    </div>
  );
}
