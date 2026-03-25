import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'text';
  size?: 'sm' | 'md' | 'lg';
  radius?: 'md' | 'full';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = '',
      variant = 'primary',
      size = 'md',
      radius = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'inline-flex items-center justify-center font-body transition-all focus:outline-none disabled:opacity-50 disabled:pointer-events-none active:scale-95';
    
    const variants = {
      primary: 'bg-[var(--color-brand-core)] text-white hover:bg-[var(--color-brand-deep)]',
      secondary: 'bg-[var(--color-surface-light)] text-[var(--color-text-dark)] border border-[var(--color-border-light)] hover:border-[var(--color-text-muted-light)] hover:bg-[var(--color-bg-light)]',
      ghost: 'bg-transparent text-[var(--color-text-light-2)] hover:text-[var(--color-text-light)] hover:bg-[var(--color-surface-dark-2)]',
      danger: 'bg-[var(--color-error)] text-white hover:bg-red-700',
      text: 'bg-transparent text-[var(--color-text-mid)] hover:text-[var(--color-text-dark)] hover:underline underline-offset-4',
    };

    const sizes = {
      sm: 'h-8 px-3 text-[12px] font-medium',
      md: 'h-[44px] px-4 text-[14px] font-semibold',
      lg: 'h-[50px] px-6 text-[16px] font-semibold',
    };

    const radii = {
      md: 'rounded-[var(--radius-md)]',
      full: 'rounded-[var(--radius-full)]',
    };

    const classes = `${baseStyles} ${variants[variant]} ${sizes[size]} ${radii[radius]} ${className}`;

    return (
      <button ref={ref} className={classes} disabled={isLoading || disabled} {...props}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
        {children}
        {!isLoading && rightIcon && <span className="ml-2.5">{rightIcon}</span>}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button };
