import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsService } from '../services/reports.service';

/**
 * Hook to get reports by topic ID
 */
export const useReportsByTopic = (topicId) => {
    return useQuery({
        queryKey: ['reports', 'topic', topicId],
        queryFn: () => reportsService.getByTopic(topicId),
        enabled: !!topicId,
        staleTime: 30 * 1000, // 30 seconds
    });
};

/**
 * Hook to get latest version of each phase
 */
export const useLatestReports = (topicId) => {
    return useQuery({
        queryKey: ['reports', 'latest', topicId],
        queryFn: () => reportsService.getLatestByTopic(topicId),
        enabled: !!topicId,
        staleTime: 30 * 1000,
    });
};

/**
 * Hook to get submission status with deadline info
 */
export const useSubmissionStatus = (topicId, sessionDeadlines) => {
    return useQuery({
        queryKey: ['reports', 'status', topicId],
        queryFn: () => reportsService.getSubmissionStatus(topicId, sessionDeadlines),
        enabled: !!topicId,
        staleTime: 60 * 1000, // 1 minute
    });
};

/**
 * Hook to upload a report
 */
export const useUploadReport = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ topicId, phase, file, note }) => 
            reportsService.upload({ topicId, phase, file, note }),
        onSuccess: (data, variables) => {
            // Invalidate related queries
            queryClient.invalidateQueries(['reports', 'topic', variables.topicId]);
            queryClient.invalidateQueries(['reports', 'latest', variables.topicId]);
            queryClient.invalidateQueries(['reports', 'status', variables.topicId]);
            queryClient.invalidateQueries({ queryKey: ['student-dashboard'] });
        },
    });
};

/**
 * Hook to download a report
 */
export const useDownloadReport = () => {
    return useMutation({
        mutationFn: (report) => reportsService.download(report),
    });
};

/**
 * Hook to get download URL
 */
export const useReportDownloadUrl = (filePath) => {
    return useQuery({
        queryKey: ['reports', 'url', filePath],
        queryFn: () => reportsService.getDownloadUrl(filePath),
        enabled: !!filePath,
        staleTime: 55 * 60 * 1000, // 55 minutes (URL valid for 1 hour)
    });
};

/**
 * Hook for teacher to get all mentees' reports
 */
export const useTeacherReports = () => {
    return useQuery({
        queryKey: ['reports', 'teacher'],
        queryFn: () => reportsService.getReportsForTeacher(),
        staleTime: 60 * 1000,
    });
};

export default {
    useReportsByTopic,
    useLatestReports,
    useSubmissionStatus,
    useUploadReport,
    useDownloadReport,
    useReportDownloadUrl,
    useTeacherReports,
};
