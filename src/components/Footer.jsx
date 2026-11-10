import { footerLinks } from '../data/content'
import './Footer.css'

function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="footer">
      <div className="footer__links">
        {footerLinks.map((link) => (
          <a key={link.label} href={link.href} className="footer__link">
            {link.label}
          </a>
        ))}
      </div>
      <span className="footer__copy">(C) {year} OUTLAND</span>
    </footer>
  )
}

export default Footer
