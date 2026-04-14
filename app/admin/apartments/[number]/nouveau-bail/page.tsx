import { notFound } from 'next/navigation'
import { runSqlAdmin } from '@/lib/adminData'
import NouveauBailForm from './NouveauBailForm'

export const dynamic = 'force-dynamic'

export default async function NouveauBailPage({
  params,
}: {
  params: Promise<{ number: string }>
}) {
  const { number } = await params

  const rows = await runSqlAdmin<{ id: string; number: string }>(
    `SELECT id, number FROM apartments WHERE number = '${number.replace(/'/g, "''")}'`
  )
  if (!rows.length) notFound()

  return (
    <div className="space-y-6 max-w-3xl">
      <a href={`/admin/apartments/${number}`} className="text-sm text-gray-400 hover:text-gray-600">
        ← Appartement {number}
      </a>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nouveau bail</h1>
        <p className="text-sm text-gray-400 mt-1">Appartement {number}</p>
      </div>

      <NouveauBailForm aptNumber={number} />
    </div>
  )
}
