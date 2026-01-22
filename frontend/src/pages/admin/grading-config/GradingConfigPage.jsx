/**
 * GradingConfigPage - Admin page to configure grading criteria
 * Allows setting up criteria with weights for each session
 */

import { useState, useMemo } from 'react';
import {
    Plus,
    Edit2,
    Trash2,
    Copy,
    AlertCircle,
    CheckCircle,
    Settings
} from 'lucide-react';
import {
    useAllGradingCriteria,
    useCreateCriteria,
    useUpdateCriteria,
    useDeleteCriteria,
    useCopyCriteria
} from '../../../hooks/useGrading';
import { useActiveSessions } from '../../../hooks/useStats';
import {
    Card,
    CardHeader,
    CardBody,
    Button,
    Select,
    Badge,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    SkeletonTable,
    EmptyState,
    ConfirmModal
} from '../../../components/ui';
import { GRADER_TYPE_LABELS } from '../../../lib/constants';
import { CriteriaFormModal, CopyCriteriaModal } from './CriteriaFormModal';
import './GradingConfigPage.css';

export function GradingConfigPage() {
    // State
    const [selectedSessionId, setSelectedSessionId] = useState('');
    const [showFormModal, setShowFormModal] = useState(false);
    const [showCopyModal, setShowCopyModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [selectedCriteria, setSelectedCriteria] = useState(null);

    // Fetch sessions
    const { data: sessions = [], isLoading: sessionsLoading } = useActiveSessions();

    // Fetch criteria for selected session
    const { data: criteriaData, isLoading: criteriaLoading } = useAllGradingCriteria({
        sessionId: selectedSessionId || undefined
    });

    // Mutations
    const deleteMutation = useDeleteCriteria();

    // Auto-select first session
    useState(() => {
        if (!selectedSessionId && sessions.length > 0) {
            setSelectedSessionId(sessions[0].id);
        }
    }, [sessions, selectedSessionId]);

    // Group criteria by grader type
    const groupedCriteria = useMemo(() => {
        const criteria = criteriaData?.data || [];
        const groups = {
            advisor: [],
            reviewer: [],
            council: []
        };
        criteria.forEach(c => {
            if (groups[c.grader_type]) {
                groups[c.grader_type].push(c);
            }
        });
        return groups;
    }, [criteriaData]);

    // Calculate total weight per group
    const weightTotals = useMemo(() => {
        return {
            advisor: groupedCriteria.advisor.reduce((sum, c) => sum + (c.weight || 0), 0),
            reviewer: groupedCriteria.reviewer.reduce((sum, c) => sum + (c.weight || 0), 0),
            council: groupedCriteria.council.reduce((sum, c) => sum + (c.weight || 0), 0),
        };
    }, [groupedCriteria]);

    // Handlers
    const handleEdit = (criteria) => {
        setSelectedCriteria(criteria);
        setShowFormModal(true);
    };

    const handleDelete = (criteria) => {
        setSelectedCriteria(criteria);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        // Use sessionId, graderType, index for delete
        await deleteMutation.mutateAsync({
            sessionId: selectedCriteria.session_id || selectedSessionId,
            graderType: selectedCriteria.grader_type,
            index: selectedCriteria.criterionIndex,
        });
        setShowDeleteConfirm(false);
        setSelectedCriteria(null);
    };

    const handleAddNew = () => {
        setSelectedCriteria(null);
        setShowFormModal(true);
    };

    const isLoading = sessionsLoading || criteriaLoading;

    return (
        <div className="page grading-config-page">
            {/* Page Header */}
            <div className="page-header">
                <div className="page-header-content">
                    <h1>Cấu hình chấm điểm</h1>
                    <p>Thiết lập tiêu chí và trọng số chấm điểm cho từng đợt</p>
                </div>
                <div className="page-header-actions">
                    <Button variant="outline" onClick={() => setShowCopyModal(true)}>
                        <Copy size={16} />
                        <span>Copy từ đợt khác</span>
                    </Button>
                    <Button onClick={handleAddNew}>
                        <Plus size={16} />
                        <span>Thêm tiêu chí</span>
                    </Button>
                </div>
            </div>

            {/* Session Selector */}
            <Card className="session-selector-card">
                <CardBody>
                    <div className="session-selector-row">
                        <label>Chọn đợt đồ án:</label>
                        <Select
                            value={selectedSessionId}
                            onChange={(e) => setSelectedSessionId(e.target.value)}
                            className="session-select"
                        >
                            <option value="">-- Tất cả đợt --</option>
                            {sessions.map(session => (
                                <option key={session.id} value={session.id}>
                                    {session.name} ({session.academic_year} - HK{session.semester})
                                </option>
                            ))}
                        </Select>
                    </div>
                </CardBody>
            </Card>

            {/* Criteria by Grader Type */}
            {isLoading ? (
                <Card>
                    <CardBody>
                        <SkeletonTable rows={5} cols={5} />
                    </CardBody>
                </Card>
            ) : !selectedSessionId ? (
                <Card>
                    <CardBody>
                        <EmptyState
                            icon={Settings}
                            title="Chọn một đợt đồ án"
                            description="Vui lòng chọn đợt đồ án để xem và cấu hình tiêu chí chấm điểm"
                        />
                    </CardBody>
                </Card>
            ) : (
                <div className="criteria-sections">
                    {/* GVHD Section */}
                    <CriteriaSection
                        title="Tiêu chí GVHD"
                        type="advisor"
                        criteria={groupedCriteria.advisor}
                        totalWeight={weightTotals.advisor}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                    />

                    {/* GVPB Section */}
                    <CriteriaSection
                        title="Tiêu chí GVPB"
                        type="reviewer"
                        criteria={groupedCriteria.reviewer}
                        totalWeight={weightTotals.reviewer}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                    />

                    {/* Council Section */}
                    <CriteriaSection
                        title="Tiêu chí Hội đồng"
                        type="council"
                        criteria={groupedCriteria.council}
                        totalWeight={weightTotals.council}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                    />
                </div>
            )}

            {/* Modals */}
            <CriteriaFormModal
                open={showFormModal}
                onClose={() => {
                    setShowFormModal(false);
                    setSelectedCriteria(null);
                }}
                criteria={selectedCriteria}
                sessionId={selectedSessionId}
            />

            <CopyCriteriaModal
                open={showCopyModal}
                onClose={() => setShowCopyModal(false)}
                targetSessionId={selectedSessionId}
                sessions={sessions}
            />

            <ConfirmModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={confirmDelete}
                title="Xác nhận xóa"
                message={`Bạn có chắc muốn xóa tiêu chí "${selectedCriteria?.name}"?`}
                confirmText="Xóa"
                variant="danger"
                loading={deleteMutation.isPending}
            />
        </div>
    );
}

/**
 * Criteria Section Component
 */
function CriteriaSection({ title, type, criteria, totalWeight, onEdit, onDelete }) {
    const isValidWeight = Math.abs(totalWeight - 1) < 0.01; // Allow small floating point errors

    return (
        <Card className="criteria-section-card">
            <CardHeader>
                <div className="criteria-section-header">
                    <div className="criteria-section-title">
                        <h3>{title}</h3>
                        <Badge variant="outline">{GRADER_TYPE_LABELS[type]}</Badge>
                    </div>
                    <div className={`weight-indicator ${isValidWeight ? 'valid' : 'invalid'}`}>
                        {isValidWeight ? (
                            <CheckCircle size={16} />
                        ) : (
                            <AlertCircle size={16} />
                        )}
                        <span>Tổng: {(totalWeight * 100).toFixed(0)}%</span>
                        {!isValidWeight && totalWeight > 0 && (
                            <span className="weight-warning">
                                (Cần = 100%)
                            </span>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardBody>
                {criteria.length === 0 ? (
                    <div className="empty-criteria">
                        Chưa có tiêu chí nào
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead style={{ width: '40%' }}>Tên tiêu chí</TableHead>
                                <TableHead style={{ width: '15%' }}>Trọng số</TableHead>
                                <TableHead style={{ width: '15%' }}>Điểm tối đa</TableHead>
                                <TableHead style={{ width: '20%' }}>Mô tả</TableHead>
                                <TableHead style={{ width: '10%' }} align="right">Thao tác</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {criteria.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        <span className="criteria-name">{item.name}</span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="primary">
                                            {(item.weight * 100).toFixed(0)}%
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{item.max_score || 10}</TableCell>
                                    <TableCell>
                                        <span className="criteria-description">
                                            {item.description || '-'}
                                        </span>
                                    </TableCell>
                                    <TableCell align="right">
                                        <div className="action-buttons">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => onEdit(item)}
                                            >
                                                <Edit2 size={14} />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-danger"
                                                onClick={() => onDelete(item)}
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardBody>
        </Card>
    );
}

export default GradingConfigPage;
