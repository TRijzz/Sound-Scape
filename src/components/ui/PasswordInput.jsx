import React, { useState } from 'react';

/**
 * A password input with a built-in show/hide ("view password") toggle.
 * Drop-in replacement for <input type="password" ... />.
 * All standard input props (value, onChange, name, id, placeholder, className,
 * autoComplete, disabled, etc.) are forwarded to the underlying input.
 */
const EyeIcon = ({ open }) => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {open ? (
      <>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-6.5 0-10-7-10-7a17.86 17.86 0 0 1 4.06-5.94" />
        <path d="M9.9 4.24A10.91 10.91 0 0 1 12 4c6.5 0 10 7 10 7a17.4 17.4 0 0 1-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    )}
  </svg>
);

const PasswordInput = ({ className = '', ...props }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        className={`${className} pr-12`}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-neon-blue transition-colors focus:outline-none"
      >
        <EyeIcon open={visible} />
      </button>
    </div>
  );
};

export default PasswordInput;
