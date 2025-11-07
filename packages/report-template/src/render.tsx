import { renderToStaticMarkup } from 'react-dom/server'
import { Report } from './Report'
import type { DraftBundle, ReportSection, SectionSelection } from './types'

export function renderReport(bundle: DraftBundle, chosen: SectionSelection = {}) {
    const sections: ReportSection[] = (bundle.sections || []).map((section) => ({
        id: section.id,
        title: section.title,
        chartUrl: section.chartUrl,
        text: chosen[section.id] ?? section.options?.[0]?.text ?? ''
    }))

    return (
        '<!doctype html>' +
        renderToStaticMarkup(
            <Report clientName={bundle.clientName} period={bundle.period} kpis={bundle.kpis || []} sections={sections} />
        )
    )
}
