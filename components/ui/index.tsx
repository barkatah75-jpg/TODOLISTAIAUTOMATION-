'use client'

import { forwardRef, ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'

// ── Button ──────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  fullWidth?: boolean
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700',
  secondary: 'bg-secondary text-foreground hover:bg-secondary/80',
  danger: 'bg-destructive text-white hover:bg-destructive/90',
  ghost: 'text-foreground hover:bg-secondary',
  outline: 'border-2 border-border text-foreground hover:bg-secondary',
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1',
  md: 'px-4 py-2.5 text-sm gap-2',
  lg: 'px-6 py-3.5 text-base gap-2',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className,
  children,
  disabled,
  ...props
}, ref) => (
  <button
    ref={ref}
    disabled={disabled || loading}
    className={clsx(
      'btn-kid inline-flex items-center justify-center font-semibold transition-all disabled:opacity-50',
      VARIANT_CLASSES[variant],
      SIZE_CLASSES[size],
      fullWidth && 'w-full',
      className
    )}
    {...props}
  >
    {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin flex-shrink-0" /> : leftIcon}
    {children}
    {!loading && rightIcon}
  </button>
))
Button.displayName = 'Button'

// ── Badge ───────────────────────────────────────────────────

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'xp'

const BADGE_CLASSES: Record<BadgeVariant, string> = {
  default: 'bg-secondary text-secondary-foreground',
  success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  xp: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

export function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold',
        BADGE_CLASSES[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

// ── Card ────────────────────────────────────────────────────

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean
  padding?: 'sm' | 'md' | 'lg'
}

export function Card({ hover = false, padding = 'md', className, children, ...props }: CardProps) {
  const PAD = { sm: 'p-3', md: 'p-4', lg: 'p-6' }
  return (
    <div
      className={clsx(
        'bg-card border rounded-2xl',
        PAD[padding],
        hover && 'hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// ── Modal ───────────────────────────────────────────────────

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const MODAL_SIZE = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg' }

export function Modal({ open, onClose, title, description, children, size = 'md' }: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className={clsx('relative w-full bg-card border rounded-3xl shadow-xl overflow-hidden', MODAL_SIZE[size])}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              {(title || description) && (
                <div className="px-6 pt-6 pb-4 border-b">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      {title && <h2 className="text-lg font-black">{title}</h2>}
                      {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-secondary transition-colors flex-shrink-0">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
              {/* Content */}
              <div className="p-6">{children}</div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

// ── Skeleton ────────────────────────────────────────────────

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx('shimmer rounded-xl bg-secondary', className)}
      {...props}
    />
  )
}

// ── Empty State ─────────────────────────────────────────────

interface EmptyStateProps {
  emoji?: string
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ emoji = '🌟', title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-16 px-4">
      <div className="text-5xl mb-3">{emoji}</div>
      <h3 className="font-bold text-lg mb-1">{title}</h3>
      {description && <p className="text-muted-foreground text-sm max-w-xs mx-auto">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

// ── Avatar ──────────────────────────────────────────────────

interface AvatarProps {
  name: string
  avatarUrl?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  emoji?: string
}

const AVATAR_SIZE = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-xl',
  xl: 'w-16 h-16 text-3xl',
}

export function Avatar({ name, avatarUrl, size = 'md', emoji }: AvatarProps) {
  if (emoji) {
    return (
      <div className={clsx('rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0', AVATAR_SIZE[size])}>
        {emoji}
      </div>
    )
  }
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={avatarUrl} alt={name} className={clsx('rounded-2xl object-cover flex-shrink-0', AVATAR_SIZE[size])} />
    )
  }
  return (
    <div className={clsx('rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 text-white font-bold', AVATAR_SIZE[size])}>
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

// ── Toggle ──────────────────────────────────────────────────

interface ToggleProps {
  checked: boolean
  onChange: (val: boolean) => void
  label?: string
  disabled?: boolean
}

export function Toggle({ checked, onChange, label, disabled = false }: ToggleProps) {
  return (
    <label className={clsx('flex items-center gap-3 cursor-pointer select-none', disabled && 'opacity-50 cursor-not-allowed')}>
      <div
        className={clsx(
          'relative w-11 h-6 rounded-full transition-colors',
          checked ? 'bg-violet-600' : 'bg-border',
          disabled && 'pointer-events-none'
        )}
        onClick={() => !disabled && onChange(!checked)}
      >
        <motion.span
          layout
          className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm"
          animate={{ x: checked ? 20 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </div>
      {label && <span className="text-sm font-medium">{label}</span>}
    </label>
  )
}
