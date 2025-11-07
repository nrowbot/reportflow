import React, { useMemo, useState } from 'react'
import Papa from 'papaparse'
import type { ParseResult } from 'papaparse'
import axios from 'axios'
import { GradientProgressBar, type DraftBundle, type SectionSelection, renderReport } from 'report-template'

type CsvRow = {
    name?: string
    value?: number | string
    delta?: number | string
}

export function App() {
    const [bundle, setBundle] = useState<DraftBundle | null>(null)
    const [chosen, setChosen] = useState<SectionSelection>({})
    const [pdfUrl, setPdfUrl] = useState<string>('')

    const onCsv = (file: File) => {
        Papa.parse<CsvRow>(file, {
            header: true,
            dynamicTyping: true,
            complete: (res: ParseResult<CsvRow>) => {
                // Expect columns: name,value,delta
                const kpis = res.data
                    .filter((row) => row?.name)
                    .map((row) => ({
                        name: String(row.name),
                        value: Number(row.value) || 0,
                        delta: row.delta != null ? Number(row.delta) : undefined
                    }))

                const sections: DraftBundle['sections'] = [
                    {
                        id: 'overview',
                        title: 'Overview',
                        options: [
                            { id: 'overview-1', text: 'Traffic surged this month thanks to stronger ad recall.' },
                            { id: 'overview-2', text: 'Engagement remained flat overall, but key segments improved.' }
                        ]
                    },
                    {
                        id: 'performance',
                        title: 'Performance',
                        options: [
                            { id: 'performance-1', text: 'North America outpaced projections while EMEA lagged.' },
                            { id: 'performance-2', text: 'Paid search generated the strongest efficiencies quarter-to-date.' }
                        ]
                    }
                ]
                setBundle({
                    clientName: 'Demo Client',
                    period: { start: '2025-10-01', end: '2025-10-31' },
                    kpis,
                    sections
                })
            }
        })
    }

    const previewHtml = useMemo(() => {
        if (!bundle) return '<p>Upload a CSV to begin.</p>'
        return renderReport(bundle, chosen)
    }, [bundle, chosen])


    const finalize = async () => {
        if (!bundle) return
        try {
            const html = renderReport(bundle, chosen)
            const resp = await axios.post('http://localhost:3001/pdf', { html }, { responseType: 'blob' })
            const blob = new Blob([resp.data], { type: 'application/pdf' })
            const url = URL.createObjectURL(blob)
            setPdfUrl(url)
            const a = document.createElement('a')
            a.href = url
            a.download = 'report.pdf'
            a.click()
            window.open(url, '_blank')
        } catch (err) {
            console.error(err)
            alert('Unable to generate the PDF. Ensure the PDF service is running on :3001.')
        }
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: 16 }}>
            <div>
                <h1>Reviewer (CSV → HTML → PDF)</h1>
                <p>Upload KPI data as CSV (columns: name,value,delta) to populate the draft bundle.</p>
                <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) onCsv(file)
                    }}
                />

                {bundle && (
                    <>
                    <h3>KPIs</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
                        {bundle.kpis.map((kpi) => (
                        <div key={kpi.name} style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
                            <strong>{kpi.name}</strong>
                            <div style={{ fontSize: 22, fontWeight: 600, margin: '6px 0 10px' }}>
                                {kpi.value}%
                                {kpi.delta != null ? (
                                <span style={{ fontSize: 12, marginLeft: 6 }}>
                                    ({kpi.delta >= 0 ? '+' : ''}
                                    {kpi.delta}%)
                                </span>
                                ) : null}
                            </div>
                            <GradientProgressBar value={kpi.value} />
                        </div>
                        ))}
                    </div>

                    {bundle.sections.map((section) => (
                        <div key={section.id} style={{ border: '1px solid #ddd', padding: 12, marginTop: 12, borderRadius: 12 }}>
                            <h3>{section.title}</h3>
                            {section.chartUrl && <img src={section.chartUrl} alt={section.title} style={{ maxWidth: '100%' }} />}
                            {section.options.map((option) => (
                            <label key={option.id} style={{ display: 'block', marginBottom: 8 }}>
                                <input
                                    type="radio"
                                    name={`opt-${section.id}`}
                                    checked={chosen[section.id] === option.text}
                                    onChange={() =>
                                        setChosen((prev) => ({
                                            ...prev,
                                            [section.id]: option.text
                                        }))
                                    }
                                />
                                <span style={{ marginLeft: 8 }}>{option.text}</span>
                            </label>
                            ))}
                            <textarea
                                placeholder="Or edit/paste your own blurb…"
                                value={chosen[section.id] || ''}
                                onChange={(e) =>
                                    setChosen((prev) => ({
                                        ...prev,
                                        [section.id]: e.target.value
                                    }))
                                }
                                style={{ width: '100%', minHeight: 100 }}
                            />
                        </div>
                    ))}

                    <button onClick={finalize} style={{ marginTop: 16 }}>
                        Finalize → PDF
                    </button>
                    </>
                )}
            </div>


            <div>
                <h2>Instant Preview</h2>
                <iframe srcDoc={previewHtml} style={{ width: '100%', height: '85vh', border: '1px solid #eee' }} />
                {pdfUrl && (
                <p>
                    <a href={pdfUrl} target="_blank" rel="noreferrer">
                        Open last PDF
                    </a>
                </p>
                )}
            </div>
        </div>
    )
}
