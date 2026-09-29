'use server';

// Changes to Talk-to-us messages. Every action checks the admin session on the
// server: the buttons are only a convenience.

import { revalidatePath } from 'next/cache';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminSession } from '@/lib/admin-auth';
import { adminFirestore } from '@/lib/firebase-admin';
import { COLLECTIONS, LEAD_RETENTION_MS } from '@/lib/plan-finder/config';

const STATUSES = ['new', 'replied', 'closed'] as const;
type Status = (typeof STATUSES)[number];
/** A closed conversation is kept 30 days, then removed by the TTL policy. */
const CLOSED_RETENTION_MS = 30 * 86_400_000;

async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) throw new Error('Not authorized');
  return session;
}

export async function setLeadStatus(id: string, status: string) {
  await requireAdmin();
  if (!STATUSES.includes(status as Status) || !/^[A-Za-z0-9]{1,40}$/.test(id)) throw new Error('Bad request');
  const now = Date.now();
  // Kept 12 months after the last contact (docs/06), or 30 days once closed.
  const expireAt = Timestamp.fromMillis(now + (status === 'closed' ? CLOSED_RETENTION_MS : LEAD_RETENTION_MS));
  await adminFirestore.collection(COLLECTIONS.leads).doc(id).update({ status, statusAt: Timestamp.fromMillis(now), expireAt });
  revalidatePath('/admin/plan-finder/leads');
}

/** Deletes a message for good, for example when the sender asks for their data to be removed. */
export async function deleteLead(id: string) {
  await requireAdmin();
  if (!/^[A-Za-z0-9]{1,40}$/.test(id)) throw new Error('Bad request');
  await adminFirestore.collection(COLLECTIONS.leads).doc(id).delete();
  revalidatePath('/admin/plan-finder/leads');
}
