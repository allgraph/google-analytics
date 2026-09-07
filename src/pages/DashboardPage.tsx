import { ArrowDownRight, ArrowUpRight, CalendarDays } from 'lucide-react'

const metrics = [
  { label: 'Расход', value: '€12 480', delta: '+8,2%', positive: false },
  { label: 'Звонки', value: '1 284', delta: '+12,4%', positive: true },
  { label: 'Заявки', value: '486', delta: '+6,8%', positive: true },
  { label: 'Чистая прибыль', value: '€18 940', delta: '+14,1%', positive: true },
]

const sites = [
  ['sanitaer-notdienst-berlin.de', '€4 820', '412', '€8 460', '175,5%'],
  ['rohrreinigung-berlin-sofort.de', '€3 160', '328', '€5 120', '162,0%'],
  ['schluesseldienst-berlin-24.de', '€2 840', '241', '−€212', '−7,5%'],
]

export function DashboardPage() {
  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Дашборд</h1>
          <p className="mt-1 text-[13px] text-slate-500">Реклама, звонки, заявки и прибыль</p>
        </div>
        <button
          className="ml-auto inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          type="button"
        >
          <CalendarDays size={15} />
          Последние 30 дней
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            key={metric.label}
          >
            <div className="text-[12px] font-medium text-slate-500">{metric.label}</div>
            <div className="mt-2 flex items-end gap-3">
              <strong className="font-mono text-2xl font-semibold tracking-tight text-slate-900">
                {metric.value}
              </strong>
              <span
                className={`mb-0.5 inline-flex items-center text-xs font-medium ${metric.positive ? 'text-emerald-600' : 'text-rose-600'}`}
              >
                {metric.positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                {metric.delta}
              </span>
            </div>
          </article>
        ))}
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Сайты и прибыль</h2>
          <p className="mt-1 text-xs text-slate-400">3 сайта · данные демонстрационные</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-slate-50/95">
              <tr>
                {['Сайт', 'Расход', 'Звонки', 'Прибыль', 'ROI'].map((heading) => (
                  <th
                    className="whitespace-nowrap px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500"
                    key={heading}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sites.map((site) => (
                <tr className="border-t border-slate-100 hover:bg-slate-50" key={site[0]}>
                  {site.map((cell, index) => (
                    <td
                      className={`whitespace-nowrap px-4 py-3 text-[13px] ${index === 0 ? 'text-indigo-600' : 'font-mono text-slate-700'} ${cell.startsWith('−') ? 'text-rose-600' : ''}`}
                      key={cell}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
