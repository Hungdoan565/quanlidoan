/**
 * Logo Component
 * DNC University - Quản lý Đồ án Logo
 */
export function Logo({ size = 40, className = '' }) {
    return (
        <svg 
            width={size} 
            height={size} 
            viewBox="0 0 40 40" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* Background circle */}
            <circle cx="20" cy="20" r="20" fill="url(#logoGradient)" />
            
            {/* Graduation cap */}
            <g transform="translate(8, 10)">
                {/* Cap top */}
                <path 
                    d="M12 2L2 8L12 14L22 8L12 2Z" 
                    fill="white" 
                    fillOpacity="0.95"
                />
                {/* Cap brim shadow */}
                <path 
                    d="M2 8L12 14L22 8" 
                    stroke="white" 
                    strokeOpacity="0.3"
                    strokeWidth="1"
                    fill="none"
                />
                {/* Tassel string */}
                <path 
                    d="M20 8V14" 
                    stroke="white" 
                    strokeWidth="1.5" 
                    strokeLinecap="round"
                />
                {/* Tassel end */}
                <circle cx="20" cy="16" r="1.5" fill="white" />
                {/* Cap body left */}
                <path 
                    d="M5 10V16C5 16 8 19 12 19C16 19 19 16 19 16V10" 
                    stroke="white" 
                    strokeWidth="1.5" 
                    strokeLinecap="round"
                    fill="none"
                />
            </g>
            
            {/* Gradient definition */}
            <defs>
                <linearGradient id="logoGradient" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#3B82F6" />
                    <stop offset="1" stopColor="#1D4ED8" />
                </linearGradient>
            </defs>
        </svg>
    );
}

/**
 * Logo with text variant
 */
export function LogoFull({ size = 40, className = '' }) {
    return (
        <div className={`logo-full ${className}`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Logo size={size} />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                <span style={{ 
                    fontSize: size * 0.4, 
                    fontWeight: 700, 
                    color: 'var(--text-primary)'
                }}>
                    QL Đồ án
                </span>
                <span style={{ 
                    fontSize: size * 0.25, 
                    color: 'var(--text-muted)',
                    fontWeight: 500
                }}>
                    DNC University
                </span>
            </div>
        </div>
    );
}
