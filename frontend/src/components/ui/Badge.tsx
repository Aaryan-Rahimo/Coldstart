import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'draft' | 'sent' | 'failed' | 'queued' | 'neutral';
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className = '', variant = 'neutral', children, ...props }, ref) => {
    const variants = {
      draft: 'bg-[rgba(242,184,176,0.12)] text-[var(--color-brand-blush)]',
      sent: 'bg-[rgba(76,175,125,0.12)] text-[#4CAF7D]',
      failed: 'bg-[rgba(217,64,72,0.12)] text-[var(--color-brand-core)]',
      queued: 'bg-[rgba(224,152,48,0.12)] text-[var(--color-warning)]',
      neutral: 'bg-[var(--color-surface-dark-2)] border border-[var(--color-border-dark)] text-[var(--color-text-light-2)]',
    };

    return (
      <span
        ref={ref}
        className={`inline-flex items-center px-2 py-0.5 rounded-[var(--radius-full)] text-[var(--text-xs)] font-mono uppercase tracking-wider ${variants[variant]} ${className}`}
        {...props}
      >
        {children}
      </span>
    );
  }
);
Badge.displayName = 'Badge';

export { Badge };
