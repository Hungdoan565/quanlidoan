/**
 * Logo Component
 * DNC University - Quản lý Đồ án Logo
 * Clean, minimal design
 */
export function Logo({ size = 40, className = '' }) {
    const id = `logo-${Math.random().toString(36).substr(2, 6)}`;
    
    return (
        <svg 
            width={size} 
            height={size} 
            viewBox="0 0 40 40" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            role="img"
            aria-label="QL Đồ án Logo"
        >
            <defs>
                <linearGradient id={id} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#14b8a6" />
                    <stop offset="100%" stopColor="#0f766e" />
                </linearGradient>
            </defs>
            
            {/* Clean rounded square */}
            <rect 
                x="0" y="0" 
                width="40" height="40" 
                rx="10" 
                fill={`url(#${id})`}
            />
            
            {/* Simple graduation cap - centered, clean */}
            <g transform="translate(8, 11)">
                {/* Cap top */}
                <path 
                    d="M12 3L1 9L12 15L23 9L12 3Z" 
                    fill="white"
                />
                {/* Cap body */}
                <path 
                    d="M5 11V15.5C5 15.5 8 18 12 18C16 18 19 15.5 19 15.5V11" 
                    stroke="white" 
                    strokeWidth="2" 
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                />
                {/* Tassel */}
                <path d="M21 9V14" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <circle cx="21" cy="15.5" r="1.5" fill="white" />
            </g>
        </svg>
    );
}

/**
 * Logo with text variant
 */
export function LogoFull({ size = 40, className = '' }) {
    return (
        <div 
            className={`logo-full ${className}`} 
            style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: size * 0.25 
            }}
        >
            <Logo size={size} />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
                <span style={{ 
                    fontSize: size * 0.4, 
                    fontWeight: 700, 
                    color: 'var(--text-primary)'
                }}>
                    QL Đồ án
                </span>
                <span style={{ 
                    fontSize: size * 0.24, 
                    color: '#0d9488',
                    fontWeight: 500
                }}>
                    DNC University
                </span>
            </div>
        </div>
    );
}
