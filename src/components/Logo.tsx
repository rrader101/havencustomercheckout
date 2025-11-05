import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'h-8 w-auto',
    md: 'h-12 w-auto',
    lg: 'h-16 w-auto'
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img
        src="/logo-final.png"
        alt="HAVEN"
        className={`${sizeClasses[size]} object-contain max-w-[203px]`}
      />
    </div>
  );
};

export default Logo;
