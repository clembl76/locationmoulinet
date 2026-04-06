'use server'

import { generateMonthlyRents, seedTestRents } from '@/lib/adminData'
import { revalidatePath } from 'next/cache'

export async function generateRentsAction(year: number, month: number) {
  const result = await generateMonthlyRents(year, month)
  revalidatePath('/admin')
  return result
}

export async function seedTestRentsAction() {
  const result = await seedTestRents()
  revalidatePath('/admin')
  return result
}
