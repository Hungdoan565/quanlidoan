import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import './ErrorPages.css';

export function ForbiddenPage() {
    return (
        <div className="error-page">
            <div className="error-content">
                <div className="error-icon">
                    <ShieldAlert size={48} />
                </div>
                <h1 className="error-code">403</h1>
                <h2 className="error-title">Không có quyền truy cập</h2>
                <p className="error-message">
                    Bạn không có quyền truy cập trang này. Vui lòng liên hệ quản trị viên nếu bạn cho rằng đây là lỗi.
                </p>
                <Link to="/" className="error-btn">
                    <ArrowLeft size={18} />
                    Quay lại
                </Link>
            </div>
        </div>
    );
}
