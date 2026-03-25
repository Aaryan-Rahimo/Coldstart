import React, { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  theme?: 'light' | 'dark';
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, type, theme = 'light', ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    const isPassword = type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;
    const isDark = theme === 'dark';

    return (
      <div className={`relative w-full flex flex-col gap-1.5 ${className}`}>
        <label
          className={`
            text-[12px] font-semibold font-body
            ${isDark ? 'text-[var(--color-text-light)]' : 'text-[var(--color-text-dark)]'}
          `}
        >
          {label}
        </label>
        <div className="relative">
          <input
            {...props}
            type={inputType}
            ref={ref}
            className={`
              w-full h-[44px] border rounded-[var(--radius-md)] px-3 text-[14px] font-body
              transition-all duration-150 outline-none
              ${isDark 
                ? 'bg-[var(--color-bg-dark)] border-[var(--color-border-dark)] text-[var(--color-text-light)] focus:border-[var(--color-brand-core)] focus:ring-[3px] focus:ring-[rgba(193,53,64,0.15)] placeholder-[var(--color-text-light-3)]' 
                : 'bg-[var(--color-bg-light)] border-[var(--color-border-light)] text-[var(--color-text-dark)] focus:border-[var(--color-brand-core)] focus:ring-[3px] focus:ring-[rgba(193,53,64,0.14)] placeholder-[var(--color-text-muted-light)]'}
              ${error ? 'border-[var(--color-error)]' : ''}
            `}
          />
          
          {isPassword && (
            <button
              type="button"
              tabIndex={-1}
              className={`absolute right-3 top-[13px] focus:outline-none transition-colors ${isDark ? 'text-[var(--color-text-light-3)] hover:text-[var(--color-text-light)]' : 'text-[var(--color-text-muted-light)] hover:text-[var(--color-text-dark)]'}`}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}
        </div>
        {error && <span className="text-[var(--color-error)] text-[12px] font-body">{error}</span>}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
