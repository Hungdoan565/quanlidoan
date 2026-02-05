import { BookOpen, Code, Users, Calendar, AlertTriangle, List, ToggleRight, ToggleLeft } from 'lucide-react';
import { 
    Modal, 
    Badge,
    Card,
    CardBody,
    Button
} from '../../../components/ui';
import './SampleTopicDetailModal.css';

// Difficulty badge config
const DIFFICULTY_CONFIG = {
    easy: { label: 'Dễ', variant: 'success' },
    medium: { label: 'Trung bình', variant: 'warning' },
    hard: { label: 'Khó', variant: 'danger' },
};

export function SampleTopicDetailModal({ isOpen, onClose, topic, onEdit }) {
    if (!topic) return null;

    const handleEdit = () => {
        onClose();
        onEdit?.(topic);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Chi tiết đề tài mẫu"
            size="lg"
        >
            <div className="topic-detail-content">
                <Card className="topic-detail-card">
                    <CardBody>
                        {/* Header */}
                        <div className="topic-detail-header">
                            <div className="topic-detail-icon">
                                <BookOpen size={24} aria-hidden="true" />
                            </div>
                            <div className="topic-detail-header-content">
                                <h3 className="topic-detail-title">{topic.title}</h3>
                                <div className="topic-detail-meta">
                                    {topic.difficulty && (
                                        <Badge variant={DIFFICULTY_CONFIG[topic.difficulty]?.variant || 'default'}>
                                            {DIFFICULTY_CONFIG[topic.difficulty]?.label || topic.difficulty}
                                        </Badge>
                                    )}
                                    <Badge variant={topic.is_active ? 'success' : 'default'}>
                                        {topic.is_active ? (
                                            <><ToggleRight size={14} aria-hidden="true" /> Đang mở</>
                                        ) : (
                                            <><ToggleLeft size={14} aria-hidden="true" /> Đã đóng</>
                                        )}
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        {/* Session Info */}
                        <div className="topic-detail-info-row">
                            <div className="topic-detail-info-item">
                                <Calendar size={16} aria-hidden="true" />
                                <span className="topic-detail-info-label">Đợt đồ án:</span>
                                <span className="topic-detail-info-value">{topic.session?.name || 'N/A'}</span>
                            </div>
                            <div className="topic-detail-info-item">
                                <Users size={16} aria-hidden="true" />
                                <span className="topic-detail-info-label">Số sinh viên:</span>
                                <span className="topic-detail-info-value">
                                    {topic.current_students || 0}/{topic.max_students} (tối đa)
                                </span>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="topic-detail-section">
                            <h4 className="topic-detail-section-title">Mô tả</h4>
                            <p className="topic-detail-description">
                                {topic.description || 'Chưa có mô tả'}
                            </p>
                        </div>

                        {/* Requirements */}
                        {(topic.requirements || []).length > 0 && (
                            <div className="topic-detail-section">
                                <h4 className="topic-detail-section-title">
                                    <List size={14} aria-hidden="true" />
                                    Yêu cầu chức năng ({topic.requirements.length})
                                </h4>
                                <ul className="topic-detail-requirements">
                                    {topic.requirements.map((req, i) => (
                                        <li key={i}>
                                            <span className="requirement-number">{i + 1}</span>
                                            <span>{req}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Technologies */}
                        {(topic.technologies || []).length > 0 && (
                            <div className="topic-detail-section">
                                <h4 className="topic-detail-section-title">
                                    <Code size={14} aria-hidden="true" />
                                    Công nghệ yêu cầu
                                </h4>
                                <div className="topic-detail-tech-tags">
                                    {topic.technologies.map((tech, i) => (
                                        <Badge key={i} variant="secondary" size="sm">
                                            <Code size={12} aria-hidden="true" />
                                            {tech}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Notes */}
                        {topic.notes && (
                            <div className="topic-detail-section topic-detail-notes">
                                <h4 className="topic-detail-section-title">
                                    <AlertTriangle size={14} aria-hidden="true" />
                                    Ghi chú
                                </h4>
                                <p>{topic.notes}</p>
                            </div>
                        )}
                    </CardBody>
                </Card>
            </div>

            {/* Actions */}
            <div className="topic-detail-actions">
                <Button variant="ghost" onClick={onClose}>
                    Đóng
                </Button>
                {onEdit && (
                    <Button onClick={handleEdit}>
                        Chỉnh sửa
                    </Button>
                )}
            </div>
        </Modal>
    );
}
