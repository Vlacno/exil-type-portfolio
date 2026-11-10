export default function ContentSkeleton({ resource, variant }) {
  const layout = variant === 'article' || resource === 'About' ? 'article' : resource.toLowerCase()
  const count = layout === 'publications' ? 12 : layout === 'article' ? 1 : 4
  return <div className={`content-skeleton content-skeleton--${layout}`} role="status" aria-label={`Loading ${resource.toLowerCase()}`} data-scroll-pending="true">
    <span className="content-skeleton__label">Loading {resource.toLowerCase()}…</span>
    <div className="content-skeleton__grid" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => <div className="content-skeleton__item" key={index}>
        {layout === 'publications' ? <span className="content-skeleton__cover" /> : <>
          <span className="content-skeleton__line content-skeleton__line--title" />
          <span className="content-skeleton__line" /><span className="content-skeleton__line" />
          <span className="content-skeleton__line content-skeleton__line--short" />
          {layout === 'article' && <><span className="content-skeleton__photo" /><span className="content-skeleton__line" /><span className="content-skeleton__line" /></>}
        </>}
      </div>)}
    </div>
  </div>
}
