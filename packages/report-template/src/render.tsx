import { renderToStaticMarkup } from 'react-dom/server'
import { Report } from './Report'


export function renderReport(data: any, chosen: Record<string, string>) {
    const sections = (data.sections || []).map((s: any) => ({
        id: s.id,
        title: s.title,
        chartUrl: s.chartUrl,
        text: chosen[s.id] ?? s.options?.[0]?.text ?? ''
    }))

    const html = '<!doctype html>' +
    renderToStaticMarkup(
        Report({
            clientName: data.clientName,
            period: data.period,
            kpis: data.kpis || [],
            sections
        }) as any
    )
    return html
}