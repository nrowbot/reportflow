import React, { useMemo, useState } from 'react'
import axios from 'axios'
import {
    type DrilldownTable,
    type DraftBundle,
    type SectionSelection,
    renderDrilldownReport,
    renderReport,
} from 'report-template'

const REPORT_PLACEHOLDER = '<p>Upload a bundle JSON to begin.</p>'
const DRILLDOWN_PLACEHOLDER = '<p>Upload a Drilldown CSV (see apps/reviewer/drilldown.csv for a sample) to preview.</p>'

const parseCsv = (text: string): string[][] => {
    const clean = text.replace(/^\uFEFF/, '')
    const rows: string[][] = []
    let current: string[] = []
    let value = ''
    let inQuotes = false

    for (let i = 0; i < clean.length; i++) {
        const char = clean[i]
        if (char === '\r') continue

        if (inQuotes) {
            if (char === '"') {
                if (clean[i + 1] === '"') {
                    value += '"'
                    i++
                } else {
                    inQuotes = false
                }
            } else {
                value += char
            }
            continue
        }

        if (char === '"') {
            inQuotes = true
            continue
        }

        if (char === ',') {
            current.push(value.trim())
            value = ''
            continue
        }

        if (char === '\n') {
            current.push(value.trim())
            rows.push(current)
            current = []
            value = ''
            continue
        }

        value += char
    }

    current.push(value.trim())
    rows.push(current)

    return rows
        .map((row) => row.map((cell) => cell.trim()))
        .filter((row) => row.some((cell) => cell.length))
}

const buildDrilldownTable = (text: string): DrilldownTable => {
    const rows = parseCsv(text)
    if (!rows.length) {
        throw new Error('CSV is empty')
    }

    let workingRows = [...rows]
    let title: string | undefined

    const firstRow = workingRows[0]
    const hasSoloFirstCell = firstRow ? firstRow.length <= 1 || firstRow.slice(1).every((cell) => !cell.length) : false
    if (hasSoloFirstCell && firstRow) {
        title = firstRow[0]
        workingRows = workingRows.slice(1)
    }

    if (!workingRows[0]) {
        throw new Error('CSV missing header row')
    }

    const headers = workingRows[0].map((header, idx) => header || `Column ${idx + 1}`)
    const dataRows = workingRows.slice(1)
    if (!dataRows.length) {
        throw new Error('CSV missing data rows')
    }

    const scoreColumnIndex = headers.findIndex((header) => header.trim().toLowerCase() === 'score')
    const filteredRows =
        scoreColumnIndex === -1
            ? dataRows
            : dataRows.filter((row) => {
                  const cell = row[scoreColumnIndex] ?? ''
                  return cell.length > 0
        })

    return {
        title,
        columns: headers,
        rows: filteredRows,
    }
}

export function App() {
    const [bundle, setBundle] = useState<DraftBundle | null>(null)
    const [chosen, setChosen] = useState<SectionSelection>({})
    const [pdfUrl, setPdfUrl] = useState<string>('')
    const [drilldownTable, setDrilldownTable] = useState<DrilldownTable | null>(null)
    const [drilldownPdfUrl, setDrilldownPdfUrl] = useState<string>('')

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

    const onDrilldownUpload = async (file: File) => {
        try {
            const text = await file.text()
            const table = buildDrilldownTable(text)
            setDrilldownTable(table)
        } catch (error) {
            console.error(error)
            alert('Unable to read drilldown CSV. Ensure it matches the sample structure.')
        }
    }

    const previewHtml = useMemo(() => {
        if (!bundle) return REPORT_PLACEHOLDER
        return renderReport(bundle, chosen)
    }, [bundle, chosen])

    const drilldownPreviewHtml = useMemo(() => {
        if (!drilldownTable) return DRILLDOWN_PLACEHOLDER
        return renderDrilldownReport(drilldownTable)
    }, [drilldownTable])

    const createPdf = async (html: string, filename: string, setUrl: (url: string) => void) => {
        try {
            const resp = await axios.post('http://localhost:3001/pdf', { html }, { responseType: 'blob' })
            const blob = new Blob([resp.data], { type: 'application/pdf' })
            const url = URL.createObjectURL(blob)
            setUrl(url)
            const a = document.createElement('a')
            a.href = url
            a.download = filename
            a.click()
        } catch (err) {
            console.error(err)
            alert('Unable to generate the PDF. Ensure the PDF service is running on :3001.')
        }
    }

    const finalizeReport = () => {
        if (!bundle) return
        const html = renderReport(bundle, chosen)
        void createPdf(html, 'report.pdf', setPdfUrl)
    }

    const finalizeDrilldown = () => {
        if (!drilldownTable) return
        const html = renderDrilldownReport(drilldownTable)
        void createPdf(html, 'drilldown-report.pdf', setDrilldownPdfUrl)
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: 16 }}>
            <div>
                <h1>Reviewer (JSON / CSV → HTML → PDF)</h1>

                <section style={{ marginBottom: 24 }}>
                    <h2>Practice Summary Bundle</h2>
                    <p>Upload a structured bundle (JSON) that includes practice info, KPIs, GROWTH metrics, and AI blurbs.</p>
                    <p style={{ fontSize: 12, color: '#475569' }}>
                        Need an example? Start with <code>apps/reviewer/sample-bundle.json</code>.
                    </p>
                    <input
                        type="file"
                        accept="application/json,.json"
                        onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) onBundleUpload(file)
                        }}
                    />
                </section>

                {bundle && (
                    <section>
                        {bundle.sections.map((section) => (
                            <div
                                key={section.id}
                                style={{ border: '1px solid #ddd', padding: 12, marginTop: 12, borderRadius: 12 }}
                            >
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
                                                    [section.id]: option.text,
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
                                            [section.id]: e.target.value,
                                        }))
                                    }
                                    style={{ width: '100%', minHeight: 100 }}
                                />
                            </div>
                        ))}

                        <button onClick={finalizeReport} style={{ marginTop: 16 }}>
                            Finalize Summary → PDF
                        </button>
                    </section>
                )}

                <section style={{ marginTop: 32 }}>
                    <h2>Drilldown Report (CSV)</h2>
                    <p>Upload the drilldown CSV to preview and export the long-form KPI table.</p>
                    <p style={{ fontSize: 12, color: '#475569' }}>
                        Sample file: <code>apps/reviewer/drilldown.csv</code>
                    </p>
                    <input
                        type="file"
                        accept=".csv,text/csv"
                        onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) onDrilldownUpload(file)
                        }}
                    />

                    {drilldownTable && (
                        <button onClick={finalizeDrilldown} style={{ marginTop: 16 }}>
                            Finalize Drilldown → PDF
                        </button>
                    )}
                </section>
            </div>


            <div>
                <h2>Practice Summary Preview</h2>
                <iframe
                    srcDoc={previewHtml}
                    style={{ width: '100%', height: '40vh', border: '1px solid #eee', marginBottom: 12 }}
                    title="Report preview"
                />
                {pdfUrl && (
                    <p>
                        <a href={pdfUrl} target="_blank" rel="noreferrer">
                            Open last summary PDF
                        </a>
                    </p>
                )}

                <h2>Drilldown Preview</h2>
                <iframe
                    srcDoc={drilldownPreviewHtml}
                    style={{ width: '100%', height: '40vh', border: '1px solid #eee', marginBottom: 12 }}
                    title="Drilldown preview"
                />
                {drilldownPdfUrl && (
                    <p>
                        <a href={drilldownPdfUrl} target="_blank" rel="noreferrer">
                            Open last drilldown PDF
                        </a>
                    </p>
                )}
            </div>
        </div>
    )
}
