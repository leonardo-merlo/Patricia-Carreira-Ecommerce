'use server'

import { requireAdmin } from '@/lib/server/auth'
import {
  getAdminNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type AdminNotification,
  type NotificationKind,
} from '@/lib/server/notifications'
import { revalidatePath } from 'next/cache'

export type { AdminNotification, NotificationKind } from '@/lib/server/notifications'

export async function listNotifications(): Promise<AdminNotification[]> {
  await requireAdmin()
  return getAdminNotifications()
}

export async function markRead(kind: NotificationKind, refId: string): Promise<{ ok: boolean }> {
  await requireAdmin()
  await markNotificationRead(kind, refId)
  revalidatePath('/admin', 'layout')
  return { ok: true }
}

export async function markAllRead(): Promise<{ ok: boolean }> {
  await requireAdmin()
  await markAllNotificationsRead()
  revalidatePath('/admin', 'layout')
  return { ok: true }
}
