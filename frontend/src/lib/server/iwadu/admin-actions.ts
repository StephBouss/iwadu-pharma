import 'server-only';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { isValidLatLng } from '@/lib/geo';
import { normalizeGabonPhone } from '@/lib/phone';
import { productSearchKey } from '@/lib/products';
import { isSettingKey, type SettingKey } from '@/lib/settings-registry';
import { parseStockCsv } from '@/lib/stock-csv';
import { prisma } from '@/lib/server/prisma';
import { slugify } from '@/lib/server/slug';
import { audit, type RequestMeta } from './audit';
import { updateSettings } from './settings';

// Actions du back-office. Chacune valide son entrée, agit, puis écrit une
// ligne au journal avec l'ancienne et la nouvelle valeur (logAdminAction).
// Elles sont appelées par POST /api/admin/iwadu/<action>.

export class AdminActionError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface ActionCtx {
  adminId: string;
  meta: RequestMeta;
}

const id = z.string().min(1).max(40);
const optText = (max: number) => z.string().trim().max(max).optional().nullable();
const dateTime = z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'date invalide');
const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const fcfa = z.number().int().min(0).max(1_000_000_000);

function pick<T extends object>(obj: T, keys: (keyof T)[]): Partial<T> {
  const out: Partial<T> = {};
  for (const k of keys) out[k] = obj[k];
  return out;
}

/** Date + heure saisies en heure de Libreville (« 2026-11-04T19:00 ») → instant UTC. */
function librevilleLocal(s: string): Date {
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return new Date(`${s}:00+01:00`);
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(s)) return new Date(`${s}+01:00`);
  return new Date(s);
}

async function uniqueSlug(name: string): Promise<string> {
  const base =
    slugify(`pharmacie ${name}`.replace(/^pharmacie pharmacie/i, 'pharmacie')) || 'pharmacie';
  let slug = base;
  for (let i = 2; await prisma.pharmacy.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;
  return slug;
}

const DEFAULT_HOURS = Object.fromEntries(
  ['1', '2', '3', '4', '5', '6'].map((d) => [d, [['08:00', '20:00']]]).concat([['7', []]]),
);

const PharmacyFields = z.object({
  name: z.string().trim().min(2).max(120),
  districtId: id.nullable().optional(),
  address: optText(200),
  phone: optText(24),
  lat: z.number(),
  lng: z.number(),
  softwareId: optText(80),
});

export const ACTIONS = {
  'pharmacy.create': {
    schema: PharmacyFields.extend({ status: z.enum(['PENDING', 'ACTIVE']).default('PENDING') }),
    async run(
      ctx: ActionCtx,
      b: z.infer<typeof PharmacyFields> & { status: 'PENDING' | 'ACTIVE' },
    ) {
      if (!isValidLatLng(b))
        throw new AdminActionError('POSITION_INVALID', 400, 'Position invalide.');
      const phone = b.phone ? normalizeGabonPhone(b.phone) : null;
      if (b.phone && !phone)
        throw new AdminActionError('PHONE_INVALID', 400, 'Téléphone invalide.');
      const p = await prisma.pharmacy.create({
        data: {
          slug: await uniqueSlug(b.name),
          name: b.name,
          districtId: b.districtId ?? null,
          address: b.address || null,
          phone,
          lat: b.lat,
          lng: b.lng,
          softwareId: b.softwareId || null,
          status: b.status,
          openingHours: DEFAULT_HOURS as Prisma.InputJsonValue,
        },
      });
      await audit(
        prisma,
        ctx.adminId,
        'pharmacy.create',
        { type: 'Pharmacy', id: p.id },
        { after: b },
        ctx.meta,
      );
      return { id: p.id };
    },
  },
  'pharmacy.update': {
    schema: z.object({
      id,
      name: z.string().trim().min(2).max(120).optional(),
      districtId: id.nullable().optional(),
      address: optText(200),
      phone: optText(24),
      lat: z.number().optional(),
      lng: z.number().optional(),
      status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED']).optional(),
      launchPricing: z.boolean().optional(),
      plan: z.enum(['MONTHLY', 'ANNUAL', '']).optional(),
      subscriptionEndsAt: z.string().optional().nullable(),
      softwareId: optText(80),
      code: optText(40),
      isDemo: z.boolean().optional(),
    }),
    async run(ctx: ActionCtx, b: Record<string, unknown> & { id: string }) {
      const before = await prisma.pharmacy.findUnique({ where: { id: b.id } });
      if (!before) throw new AdminActionError('NOT_FOUND', 404, 'Pharmacie introuvable.');
      const data: Prisma.PharmacyUncheckedUpdateInput = {};
      if (typeof b.name === 'string') data.name = b.name;
      if (b.districtId !== undefined) data.districtId = (b.districtId as string | null) || null;
      if (b.address !== undefined) data.address = (b.address as string | null) || null;
      if (b.phone !== undefined) {
        const phone = b.phone ? normalizeGabonPhone(String(b.phone)) : null;
        if (b.phone && !phone)
          throw new AdminActionError('PHONE_INVALID', 400, 'Téléphone invalide.');
        data.phone = phone;
      }
      if (typeof b.lat === 'number' || typeof b.lng === 'number') {
        const pos = {
          lat: (b.lat as number | undefined) ?? before.lat,
          lng: (b.lng as number | undefined) ?? before.lng,
        };
        if (!isValidLatLng(pos))
          throw new AdminActionError('POSITION_INVALID', 400, 'Position invalide.');
        data.lat = pos.lat;
        data.lng = pos.lng;
      }
      if (typeof b.status === 'string') data.status = b.status;
      if (typeof b.launchPricing === 'boolean') data.launchPricing = b.launchPricing;
      if (b.plan !== undefined) data.plan = (b.plan as string) || null;
      if (b.subscriptionEndsAt !== undefined) {
        data.subscriptionEndsAt = b.subscriptionEndsAt
          ? new Date(String(b.subscriptionEndsAt))
          : null;
      }
      if (b.softwareId !== undefined) data.softwareId = (b.softwareId as string | null) || null;
      if (b.code !== undefined) {
        const code = ((b.code as string | null) || '').trim().toUpperCase() || null;
        if (code && (await prisma.pharmacy.findFirst({ where: { code, id: { not: b.id } } }))) {
          throw new AdminActionError(
            'CODE_TAKEN',
            409,
            'Ce code est déjà utilisé par une autre pharmacie.',
          );
        }
        data.code = code;
      }
      if (typeof b.isDemo === 'boolean') data.isDemo = b.isDemo;
      await prisma.pharmacy.update({ where: { id: b.id }, data });
      const keys = Object.keys(data) as (keyof typeof before)[];
      await audit(
        prisma,
        ctx.adminId,
        'pharmacy.update',
        { type: 'Pharmacy', id: b.id },
        { before: pick(before, keys), after: data },
        ctx.meta,
      );
      return { ok: true };
    },
  },
  'pharmacy.addMember': {
    schema: z.object({ pharmacyId: id, email: z.email().max(200) }),
    async run(ctx: ActionCtx, b: { pharmacyId: string; email: string }) {
      const user = await prisma.user.findUnique({ where: { email: b.email.toLowerCase() } });
      if (!user)
        throw new AdminActionError(
          'USER_NOT_FOUND',
          404,
          'Aucun compte avec cet e-mail. Le pharmacien doit d’abord créer son compte.',
        );
      const existing = await prisma.pharmacyMember.findUnique({ where: { userId: user.id } });
      if (existing && existing.pharmacyId !== b.pharmacyId) {
        throw new AdminActionError(
          'ALREADY_MEMBER',
          409,
          'Ce compte est déjà rattaché à une autre pharmacie.',
        );
      }
      if (!existing)
        await prisma.pharmacyMember.create({ data: { userId: user.id, pharmacyId: b.pharmacyId } });
      await audit(
        prisma,
        ctx.adminId,
        'pharmacy.addMember',
        { type: 'Pharmacy', id: b.pharmacyId },
        { userId: user.id },
        ctx.meta,
      );
      return { ok: true };
    },
  },
  'pharmacy.removeMember': {
    schema: z.object({ pharmacyId: id, userId: id }),
    async run(ctx: ActionCtx, b: { pharmacyId: string; userId: string }) {
      await prisma.pharmacyMember.deleteMany({
        where: { pharmacyId: b.pharmacyId, userId: b.userId },
      });
      await audit(
        prisma,
        ctx.adminId,
        'pharmacy.removeMember',
        { type: 'Pharmacy', id: b.pharmacyId },
        { userId: b.userId },
        ctx.meta,
      );
      return { ok: true };
    },
  },
  'application.setStatus': {
    schema: z.object({ id, status: z.enum(['NEW', 'CONTACTED', 'ACCEPTED', 'REJECTED']) }),
    async run(ctx: ActionCtx, b: { id: string; status: string }) {
      const before = await prisma.pharmacyApplication.findUnique({ where: { id: b.id } });
      if (!before) throw new AdminActionError('NOT_FOUND', 404, 'Demande introuvable.');
      await prisma.pharmacyApplication.update({ where: { id: b.id }, data: { status: b.status } });
      await audit(
        prisma,
        ctx.adminId,
        'application.setStatus',
        { type: 'PharmacyApplication', id: b.id },
        { before: before.status, after: b.status },
        ctx.meta,
      );
      return { ok: true };
    },
  },
  'duty.create': {
    schema: z.object({ pharmacyId: id, startsAt: dateTime, endsAt: dateTime }),
    async run(ctx: ActionCtx, b: { pharmacyId: string; startsAt: string; endsAt: string }) {
      const startsAt = librevilleLocal(b.startsAt);
      const endsAt = librevilleLocal(b.endsAt);
      if (endsAt <= startsAt)
        throw new AdminActionError('DATES_INVALID', 400, 'La fin doit suivre le début.');
      const shift = await prisma.dutyShift.create({
        data: { pharmacyId: b.pharmacyId, startsAt, endsAt },
      });
      await audit(
        prisma,
        ctx.adminId,
        'duty.create',
        { type: 'DutyShift', id: shift.id },
        { after: { pharmacyId: b.pharmacyId, startsAt, endsAt } },
        ctx.meta,
      );
      return { ok: true };
    },
  },
  'duty.delete': {
    schema: z.object({ id }),
    async run(ctx: ActionCtx, b: { id: string }) {
      const before = await prisma.dutyShift.findUnique({ where: { id: b.id } });
      if (!before) return { ok: true };
      await prisma.dutyShift.delete({ where: { id: b.id } });
      await audit(
        prisma,
        ctx.adminId,
        'duty.delete',
        { type: 'DutyShift', id: b.id },
        { before },
        ctx.meta,
      );
      return { ok: true };
    },
  },
  'duty.importCsv': {
    schema: z.object({ csv: z.string().min(1).max(50_000) }),
    async run(ctx: ActionCtx, b: { csv: string }) {
      // Une ligne par garde : slug;AAAA-MM-JJ;HH:MM;HH:MM (fin le lendemain si elle précède le début).
      const lines = b.csv
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#'));
      const errors: string[] = [];
      const rows: { pharmacyId: string; startsAt: Date; endsAt: Date }[] = [];
      const pharmacies = await prisma.pharmacy.findMany({ select: { id: true, slug: true } });
      lines.forEach((line, i) => {
        const [slug, day, from, to] = line.split(/[;,\t]/).map((s) => s.trim());
        const p = pharmacies.find((x) => x.slug === slug);
        if (
          !p ||
          !day ||
          !from ||
          !to ||
          !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
          !/^\d{2}:\d{2}$/.test(from) ||
          !/^\d{2}:\d{2}$/.test(to)
        ) {
          errors.push(`Ligne ${i + 1} illisible : « ${line.slice(0, 80)} »`);
          return;
        }
        const startsAt = new Date(`${day}T${from}:00+01:00`);
        let endsAt = new Date(`${day}T${to}:00+01:00`);
        if (endsAt <= startsAt) endsAt = new Date(endsAt.getTime() + 24 * 60 * 60 * 1000);
        rows.push({ pharmacyId: p.id, startsAt, endsAt });
      });
      if (errors.length > 0)
        throw new AdminActionError('CSV_INVALID', 400, errors.slice(0, 5).join(' '));
      await prisma.dutyShift.createMany({ data: rows });
      await audit(prisma, ctx.adminId, 'duty.importCsv', null, { count: rows.length }, ctx.meta);
      return { imported: rows.length };
    },
  },
  'stock.importCsv': {
    schema: z.object({ csv: z.string().min(1).max(2_000_000) }),
    async run(ctx: ActionCtx, b: { csv: string }) {
      const { rows, errors } = parseStockCsv(b.csv);
      if (errors.length > 0)
        throw new AdminActionError('CSV_INVALID', 400, errors.slice(0, 5).join(' '));
      const pharmacies = await prisma.pharmacy.findMany({
        where: { code: { in: [...new Set(rows.map((r) => r.pharmacyCode))] } },
        select: { id: true, code: true },
      });
      const unknown = [...new Set(rows.map((r) => r.pharmacyCode))].filter(
        (c) => !pharmacies.some((p) => p.code === c),
      );
      if (unknown.length > 0) {
        throw new AdminActionError(
          'PHARMACY_UNKNOWN',
          400,
          `Codes pharmacie inconnus : ${unknown.slice(0, 10).join(', ')}. Saisissez-les sur la fiche de chaque pharmacie.`,
        );
      }
      let created = 0;
      const productIds = new Map<string, string>();
      for (const code of [...new Set(rows.map((r) => r.productCode))]) {
        const row = rows.find((r) => r.productCode === code)!;
        const byCode = await prisma.product.findUnique({ where: { code } });
        if (byCode) {
          productIds.set(code, byCode.id);
          continue;
        }
        const searchKey = productSearchKey(row.name, row.dosage);
        const byKey = await prisma.product.findUnique({ where: { searchKey } });
        if (byKey) {
          await prisma.product.update({ where: { id: byKey.id }, data: { code } });
          productIds.set(code, byKey.id);
        } else {
          const p = await prisma.product.create({
            data: { code, name: row.name, dosage: row.dosage, form: row.form, searchKey },
          });
          productIds.set(code, p.id);
          created++;
        }
      }
      await prisma.$transaction(
        rows.map((r) => {
          const pharmacyId = pharmacies.find((p) => p.code === r.pharmacyCode)!.id;
          const productId = productIds.get(r.productCode)!;
          return prisma.stock.upsert({
            where: { pharmacyId_productId: { pharmacyId, productId } },
            create: {
              pharmacyId,
              productId,
              quantity: r.quantity,
              priceFcfa: r.priceXaf,
              updatedAt: r.updatedAt,
            },
            update: { quantity: r.quantity, priceFcfa: r.priceXaf, updatedAt: r.updatedAt },
          });
        }),
      );
      await prisma.pharmacy.updateMany({
        where: { id: { in: pharmacies.map((p) => p.id) } },
        data: { lastSyncAt: new Date() },
      });
      await audit(
        prisma,
        ctx.adminId,
        'stock.importCsv',
        null,
        { rows: rows.length, pharmacies: pharmacies.length, productsCreated: created },
        ctx.meta,
      );
      return { imported: rows.length, pharmacies: pharmacies.length, productsCreated: created };
    },
  },
  'credit.grant': {
    schema: z.object({ email: z.string().trim().email().max(200), note: optText(200) }),
    async run(ctx: ActionCtx, b: { email: string; note?: string | null }) {
      const user = await prisma.user.findUnique({ where: { email: b.email.toLowerCase() } });
      if (!user) throw new AdminActionError('NOT_FOUND', 404, 'Aucun compte avec cet e-mail.');
      const credit = await prisma.credit.create({
        data: { userId: user.id, reason: 'MANUAL', note: b.note || null, grantedById: ctx.adminId },
      });
      await audit(
        prisma,
        ctx.adminId,
        'credit.grant',
        { type: 'Credit', id: credit.id },
        { userId: user.id, note: b.note ?? null },
        ctx.meta,
      );
      return { ok: true };
    },
  },
  'insurance.create': {
    schema: z.object({ name: z.string().trim().min(2).max(120) }),
    async run(ctx: ActionCtx, b: { name: string }) {
      const ins = await prisma.insurance.create({ data: { name: b.name } }).catch(() => {
        throw new AdminActionError('DUPLICATE', 409, 'Cette assurance existe déjà.');
      });
      await audit(
        prisma,
        ctx.adminId,
        'insurance.create',
        { type: 'Insurance', id: ins.id },
        { after: b },
        ctx.meta,
      );
      return { ok: true };
    },
  },
  'insurance.update': {
    schema: z.object({
      id,
      name: z.string().trim().min(2).max(120).optional(),
      active: z.boolean().optional(),
    }),
    async run(
      ctx: ActionCtx,
      b: { id: string; name?: string | undefined; active?: boolean | undefined },
    ) {
      const before = await prisma.insurance.findUnique({ where: { id: b.id } });
      if (!before) throw new AdminActionError('NOT_FOUND', 404, 'Assurance introuvable.');
      await prisma.insurance.update({
        where: { id: b.id },
        data: {
          ...(b.name ? { name: b.name } : {}),
          ...(b.active !== undefined ? { active: b.active } : {}),
        },
      });
      await audit(
        prisma,
        ctx.adminId,
        'insurance.update',
        { type: 'Insurance', id: b.id },
        { before: { name: before.name, active: before.active }, after: b },
        ctx.meta,
      );
      return { ok: true };
    },
  },
  'product.setReimbursable': {
    schema: z.object({ productId: id, reimbursable: z.boolean() }),
    async run(ctx: ActionCtx, b: { productId: string; reimbursable: boolean }) {
      const before = await prisma.product.findUnique({ where: { id: b.productId } });
      if (!before) throw new AdminActionError('NOT_FOUND', 404, 'Médicament introuvable.');
      await prisma.product.update({
        where: { id: b.productId },
        data: { reimbursable: b.reimbursable },
      });
      await audit(
        prisma,
        ctx.adminId,
        'product.setReimbursable',
        { type: 'Product', id: b.productId },
        { before: before.reimbursable, after: b.reimbursable },
        ctx.meta,
      );
      return { ok: true };
    },
  },
  'ad.create': {
    schema: z.object({
      advertiser: z.string().trim().min(2).max(120),
      title: z.string().trim().min(2).max(120),
      imageUrl: z.union([z.url().max(500), z.literal('')]).optional(),
      linkUrl: z.url().max(500),
      districtIds: z.array(id).max(50).default([]),
      slot: z.coerce.number().int().min(1).max(2),
      startsAt: dateTime,
      endsAt: dateTime,
    }),
    async run(
      ctx: ActionCtx,
      b: {
        advertiser: string;
        title: string;
        imageUrl?: string | undefined;
        linkUrl: string;
        districtIds: string[];
        slot: number;
        startsAt: string;
        endsAt: string;
      },
    ) {
      if (!/^https:\/\//.test(b.linkUrl) || (b.imageUrl && !/^https:\/\//.test(b.imageUrl))) {
        throw new AdminActionError('URL_INVALID', 400, 'Les liens doivent commencer par https://');
      }
      const startsAt = librevilleLocal(b.startsAt);
      const endsAt = librevilleLocal(b.endsAt);
      if (endsAt <= startsAt)
        throw new AdminActionError('DATES_INVALID', 400, 'La fin doit suivre le début.');
      const ad = await prisma.adCampaign.create({
        data: {
          advertiser: b.advertiser,
          title: b.title,
          imageUrl: b.imageUrl || null,
          linkUrl: b.linkUrl,
          ...(b.districtIds.length ? { districtIds: b.districtIds as Prisma.InputJsonValue } : {}),
          slot: b.slot,
          startsAt,
          endsAt,
        },
      });
      await audit(
        prisma,
        ctx.adminId,
        'ad.create',
        { type: 'AdCampaign', id: ad.id },
        { after: b },
        ctx.meta,
      );
      return { ok: true };
    },
  },
  'ad.update': {
    schema: z.object({ id, active: z.boolean() }),
    async run(ctx: ActionCtx, b: { id: string; active: boolean }) {
      const before = await prisma.adCampaign.findUnique({ where: { id: b.id } });
      if (!before) throw new AdminActionError('NOT_FOUND', 404, 'Campagne introuvable.');
      await prisma.adCampaign.update({ where: { id: b.id }, data: { active: b.active } });
      await audit(
        prisma,
        ctx.adminId,
        'ad.update',
        { type: 'AdCampaign', id: b.id },
        { before: before.active, after: b.active },
        ctx.meta,
      );
      return { ok: true };
    },
  },
  'ad.delete': {
    schema: z.object({ id }),
    async run(ctx: ActionCtx, b: { id: string }) {
      const before = await prisma.adCampaign.findUnique({ where: { id: b.id } });
      if (!before) return { ok: true };
      await prisma.adCampaign.delete({ where: { id: b.id } });
      await audit(
        prisma,
        ctx.adminId,
        'ad.delete',
        { type: 'AdCampaign', id: b.id },
        { before: { advertiser: before.advertiser, title: before.title } },
        ctx.meta,
      );
      return { ok: true };
    },
  },
  'settings.update': {
    schema: z.object({
      values: z.record(
        z.string(),
        z.union([z.string().max(300), z.boolean(), z.number(), z.null()]),
      ),
    }),
    async run(ctx: ActionCtx, b: { values: Record<string, unknown> }) {
      const changes: Partial<Record<SettingKey, unknown>> = {};
      for (const [k, v] of Object.entries(b.values)) if (isSettingKey(k)) changes[k] = v;
      const res = await updateSettings(ctx.adminId, changes, ctx.meta);
      if (res.invalid.length > 0) {
        throw new AdminActionError(
          'SETTINGS_INVALID',
          400,
          `Valeurs refusées : ${res.invalid.join(', ')}.`,
        );
      }
      return { saved: res.saved.length };
    },
  },
  'order.refund': {
    schema: z.object({ id, reason: z.string().trim().min(3).max(300) }),
    async run(ctx: ActionCtx, b: { id: string; reason: string }) {
      const now = new Date();
      await prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({ where: { id: b.id } });
        if (!order) throw new AdminActionError('NOT_FOUND', 404, 'Paiement introuvable.');
        if (order.status !== 'PAID')
          throw new AdminActionError(
            'NOT_PAID',
            409,
            'Seul un paiement confirmé peut être remboursé.',
          );
        await tx.order.update({
          where: { id: order.id },
          data: { status: 'REFUNDED', refundedAt: now, refundReason: b.reason },
        });
        // Le remboursement retire ce que le paiement avait ouvert.
        await tx.unlock.deleteMany({ where: { orderId: order.id } });
        await tx.pass.updateMany({
          where: { orderId: order.id, endsAt: { gt: now } },
          data: { endsAt: now },
        });
        await audit(
          tx,
          ctx.adminId,
          'order.refund',
          { type: 'Order', id: order.id },
          { before: order.status, after: 'REFUNDED', amount: order.amount, reason: b.reason },
          ctx.meta,
        );
      });
      return { ok: true };
    },
  },
  'forecast.import': {
    schema: z.object({ csv: z.string().min(1).max(20_000) }),
    async run(ctx: ActionCtx, b: { csv: string }) {
      // Une ligne par mois : AAAA-MM;chiffre d'affaires;charges (facultatif), en FCFA.
      const rows: { month: string; revenueFcfa: number; expensesFcfa: number | null }[] = [];
      const errors: string[] = [];
      b.csv
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#'))
        .forEach((line, i) => {
          const [m, rev, exp] = line.split(/[;\t]/).map((s) => s.trim().replace(/\s+/g, ''));
          if (
            !m ||
            !month.safeParse(m).success ||
            !rev ||
            !/^\d+$/.test(rev) ||
            (exp && !/^\d+$/.test(exp))
          ) {
            errors.push(`Ligne ${i + 1} illisible.`);
            return;
          }
          rows.push({ month: m, revenueFcfa: Number(rev), expensesFcfa: exp ? Number(exp) : null });
        });
      if (errors.length > 0)
        throw new AdminActionError('CSV_INVALID', 400, errors.slice(0, 5).join(' '));
      for (const r of rows) {
        await prisma.forecast.upsert({ where: { month: r.month }, create: r, update: r });
      }
      await audit(
        prisma,
        ctx.adminId,
        'forecast.import',
        null,
        { months: rows.map((r) => r.month) },
        ctx.meta,
      );
      return { imported: rows.length };
    },
  },
  'expense.create': {
    schema: z.object({ month, label: z.string().trim().min(2).max(120), amountFcfa: fcfa }),
    async run(ctx: ActionCtx, b: { month: string; label: string; amountFcfa: number }) {
      const e = await prisma.expense.create({ data: b });
      await audit(
        prisma,
        ctx.adminId,
        'expense.create',
        { type: 'Expense', id: e.id },
        { after: b },
        ctx.meta,
      );
      return { ok: true };
    },
  },
  'expense.delete': {
    schema: z.object({ id }),
    async run(ctx: ActionCtx, b: { id: string }) {
      const before = await prisma.expense.findUnique({ where: { id: b.id } });
      if (!before) return { ok: true };
      await prisma.expense.delete({ where: { id: b.id } });
      await audit(
        prisma,
        ctx.adminId,
        'expense.delete',
        { type: 'Expense', id: b.id },
        { before },
        ctx.meta,
      );
      return { ok: true };
    },
  },
} as const;

export type AdminActionName = keyof typeof ACTIONS;

export function isAdminAction(name: string): name is AdminActionName {
  return Object.prototype.hasOwnProperty.call(ACTIONS, name);
}
