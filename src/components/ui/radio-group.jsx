import { cn } from '../../lib/utils'

export function RadioGroup({ className, children, ...props }) {
  return <div className={cn('ui-radio-group', className)} {...props}>{children}</div>
}

export function RadioGroupItem({ className, ...props }) {
  return <input type="radio" className={cn('ui-radio-item', className)} {...props} />
}
