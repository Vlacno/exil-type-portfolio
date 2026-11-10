import { useEffect, useMemo, useRef, useState } from 'react'
import usePublicationCatalogue from '../hooks/usePublicationCatalogue'
import PublicationCover from '../components/PublicationCover'
import ContentStatus from '../components/ContentStatus'
import './PublicationsPage.css'

const filterOptions = (publications, field) => [...new Set(publications.map((entry) => entry[field]).filter(Boolean))].sort()

function Filter({ label, value, onChange, options }) {
  const [isOpen, setIsOpen] = useState(false)
  const filterRef = useRef(null)
  const values = ['all', ...options]

  useEffect(() => {
    if (!isOpen) return undefined

    const closeOnOutsideClick = (event) => {
      if (!filterRef.current?.contains(event.target)) setIsOpen(false)
    }

    document.addEventListener('pointerdown', closeOnOutsideClick)
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick)
  }, [isOpen])

  const selectOption = (option) => {
    onChange(option)
    setIsOpen(false)
  }

  return (
    <div ref={filterRef} className={`publication-filter publication-filter--${label.toLowerCase()}${isOpen ? ' is-open' : ''}`}>
      <button type="button" className="publication-filter__trigger" aria-haspopup="listbox" aria-expanded={isOpen} onClick={() => setIsOpen((open) => !open)}>
        <span>{value === 'all' ? label : value}</span>
        <svg viewBox="0 0 12 8" aria-hidden="true"><path d="M1 1h10L6 7z" /></svg>
      </button>
      {isOpen && (
        <div className="publication-filter__menu" role="listbox" aria-label={`Filter by ${label}`}>
          {values.map((option) => (
            <button type="button" role="option" aria-selected={value === option} className={value === option ? 'is-selected' : ''} key={option} onClick={() => selectOption(option)}>
              {option === 'all' ? 'All' : option}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function PublicationsPage({ navigate }) {
  const { publications, loading, error, retry } = usePublicationCatalogue()
  const [place, setPlace] = useState('all')
  const [year, setYear] = useState('all')
  const entries = useMemo(() => publications.filter((entry) =>
    (place === 'all' || entry.place === place) &&
    (year === 'all' || entry.year === year)
  ), [publications, place, year])

  return (
    <main className="publications-page">
      <div className="publications-page__filters">
        <Filter label="Place" value={place} onChange={setPlace} options={filterOptions(publications, 'place')} />
        <Filter label="Year" value={year} onChange={setYear} options={filterOptions(publications, 'year')} />
      </div>
      <div className="publications-page__grid">
        {entries.map((entry, index) => (
          <a key={entry.id} className="publication-card" aria-label={entry.title} href={`#/publications/${entry.id}`} onClick={(event) => { event.preventDefault(); navigate(`/publications/${entry.id}`) }}>
            <PublicationCover publication={entry} loading={index < 6 ? 'eager' : 'lazy'} fetchPriority={index < 2 ? 'high' : 'auto'} />
          </a>
        ))}
      </div>
      {(loading || error || !publications.length) && <ContentStatus resource="Publications" loading={loading} error={error} retry={retry}>No publications have been published yet.</ContentStatus>}
      {!loading && !error && publications.length > 0 && entries.length === 0 && <p className="publications-page__empty">No publications match these filters.</p>}
    </main>
  )
}

export default PublicationsPage
