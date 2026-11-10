import { Children } from 'react'
import useSharedTypefaceSize from '../hooks/useSharedTypefaceSize'
import ContentSkeleton from './ContentSkeleton'
import './PreparedTypefaceGrid.css'

export default function PreparedTypefaceGrid({ children, className, contentKey }) {
  const { gridRef, ready } = useSharedTypefaceSize(contentKey)
  const pending = Children.count(children) > 0 && !ready
  return <div className="typeface-preparation" aria-busy={pending}>
    <div className={`${className}${pending ? ' typeface-preparation__grid--pending' : ''}`}
      ref={gridRef} aria-hidden={pending || undefined} inert={pending}>
      {children}
    </div>
    {pending && <ContentSkeleton resource="Typefaces" />}
  </div>
}
