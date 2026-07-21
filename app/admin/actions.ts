'use server'

import { generateMonthlyRents } from '@/lib/adminData'
import { revalidatePath } from 'next/cache'

export async function generateRentsAction(year: number, month: number) {
  const result = await generateMonthlyRents(year, month)
  revalidatePath('/admin')
  return result
}
