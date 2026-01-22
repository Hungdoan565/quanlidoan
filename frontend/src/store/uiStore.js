import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * UI Store - Quản lý trạng thái UI
 */
export const useUIStore = create(
    persist(
        (set, get) => ({
            // Sidebar state
            sidebarOpen: true,
            sidebarCollapsed: false,

            // Theme
            theme: 'light',

            // Selected session for admin dashboard
            selectedSessionId: null,

            // Actions
            toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
            setSidebarOpen: (open) => set({ sidebarOpen: open }),
            toggleSidebarCollapse: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

            // Session selection
            setSelectedSession: (sessionId) => set({ selectedSessionId: sessionId }),

            // Theme
            setTheme: (theme) => {
                document.documentElement.setAttribute('data-theme', theme);
                set({ theme });
            },

            toggleTheme: () => set((state) => {
                const newTheme = state.theme === 'light' ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', newTheme);
                return { theme: newTheme };
            }),

            // Initialize theme on app load
            initTheme: () => {
                const { theme } = get();
                document.documentElement.setAttribute('data-theme', theme);
            },
        }),
        {
            name: 'ui-storage',
            partialize: (state) => ({
                theme: state.theme,
                selectedSessionId: state.selectedSessionId,
                sidebarCollapsed: state.sidebarCollapsed,
            }),
        }
    )
);
