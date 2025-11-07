export type Period = { start: string; end: string }

export type KPI = {
    name: string
    value: number
    delta?: number
}

export type SectionOption = { id: string; text: string }

export type DraftSection = {
    id: string
    title: string
    options: SectionOption[]
    chartUrl?: string
}

export type ReportSection = {
    id: string
    title: string
    text: string
    chartUrl?: string
}

export type DraftBundle = {
    clientName: string
    period: Period
    kpis: KPI[]
    sections: DraftSection[]
}

export type SectionSelection = Record<string, string>
