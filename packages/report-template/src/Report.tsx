import React from 'react'
import { GradientBar, GradientProgressBar } from './components/GradientProgressBar'
import type { DraftBundle, GrowthCategory, ReportSection, SummaryDetail } from './types'

type Props = Pick<DraftBundle, 'clientName' | 'date' | 'kpis'> & {
    sections: ReportSection[]
    growthCategories: GrowthCategory[]
    summaryDetails: SummaryDetail[]
}

const sectionGroup = (section?: ReportSection) => section?.group ?? 'general'

export function Report({ clientName, date, kpis, sections, growthCategories, summaryDetails }: Props) {
    const questionSections = sections.filter((section) => sectionGroup(section) === 'question')
    const generalSections = sections.filter((section) => !['question', 'summary'].includes(sectionGroup(section)))
    const sectionLookup = Object.fromEntries(sections.map((section) => [section.id, section]))

    const resolveSummaryText = (detail: SummaryDetail) => {
        const linked = (detail.sectionId && sectionLookup[detail.sectionId]) || sectionLookup[detail.id]
        return linked?.text || detail.text || ''
    }

    return (
        <html>
            <head>
                <meta charSet="utf-8" />
                <style>{`
                    @page { size: Letter; margin: 0.35in; }
                    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color:#111; font-size:11.5px; line-height:1.25; }
                    h1 { font-size:21px; margin:0 0 2px; color:#111; }
                    h2 { font-size:15px; margin:12px 0 2px; color:#111; }
                    h3 { font-size:13px; margin:12px 0 2px; color:#111; }
                    header { margin-bottom: 10px; display:flex; justify-content:space-between; align-items:center; gap:10px; }
                    header h1{ margin:0; }
                    .header-meta{ text-align:right; font-size:10px; color:#475569; }
                    .kpi { display:grid; grid-template-columns: repeat(auto-fit,minmax(165px,1fr)); gap:8px; margin-bottom: 6px; }
                    .kpi-card{ padding:8px; border-radius:8px; background:#f8fafc; }
                    .kpi-card strong{ display:inline; font-size:11px; color:#111; }
                    .questions{ margin: 12px 0; display:flex; flex-direction:column; gap:6px; }
                    .question-item{ background:#f8fafc; border-radius:8px; padding:8px 10px; page-break-inside:avoid; }
                    .question-item h4{ margin:0 0 4px; font-size:11px; color:#111; }
                    .question-item p{ margin:0; color:#111; font-size:10.5px; line-height:1.25; }
                    .category-table{ width:100%; border-collapse:collapse; margin:10px 0; font-size:10.5px; }
                    .category-table th,.category-table td{ text-align:center; padding:6px; border-bottom:1px solid #e2e8f0; }
                    .category-table th{ font-size:10px; color:#111; background:#f8fafc; }
                    .category-table td:first-child{ font-weight:600; color:#111; }
                    .category-score{ min-width:130px; }
                    .summary-grid{ display:flex; flex-direction:column; gap:3px; margin:9px 0 16px; }
                    .summary-item{ display:flex; gap:9px; padding:6px 0; border-bottom:1px solid #e2e8f0; align-items:center; }
                    .summary-item:last-child{ border-bottom:none; }
                    .summary-badge{ width:25px; height:25px; border-radius:50%; background:rgba(4,120,87,0.2); color:#065f46; font-weight:600; display:flex; align-items:center; justify-content:center; font-size:12px; flex-shrink:0; border:1px solid rgba(4,120,87,0.3); }
                    .summary-copy p{ margin:0; font-size:10px; color:#111; line-height:1.25; }
                    .section{ page-break-inside: avoid; margin: 12px 0; }
                    img { max-width: 100%; }
                `}</style>
            </head>
            <body>
                <header>
                    <h1>{clientName} — Online Analysis</h1>
                    <div className="header-meta">{date}</div>
                </header>
                <main>
                    <div className="kpi">
                        {kpis.map((k) => (
                            <div className="kpi-card" key={k.name}>
                                <strong>{k.name}</strong>
                                <GradientProgressBar value={k.value} height={12} />
                            </div>
                        ))}
                    </div>
                    {questionSections.length > 0 && (
                        <>
                            <h2>Key Questions</h2>
                            <div className="questions">
                                {questionSections.map((section) => (
                                    <div className="question-item" key={section.id}>
                                        <h4>{section.title}</h4>
                                        <p>{section.text}</p>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {growthCategories.length > 0 && (
                        <>
                            <h3>Breakdown by Category</h3>
                            <table className="category-table">
                                <thead>
                                    <tr>
                                        <th>Category</th>
                                        <th>Score</th>
                                        <th>Confidence</th>
                                        <th>KPIs Scored</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {growthCategories.map((category) => (
                                        <tr key={category.id}>
                                            <td>{category.name}</td>
                                            <td>
                                                <div className="category-score">
                                                    <GradientBar value={category.score} height={10} trackColor="#e2e8f0" />
                                                </div>
                                            </td>
                                            <td>{category.confidence}%</td>
                                            <td>
                                                {category.scored} of {category.total}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </>
                    )}

                    {summaryDetails.length > 0 && (
                        <>
                            <h3>Summary Details</h3>
                            <div className="summary-grid">
                                {summaryDetails.map((detail) => (
                                    <div className="summary-item" key={detail.id}>
                                        <div className="summary-badge">{detail.label}</div>
                                        <div className="summary-copy">
                                            <p>{resolveSummaryText(detail)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {generalSections.map((section) => (
                        <section className="section" key={section.id}>
                            <h3>{section.title}</h3>
                            <p>{section.text}</p>
                        </section>
                    ))}

                    <p>
                        Learn more about GROWTH Practice Optimization Partnership, the new <u><i>Zero Risk</i></u> way to win in
                        dentistry!
                    </p>
                    <p>
                        &quot;We love helping practices double their profitability risk free without having to come up with money out
                        of their pocket. It's a game changer for the practice and unbelievably fulfilling for our team, for practices
                        that qualify.&quot; Shawn Rowbotham
                    </p>
                </main>
            </body>
        </html>
    )
}
