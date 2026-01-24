import { useQuery } from '@tanstack/react-query';
import { gradesService } from '../services/grades.service';
import { useMyTopic } from './useTopics';

/**
 * Hook để lấy điểm của sinh viên
 */
export function useMyGrades() {
    const { data: topic } = useMyTopic();
    const topicId = topic?.id;

    return useQuery({
        queryKey: ['my-grades', topicId],
        queryFn: () => gradesService.getMyGrades(topicId),
        enabled: !!topicId,
        staleTime: 10 * 60 * 1000, // 10 minutes - grades don't change often
    });
}

/**
 * Hook để lấy điểm tổng hợp (summary)
 */
export function useGradeSummary() {
    const { data: topic, isLoading: topicLoading } = useMyTopic();
    const topicId = topic?.id;

    const query = useQuery({
        queryKey: ['grade-summary', topicId],
        queryFn: () => gradesService.getGradeSummary(topicId),
        enabled: !!topicId,
        staleTime: 10 * 60 * 1000,
    });

    return {
        ...query,
        isLoading: topicLoading || query.isLoading,
        topic,
    };
}

/**
 * Hook để lấy lịch bảo vệ
 */
export function useDefenseSchedule() {
    const { data: topic } = useMyTopic();
    const topicId = topic?.id;

    return useQuery({
        queryKey: ['defense-schedule', topicId],
        queryFn: () => gradesService.getDefenseSchedule(topicId),
        enabled: !!topicId,
        staleTime: 10 * 60 * 1000,
    });
}

/**
 * Hook để lấy rubric/grading criteria
 */
export function useGradingCriteria(sessionId) {
    return useQuery({
        queryKey: ['grading-criteria', sessionId],
        queryFn: () => gradesService.getGradingCriteria(sessionId),
        enabled: !!sessionId,
        staleTime: 30 * 60 * 1000, // 30 minutes - criteria rarely change
    });
}
