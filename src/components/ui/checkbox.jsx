import { cn } from '../../lib/utils'

export function Checkbox({ className, ...props }) {
  return <input type="checkbox" className={cn('ui-checkbox', className)} {...props} />
}
