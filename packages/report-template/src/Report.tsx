import React from 'react'
import { GradientBar, GradientProgressBar } from './components/GradientProgressBar'
import type { DraftBundle, GrowthCategory, ReportSection, SummaryDetail } from './types'

type Props = Pick<DraftBundle, 'clientName' | 'date' | 'kpis'> & {
    sections: ReportSection[]
    growthCategories: GrowthCategory[]
    summaryDetails: SummaryDetail[]
}

const sectionGroup = (section?: ReportSection) => section?.group ?? 'general'
const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
})

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
                    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color:#111; font-size:10px; line-height:1.25; }
                    h1 { font-size:16px; color:#111; }
                    h2 { font-size:14px; margin:2px; color:#111; }
                    h3 { font-size:12px; margin:2px; color:#111; }
                    p { margin: 2px; }
                    header { margin-bottom: 4px; display:flex; justify-content:space-between; align-items:center; gap:8px; }
                    header h1{ margin:0; }
                    .header-meta{ text-align:right; font-size:10px; color:#475569; }
                    .kpi { display:grid; grid-template-columns: repeat(auto-fit,minmax(165px,1fr)); gap:4px; margin-bottom: 4px; }
                    .kpi-card{ padding:6px; border-radius:8px; background:#f8fafc; }
                    .kpi-card strong{ display:inline; font-size:10px; color:#111; }
                    .questions{ margin: 6px 0; display:flex; flex-direction:column; gap:4px; }
                    .question-item{ background:#f8fafc; border-radius:8px; padding:8px 10px; page-break-inside:avoid; }
                    .question-item h4{ margin:0 0 4px; font-size:11px; color:#111; }
                    .question-item p{ margin:0; color:#111; font-size:10px; line-height:1.25; }
                    .category-table{ width:100%; border-collapse:collapse; margin:6px 0; font-size:10px; }
                    .category-table th,.category-table td{ text-align:center; padding:6px; border-bottom:1px solid #e2e8f0; }
                    .category-table th{ font-size:10px; color:#111; background:#f8fafc; }
                    .category-table td:first-child{ font-weight:600; color:#111; text-align:left; }
                    .category-name{ color:#111; font-weight:400; }
                    .category-initial{ font-weight:700; color:#0f172a; }
                    .category-note{ font-size:9px; color:#475569; margin:4px 0 8px; text-align: center; }
                    .category-score{ min-width:130px; }
                    .summary-table{ width:100%; border-collapse:collapse; margin:4px 0 4px; font-size:10.5px; }
                    .summary-table th,.summary-table td{ padding:8px; border-bottom:1px solid #e2e8f0; vertical-align:middle; }
                    .summary-table th{ font-size:10px; color:#111; background:#f8fafc; text-align:left; }
                    .summary-details-header{ display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
                    .summary-details-label{ font-weight:600; text-align:left; }
                    .summary-note-inline{ font-size:9px; color:#475569; text-align:right; white-space:nowrap; }
                    .summary-focus{ display:flex; align-items:center; gap:6px; }
                    .summary-badge{ width:25px; height:25px; border-radius:50%; background:rgba(4,120,87,0.15); color:#065f46; font-weight:600; display:flex; align-items:center; justify-content:center; font-size:12px; border:1px solid rgba(4,120,87,0.3); }
                    .summary-copy{ margin:0; font-size:9.25px; color:#111; line-height:1.3; }
                    .summary-profit{ text-align:right; font-weight:600; color:#047857; white-space:nowrap; }
                    .section{ page-break-inside: avoid; margin: 10px 0; }
                    .profit-callout{ margin:6px 0; padding:6px 8px; border-radius:8px; background:#f0fdf4; color:#065f46; font-size:10px; font-weight:500; border:1px solid rgba(6,95,70,0.2); }
                    .quote-block{ font-style:italic; color:#111; margin:10px 0 2px; line-height: 1.8; }
                    .quote-text{ display:inline; }
                    .quote-signature{ font-family:"Zapfino"; font-size:9px; margin:0 0 20px 2rem; color:#111; font-weight:300; font-style:normal; white-space:nowrap; display:inline-block; letter-spacing:0.25px; }
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
                    <p className="profit-callout">
                        Additional profitability a top 10% practice captures averages <strong>$162,548</strong> per year.
                    </p>
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
                                            <td>
                                                <span className="category-name">
                                                    <span className="category-initial">{category.name.charAt(0)}</span>
                                                    {category.name.slice(1)}
                                                </span>
                                            </td>
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
                            <p className="category-note">
                                Score represents only KPIs currently scored. Score will adjust after completion of part 2 and 3 of analysis.
                            </p>
                        </>
                    )}

                    {summaryDetails.length > 0 && (
                        <>
                            <table className="summary-table">
                                <thead>
                                    <tr>
                                        <th className="summary-details-header">
                                            <span className="summary-details-label">Summary Details</span>
                                            <span className="summary-note-inline">
                                                * Ask about our Profit Accelerator to turn these projected gains into your actual profit.
                                            </span>
                                        </th>
                                        <th className="summary-profit">Avg Profit ↗</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {summaryDetails.map((detail) => (
                                        <tr key={detail.id}>
                                            <td>
                                                <div className="summary-focus">
                                                    <span className="summary-badge">{detail.label}</span>
                                                    <p className="summary-copy">{resolveSummaryText(detail)}</p>
                                                </div>
                                            </td>
                                            <td className="summary-profit">
                                                {detail.avgProfit != null ? currencyFormatter.format(detail.avgProfit) : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
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
                    <blockquote className="quote-block">
                        <span className="quote-text">
                            &quot;We love helping practices double their profitability risk free without having to come up with money out of
                            their pocket. It's a game changer for the practice and unbelievably fulfilling for our team, for practices that qualify.&quot;
                        </span>
                        <span className="quote-signature">Shawn Rowbotham</span>
                    </blockquote>
                </main>
            </body>
        </html>
    )
}
