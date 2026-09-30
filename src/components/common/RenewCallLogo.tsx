import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export const RenewCallIcon: React.FC<{ className?: string; size?: number }> = ({ 
  className = "w-6 h-6", 
  size 
}) => {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: size } : undefined}
    >
      <defs>
        <linearGradient id="renewGrad" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4f6ef7" />
          <stop offset="1" stopColor="#9333ea" />
        </linearGradient>
        <linearGradient id="phoneGrad" x1="8" y1="8" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" />
          <stop offset="1" stopColor="#e0e7ff" />
        </linearGradient>
      </defs>

      {/* Renewal Dynamic Outer Orbit / Sync Ring */}
      <path
        d="M16 4C22.6274 4 28 9.37258 28 16C28 18.3 27.35 20.45 26.22 22.28M16 28C9.37258 28 4 22.6274 4 16C4 13.7 4.65 11.55 5.78 9.72"
        stroke="url(#renewGrad)"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      {/* Arrow Heads for Renewal Orbit */}
      <path
        d="M23.5 24L26.5 22.28L28.8 25.5"
        stroke="url(#renewGrad)"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 8L5.5 9.72L3.2 6.5"
        stroke="url(#renewGrad)"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Modern Center Phone Handset */}
      <path
        d="M11.5 10.2C11.5 9.54 12.04 9 12.7 9H14.1C14.65 9 15.12 9.38 15.22 9.92L15.75 12.8C15.84 13.28 15.65 13.77 15.26 14.05L14.2 14.8C15.1 16.7 16.7 18.3 18.6 19.2L19.35 18.14C19.63 17.75 20.12 17.56 20.6 17.65L23.48 18.18C24.02 18.28 24.4 18.75 24.4 19.3V20.7C24.4 21.36 23.86 21.9 23.2 21.9C16.74 21.9 11.5 16.66 11.5 10.2Z"
        fill="url(#phoneGrad)"
      />

      {/* Pulse Dot */}
      <circle cx="21.5" cy="11.5" r="2.2" fill="#22c55e" />
    </svg>
  );
};

export const RenewCallLogo: React.FC<LogoProps> = ({ 
  className = "", 
  size = 'md',
  showText = true 
}) => {
  const sizeMap = {
    sm: { box: "w-8 h-8 rounded-lg", icon: 18, title: "text-base", sub: "text-[9px]" },
    md: { box: "w-10 h-10 rounded-xl", icon: 22, title: "text-lg", sub: "text-[10px]" },
    lg: { box: "w-14 h-14 rounded-2xl", icon: 30, title: "text-2xl", sub: "text-xs" },
    xl: { box: "w-16 h-16 rounded-2xl", icon: 36, title: "text-3xl", sub: "text-xs" },
  };

  const current = sizeMap[size];

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <div className={`${current.box} bg-gradient-to-tr from-[#161926] to-[#1f2338] border border-[#252840] flex items-center justify-center shadow-lg shadow-indigo-950/50 relative overflow-hidden group`}>
        <div className="absolute inset-0 bg-gradient-to-tr from-[#4f6ef7]/15 to-[#8b5cf6]/15 group-hover:opacity-100 transition-opacity" />
        <RenewCallIcon size={current.icon} />
      </div>

      {showText && (
        <div>
          <div className="flex items-center space-x-1.5">
            <span className={`${current.title} font-black tracking-tight text-white font-sans`}>
              RENEW<span className="text-[#4f6ef7]">CALL</span>
            </span>
          </div>
          <p className={`${current.sub} uppercase tracking-widest font-bold text-slate-400`}>
            INSURANCE RENEWAL ENGINE
          </p>
        </div>
      )}
    </div>
  );
};
