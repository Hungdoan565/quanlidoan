import { useState } from 'react';
import {
    FileText, Upload, Clock, CheckCircle, AlertCircle,
    Download, Eye, Calendar, FileUp
} from 'lucide-react';
import {
    Button,
    Card,
    CardBody,
    Badge,
    Modal,
    SkeletonCard,
    NoDataState,
    ErrorState,
    ProgressBar,
} from '../../../components/ui';
import { useMyTopic } from '../../../hooks/useTopics';
import './ReportsPage.css';

const reportPhases = [
    {
        id: 'report1',
        name: 'Báo cáo Tiến độ 1',
        icon: FileText,
        description: 'Phân tích yêu cầu và thiết kế sơ bộ'
    },
    {
        id: 'report2',
        name: 'Báo cáo Tiến độ 2',
        icon: FileText,
        description: 'Thiết kế chi tiết và triển khai một phần'
    },
    {
        id: 'final',
        name: 'Báo cáo Cuối kỳ',
        icon: FileText,
        description: 'Tổng kết toàn bộ nội dung đồ án'
    },
    {
        id: 'slide',
        name: 'Slide Bảo vệ',
        icon: FileUp,
        description: 'Slide trình bày cho buổi bảo vệ'
    },
    {
        id: 'source_code',
        name: 'Mã nguồn',
        icon: FileUp,
        description: 'File nén chứa toàn bộ mã nguồn'
    },
];

export function ReportsPage() {
    const { data: topic, isLoading, error, refetch } = useMyTopic();
    const [uploadModal, setUploadModal] = useState({ open: false, phase: null });
    const [selectedFile, setSelectedFile] = useState(null);
    const [reports] = useState([]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) setSelectedFile(file);
    };

    const handleUpload = () => {
        console.log('Uploading:', selectedFile, 'for phase:', uploadModal.phase);
        setUploadModal({ open: false, phase: null });
        setSelectedFile(null);
    };

    const getPhaseStatus = (phaseId) => {
        const report = reports.find(r => r.phase === phaseId);
        return report ? 'submitted' : 'pending';
    };

    const getPhaseDeadline = (phaseId) => {
        if (!topic?.class?.session) return null;
        const session = topic.class.session;
        switch (phaseId) {
            case 'report1': return session.report1_deadline;
            case 'report2': return session.report2_deadline;
            case 'final': return session.final_deadline;
            default: return session.final_deadline;
        }
    };

    const formatDate = (date) => {
        if (!date) return 'Chưa xác định';
        return new Date(date).toLocaleDateString('vi-VN');
    };

    const isOverdue = (deadline) => deadline && new Date() > new Date(deadline);

    if (isLoading) {
        return (
            <div className="reports-page">
                <div className="page-header"><div className="page-header-content"><h1>Đang tải...</h1></div></div>
                <SkeletonCard />
            </div>
        );
    }

    if (error) return <ErrorState onRetry={refetch} />;

    if (!topic) {
        return (
            <div className="reports-page">
                <div className="page-header">
                    <div className="page-header-content">
                        <h1 className="page-title"><FileText size={28} /> Nộp Báo cáo</h1>
                    </div>
                </div>
                <NoDataState
                    icon={FileText}
                    title="Chưa có đề tài được duyệt"
                    description="Bạn cần đăng ký và được duyệt đề tài trước khi nộp báo cáo"
                />
            </div>
        );
    }

    const canSubmit = ['approved', 'in_progress'].includes(topic.status);
    const submittedCount = reports.length;

    return (
        <div className="reports-page">
            <div className="page-header">
                <div className="page-header-content">
                    <h1 className="page-title"><FileText size={28} /> Nộp Báo cáo</h1>
                    <p className="page-subtitle">{topic.title}</p>
                </div>
            </div>

            <Card className="progress-card">
                <CardBody>
                    <div className="progress-header">
                        <span className="progress-label">Tiến độ nộp</span>
                        <Badge variant={submittedCount === reportPhases.length ? 'success' : 'info'}>
                            {submittedCount}/{reportPhases.length}
                        </Badge>
                    </div>
                    <ProgressBar value={submittedCount} max={reportPhases.length} variant="primary" showLabel />
                </CardBody>
            </Card>

            <div className="phases-grid">
                {reportPhases.map((phase) => {
                    const status = getPhaseStatus(phase.id);
                    const deadline = getPhaseDeadline(phase.id);
                    const overdue = isOverdue(deadline) && status === 'pending';
                    const PhaseIcon = phase.icon;

                    return (
                        <Card key={phase.id} className={`phase-card ${status} ${overdue ? 'overdue' : ''}`}>
                            <CardBody>
                                <div className="phase-top">
                                    <div className="phase-icon-wrap">
                                        <PhaseIcon size={22} />
                                    </div>
                                    {status === 'submitted' ? (
                                        <Badge variant="success"><CheckCircle size={12} /> Đã nộp</Badge>
                                    ) : overdue ? (
                                        <Badge variant="danger"><AlertCircle size={12} /> Quá hạn</Badge>
                                    ) : (
                                        <Badge variant="warning"><Clock size={12} /> Chờ nộp</Badge>
                                    )}
                                </div>

                                <h3 className="phase-name">{phase.name}</h3>
                                <p className="phase-desc">{phase.description}</p>

                                {deadline && (
                                    <div className={`phase-deadline ${overdue ? 'text-danger' : ''}`}>
                                        <Calendar size={14} />
                                        <span>Hạn: {formatDate(deadline)}</span>
                                    </div>
                                )}

                                <div className="phase-actions">
                                    {status === 'submitted' ? (
                                        <>
                                            <Button variant="ghost" size="sm" leftIcon={<Eye size={14} />}>Xem</Button>
                                            <Button variant="ghost" size="sm" leftIcon={<Download size={14} />}>Tải</Button>
                                            {canSubmit && (
                                                <Button variant="outline" size="sm" leftIcon={<Upload size={14} />}
                                                    onClick={() => setUploadModal({ open: true, phase: phase.id })}>
                                                    Nộp lại
                                                </Button>
                                            )}
                                        </>
                                    ) : canSubmit ? (
                                        <Button leftIcon={<Upload size={16} />}
                                            onClick={() => setUploadModal({ open: true, phase: phase.id })}>
                                            Nộp báo cáo
                                        </Button>
                                    ) : (
                                        <Button disabled>Chưa thể nộp</Button>
                                    )}
                                </div>
                            </CardBody>
                        </Card>
                    );
                })}
            </div>

            <Modal
                isOpen={uploadModal.open}
                onClose={() => { setUploadModal({ open: false, phase: null }); setSelectedFile(null); }}
                title={`Nộp ${reportPhases.find(p => p.id === uploadModal.phase)?.name || ''}`}
                size="md"
            >
                <div className="upload-form">
                    <div className="upload-zone">
                        <input type="file" id="file-input" onChange={handleFileChange}
                            accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,.rar" hidden />
                        <label htmlFor="file-input" className="upload-label">
                            {selectedFile ? (
                                <div className="selected-file">
                                    <FileText size={40} />
                                    <span className="file-name">{selectedFile.name}</span>
                                    <span className="file-size">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                                </div>
                            ) : (
                                <div className="upload-placeholder">
                                    <Upload size={40} />
                                    <span>Kéo thả hoặc click để chọn file</span>
                                    <span className="file-types">PDF, DOC, DOCX, PPT, PPTX, ZIP, RAR</span>
                                </div>
                            )}
                        </label>
                    </div>
                    <div className="upload-actions">
                        <Button variant="ghost" onClick={() => { setUploadModal({ open: false, phase: null }); setSelectedFile(null); }}>
                            Hủy
                        </Button>
                        <Button onClick={handleUpload} disabled={!selectedFile} leftIcon={<Upload size={16} />}>
                            Nộp file
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

export default ReportsPage;
