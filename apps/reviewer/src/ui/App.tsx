import React, { useMemo, useState } from 'react'
import axios from 'axios'
import { type DraftBundle, type SectionSelection, renderReport } from 'report-template'

export function App() {
    const [bundle, setBundle] = useState<DraftBundle | null>(null)
    const [chosen, setChosen] = useState<SectionSelection>({})
    const [pdfUrl, setPdfUrl] = useState<string>('')

    const onBundleUpload = async (file: File) => {
        try {
            const text = await file.text()
            const parsed = JSON.parse(text) as DraftBundle
            if (!parsed.clientName || !parsed.sections) {
                throw new Error('Missing required fields (clientName, sections)')
            }
            setBundle(parsed)
            setChosen({})
        } catch (error) {
            console.error(error)
            alert('Unable to read bundle JSON. Ensure it matches the DraftBundle schema.')
        }
    }

    const previewHtml = useMemo(() => {
        if (!bundle) return '<p>Upload a bundle JSON to begin.</p>'
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
                <h1>Reviewer (JSON Bundle → HTML → PDF)</h1>
                <p>Upload a structured bundle (JSON) that includes practice info, KPIs, GROWTH metrics, and AI blurbs.</p>
                <p style={{ fontSize: 12, color: '#475569' }}>Need an example? Start with <code>apps/reviewer/sample-bundle.json</code>.</p>
                <input
                    type="file"
                    accept="application/json,.json"
                    onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) onBundleUpload(file)
                    }}
                />

                {bundle && (
                    <>
                    {bundle.sections.map((section) => (
                        <div key={section.id} style={{ border: '1px solid #ddd', padding: 12, marginTop: 12, borderRadius: 12 }}>
                            <h3>{section.title}</h3>
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
                <iframe srcDoc={previewHtml} style={{ width: '100%', height: '85vh', border: '1px solid #eee' }} title="Report preview" />
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
