import { useState } from 'react';
import { Plus, Edit, Trash2, BookOpen, Users, ToggleLeft, ToggleRight, Code } from 'lucide-react';
import {
    useMySampleTopics,
    useDeleteSampleTopic,
    useToggleSampleTopicActive
} from '../../../hooks/useSampleTopics';
import { useSessions } from '../../../hooks/useSessions';
import {
    Button,
    Card,
    CardHeader,
    CardBody,
    Badge,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    Select,
    ConfirmModal,
    SkeletonTable,
    NoDataState,
    ErrorState,
} from '../../../components/ui';
import { SampleTopicFormModal } from './SampleTopicFormModal';
import './SampleTopicsPage.css';

export function SampleTopicsPage() {
    // State
    const [sessionFilter, setSessionFilter] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingTopic, setEditingTopic] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState({ open: false, topic: null });

    // Queries
    const { data: topics = [], isLoading, error, refetch } = useMySampleTopics();
    const { data: sessions = [] } = useSessions();
    const deleteTopic = useDeleteSampleTopic();
    const toggleActive = useToggleSampleTopicActive();

    // Filter topics
    const filteredTopics = sessionFilter
        ? topics.filter(t => t.session_id === sessionFilter)
        : topics;

    // Handlers
    const handleCreate = () => {
        setEditingTopic(null);
        setIsFormOpen(true);
    };

    const handleEdit = (topic) => {
        setEditingTopic(topic);
        setIsFormOpen(true);
    };

    const handleDelete = async () => {
        if (deleteConfirm.topic) {
            await deleteTopic.mutateAsync(deleteConfirm.topic.id);
            setDeleteConfirm({ open: false, topic: null });
        }
    };

    const handleToggleActive = async (topic) => {
        await toggleActive.mutateAsync({ id: topic.id, isActive: !topic.is_active });
    };

    const handleFormSuccess = () => {
        setIsFormOpen(false);
        setEditingTopic(null);
    };

    // Session options for filter
    const sessionOptions = [
        { value: '', label: 'Tất cả đợt đồ án' },
        ...sessions.filter(s => s.status === 'open').map(s => ({
            value: s.id,
            label: s.name,
        })),
    ];

    if (error) {
        return <ErrorState onRetry={refetch} />;
    }

    return (
        <div className="sample-topics-page">
            {/* Page Header */}
            <div className="page-header">
                <div className="page-header-content">
                    <h1>Đề tài mẫu</h1>
                    <p>Tạo và quản lý các đề tài mẫu cho sinh viên đăng ký</p>
                </div>
                <Button leftIcon={<Plus size={18} />} onClick={handleCreate}>
                    Thêm đề tài
                </Button>
            </div>

            {/* Filters */}
            <Card className="filters-card">
                <CardBody>
                    <div className="filters-row">
                        <Select
                            options={sessionOptions}
                            value={sessionFilter}
                            onChange={(e) => setSessionFilter(e.target.value)}
                            style={{ width: 300 }}
                        />
                    </div>
                </CardBody>
            </Card>

            {/* Topics Table */}
            <Card>
                <CardHeader>
                    <h3>Danh sách đề tài ({filteredTopics.length})</h3>
                </CardHeader>
                <CardBody>
                    {isLoading ? (
                        <SkeletonTable rows={5} cols={6} />
                    ) : filteredTopics.length === 0 ? (
                        <NoDataState
                            icon={BookOpen}
                            title="Chưa có đề tài mẫu"
                            description="Tạo đề tài mẫu để sinh viên có thể đăng ký"
                            action={
                                <Button leftIcon={<Plus size={16} />} onClick={handleCreate}>
                                    Thêm đề tài đầu tiên
                                </Button>
                            }
                        />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tên đề tài</TableHead>
                                    <TableHead>Đợt đồ án</TableHead>
                                    <TableHead>Công nghệ</TableHead>
                                    <TableHead style={{ width: 100 }}>Số SV</TableHead>
                                    <TableHead style={{ width: 100 }}>Trạng thái</TableHead>
                                    <TableHead style={{ width: 120 }}>Thao tác</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTopics.map((topic) => (
                                    <TableRow key={topic.id}>
                                        <TableCell>
                                            <div className="topic-title-cell">
                                                <BookOpen size={16} />
                                                <div>
                                                    <span className="topic-title">{topic.title}</span>
                                                    {topic.description && (
                                                        <span className="topic-desc">
                                                            {topic.description.slice(0, 80)}...
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="session-name">
                                                {topic.session?.name || 'N/A'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="tech-badges">
                                                {(topic.technologies || []).slice(0, 3).map((tech, i) => (
                                                    <Badge key={i} variant="secondary" size="sm">
                                                        <Code size={12} />
                                                        {tech}
                                                    </Badge>
                                                ))}
                                                {(topic.technologies || []).length > 3 && (
                                                    <Badge variant="default" size="sm">
                                                        +{topic.technologies.length - 3}
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="student-count">
                                                <Users size={14} />
                                                <span>{topic.current_students || 0}/{topic.max_students}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={topic.is_active ? 'success' : 'default'}
                                                onClick={() => handleToggleActive(topic)}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                {topic.is_active ? (
                                                    <><ToggleRight size={14} /> Mở</>
                                                ) : (
                                                    <><ToggleLeft size={14} /> Đóng</>
                                                )}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="action-buttons">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEdit(topic)}
                                                    title="Chỉnh sửa"
                                                >
                                                    <Edit size={16} />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setDeleteConfirm({ open: true, topic })}
                                                    title="Xóa"
                                                >
                                                    <Trash2 size={16} />
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

            {/* Form Modal */}
            <SampleTopicFormModal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSuccess={handleFormSuccess}
                topic={editingTopic}
            />

            {/* Delete Confirmation */}
            <ConfirmModal
                isOpen={deleteConfirm.open}
                onClose={() => setDeleteConfirm({ open: false, topic: null })}
                onConfirm={handleDelete}
                title="Xóa đề tài mẫu"
                message={`Bạn có chắc muốn xóa đề tài "${deleteConfirm.topic?.title}"?`}
                confirmText="Xóa"
                variant="danger"
                loading={deleteTopic.isPending}
            />
        </div>
    );
}
