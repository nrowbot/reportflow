import { renderToStaticMarkup } from 'react-dom/server'
import { DrilldownReport } from './DrilldownReport'
import type { DrilldownTable } from './types'

export function renderDrilldownReport(table: DrilldownTable) {
    return '<!doctype html>' + renderToStaticMarkup(<DrilldownReport table={table} />)
}
