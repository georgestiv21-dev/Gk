import React from 'react';

export default function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: { box: 'w-8 h-8 text-sm rounded-lg', text: 'text-lg' },
    md: { box: 'w-11 h-11 text-base rounded-xl', text: 'text-2xl' },
    lg: { box: 'w-16 h-16 text-2xl rounded-2xl', text: 'text-4xl' },
  };

  return (
    <div className="flex items-center gap-3 select-none">
      <div className={`${sizes[size].box} bg-gradient-to-br from-primary via-primary-dark to-amber-600 text-white font-black flex items-center justify-center shadow-xl shadow-primary/30 border border-white/20 tracking-tighter`}>
        GS
      </div>
      <div className="flex flex-col">
        <span className={`${sizes[size].text} font-black tracking-tight text-white leading-none drop-shadow-md`}>
          Greek <span className="text-primary">Streaming</span>
        </span>
      </div>
    </div>
  );
}
