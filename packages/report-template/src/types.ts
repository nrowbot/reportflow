export type KPI = {
    name: string
    value: number
    delta?: number
}

export type SectionGroup = 'question' | 'summary' | 'general'

export type SectionOption = { id: string; text: string }

export type DraftSection = {
    id: string
    title: string
    options: SectionOption[]
    chartUrl?: string
    group?: SectionGroup
}

export type ReportSection = {
    id: string
    title: string
    text: string
    chartUrl?: string
    group?: SectionGroup
}

export type GrowthCategory = {
    id: string
    name: string
    score: number
    confidence: number
    scored: number
    total: number
}

export type SummaryDetail = {
    id: string
    label: string
    title: string
    sectionId?: string
    text?: string
}

export type DraftBundle = {
    clientName: string
    date: string
    kpis: KPI[]
    sections: DraftSection[]
    growthCategories?: GrowthCategory[]
    summaryDetails?: SummaryDetail[]
}

export type SectionSelection = Record<string, string>
