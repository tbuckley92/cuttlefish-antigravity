import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 24, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Eye outline */}
      <path
        d="M 20 50 Q 20 30 50 30 Q 80 30 80 50 Q 80 70 50 70 Q 20 70 20 50 Z"
        stroke="#4f46e5"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      
      {/* Iris circle outline */}
      <circle
        cx="50"
        cy="50"
        r="20"
        stroke="#4f46e5"
        strokeWidth="5"
        fill="none"
      />
      
      {/* Folder outline */}
      <rect
        x="35"
        y="35"
        width="30"
        height="30"
        rx="2"
        stroke="#4f46e5"
        strokeWidth="4"
        fill="none"
      />
      {/* Folder tab */}
      <path
        d="M 35 35 L 35 30 L 45 30 L 45 35"
        stroke="#4f46e5"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      
      {/* Pupil (camera lens) - solid circle */}
      <circle
        cx="50"
        cy="50"
        r="8"
        fill="#4f46e5"
      />
    </svg>
  );
};
