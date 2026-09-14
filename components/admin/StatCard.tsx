export default function StatCard({
  label, value, sub, href,
}: {
  label: string; value: number | string; sub?: string; href?: string
}) {
  const inner = (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm p-5 h-full ${href ? 'hover:border-teal/40 hover:shadow transition-all' : ''}`}>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
  return href ? <a href={href} className="block">{inner}</a> : <div>{inner}</div>
}
