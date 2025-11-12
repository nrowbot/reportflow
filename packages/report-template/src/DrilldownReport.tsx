import React from 'react'
import type { DrilldownTable } from './types'

type Props = {
    table: DrilldownTable
}

const sanitizeRows = (columns: string[], rows: string[][]) =>
    rows.map((row) =>
        columns.map((_, idx) => {
            const value = row?.[idx]
            if (value == null) return ''
            if (typeof value === 'string') return value.trim()
            return String(value)
        })
    )

export function DrilldownReport({ table }: Props) {
    const columns = table.columns || []
    const normalizedRows = sanitizeRows(columns, table.rows || [])
    const displayRows = normalizedRows.map((row, rowIdx) =>
        row.map((cell, colIdx) => {
            if (!cell) return ''
            const prev = normalizedRows[rowIdx - 1]?.[colIdx]
            return prev === cell ? '' : cell
        })
    )
    const columnMeta = columns.map((column) => {
        const key = column.toLowerCase().trim()
        if (key.includes('growth category')) {
            return {
                label: column,
                headerLabel: '',
                width: '30px',
                className: 'growth-column',
                isGrowth: true,
            }
        }
        if (key === 'kpis') {
            return { label: column, headerLabel: column, width: '50px', className: 'indent-column indent-kpis' }
        }
        if (key === 'category') {
            return {
                label: column,
                headerLabel: column,
                width: '110px',
                className: 'indent-column indent-category',
            }
        }
        if (key === 'score') {
            return { label: column, headerLabel: column, width: '40px', className: 'detail-column' }
        }
        if (key === 'kpi') {
            return { label: column, headerLabel: column, width: '310px', className: 'detail-column' }
        }
        if (key === 'description') {
            return { label: column, headerLabel: column, width: '242px', className: 'detail-column' }
        }
        if (key.includes('profit driver')) {
            return { label: column, headerLabel: column, width: '157px', className: 'detail-column' }
        }
        return { label: column, headerLabel: column, width: '150px', className: 'detail-column' }
    })

    return (
        <html>
            <head>
                <meta charSet="utf-8" />
                <style>{`
                    @page { size: Letter; margin: 0.4in; }
                    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color:#111; font-size:11px; line-height:1.3; }
                    h1 { font-size:16px; margin:0 0 0; color:#0f172a; }
                    .drilldown-wrapper{ display:flex; flex-direction:column; gap:3px; }
                    .drilldown-meta{ color:#475569; font-size:10px; }
                    .drilldown-table{ width:100%; border-collapse:collapse; font-size:10px; table-layout:fixed; }
                    .drilldown-table thead th{ text-align:left; font-size:9.5px; color:#0f172a; border-bottom:2px solid #e2e8f0; padding:6px 8px; background:#f8fafc; }
                    .drilldown-table td{ padding:2px 2px; border-bottom:1px solid #e2e8f0; vertical-align:middle; background:#fff; line-height:1.2; }
                    .drilldown-table th{ vertical-align:middle; }
                    .drilldown-table td.empty{ color:transparent; }
                    .growth-column{ text-transform:uppercase; letter-spacing:0.04em; }
                    .growth-badge{ width:20px; height:20px; border-radius:50%; background:rgba(4,120,87,0.15); color:#065f46; font-size:11px; font-weight:600; display:flex; align-items:center; justify-content:center; border:1px solid rgba(4,120,87,0.3); margin-right:6px; }
                    .indent-column{ padding-left:14px; }
                    .indent-kpis{ padding-left:18px; }
                    .indent-category{ padding-left:24px; }
                    .detail-column{ font-size:9.5px; color:#0f172a; }
                    tr{ page-break-inside:avoid; }
                `}</style>
            </head>
            <body>
                <main className="drilldown-wrapper">
                    {table.title && <h1>{table.title}</h1>}
                    <table className="drilldown-table">
                        <colgroup>
                            {columnMeta.map((meta, idx) => (
                                <col key={`col-${idx}`} style={{ width: meta.width }} />
                            ))}
                        </colgroup>
                        <thead>
                            <tr>
                                {columnMeta.map((meta) => (
                                    <th key={meta.label}>{meta.headerLabel}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {displayRows.map((row, rowIdx) => (
                                <tr key={rowIdx}>
                                    {columnMeta.map((meta, colIdx) => {
                                        const displayValue = row[colIdx]
                                        const rawValue = normalizedRows[rowIdx]?.[colIdx] ?? ''
                                        const classes = [meta.className, displayValue ? '' : 'empty'].filter(Boolean).join(' ')
                                        const hasValue = Boolean(displayValue?.trim())
                                        const content = meta.isGrowth
                                            ? hasValue
                                                ? (
                                                    <span className="growth-badge">{displayValue}</span>
                                                )
                                                : '\u00a0'
                                            : hasValue
                                                ? displayValue
                                                : '\u00a0'
                                        return (
                                            <td key={`${rowIdx}-${colIdx}`} className={classes} data-value={rawValue}>
                                                {content}
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </main>
            </body>
        </html>
    )
}
