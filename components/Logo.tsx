
import React from 'react';

const Logo: React.FC<{ size?: number }> = ({ size = 120 }) => {
  return (
    <div className="relative flex items-center justify-center group" style={{ width: size, height: size }}>
      {/* Background Atmosphere - Enhanced Bloom */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-leoh-primary/40 via-leoh-magenta/30 to-leoh-accent/40 blur-2xl animate-pulse-slow"></div>
      
      <svg 
        viewBox="0 0 100 100" 
        className="z-10 w-full h-full filter drop-shadow-[0_0_12px_rgba(255,77,0,0.6)]"
      >
        <defs>
          <linearGradient id="cyberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#FF7D45', stopOpacity: 1 }} />
            <stop offset="50%" style={{ stopColor: '#E046FF', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#FFEC1F', stopOpacity: 1 }} />
          </linearGradient>
          
          <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style={{ stopColor: '#FFFFFF', stopOpacity: 1 }} />
            <stop offset="40%" style={{ stopColor: '#FFD60A', stopOpacity: 0.9 }} />
            <stop offset="100%" style={{ stopColor: '#FF4D00', stopOpacity: 0 }} />
          </radialGradient>

          <filter id="neonBlur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer Orbital Ring - More visible light tracks */}
        <circle 
          cx="50" cy="50" r="46" 
          fill="none" 
          stroke="url(#cyberGrad)" 
          strokeWidth="1" 
          strokeDasharray="2 6" 
          className="animate-spin-slow opacity-50"
        />

        {/* The Cyber-Lion "L" Symbol - Thicker and Brighter */}
        <path 
          d="M35 25 
             C 35 25, 30 45, 30 65 
             C 30 75, 40 80, 50 80 
             L 75 80 
             M 35 25 
             C 55 20, 80 35, 80 55 
             C 80 65, 75 70, 70 70" 
          fill="none" 
          stroke="url(#cyberGrad)" 
          strokeWidth="9" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          filter="url(#neonBlur)"
          className="transition-all duration-700 group-hover:stroke-[10]"
        />

        {/* Floating Data Shards - Increased brightness */}
        <rect x="70" y="30" width="10" height="3" fill="#FFD60A" className="animate-pulse">
          <animate attributeName="x" values="70;78;70" dur="2s" repeatCount="indefinite" />
        </rect>
        <rect x="18" y="48" width="6" height="2" fill="#E046FF" className="animate-pulse delay-75">
          <animate attributeName="y" values="48;40;48" dur="3s" repeatCount="indefinite" />
        </rect>

        {/* The "Eye" of Intelligence - Brighter Central Core */}
        <circle cx="48" cy="52" r="12" fill="url(#coreGlow)" className="animate-pulse" />
        <circle cx="48" cy="52" r="4" fill="#1A0033" />
        <circle cx="46.5" cy="50.5" r="1.5" fill="#FFFFFF" />
      </svg>
      
      {/* Interactive hover ring */}
      <div className="absolute inset-0 rounded-full border border-white/0 group-hover:border-white/20 group-hover:scale-110 transition-all duration-500"></div>
    </div>
  );
};

export default Logo;
