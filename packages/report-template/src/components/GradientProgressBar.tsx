import React from 'react'
import gradientFill from '../assets/gradient-fill.png'

const TRACK_BORDER = 'rgba(15,23,42,0.08)'
const TRACK_BACKGROUND = '#f6f8fb'
const TRACK_SHADOW = 'inset 0 1px 1px rgba(15,23,42,0.08)'
const FULL_THRESHOLD = 99.95
const CLIP_PAD_START = -0.15
const CLIP_PAD_END = 0.1

export type GradientProgressBarProps = {
    value: number
    label?: string
    min?: number
    max?: number
    height?: number
    showHeader?: boolean
}

export type GradientBarProps = GradientProgressBarProps & {
    trackColor?: string
    rounded?: number
    showValue?: boolean
    valueColor?: string
    'aria-label'?: string
}

const clamp = (value: number, min: number, max: number) => {
    const safeValue = Number.isFinite(value) ? value : min
    return Math.min(max, Math.max(min, safeValue))
}

const getPercent = (value: number, min: number, max: number) => {
    const safeMax = max === min ? min + 1 : max
    const fraction = (clamp(value, min, safeMax) - min) / (safeMax - min)
    return Number.isFinite(fraction) ? fraction : 0
}

export function GradientBar({
    value,
    label,
    min = 0,
    max = 100,
    height = 16,
    trackColor = '#f1f5f9',
    rounded = 999,
    showValue = true,
    valueColor = '#111',
    'aria-label': ariaLabel
}: GradientBarProps) {
    const percent = getPercent(value, min, max)
    const fillPercent = Math.min(100, Math.max(0, Number((percent * 100).toFixed(4))))
    const isFull = fillPercent >= FULL_THRESHOLD
    const remainderPercent = isFull ? 0 : Math.max(0, 100 - fillPercent)
    const clipRight = isFull ? 0 : Math.max(0, remainderPercent - CLIP_PAD_END)
    const labelLeft = Math.min(Math.max(fillPercent + 8, 8), 93)
    const percentValue = Math.round(fillPercent)
    const trackRadius = Math.min(rounded, height / 2)
    const hasFill = fillPercent > 0

    const gradientStyle: React.CSSProperties = {
        position: 'absolute',
        inset: 0,
        borderRadius: trackRadius,
        backgroundImage: `url(${gradientFill})`,
        backgroundSize: '120% 160%',
        backgroundPosition: 'left center',
        backgroundRepeat: 'no-repeat',
        clipPath: isFull ? undefined : `inset(0 ${clipRight}% 0 ${CLIP_PAD_START}%)`
    }

    return (
        <div
            aria-label={ariaLabel ?? label}
            style={{
                width: '100%',
                height,
                borderRadius: trackRadius,
                backgroundColor: trackColor ?? TRACK_BACKGROUND,
                border: `1px solid ${TRACK_BORDER}`,
                boxShadow: TRACK_SHADOW,
                backdropFilter: 'blur(2px)',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            {hasFill && <div style={gradientStyle} />}
            {showValue && (
                <span
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: `${labelLeft}%`,
                        transform: 'translate(-50%,-50%)',
                        fontSize: Math.max(10, height * 0.6),
                        fontWeight: 600,
                        color: valueColor,
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none'
                    }}
                >
                    {percentValue}%
                </span>
            )}
        </div>
    )
}

export function GradientProgressBar({
    value,
    label,
    min = 0,
    max = 100,
    height = 16,
    showHeader
}: GradientProgressBarProps) {
    const headerVisible = showHeader ?? Boolean(label)

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {headerVisible && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#555' }}>{label}</div>
            )}
            <GradientBar value={value} min={min} max={max} height={height} aria-label={label} />
        </div>
    )
}
