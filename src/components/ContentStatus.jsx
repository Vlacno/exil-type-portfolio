import './ContentStatus.css'
import ContentSkeleton from './ContentSkeleton'

export default function ContentStatus({ loading, error, retry, children, resource = 'Research', variant }) {
  if (loading) return <ContentSkeleton resource={resource} variant={variant} />
  if (error) return <div className="content-status" role="alert">
    <p>{resource} could not be loaded. Please try again.</p>
    <button type="button" onClick={retry}>Try again</button>
  </div>
  return <div className="content-status">{children}</div>
}
