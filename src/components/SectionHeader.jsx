import './SectionHeader.css'

function SectionHeader({ title, path, navigate }) {
  return (
    <div className="section-header">
      <h2 className="section-header__title">{title}</h2>
      <a
        href={`#${path}`}
        className="btn btn--light section-header__btn"
        data-label="See more"
        onClick={(e) => {
          e.preventDefault()
          navigate(path)
        }}
      >
        <span>See more</span>
      </a>
    </div>
  )
}

export default SectionHeader
