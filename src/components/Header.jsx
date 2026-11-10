import { useEffect, useRef, useState } from 'react'
import { navLinks } from '../data/content'
import logo from '../assets/exil-type-logo.svg'
import './Header.css'

function Header({ path, navigate }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isAtTop, setIsAtTop] = useState(() => window.scrollY < 4)
  const headerRef = useRef(null)
  const menuOpenRef = useRef(isMenuOpen)
  const hideHeaderTimerRef = useRef(null)

  useEffect(() => {
    menuOpenRef.current = isMenuOpen
    if (isMenuOpen && hideHeaderTimerRef.current !== null) {
      window.clearTimeout(hideHeaderTimerRef.current)
      hideHeaderTimerRef.current = null
    }
  }, [isMenuOpen])

  useEffect(() => {
    const updatePosition = () => {
      const atTop = window.scrollY < 4
      if (path === '/' && atTop && menuOpenRef.current) {
        menuOpenRef.current = false
        setIsMenuOpen(false)
        window.clearTimeout(hideHeaderTimerRef.current)
        hideHeaderTimerRef.current = window.setTimeout(() => {
          hideHeaderTimerRef.current = null
          if (window.scrollY < 4 && !menuOpenRef.current) setIsAtTop(true)
        }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 450)
      } else if (!atTop || path !== '/') {
        window.clearTimeout(hideHeaderTimerRef.current)
        hideHeaderTimerRef.current = null
        setIsAtTop(atTop)
      } else if (hideHeaderTimerRef.current === null) {
        setIsAtTop(true)
      }
    }
    window.addEventListener('scroll', updatePosition, { passive: true })
    return () => {
      window.removeEventListener('scroll', updatePosition)
      window.clearTimeout(hideHeaderTimerRef.current)
      hideHeaderTimerRef.current = null
    }
  }, [path])

  useEffect(() => {
    if (!isMenuOpen) return

    const closeOnOutsideClick = (event) => {
      if (!headerRef.current?.contains(event.target)) setIsMenuOpen(false)
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setIsMenuOpen(false)
    }

    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isMenuOpen])

  useEffect(() => {
    const mobileWidth = window.matchMedia('(max-width: 1000px)')
    const closeOnDesktop = (event) => {
      if (!event.matches) setIsMenuOpen(false)
    }

    mobileWidth.addEventListener('change', closeOnDesktop)
    return () => mobileWidth.removeEventListener('change', closeOnDesktop)
  }, [])

  return (
    <header ref={headerRef} className={`header${path === '/' ? ' header--home' : ''}${isAtTop ? ' header--at-top' : ''}${isMenuOpen ? ' header--menu-open' : ''}`}>
      <a
        href="#/"
        className="header__logo"
        onClick={(e) => {
          e.preventDefault()
          setIsMenuOpen(false)
          navigate('/')
        }}
      >
        <img src={logo} alt="EXIL Type" />
      </a>

      <button
        type="button"
        className="header__menu-toggle"
        aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
        aria-controls="site-navigation"
        aria-expanded={isMenuOpen}
        onClick={() => setIsMenuOpen((open) => !open)}
      >
        <span /><span />
      </button>

      <nav id="site-navigation" className={`header__nav${isMenuOpen ? ' is-open' : ''}`}>
        {navLinks.map((link) => (
          <a
            key={link.path}
            href={`#${link.path}`}
            data-label={link.label}
            className={
              'header__nav-item' + (path === link.path || path.startsWith(`${link.path}/`) ? ' header__nav-item--active' : '')
            }
            onClick={(e) => {
              e.preventDefault()
              setIsMenuOpen(false)
              navigate(link.path)
            }}
          >
            <span>{link.label}</span>
          </a>
        ))}
      </nav>
    </header>
  )
}

export default Header
