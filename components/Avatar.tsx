
import React from 'react';

const Avatar: React.FC<{ mood: 'happy' | 'thinking' | 'idle' | 'dancing' }> = ({ mood }) => {
  return (
    <div className="w-24 h-24 relative overflow-visible flex items-center justify-center">
      {/* Cyber Lion Simple Stylized Design */}
      <div className={`transition-all duration-500 transform ${mood === 'dancing' ? 'animate-bounce' : mood === 'thinking' ? 'animate-pulse' : ''}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full">
           <defs>
              <linearGradient id="maneGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#FF4D00" />
                <stop offset="100%" stopColor="#9F00FF" />
              </linearGradient>
           </defs>
           {/* Mane */}
           <path d="M50 5 L70 15 L90 40 L95 60 L85 85 L50 95 L15 85 L5 60 L10 40 L30 15 Z" fill="url(#maneGrad)" className="opacity-80" />
           {/* Face */}
           <circle cx="50" cy="50" r="30" fill="#FFF8E8" />
           {/* Eyes */}
           <circle cx="40" cy="45" r="4" fill="#0A0015" />
           <circle cx="60" cy="45" r="4" fill="#0A0015" />
           {/* Cyber Details */}
           <rect x="35" y="42" width="10" height="2" fill="#FFD60A" />
           <path d="M45 70 Q50 75 55 70" fill="none" stroke="#0A0015" strokeWidth="2" />
        </svg>
      </div>
    </div>
  );
};

export default Avatar;
