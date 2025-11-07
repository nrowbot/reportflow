import React from 'react'

export type GradientProgressBarProps = {
    value: number
    label?: string
    min?: number
    max?: number
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export function GradientProgressBar({ value, label, min = 0, max = 100 }: GradientProgressBarProps) {
    const safeMax = max === min ? min + 1 : max
    const percent = (clamp(value, min, safeMax) - min) / (safeMax - min)
    const percentValue = Math.round(percent * 100)
    const fillPercent = percent * 100
    const gradientMask = `linear-gradient(90deg,#000 0%,#000 ${fillPercent}%,transparent ${fillPercent}%,transparent 100%)`

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {label && <span style={{ fontSize: 12, color: '#555' }}>{label}</span>}
            <div
                aria-label={label}
                style={{
                    width: '100%',
                    height: 16,
                    borderRadius: 999,
                    backgroundColor: '#e2e8f0',
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                {fillPercent > 0 && (
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(90deg,#dc2626,#eab308,#16a34a)',
                            maskImage: gradientMask,
                            WebkitMaskImage: gradientMask
                        }}
                    />
                )}
            </div>
            <span style={{ fontSize: 12, color: '#444', textAlign: 'right' }}>{percentValue}%</span>
        </div>
    )
}
