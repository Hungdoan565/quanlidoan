import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import './ErrorPages.css';

export function NotFoundPage() {
    return (
        <div className="error-page">
            <div className="error-content">
                <h1 className="error-code">404</h1>
                <h2 className="error-title">Không tìm thấy trang</h2>
                <p className="error-message">
                    Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
                </p>
                <Link to="/" className="error-btn">
                    <Home size={18} />
                    Về trang chủ
                </Link>
            </div>
        </div>
    );
}
