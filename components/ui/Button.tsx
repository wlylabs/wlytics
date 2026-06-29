import { ButtonHTMLAttributes, forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary:   'bg-[#111111] text-white hover:bg-[#2d2d2d] active:bg-[#111111]',
  secondary: 'bg-gray-100 text-[#111111] hover:bg-gray-200',
  danger:    'bg-red-500 text-white hover:bg-red-600',
  ghost:     'bg-transparent text-[#6B7280] hover:bg-gray-100 hover:text-[#111111]',
}

const sizeClasses: Record<Size, string> = {
  sm:  'h-9 px-4 text-sm',
  md:  'h-11 px-5 text-sm',
  lg:  'h-12 px-6 text-base',
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, disabled = false, className = '', children, ...props },
  ref
) {
  const isDisabled = disabled || loading

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2 ${
        isDisabled ? 'opacity-40 cursor-not-allowed' : 'active:scale-[0.97]'
      } ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
})

export default Button
