import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute, PublicRoute } from '../components/auth/ProtectedRoute';

// Layouts
import { DashboardLayout } from '../components/layout/DashboardLayout';

// Auth Pages
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage';
import { SetPasswordPage } from '../pages/auth/SetPasswordPage';
import { AuthCallback } from '../pages/auth/AuthCallback';

// Admin Pages
import { AdminDashboard } from '../pages/admin/DashboardPage';
import { SessionsListPage } from '../pages/admin/sessions/SessionsListPage';
import { ClassesListPage } from '../pages/admin/classes/ClassesListPage';
import { ClassDetailPage } from '../pages/admin/classes/ClassDetailPage';
import { UsersListPage } from '../pages/admin/users/UsersListPage';
import { GradingConfigPage } from '../pages/admin/grading-config/GradingConfigPage';

// Teacher Pages
import { TeacherDashboard } from '../pages/teacher/DashboardPage';
import { TopicReviewsPage } from '../pages/teacher/reviews/TopicReviewsPage';
import { SampleTopicsPage } from '../pages/teacher/topics/SampleTopicsPage';
import { StudentsLogbookPage } from '../pages/teacher/logbook/StudentsLogbookPage';
import { StudentLogbookDetailPage } from '../pages/teacher/logbook/StudentLogbookDetailPage';
import { GradingPage } from '../pages/teacher/grading/GradingPage';
import { GradingDetailPage } from '../pages/teacher/grading/GradingDetailPage';
import { MenteesKanbanPage } from '../pages/teacher/mentees/MenteesKanbanPage';
import MyClassesPage from '../pages/teacher/mentees/MyClassesPage';
import TeacherClassDetailPage from '../pages/teacher/mentees/TeacherClassDetailPage';

// Student Pages
import { StudentDashboard } from '../pages/student/DashboardPage';
import { TopicRegisterPage } from '../pages/student/TopicRegisterPage';
import { MyTopicPage } from '../pages/student/MyTopicPage';
import { LogbookPage } from '../pages/student/logbook/LogbookPage';
import { ReportsPage } from '../pages/student/reports/ReportsPage';
import { GradesPage } from '../pages/student/grades/GradesPage';

// Common Pages
import { NotificationsPage } from '../pages/common/NotificationsPage';

// Error Pages
import { NotFoundPage } from '../pages/errors/NotFoundPage';
import { ForbiddenPage } from '../pages/errors/ForbiddenPage';

export const router = createBrowserRouter([
    // ==========================================
    // PUBLIC AUTH ROUTES
    // ==========================================
    {
        path: '/login',
        element: (
            <PublicRoute>
                <LoginPage />
            </PublicRoute>
        ),
    },
    {
        path: '/register',
        element: (
            <PublicRoute>
                <RegisterPage />
            </PublicRoute>
        ),
    },
    {
        path: '/reset-password',
        element: (
            <PublicRoute>
                <ResetPasswordPage />
            </PublicRoute>
        ),
    },
    {
        path: '/set-password',
        element: <SetPasswordPage />, // Không cần PublicRoute vì có thể là user đã login
    },
    {
        path: '/auth/callback',
        element: <AuthCallback />, // Xử lý callback từ email
    },

    // ==========================================
    // ADMIN ROUTES
    // ==========================================
    {
        path: '/admin',
        element: (
            <ProtectedRoute allowedRoles={['admin']}>
                <DashboardLayout role="admin" />
            </ProtectedRoute>
        ),
        children: [
            { index: true, element: <Navigate to="dashboard" replace /> },
            { path: 'dashboard', element: <AdminDashboard /> },
            { path: 'sessions', element: <SessionsListPage /> },
            { path: 'classes', element: <ClassesListPage /> },
            { path: 'classes/:id', element: <ClassDetailPage /> },
            { path: 'users', element: <UsersListPage /> },
            { path: 'grading-config', element: <GradingConfigPage /> },
            // TODO: Thêm các routes admin khác
            // { path: 'sessions/:id', element: <SessionDetailPage /> },
            // { path: 'teacher-pairs', element: <TeacherPairsPage /> },
            // { path: 'councils', element: <CouncilsPage /> },
            // { path: 'settings', element: <SettingsPage /> },
        ],
    },

    // ==========================================
    // TEACHER ROUTES
    // ==========================================
    {
        path: '/teacher',
        element: (
            <ProtectedRoute allowedRoles={['teacher']}>
                <DashboardLayout role="teacher" />
            </ProtectedRoute>
        ),
        children: [
{ index: true, element: <Navigate to="dashboard" replace /> },
            { path: 'dashboard', element: <TeacherDashboard /> },
            { path: 'topics', element: <SampleTopicsPage /> },
            { path: 'reviews', element: <TopicReviewsPage /> },
            { path: 'mentees', element: <MyClassesPage /> },
            { path: 'mentees/health', element: <MenteesKanbanPage /> },
            { path: 'mentees/:classId', element: <TeacherClassDetailPage /> },
            { path: 'logbook', element: <StudentsLogbookPage /> },
            { path: 'logbook/:topicId', element: <StudentLogbookDetailPage /> },
            { path: 'grading', element: <GradingPage /> },
            { path: 'grading/:topicId', element: <GradingDetailPage /> },
        ],
    },

    // ==========================================
    // STUDENT ROUTES
    // ==========================================
    {
        path: '/student',
        element: (
            <ProtectedRoute allowedRoles={['student']}>
                <DashboardLayout role="student" />
            </ProtectedRoute>
        ),
        children: [
{ index: true, element: <Navigate to="dashboard" replace /> },
            { path: 'dashboard', element: <StudentDashboard /> },
            { path: 'register', element: <TopicRegisterPage /> },
            { path: 'topic', element: <MyTopicPage /> },
            { path: 'logbook', element: <LogbookPage /> },
            { path: 'reports', element: <ReportsPage /> },
            { path: 'grades', element: <GradesPage /> },
        ],
    },

    // ==========================================
    // COMMON PROTECTED ROUTES
    // ==========================================
    {
        path: '/profile',
        element: (
            <ProtectedRoute>
                {/* TODO: <ProfilePage /> */}
                <div>Profile Page - Coming Soon</div>
            </ProtectedRoute>
        ),
    },
    {
        path: '/notifications',
        element: (
            <ProtectedRoute>
                <NotificationsPage />
            </ProtectedRoute>
        ),
    },

    // ==========================================
    // REDIRECTS & ERROR PAGES
    // ==========================================
    {
        path: '/',
        element: <Navigate to="/login" replace />,
    },
    {
        path: '/403',
        element: <ForbiddenPage />,
    },
    {
        path: '*',
        element: <NotFoundPage />,
    },
]);
