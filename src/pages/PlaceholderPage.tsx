interface PlaceholderPageProps {
  title: string
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <div className="mx-auto max-w-[1500px]">
      <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
      <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-[13px] text-slate-500">
        Раздел подготовлен для дальнейшей реализации.
      </div>
    </div>
  )
}
