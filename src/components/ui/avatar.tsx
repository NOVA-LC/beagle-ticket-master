import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export const Avatar = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'relative inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full',
        className,
      )}
      {...props}
    />
  ),
)
Avatar.displayName = 'Avatar'

export const AvatarFallback = forwardRef<HTMLSpanElement, HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn('flex h-full w-full items-center justify-center', className)}
      {...props}
    />
  ),
)
AvatarFallback.displayName = 'AvatarFallback'
