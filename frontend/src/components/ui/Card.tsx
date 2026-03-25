import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'light' | 'dark';
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', variant = 'light', children, ...props }, ref) => {
    const isDark = variant === 'dark';
    return (
      <div
        ref={ref}
        className={`
          relative rounded-[var(--radius-lg)] overflow-hidden transition-all duration-200
          ${isDark 
            ? 'bg-[var(--color-surface-dark)] border border-[var(--color-border-dark)]' 
            : 'bg-[var(--color-bg-light)] border border-[var(--color-border-light)] hover:shadow-[var(--shadow-hover)] hover:border-[var(--color-brand-blush)] hover:-translate-y-[2px]'}
          ${className}
        `}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';

export { Card };
