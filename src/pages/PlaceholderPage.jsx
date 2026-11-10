import './PlaceholderPage.css'

function PlaceholderPage({ title, navigate }) {
  return (
    <section className="placeholder">
      <span className="eyebrow">Page</span>
      <h1 className="placeholder__title">{title}</h1>
      <p className="placeholder__text">
        Эта страница ещё не наполнена карточками — сделаем на следующем шаге.
      </p>
      <a
        href="#/"
        className="btn btn--dark"
        onClick={(e) => {
          e.preventDefault()
          navigate('/')
        }}
      >
        ← Back to home
      </a>
    </section>
  )
}

export default PlaceholderPage
