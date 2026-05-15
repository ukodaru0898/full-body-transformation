import { cn } from '../../lib/utils'

export function Progress({ className, value = 0, ...props }) {
  return (
    <div className={cn('ui-progress', className)} {...props}>
      <div className="ui-progress-fill" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  )
}
