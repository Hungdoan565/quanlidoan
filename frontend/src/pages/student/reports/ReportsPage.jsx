import { useState, useCallback } from 'react';
import {
    FileText, Upload, Clock, CheckCircle, AlertCircle,
    Download, Calendar, Code, Loader2,
    ExternalLink, Github
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
    Input,
} from '../../../components/ui';
import { useMyTopic } from '../../../hooks/useTopics';
import { useReportsByTopic, useUploadReport, useDownloadReport } from '../../../hooks/useReports';
import { reportsService } from '../../../services/reports.service';
import { topicsService } from '../../../services/topics.service';
import './ReportsPage.css';

const reportPhases = [
    {
        id: 'report1',
        name: 'Báo cáo Tiến độ 1',
        icon: FileText,
        description: 'Phân tích yêu cầu và thiết kế sơ bộ',
        accept: '.pdf,.doc,.docx',
    },
    {
        id: 'report2',
        name: 'Báo cáo Tiến độ 2',
        icon: FileText,
        description: 'Thiết kế chi tiết và triển khai một phần',
        accept: '.pdf,.doc,.docx',
    },
    {
        id: 'final',
        name: 'Báo cáo Cuối kỳ',
        icon: FileText,
        description: 'Tổng kết toàn bộ nội dung đồ án',
        accept: '.pdf,.doc,.docx',
    },
    {
        id: 'slide',
        name: 'Slide Bảo vệ',
        icon: FileText,
        description: 'Slide trình bày cho buổi bảo vệ',
        accept: '.pdf,.ppt,.pptx',
    },
    {
        id: 'source_code',
        name: 'Mã nguồn',
        icon: Code,
        description: 'File nén chứa toàn bộ mã nguồn',
        accept: '.zip,.rar,.7z',
    },
];

export function ReportsPage() {
    const { data: topic, isLoading, error, refetch } = useMyTopic();
    const { data: reports = [], refetch: refetchReports } = useReportsByTopic(topic?.id);
    const uploadMutation = useUploadReport();
    const downloadMutation = useDownloadReport();

    const [uploadModal, setUploadModal] = useState({ open: false, phase: null });
    const [repoModal, setRepoModal] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadNote, setUploadNote] = useState('');
    const [repoUrl, setRepoUrl] = useState('');
    const [uploadError, setUploadError] = useState(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setUploadError(null);
        if (file) {
            try {
                reportsService.validateFile(file, uploadModal.phase);
                setSelectedFile(file);
            } catch (err) {
                setUploadError(err.message);
                setSelectedFile(null);
            }
        }
    };

    const handleUpload = async () => {
        if (!selectedFile || !uploadModal.phase || !topic?.id) return;

        try {
            await uploadMutation.mutateAsync({
                topicId: topic.id,
                phase: uploadModal.phase,
                file: selectedFile,
                note: uploadNote.trim() || null,
            });
            setUploadModal({ open: false, phase: null });
            setSelectedFile(null);
            setUploadNote('');
            setUploadError(null);
            refetchReports();
        } catch (err) {
            setUploadError(err.message);
        }
    };

    const handleDownload = useCallback(async (report) => {
        try {
            await downloadMutation.mutateAsync(report);
        } catch (err) {
            console.error('Download error:', err);
        }
    }, [downloadMutation]);

    const handleSaveRepoUrl = async () => {
        if (!topic?.id) return;
        try {
            await topicsService.updateRepoUrl(topic.id, repoUrl.trim());
            setRepoModal(false);
            refetch();
        } catch (err) {
            console.error('Save repo URL error:', err);
        }
    };

    const getPhaseReports = (phaseId) => {
        return reports.filter(r => r.phase === phaseId).sort((a, b) => b.version - a.version);
    };

    const getLatestReport = (phaseId) => {
        const phaseReports = getPhaseReports(phaseId);
        return phaseReports[0] || null;
    };

    const getPhaseStatus = (phaseId) => {
        return getLatestReport(phaseId) ? 'submitted' : 'pending';
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
        return new Date(date).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatDateShort = (date) => {
        if (!date) return 'Chưa xác định';
        return new Date(date).toLocaleDateString('vi-VN');
    };

    const isOverdue = (deadline) => deadline && new Date() > new Date(deadline);

    const formatFileSize = (bytes) => {
        if (!bytes) return '0 KB';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    };

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
                        <h1 className="page-title"><FileText size={28}  aria-hidden="true" /> Nộp Báo cáo</h1>
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
    const submittedPhases = reportPhases.filter(p => getLatestReport(p.id)).length;

    return (
        <div className="reports-page">
            <div className="page-header">
                <div className="page-header-content">
                    <h1 className="page-title"><FileText size={28}  aria-hidden="true" /> Nộp Báo cáo</h1>
                    <p className="page-subtitle">{topic.title}</p>
                </div>
            </div>

            {/* Progress Card */}
            <Card className="progress-card">
                <CardBody>
                    <div className="progress-header">
                        <span className="progress-label">Tiến độ nộp</span>
                        <Badge variant={submittedPhases === reportPhases.length ? 'success' : 'info'}>
                            {submittedPhases}/{reportPhases.length}
                        </Badge>
                    </div>
                    <ProgressBar 
                        value={submittedPhases} 
                        max={reportPhases.length} 
                        variant={submittedPhases === reportPhases.length ? 'success' : 'primary'} 
                    />
                </CardBody>
            </Card>

            {/* Repository URL Card */}
            <Card className="repo-card">
                <CardBody>
                    <div className="repo-header">
                        <div className="repo-info">
                            <Github size={20}  aria-hidden="true" />
                            <span className="repo-label">Repository mã nguồn</span>
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                                setRepoUrl(topic.repo_url || '');
                                setRepoModal(true);
                            }}
                        >
                            {topic.repo_url ? 'Cập nhật' : 'Thêm link'}
                        </Button>
                    </div>
                    {topic.repo_url ? (
                        <a href={topic.repo_url} target="_blank" rel="noopener noreferrer" className="repo-link">
                            {topic.repo_url}
                            <ExternalLink size={14}  aria-hidden="true" />
                        </a>
                    ) : (
                        <p className="repo-empty">Chưa có link repository. Vui lòng thêm link GitHub/GitLab.</p>
                    )}
                </CardBody>
            </Card>

            {/* Phases Grid */}
            <div className="phases-grid">
                {reportPhases.map((phase) => {
                    const status = getPhaseStatus(phase.id);
                    const deadline = getPhaseDeadline(phase.id);
                    const overdue = isOverdue(deadline) && status === 'pending';
                    const latestReport = getLatestReport(phase.id);
                    const phaseReports = getPhaseReports(phase.id);
                    const PhaseIcon = phase.icon;

                    return (
                        <Card key={phase.id} className={`phase-card ${status} ${overdue ? 'overdue' : ''}`}>
                            <CardBody>
                                <div className="phase-top">
                                    <div className="phase-icon-wrap">
                                        <PhaseIcon size={22}  aria-hidden="true" />
                                    </div>
                                    {status === 'submitted' ? (
                                        <Badge variant="success"><CheckCircle size={12}  aria-hidden="true" /> Đã nộp</Badge>
                                    ) : overdue ? (
                                        <Badge variant="danger"><AlertCircle size={12}  aria-hidden="true" /> Quá hạn</Badge>
                                    ) : (
                                        <Badge variant="warning"><Clock size={12}  aria-hidden="true" /> Chờ nộp</Badge>
                                    )}
                                </div>

                                <h3 className="phase-name">{phase.name}</h3>
                                <p className="phase-desc">{phase.description}</p>

                                {deadline && (
                                    <div className={`phase-deadline ${overdue ? 'text-danger' : ''}`}>
                                        <Calendar size={14}  aria-hidden="true" />
                                        <span>Hạn: {formatDateShort(deadline)}</span>
                                    </div>
                                )}

                                {/* Show latest submission info */}
                                {latestReport && (
                                    <div className="phase-submission">
                                        <div className="submission-info">
                                            <span className="submission-version">v{latestReport.version}</span>
                                            <span className="submission-name">{latestReport.file_name}</span>
                                            <span className="submission-size">{formatFileSize(latestReport.file_size)}</span>
                                        </div>
                                        <span className="submission-date">
                                            Nộp lúc: {formatDate(latestReport.submitted_at)}
                                        </span>
                                    </div>
                                )}

                                <div className="phase-actions">
                                    {status === 'submitted' ? (
                                        <>
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                leftIcon={<Download size={14} aria-hidden="true" />}
                                                onClick={() => handleDownload(latestReport)}
                                                disabled={downloadMutation.isPending}
                                            >
                                                Tải về
                                            </Button>
                                            {canSubmit && (
                                                <Button variant="outline" size="sm" leftIcon={<Upload size={14} aria-hidden="true" />}
                                                    onClick={() => setUploadModal({ open: true, phase: phase.id })}>
                                                    Nộp lại (v{latestReport.version + 1})
                                                </Button>
                                            )}
                                        </>
                                    ) : canSubmit ? (
                                        <Button leftIcon={<Upload size={16} aria-hidden="true" />}
                                            onClick={() => setUploadModal({ open: true, phase: phase.id })}>
                                            Nộp báo cáo
                                        </Button>
                                    ) : (
                                        <Button disabled>Chưa thể nộp</Button>
                                    )}
                                </div>

                                {/* Show version history if multiple versions */}
                                {phaseReports.length > 1 && (
                                    <details className="version-history">
                                        <summary>Xem {phaseReports.length - 1} phiên bản trước</summary>
                                        <ul>
                                            {phaseReports.slice(1).map(report => (
                                                <li key={report.id}>
                                                    <span>v{report.version} - {formatDate(report.submitted_at)}</span>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        onClick={() => handleDownload(report)}
                                                    >
                                                        <Download size={12}  aria-hidden="true" />
                                                    </Button>
                                                </li>
                                            ))}
                                        </ul>
                                    </details>
                                )}
                            </CardBody>
                        </Card>
                    );
                })}
            </div>

            {/* Upload Modal */}
            <Modal
                isOpen={uploadModal.open}
                onClose={() => { 
                    setUploadModal({ open: false, phase: null }); 
                    setSelectedFile(null); 
                    setUploadNote('');
                    setUploadError(null);
                }}
                title={`Nộp ${reportPhases.find(p => p.id === uploadModal.phase)?.name || ''}`}
                size="md"
            >
                <div className="upload-form">
                    {uploadError && (
                        <div className="upload-error">
                            <AlertCircle size={16}  aria-hidden="true" />
                            <span>{uploadError}</span>
                        </div>
                    )}

                    <div className="upload-zone">
                        <input 
                            type="file" 
                            id="file-input" 
                            onChange={handleFileChange}
                            accept={reportPhases.find(p => p.id === uploadModal.phase)?.accept || '*'}
                            hidden 
                        />
                        <label htmlFor="file-input" className="upload-label">
                            {selectedFile ? (
                                <div className="selected-file">
                                    <FileText size={40}  aria-hidden="true" />
                                    <span className="file-name">{selectedFile.name}</span>
                                    <span className="file-size">{formatFileSize(selectedFile.size)}</span>
                                </div>
                            ) : (
                                <div className="upload-placeholder">
                                    <Upload size={40}  aria-hidden="true" />
                                    <span>Kéo thả hoặc click để chọn file</span>
                                    <span className="file-types">
                                        {reportPhases.find(p => p.id === uploadModal.phase)?.accept?.toUpperCase().replace(/\./g, '') || 'PDF, DOC, DOCX'}
                                    </span>
                                </div>
                            )}
                        </label>
                    </div>

                    <div className="upload-note">
                        <label htmlFor="upload-note">Ghi chú (tùy chọn)</label>
                        <textarea
                            id="upload-note"
                            value={uploadNote}
                            onChange={(e) => setUploadNote(e.target.value)}
                            placeholder="Ghi chú về phiên bản này..."
                            rows={3}
                        />
                    </div>

                    <div className="upload-actions">
                        <Button 
                            variant="ghost" 
                            onClick={() => { 
                                setUploadModal({ open: false, phase: null }); 
                                setSelectedFile(null);
                                setUploadNote('');
                                setUploadError(null);
                            }}
                        >
                            Hủy
                        </Button>
                        <Button 
                            onClick={handleUpload} 
                            disabled={!selectedFile || uploadMutation.isPending} 
                            leftIcon={uploadMutation.isPending ? <Loader2 className="spin" size={16} aria-hidden="true" /> : <Upload size={16}  aria-hidden="true" />}
                        >
                            {uploadMutation.isPending ? 'Đang tải...' : 'Nộp file'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Repo URL Modal */}
            <Modal
                isOpen={repoModal}
                onClose={() => setRepoModal(false)}
                title="Cập nhật Repository"
                size="md"
            >
                <div className="repo-form">
                    <p className="repo-hint">
                        Nhập link GitHub hoặc GitLab repository của bạn. Link này giúp giảng viên 
                        có thể xem mã nguồn trực tiếp.
                    </p>
                    <Input
                        label="Link Repository"
                        placeholder="https://github.com/username/project"
                        value={repoUrl}
                        onChange={(e) => setRepoUrl(e.target.value)}
                        leftIcon={<Github size={16}  aria-hidden="true" />}
                    />
                    <div className="repo-actions">
                        <Button variant="ghost" onClick={() => setRepoModal(false)}>
                            Hủy
                        </Button>
                        <Button onClick={handleSaveRepoUrl}>
                            Lưu
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

export default ReportsPage;
