import React from 'react'


type KPI = { name: string; value: number; delta?: number }


type Section = {
    id: string
    title: string
    text: string
    chartUrl?: string
}


type Props = {
    clientName: string
    period: { start: string; end: string }
    kpis: KPI[]
    sections: Section[]
}


export function Report({ clientName, period, kpis, sections }: Props) {
    return (
        <html>
            <head>
                <meta charSet="utf-8" />
                <style>{`
                    @page { size: Letter; margin: 0.5in; }
                    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color:#111; }
                    h1,h2,h3 { margin: 0 0 8px; }
                    header { margin-bottom: 16px; }
                    .kpi { display:grid; grid-template-columns: repeat(3,1fr); gap:8px; margin-bottom: 16px; }
                    .kpi > div{ border:1px solid #eee; padding:8px; border-radius:8px; }
                    .section{ page-break-inside: avoid; margin: 16px 0; }
                    img { max-width: 100%; }
                `}</style>
            </head>
            <body>
                <header>
                    <h1>{clientName} — Performance Report</h1>
                    <div>{period.start} → {period.end}</div>
                </header>
                <main>
                    <h2>Key Metrics</h2>
                    <div className="kpi">
                        {kpis.map((k) => (
                        <div key={k.name}>
                            <strong>{k.name}</strong>
                            <div>
                                {k.value}
                                {k.delta != null ? ` (${k.delta >= 0 ? '+' : ''}${k.delta})` : ''}
                            </div>
                        </div>
                        ))}
                    </div>

                    {sections.map((s) => (
                    <section className="section" key={s.id}>
                        <h3>{s.title}</h3>
                        {s.chartUrl && <img src={s.chartUrl} alt={s.title} />}
                        <p>{s.text}</p>
                    </section>
                    ))}
                </main>
            </body>
        </html>
    )
}