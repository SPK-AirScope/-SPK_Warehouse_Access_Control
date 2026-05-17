import React, { useState } from 'react';
import { Globe } from 'lucide-react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Button = ({
  children,
  variant = 'primary',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'success' }) => {
  const variants = {
    primary: 'bg-[#E30613] text-white hover:bg-[#C20510] shadow-lg shadow-red-100',
    secondary: 'bg-[#1A1A1A] text-white hover:bg-black',
    outline: 'border border-slate-200 text-slate-700 hover:bg-slate-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'text-slate-500 hover:bg-slate-100',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700',
  };

  return (
    <button
      className={cn(
        'px-4 py-2 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95 text-sm',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export const Card = ({ children, className, ...props }: { children: React.ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('bg-white border border-slate-200 rounded-2xl shadow-sm p-6', className)} {...props}>
    {children}
  </div>
);

export const SwissportLogo = ({ className, size = 'md' }: { className?: string, size?: 'sm' | 'md' | 'lg' | 'xl' }) => {
  const sizes = {
    sm: { text: 'text-xl', rhombus: 'w-6 h-6', icon: 12, gap: 'gap-1' },
    md: { text: 'text-2xl', rhombus: 'w-8 h-8', icon: 16, gap: 'gap-1.5' },
    lg: { text: 'text-4xl', rhombus: 'w-12 h-12', icon: 24, gap: 'gap-2' },
    xl: { text: 'text-6xl', rhombus: 'w-20 h-20', icon: 40, gap: 'gap-3' },
  };

  const s = sizes[size];

  return (
    <div className={cn("flex items-center select-none", s.gap, className)}>
      <span className={cn("font-black text-[#1A1A1A] tracking-tighter italic lowercase leading-none", s.text)}>
        swissport
      </span>
      <div className={cn("relative flex items-center justify-center shrink-0", s.rhombus)}>
        <div className="absolute inset-0 bg-[#E30613] transform skew-x-[-20deg] rounded-sm" />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
          className="relative z-10 flex items-center justify-center"
        >
          <Globe size={s.icon} className="text-white opacity-90" strokeWidth={1.5} />
        </motion.div>
      </div>
    </div>
  );
};

export const ApprovalSeal = ({ className, size = 'md', isPdf = false }: { className?: string, size?: 'sm' | 'md' | 'lg', isPdf?: boolean }) => {
  const sizes = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-28 h-28',
  };

  const [imageError, setImageError] = useState(false);

  return (
    <div className={cn("relative flex items-center justify-center overflow-hidden", sizes[size], className)}>
      {!imageError ? (
        <img
          src="/1.JPG"
          alt="직인"
          className={cn(
            "w-full h-full object-contain opacity-90",
            !isPdf && "mix-blend-multiply"
          )}
          onError={() => setImageError(true)}
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="w-full h-full border-4 border-[#D30410] rounded-sm flex items-center justify-center p-1 bg-white/20">
           <div className="w-full h-full border-2 border-[#D30410] flex flex-col items-center justify-center text-[#D30410] font-black leading-none">
              <span className="text-[10px] scale-x-75">스위스포트</span>
              <span className="text-[14px]">직인</span>
              <span className="text-[10px] scale-x-75">코리아(주)</span>
           </div>
        </div>
      )}
    </div>
  );
};
