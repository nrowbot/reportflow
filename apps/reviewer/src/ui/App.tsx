import React, { useMemo, useState } from 'react'
import Papa from 'papaparse'
import axios from 'axios'
import { renderReport } from 'packages/report-template'


type Section = { id: string; title: string; options: { id: string; text: string }[]; chartUrl?: string }


type DraftBundle = {
clientName: string
period: { start: string; end: string }
kpis: { name: string; value: number; delta?: number }[]
sections: Section[]
}


export function App(){
    const [bundle, setBundle] = useState<DraftBundle | null>(null)
    const [chosen, setChosen] = useState<Record<string,string>>({})
    const [pdfUrl, setPdfUrl] = useState<string>('')
    
    
    const onCsv = (file: File) => {
        Papa.parse(file, {
            header: true,
            dynamicTyping: true,
            complete: (res) => {
                // Expect columns: name,value,delta
                const kpis = (res.data as any[]).filter(Boolean).map(r => ({ name: r.name, value: Number(r.value), delta: r.delta!=null? Number(r.delta): undefined }))
                const sections: Section[] = [
                    { id:'overview', title:'Overview', options:[{id:'overview-1', text:'Overview placeholder from CSV.'}] },
                    { id:'performance', title:'Performance', options:[{id:'performance-1', text:'Performance placeholder from CSV.'}] }
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
        if(!bundle) return '<p>Upload a CSV to begin.</p>'
        return renderReport(bundle, chosen)
    }, [bundle, chosen])


const finalize = async () => {
    if(!bundle) return
    const html = renderReport(bundle, chosen)
    const resp = await axios.post('http://localhost:3001/pdf', { html }, { responseType: 'blob' })
    const blob = new Blob([resp.data], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    setPdfUrl(url)
    // auto-download
    const a = document.createElement('a')
    a.href = url
    a.download = 'report.pdf'
    a.click()
    window.open(url, '_blank')
}


    return (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, padding:16 }}>
            <div>
                <h1>Reviewer (CSV → HTML → PDF)</h1>
                <input type="file" accept=".csv" onChange={e => e.target.files && onCsv(e.target.files[0])} />

                {bundle && (
                    <>
                    <h3>KPIs</h3>
                    <ul>
                        {bundle.kpis.map(k => (
                        <li key={k.name}><strong>{k.name}</strong>: {k.value}{k.delta!=null?` (${k.delta>=0?'+':''}${k.delta})`:''}</li>
                        ))}
                    </ul>


                    {bundle.sections.map(s => (
                        <div key={s.id} style={{ border:'1px solid #ddd', padding:12, marginTop:12 }}>
                            <h3>{s.title}</h3>
                            {s.chartUrl && <img src={s.chartUrl} alt={s.title} style={{ maxWidth:'100%' }} />}
                            {s.options.map(o => (
                            <label key={o.id} style={{ display:'block', marginBottom:8 }}>
                                <input type="radio" name={`opt-${s.id}`} onChange={() => setChosen(prev=>({ ...prev, [s.id]: o.text }))} />
                                <span style={{ marginLeft:8 }}>{o.text}</span>
                            </label>
                            ))}
                            <textarea
                                placeholder="Or edit/paste your own blurb…"
                                value={chosen[s.id] || ''}
                                onChange={e => setChosen(prev=>({ ...prev, [s.id]: e.target.value }))}
                                style={{ width:'100%', minHeight:100 }}
                            />
                        </div>
                    ))}

                    <button onClick={finalize} style={{ marginTop:16 }}>Finalize → PDF</button>
                    </>
                )}
                </div>


                <div>
                <h2>Instant Preview</h2>
                <iframe srcDoc={previewHtml} style={{ width:'100%', height:'85vh', border:'1px solid #eee' }} />
                {pdfUrl && <p><a href={pdfUrl} target="_blank" rel="noreferrer">Open last PDF</a></p>}
            </div>
        </div>
    )
}