import React from 'react'
import { GradientProgressBar } from './components/GradientProgressBar'
import type { DraftBundle, ReportSection } from './types'

type Props = Pick<DraftBundle, 'clientName' | 'period' | 'kpis'> & {
    sections: ReportSection[]
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
                    .kpi { display:grid; grid-template-columns: repeat(auto-fit,minmax(180px,1fr)); gap:12px; margin-bottom: 20px; }
                    .kpi-card{ border:1px solid #eee; padding:12px; border-radius:12px; background:#fafafa; }
                    .kpi-card strong{ display:block; margin-bottom:4px; font-size:14px; color:#111; }
                    .kpi-value{ font-size:24px; font-weight:600; margin-bottom:8px; }
                    .kpi-delta{ font-size:12px; color:#2563eb; }
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
                        <div className="kpi-card" key={k.name}>
                            <strong>{k.name}</strong>
                            <div className="kpi-value">
                                {k.value}%
                                {k.delta != null ? (
                                <span className="kpi-delta">
                                    {' '}
                                    ({k.delta >= 0 ? '+' : ''}
                                    {k.delta}%)
                                </span>
                                ) : null}
                            </div>
                            <GradientProgressBar value={k.value} />
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
