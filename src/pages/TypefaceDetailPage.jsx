import { Fragment, createContext, useContext, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { characterStyles } from '../../shared/typefaceStyles'
import { resolveTesterSettings } from '../data/testerSettings'
import ImageLightbox from '../components/ImageLightbox'
import FontReady from '../components/FontReady'
import TypefaceContent from '../components/TypefaceContent'
import TypefaceFacts from '../components/TypefaceFacts'
import typefaceImage from '../assets/3e391c0bd2d88251fb3e6a3203994f1870ba8b42.jpg'
import { getGlyphGroups, getGlyphMetrics } from '../data/glyphCoverage'
import { typefaceItalicWeights, typefaceEntries } from '../data/content'
import './TypefaceDetailPage.css'

const fallbackTypeface = typefaceEntries.find(({ id }) => id === 'source-serif-4')
const weightMap = { Light: 300, Regular: 400, Medium: 500, SemiBold: 600, Bold: 700, Black: 900, 'Russo One Regular': 400 }
const fontFamilies = {
  unbounded: "'Unbounded', sans-serif",
  'roboto-condensed-russo-one': "'Roboto Condensed', sans-serif",
  'source-serif-4': "'Source Serif 4', Georgia, serif",
  'ruslan-display': "'Ruslan Display', serif",
  inter: "'Inter', sans-serif",
}
const fontFamilyFor = (typefaceId, weight) => typefaceId === 'roboto-condensed-russo-one' && weight === 'Russo One Regular'
  ? "'Russo One', sans-serif"
  : fontFamilies[typefaceId] || fontFamilies['source-serif-4']
const styleLabel = (typeface, weight) => weight === 'Russo One Regular' ? weight : `${typeface.name} ${weight}`
const regularCharacterStyle = { label: 'Regular', weight: 400, fontStyle: 'normal' }
const TypefaceContext = createContext(fallbackTypeface)
const ukrainianText = 'Попередником німецького видавництва було «Молоде життя» в Галичині, яке очолював Степан Тисовський, по ньому перебрав відповідальність в 1923–1926 роках Володимир Кузьмович, згодом — Богдан Кравців.'
const paragraphText = 'The e-book (electronic book) is a digital publication format that allows text and images to be read on electronic devices such as computers, tablets, smartphones, and dedicated e-readers. While early concepts of electronic reading date back to the mid-20th century, the first recognized e-book project was Project Gutenberg, launched in 1971 by Michael S. Hart, who typed the full text of the U.S. Declaration of Independence into a mainframe computer. E-books became commercially viable in the late 1990s and early 2000s with the appearance of specialized reading hardware like the RocketBook and SoftBook, followed by the release of Amazon’s Kindle in 2007, which helped normalize large-scale e-book distribution and retail.'

function FittedTypefaceHero({ typeface }) {
  const heroRef = useRef(null)
  const fontKey = typeface.fontKey || typeface.id

  useLayoutEffect(() => {
    const hero = heroRef.current
    if (!hero) return undefined

    let lastWidth = 0
    let active = true
    const fit = (force = false) => {
      const availableWidth = hero.clientWidth
      if (!availableWidth || (!force && availableWidth === lastWidth)) return
      lastWidth = availableWidth
      hero.style.removeProperty('--hero-fitted-size')
      const baseSize = Number.parseFloat(window.getComputedStyle(hero).fontSize)
      const widestLine = Math.max(...Array.from(hero.querySelectorAll('.typeface-detail__hero-line span'), (line) => line.getBoundingClientRect().width))
      if (widestLine > availableWidth - 2) hero.style.setProperty('--hero-fitted-size', `${baseSize * (availableWidth - 2) / widestLine}px`)
    }

    const observer = new ResizeObserver(() => fit())
    const onResize = () => fit(true)
    observer.observe(hero)
    window.addEventListener('resize', onResize)
    hero.addEventListener('blockfontsready', onResize)
    fit(true)
    document.fonts?.ready.then(() => { if (active) fit(true) })

    return () => {
      active = false
      observer.disconnect()
      window.removeEventListener('resize', onResize)
      hero.removeEventListener('blockfontsready', onResize)
    }
  }, [typeface])

  return (
    <FontReady><section ref={heroRef} className={`typeface-detail__hero font-${fontKey}`}>
      <h1 className="typeface-detail__hero-line" style={{ fontFamily: fontFamilyFor(fontKey), fontWeight: fontKey === 'unbounded' ? 700 : fontKey === 'roboto-condensed-russo-one' ? 600 : 400 }}>
        <span>{fontKey === 'roboto-condensed-russo-one' ? <>Roboto Condensed <span style={{ fontFamily: fontFamilyFor(fontKey, 'Russo One Regular'), fontWeight: 400 }}>Russo One</span></> : typeface.name}</span>
      </h1>
      <div className="typeface-detail__styles">
        <span className="eyebrow typeface-detail__label">Styles</span>
        <hr className="typeface-detail__rule" />
        <div className="typeface-detail__styles-row">
          {typeface.weights.map((weight) => <span key={weight} style={{ fontFamily: fontFamilyFor(typeface.id, weight), fontWeight: weightMap[weight] || 400 }}>{weight}</span>)}
          {typefaceItalicWeights[typeface.id]?.map((weight) => <span key={`${weight}-italic`} style={{ fontFamily: fontFamilyFor(typeface.id, weight), fontWeight: weightMap[weight], fontStyle: 'italic' }}>{weight} Italic</span>)}
        </div>
      </div>
    </section></FontReady>
  )
}

function AlignmentIcon({ align }) {
  const positions = align === 'left'
    ? [[2, 5, 18], [2, 10, 15], [2, 15, 12]]
    : [[2, 5, 18], [4, 10, 16], [6, 15, 14]]

  return (
    <svg className="type-tester__align-icon" viewBox="0 0 20 20" aria-hidden="true">
      {positions.map(([start, y, end]) => <path key={y} d={`M${start} ${y}H${end}`} />)}
    </svg>
  )
}

function DropdownArrow() {
  return <svg className="type-tester__dropdown-arrow" viewBox="0 0 12 8" aria-hidden="true"><path d="M1 1h10L6 7z" /></svg>
}

function TesterMenu({ label, isOpen, onToggle, children, className = '' }) {
  return (
    <div className={`type-tester__menu ${className}${isOpen ? ' is-open' : ''}`}>
      <button type="button" className="type-tester__menu-trigger" aria-expanded={isOpen} onClick={onToggle}>
        <span>{label}</span><DropdownArrow />
      </button>
      {isOpen && <div className="type-tester__menu-list">{children}</div>}
    </div>
  )
}

function defaultDisplayPreview(initialText, isLargeTester, viewportWidth) {
  if (!isLargeTester) return { text: initialText, isSplit: false }
  const words = initialText.trim().split(/\s+/)
  if (words.length === 1 && viewportWidth <= 1000) {
    return { text: Array.from(initialText).slice(0, 2).join(''), isSplit: false }
  }
  if (words.length > 1 && viewportWidth <= 600) {
    return { text: words.join('\n'), isSplit: true }
  }
  return { text: initialText, isSplit: false }
}

function fittedDisplaySize(tester, text, sample, weight, letterSpacing, maxSize, minSize = 12, font = {}) {
  if (!tester?.clientWidth || !text) return null
  const testerStyle = window.getComputedStyle(tester)
  const availableWidth = tester.clientWidth - Number.parseFloat(testerStyle.paddingLeft) - Number.parseFloat(testerStyle.paddingRight) - 4
  const textStyle = window.getComputedStyle(text)
  // Measure with the same CSS as the specimen. Canvas applies automatic optical
  // sizing to variable fonts, which can disagree with the actual DOM width.
  const probe = document.createElement('span')
  Object.assign(probe.style, {
    position: 'fixed', visibility: 'hidden', pointerEvents: 'none',
    display: 'inline-block', width: 'max-content', maxWidth: 'none',
    padding: '0', border: '0', margin: '0', whiteSpace: 'pre',
    fontSize: '100px', fontFamily: font.fontFamily || textStyle.fontFamily,
    fontWeight: font.weight || textStyle.fontWeight,
    fontStyle: font.fontStyle || textStyle.fontStyle,
    fontOpticalSizing: textStyle.fontOpticalSizing,
    fontFeatureSettings: textStyle.fontFeatureSettings,
    letterSpacing: `${letterSpacing}em`,
  })
  tester.appendChild(probe)
  const widthPerPixel = Math.max(...sample.split('\n').map((line) => {
    probe.textContent = line
    return probe.getBoundingClientRect().width / 100
  }))
  probe.remove()
  return Math.max(minSize, Math.min(maxSize, Math.floor(availableWidth / Math.max(widthPerPixel, 0.01))))
}

function Tester({ initialText, typeface, className = '', initialSize = 72, initialAlign = 'left', initialStyle, initialLineHeight = 1, initialLetterSpacing = 0, initialColumns = 1, configured = false, autoFit = false }) {
  const contextTypeface = useContext(TypefaceContext)
  const activeTypeface = typeface || contextTypeface
  const demoTypeface = activeTypeface
  const defaultWeight = initialStyle || (activeTypeface.weights.includes('Regular') ? 'Regular' : activeTypeface.weights[0])
  const [weight, setWeight] = useState(defaultWeight)
  const testerStyles = (characterStyles[activeTypeface.id] || [regularCharacterStyle]).map((style) => ({
    ...style,
    label: style.label === 'Roboto Condensed SemiBold' ? 'SemiBold' : style.label,
  }))
  const selectedTesterStyle = testerStyles.find((style) => style.label === weight) || testerStyles[0]
  const [size, setSize] = useState(initialSize)
  const [lineHeight, setLineHeight] = useState(initialLineHeight)
  const [letterSpacing, setLetterSpacing] = useState(initialLetterSpacing)
  const [ss01, setSs01] = useState(false)
  const [align, setAlign] = useState(initialAlign)
  const [openMenu, setOpenMenu] = useState(null)
  const [isTextEdited, setIsTextEdited] = useState(false)
  const [editVersion, setEditVersion] = useState(0)
  const [isSplitPreview, setIsSplitPreview] = useState(false)
  const [isEnlarged, setIsEnlarged] = useState(false)
  const testerRef = useRef(null)
  const textRef = useRef(null)
  const fittedSizeRef = useRef(initialSize)
  const sizeScaleRef = useRef(1)
  const supportsStylisticSets = ['source-serif-4', 'inter'].includes(activeTypeface.id)
  const isLargeTester = className.includes('type-tester--large')
  const maxSize = 1000
  const isLongTextTester = className.includes('type-tester--two-columns') || className.includes('type-tester--three-columns')
  const columnCount = autoFit ? 1 : configured ? initialColumns : !isLongTextTester ? 1 : size <= 40 ? 3 : size <= 80 ? 2 : 1

  useLayoutEffect(() => {
    if ((!isLargeTester && !autoFit) || !testerRef.current || !textRef.current) return undefined

    const tester = testerRef.current
    const text = textRef.current
    const updateDisplay = () => {
      const preview = defaultDisplayPreview(initialText, isLargeTester, window.innerWidth)
      const sample = autoFit && isTextEdited ? text.textContent || ' ' : preview.text
      const fittedSize = fittedDisplaySize(tester, text, sample, weight, letterSpacing, maxSize, autoFit ? 1 : 12)
      if (fittedSize === null) return
      fittedSizeRef.current = fittedSize
      const nextSize = Math.max(autoFit ? 1 : 12, Math.min(maxSize, Math.round(fittedSize * sizeScaleRef.current)))
      setSize(nextSize)
      setIsEnlarged(nextSize > fittedSize)
      if (!isTextEdited) {
        text.textContent = preview.text
        setIsSplitPreview(preview.isSplit)
      }
    }
    const observer = new ResizeObserver(updateDisplay)
    observer.observe(tester)
    window.addEventListener('resize', updateDisplay)
    tester.addEventListener('blockfontsready', updateDisplay)
    document.fonts.addEventListener('loadingdone', updateDisplay)
    updateDisplay()
    let active = true
    document.fonts?.ready.then(() => { if (active) updateDisplay() })
    return () => {
      active = false
      observer.disconnect()
      window.removeEventListener('resize', updateDisplay)
      tester.removeEventListener('blockfontsready', updateDisplay)
      document.fonts.removeEventListener('loadingdone', updateDisplay)
    }
  }, [initialText, isLargeTester, autoFit, isTextEdited, editVersion, letterSpacing, maxSize, weight, ss01])

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!testerRef.current?.contains(event.target)) setOpenMenu(null)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick)
  }, [])

  const toggleMenu = (menu) => setOpenMenu((currentMenu) => currentMenu === menu ? null : menu)
  const resetSettings = () => {
    const preview = defaultDisplayPreview(initialText, isLargeTester, window.innerWidth)
    setWeight(defaultWeight)
    sizeScaleRef.current = 1
    const defaultStyle = testerStyles.find((style) => style.label === defaultWeight) || testerStyles[0]
    const fittedSize = isLargeTester || autoFit
      ? fittedDisplaySize(testerRef.current, textRef.current, preview.text, defaultWeight, initialLetterSpacing, maxSize, autoFit ? 1 : 12, { ...defaultStyle, fontFamily: defaultStyle.fontFamily || fontFamilyFor(activeTypeface.id, defaultWeight) })
      : null
    if (fittedSize !== null) fittedSizeRef.current = fittedSize
    setSize(fittedSize ?? initialSize)
    setIsEnlarged(false)
    setLineHeight(initialLineHeight)
    setLetterSpacing(initialLetterSpacing)
    setSs01(false)
    setAlign(initialAlign)
    setIsTextEdited(false)
    setIsSplitPreview(preview.isSplit)
    if (textRef.current) textRef.current.textContent = preview.text
  }
  return (
    <FontReady><section ref={testerRef} className={`type-tester ${className}${autoFit ? ' type-tester--auto-fit' : ''}${columnCount === 3 ? ' is-three-columns' : ''}${openMenu ? ' has-open-menu' : ''}`}>
      <div className="type-tester__controls">
        <label className="type-tester__weight"><span>▼</span><select value={weight} onChange={(event) => setWeight(event.target.value)}>{testerStyles.map(({ label }) => <option key={label} value={label}>{styleLabel(demoTypeface, label)}</option>)}</select></label>
        <TesterMenu label={styleLabel(demoTypeface, weight)} isOpen={openMenu === 'weight'} onToggle={() => toggleMenu('weight')} className="type-tester__weight-menu">
          {testerStyles.map(({ label }) => <button type="button" className={weight === label ? 'is-selected' : ''} key={label} onClick={() => { setWeight(label); setOpenMenu(null) }}>{styleLabel(demoTypeface, label)}</button>)}
        </TesterMenu>
        <label className="type-tester__slider"><span>Font size</span><input type="range" min={autoFit ? 1 : 12} max={maxSize} value={Math.min(size, maxSize)} onChange={(event) => { const nextSize = Number(event.target.value); if (isLargeTester || autoFit) { sizeScaleRef.current = nextSize / fittedSizeRef.current; setIsEnlarged(nextSize > fittedSizeRef.current) } setSize(nextSize) }} /><output>{Math.min(size, maxSize)}px</output></label>
        <label className="type-tester__slider type-tester__slider--desktop-only"><span>Line Height</span><input type="range" min="0.85" max="2" step="0.05" value={lineHeight} onChange={(event) => setLineHeight(Number(event.target.value))} /><output>{lineHeight.toFixed(2)}</output></label>
        <label className="type-tester__slider type-tester__slider--desktop-only"><span>Letter spacing</span><input type="range" min="-0.08" max="0.1" step="0.01" value={letterSpacing} onChange={(event) => setLetterSpacing(Number(event.target.value))} /><output>{letterSpacing.toFixed(2)}em</output></label>
        {supportsStylisticSets && <TesterMenu label="Stylistic sets" isOpen={openMenu === 'stylistic'} onToggle={() => toggleMenu('stylistic')} className="type-tester__stylistic"><label><input type="checkbox" checked={ss01} onChange={(event) => setSs01(event.target.checked)} />SS01</label></TesterMenu>}
        <div className="type-tester__alignment" aria-label="Text alignment">
          <button type="button" className={align === 'left' ? 'is-active' : ''} aria-label="Align left" onClick={() => setAlign('left')}><AlignmentIcon align="left" /></button>
          <button type="button" className={align === 'center' ? 'is-active' : ''} aria-label="Align center" onClick={() => setAlign('center')}><AlignmentIcon align="center" /></button>
        </div>
        <button type="button" className="type-tester__reset" onClick={resetSettings}>Reset</button>
      </div>
      <div
        ref={textRef}
        className={`type-tester__text font-${activeTypeface.id}${isSplitPreview ? ' is-split' : ''}${isTextEdited ? ' is-edited' : ''}${isLargeTester && isEnlarged ? ' is-enlarged' : ''}`}
        contentEditable
        suppressContentEditableWarning
        onInput={() => { setIsTextEdited(true); if (autoFit) setEditVersion((value) => value + 1) }}
        style={{
          fontSize: `${size}px`,
          lineHeight,
          marginBlock: configured ? 0 : `${(1 - lineHeight) * size / 2}px`,
          textAlign: align,
          fontWeight: selectedTesterStyle.weight,
          fontStyle: selectedTesterStyle.fontStyle,
          fontFamily: selectedTesterStyle.fontFamily || fontFamilyFor(activeTypeface.id, weight),
          letterSpacing: `${letterSpacing}em`,
          fontFeatureSettings: supportsStylisticSets && ss01 ? '"ss01" 1' : 'normal',
          '--text-column-count': columnCount,
        }}
      >{initialText}</div>
    </section></FontReady>
  )
}

const mobileTesterQuery = '(max-width: 800px)'
const subscribeViewport = (callback) => {
  const query = window.matchMedia(mobileTesterQuery)
  query.addEventListener('change', callback)
  return () => query.removeEventListener('change', callback)
}
const mobileSnapshot = () => window.matchMedia(mobileTesterQuery).matches

function CmsTesterBlocks({ typeface }) {
  const mobile = useSyncExternalStore(subscribeViewport, mobileSnapshot, () => false)
  return typeface.testerBlocks.map((block) => {
    const settings = resolveTesterSettings(block, typeface, mobile)
    return <Tester key={`${block._key}-${mobile ? 'mobile' : 'desktop'}`} typeface={settings.typeface}
      initialText={settings.text} initialSize={settings.size} initialStyle={settings.style}
      initialLineHeight={settings.lineHeight} initialLetterSpacing={settings.letterSpacing}
      initialAlign={settings.align} initialColumns={settings.columns} autoFit={settings.autoFit} configured
      className="type-tester--wide type-tester--configured" />
  })
}

function CharacterOverview({ typeface }) {
  const [glyph, setGlyph] = useState('A')
  const [styleName, setStyleName] = useState('Regular')
  const [isStyleMenuOpen, setIsStyleMenuOpen] = useState(false)
  const [mobileGlyphViewBox, setMobileGlyphViewBox] = useState(null)
  const glyphLetterRef = useRef(null)
  const glyphGridRef = useRef(null)
  const styleMenuRef = useRef(null)
  const availableStyles = characterStyles[typeface.id] || [regularCharacterStyle]
  const selectedStyle = availableStyles.find((style) => style.label === styleName) || availableStyles[0]
  const groups = getGlyphGroups(typeface.id, selectedStyle.label)
  const selectedGlyph = groups.some(({ characters }) => characters.includes(glyph))
    ? glyph
    : groups[0]?.characters[0] ?? 'A'
  const code = selectedGlyph.codePointAt(0)
  const { unitsPerEm, capHeight, xHeight, descent, sizeAdjust = 1 } = getGlyphMetrics(typeface.id, selectedStyle.label)
  const guideScale = 1000 * sizeAdjust / unitsPerEm
  const guideYs = [780 - capHeight * guideScale, 780 - xHeight * guideScale, 780, 780 + descent * guideScale]
  const glyphViewBoxTop = mobileGlyphViewBox?.top ?? -300
  const glyphViewBoxHeight = mobileGlyphViewBox?.height ?? 1400
  const guideStyles = {
    '--guide-cap': `${((guideYs[0] - glyphViewBoxTop) / glyphViewBoxHeight) * 100}%`,
    '--guide-x': `${((guideYs[1] - glyphViewBoxTop) / glyphViewBoxHeight) * 100}%`,
    '--guide-base': `${((guideYs[2] - glyphViewBoxTop) / glyphViewBoxHeight) * 100}%`,
    '--guide-desc': `${((guideYs[3] - glyphViewBoxTop) / glyphViewBoxHeight) * 100}%`,
  }

  useEffect(() => {
    const mobileQuery = window.matchMedia('(max-width: 1000px)')
    let cancelled = false

    const updateGlyphViewBox = async () => {
      const letter = glyphLetterRef.current
      if (!letter) return
      const style = window.getComputedStyle(letter)
      const characters = getGlyphGroups(typeface.id, selectedStyle.label).flatMap((group) => group.characters)
      await document.fonts.load(`${style.fontStyle} ${style.fontWeight} 1000px ${style.fontFamily}`, characters.join(''))
      await document.fonts.ready
      if (cancelled) return
      if (!mobileQuery.matches) {
        setMobileGlyphViewBox(null)
        return
      }

      // One shared scale for every glyph in this style, including its accents.
      const probe = letter.cloneNode(false)
      probe.setAttribute('visibility', 'hidden')
      probe.setAttribute('aria-hidden', 'true')
      letter.parentNode.appendChild(probe)
      let top = 780 - capHeight * guideScale
      let bottom = 780 + descent * guideScale
      try {
        for (const character of characters) {
          probe.textContent = character
          const bounds = probe.getBBox()
          if (!bounds.height) continue
          top = Math.min(top, bounds.y)
          bottom = Math.max(bottom, bounds.y + bounds.height)
        }
      } finally {
        probe.remove()
      }
      setMobileGlyphViewBox({ top: top - 24, height: bottom - top + 48 })
    }

    updateGlyphViewBox()
    mobileQuery.addEventListener('change', updateGlyphViewBox)
    return () => {
      cancelled = true
      mobileQuery.removeEventListener('change', updateGlyphViewBox)
    }
  }, [typeface.id, selectedStyle, capHeight, descent, guideScale])

  useEffect(() => {
    if (!isStyleMenuOpen) return

    const closeOnOutsideClick = (event) => {
      if (!styleMenuRef.current?.contains(event.target)) setIsStyleMenuOpen(false)
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setIsStyleMenuOpen(false)
    }

    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isStyleMenuOpen])

  useEffect(() => {
    const grid = glyphGridRef.current
    const section = grid?.closest('.typeface-detail__characters')
    const header = document.querySelector('.header')
    if (!grid || !section || !header) return

    const updateHeaderHeight = () => {
      const headerBottom = header.getBoundingClientRect().bottom
      section.style.setProperty('--overview-sticky-top', `${headerBottom}px`)
    }

    const headerResizeObserver = new ResizeObserver(updateHeaderHeight)
    headerResizeObserver.observe(header)
    window.addEventListener('resize', updateHeaderHeight)
    updateHeaderHeight()

    return () => {
      headerResizeObserver.disconnect()
      window.removeEventListener('resize', updateHeaderHeight)
      section.style.removeProperty('--overview-sticky-top')
    }
  }, [])

  return (
    <FontReady><section className="typeface-detail__characters">
      <hr className="typeface-detail__rule" />
      <div ref={glyphGridRef} className={`typeface-detail__character-grid font-${typeface.id}`} style={{ fontFamily: selectedStyle.fontFamily || fontFamilyFor(typeface.id), '--glyph-font-weight': selectedStyle.weight, '--glyph-font-style': selectedStyle.fontStyle }}>
        <div className="typeface-detail__character-left">
          <div className="typeface-detail__character-toolbar">
            <span className="eyebrow">Character overview</span>
            {availableStyles.length > 1 && <div ref={styleMenuRef} className={`typeface-detail__character-style${isStyleMenuOpen ? ' is-open' : ''}`} onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setIsStyleMenuOpen(false)
            }}>
              <button type="button" className="typeface-detail__character-style-trigger" aria-label={`Character style: ${selectedStyle.label}`} aria-haspopup="listbox" aria-expanded={isStyleMenuOpen} onClick={() => setIsStyleMenuOpen((open) => !open)}>
                {selectedStyle.label}<span className="typeface-detail__character-style-arrow" aria-hidden="true" />
              </button>
              {isStyleMenuOpen && <div className="typeface-detail__character-style-menu" role="listbox" aria-label="Character style">
                {availableStyles.map((style) => <button type="button" role="option" aria-selected={style.label === selectedStyle.label} className={style.label === selectedStyle.label ? 'is-selected' : ''} key={style.label} onClick={() => { setStyleName(style.label); setIsStyleMenuOpen(false) }}>{style.label}</button>)}
              </div>}
            </div>}
          </div>
          <div className="typeface-detail__glyph-panel">
          <div className="typeface-detail__glyph-stage" style={guideStyles}>
            <div className="typeface-detail__guide typeface-detail__guide--cap"><span>Cap Height</span></div>
            <div className="typeface-detail__guide typeface-detail__guide--x"><span>X-Height</span></div>
            <div className="typeface-detail__guide typeface-detail__guide--base"><span>Baseline</span></div>
            <div className="typeface-detail__guide typeface-detail__guide--desc"><span>Descender</span></div>
            <svg className="typeface-detail__glyph" viewBox={`0 ${glyphViewBoxTop} 1000 ${glyphViewBoxHeight}`} role="img" aria-label={`Selected character ${selectedGlyph}`}>
              <text ref={glyphLetterRef} className="typeface-detail__glyph-letter" x="500" y="780">{selectedGlyph}</text>
              <g className="typeface-detail__glyph-svg-guides" aria-hidden="true">
                {guideYs.map((y, index) => <line key={index} x1="0" x2="1000" y1={y} y2={y} />)}
              </g>
            </svg>
          </div>
          <dl><dt>Glyph name</dt><dd>{selectedGlyph}</dd><dt>Unicode name</dt><dd>{code}</dd><dt>Unicode decimal</dt><dd>{code}</dd><dt>Unicode hex</dt><dd>{code.toString(16).toUpperCase()}</dd></dl>
          </div>
        </div>
        <div className="typeface-detail__glyph-list">
          {groups.map(({ title, characters }) => <Fragment key={title}>
            <span className="typeface-detail__glyph-group-label">{title}</span>
            {characters.map((character) => <button type="button" key={character} className={selectedGlyph === character ? 'is-selected' : ''} onMouseEnter={() => setGlyph(character)} onFocus={() => setGlyph(character)} onClick={() => setGlyph(character)} aria-label={`${character}, Unicode ${character.codePointAt(0)}`}>
              <span>{character}</span>
            </button>)}
          </Fragment>)}
        </div>
      </div>
    </section></FontReady>
  )
}

function TypefaceDetailPage({ typeface = fallbackTypeface, fromCms = false }) {
  const [isImageOpen, setIsImageOpen] = useState(false)
  const [cmsImage, setCmsImage] = useState(null)
  const sample = (key, localDefault) => fromCms
    ? (typeof typeface.samples[key] === 'string' && typeface.samples[key].trim() ? typeface.samples[key] : 'Type your text here')
    : localDefault

  return (
    <main className="typeface-detail">
      <span className="eyebrow typeface-detail__label">Typeface name</span>
      <hr className="typeface-detail__rule" />
      <FittedTypefaceHero typeface={typeface} />
      {fromCms ? <TypefaceContent body={typeface.body} onOpen={setCmsImage} /> : <FontReady><article className="typeface-detail__article">
        <p>The second unifying area was the care of children and young people. Throughout the war there was a Russian kindergarten in Prague. Although the English and French gymnasiums were closed, the Russian and Ukrainian gymnasiums survived the war. A wide circle of parents, relatives, and volunteers formed around the kindergarten and gymnasium, who met, attended school events, and provided financial assistance. Thanks to them, excursions and summer camps were held, to which children from poor families went for free, and at Christmas and Easter meetings no one left without a present.</p>
        <figure><button type="button" className="typeface-detail__image-button" onClick={() => setIsImageOpen(true)} aria-label="Open historic Cyrillic newspaper detail full screen"><img src={typefaceImage} alt="Historic Cyrillic newspaper detail" /></button><figcaption>Russian residents. Prague, 1923, Archive of Russian Tradition.</figcaption></figure>
        <p>It was not only the Soviet army who came to Prague in 1945, but also the Soviet state security services. Those Russian emigrants involved in the civil war for the Whites were threatened. In Carpathian Ruthenia and Slovakia the arrests were massive, in Moravia and Bohemia they were individual, but prepared and targeted in advance. The arrest of part of the Russian emigrants was the beginning of the end of the Russian emigrant community. The oldest and most famous of them, the so-called Professors’ House, stood on Roosevelt Street, the others were on Yugoslav Partizan Street, Kowlowa Street, and Prudznaya Street. Arrests were also made in these houses.</p>
        <p>The Orthodox clergy before the war were under the authority of Metropolitan Evlogy (Russian Orthodox Church Abroad), whose residence was in Paris. After the war, the Soviet Union sent new priests to the ČSR from the Soviet Union, who were not as trusted as their predecessors. Religious people feared that they might have other tasks incompatible with the faith besides a spiritual mission. Confession without trust was meaningless, and the church ceased to be the center of spiritual life. In addition to the school and church, the centers of Russian life in Prague were four cooperative houses built in the 1920s and 1930s by Russian emigrants. The oldest and most famous of them, the so-called Professors’ House, stood on Roosevelt Street, the others were on Yugoslav Partizan Street, Kowlowa Street, and Prudznaya Street. Arrests were also made in these houses.</p>
      </article></FontReady>}
      {isImageOpen && <ImageLightbox src={typefaceImage} alt="Historic Cyrillic newspaper detail" onClose={() => setIsImageOpen(false)} />}
      {cmsImage && <ImageLightbox {...cmsImage} onClose={() => setCmsImage(null)} />}
      <TypefaceContext.Provider value={typeface}>
      <div key={typeface.id} className="typeface-detail__test-grid">
        {fromCms && typeface.testerMode === 'custom' ? <CmsTesterBlocks typeface={typeface} /> : <>
        <Tester typeface={typeface} initialText={sample('displayPrimary', 'Paris')} initialSize={360} initialAlign="center" className="type-tester--wide type-tester--large" />
        <Tester typeface={typeface} initialText={sample('reading', ukrainianText)} initialSize={40} className="type-tester--wide type-tester--reading" />
        <Tester typeface={typeface} initialText={sample('twoColumn', paragraphText)} initialSize={32} className="type-tester--wide type-tester--two-columns" />
        <Tester typeface={typeface} initialText={sample('displaySecondary', 'Partizan Street')} initialSize={190} initialAlign="center" className="type-tester--wide type-tester--large" />
        <Tester typeface={typeface} initialText={sample('threeColumn', paragraphText)} initialSize={23} className="type-tester--wide type-tester--three-columns type-tester--mobile-extra" />
        <Tester initialText={sample('cyrillic', 'Журнал Время')} initialSize={190} initialAlign="center" className="type-tester--wide type-tester--large" />
        </>}
      </div>
      </TypefaceContext.Provider>
      <TypefaceFacts typeface={typeface} styleCount={characterStyles[typeface.id].length} />
      <CharacterOverview key={typeface.id} typeface={typeface} />
    </main>
  )
}

export default TypefaceDetailPage
