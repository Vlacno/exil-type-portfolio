import { typefaceEntries } from './content'
import { testerStyleLabels } from '../../shared/typefaceStyles'

const bounded = (value, fallback, min, max) => typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback
const object = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {}

export function resolveTesterSettings(block, pageTypeface, mobile) {
  const desktop = object(block.desktop)
  const overrides = mobile ? object(block.mobile) : {}
  const settings = { ...desktop }
  for (const [key, value] of Object.entries(overrides)) {
    if (value !== null && value !== undefined && value !== '' && value !== 'inherit') settings[key] = value
  }
  const technical = typefaceEntries.find((entry) => entry.id === settings.fontKey) || pageTypeface
  const typeface = technical.id === pageTypeface.id ? pageTypeface : technical
  const labels = testerStyleLabels(typeface.id)
  const defaultStyle = labels.includes('Regular') ? 'Regular' : labels[0]
  const initialText = mobile && typeof block.mobileText === 'string' ? block.mobileText : block.text
  return {
    typeface,
    text: typeof initialText === 'string' && initialText.trim() ? initialText : 'Type your text here',
    style: labels.includes(settings.style) ? settings.style : defaultStyle,
    size: bounded(settings.fontSize, 72, 12, 1000),
    autoFit: settings.autoFit === true,
    lineHeight: bounded(settings.lineHeight, 1, 0.85, 2),
    letterSpacing: bounded(settings.letterSpacing, 0, -0.08, 0.1),
    align: settings.align === 'center' ? 'center' : 'left',
    columns: Math.round(bounded(settings.columns, 1, 1, 3)),
  }
}
