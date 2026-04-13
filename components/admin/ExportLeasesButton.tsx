'use client'

import { useState } from 'react'

export default function ExportLeasesButton({ currentYear }: { currentYear: number }) {
  const [year, setYear] = useState(currentYear)

  const years = Array.from({ length: currentYear - 2016 + 1 }, (_, i) => currentYear - i)

  return (
    <div className="flex items-center gap-2">
      <select
        value={year}
        onChange={e => setYear(Number(e.target.value))}
        className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-primary/30"
      >
        {years.map(y => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
      <a
        href={`/api/admin/export-leases?year=${year}`}
        download
        className="text-xs font-medium px-3 py-1 rounded-lg border border-gray-200 text-gray-600 hover:border-blue-primary hover:text-blue-primary transition-colors"
      >
        Exporter CSV
      </a>
    </div>
  )
}
