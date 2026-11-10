export const fontNames = {
  unbounded: 'Unbounded',
  'roboto-condensed-russo-one': 'Roboto Condensed / Russo One',
  'source-serif-4': 'Source Serif 4',
  inter: 'Inter',
  'ruslan-display': 'Ruslan Display',
}

// Local font styles used by portfolio specimens and Studio's font dictionaries.
export const characterStyles = {
  unbounded: [
    { label: 'Light', weight: 300, fontStyle: 'normal' },
    { label: 'Regular', weight: 400, fontStyle: 'normal' },
    { label: 'Bold', weight: 700, fontStyle: 'normal' },
  ],
  'roboto-condensed-russo-one': [
    { label: 'Roboto Condensed SemiBold', weight: 600, fontStyle: 'normal', fontFamily: "'Roboto Condensed', sans-serif" },
    { label: 'Russo One Regular', weight: 400, fontStyle: 'normal', fontFamily: "'Russo One', sans-serif" },
  ],
  'source-serif-4': [
    { label: 'Regular', weight: 400, fontStyle: 'normal' },
    { label: 'Regular Italic', weight: 400, fontStyle: 'italic' },
    { label: 'Medium', weight: 500, fontStyle: 'normal' },
    { label: 'Medium Italic', weight: 500, fontStyle: 'italic' },
    { label: 'Bold', weight: 700, fontStyle: 'normal' },
    { label: 'Bold Italic', weight: 700, fontStyle: 'italic' },
    { label: 'Black', weight: 900, fontStyle: 'normal' },
    { label: 'Black Italic', weight: 900, fontStyle: 'italic' },
  ],
  inter: [
    { label: 'Regular', weight: 400, fontStyle: 'normal' },
    { label: 'Regular Italic', weight: 400, fontStyle: 'italic' },
    { label: 'Bold', weight: 700, fontStyle: 'normal' },
    { label: 'Bold Italic', weight: 700, fontStyle: 'italic' },
  ],
  'ruslan-display': [{ label: 'Regular', weight: 400, fontStyle: 'normal' }],
}

export const testerStyleLabels = (fontKey) => (characterStyles[fontKey] || []).map(({ label }) => label === 'Roboto Condensed SemiBold' ? 'SemiBold' : label)
