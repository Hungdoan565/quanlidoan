import { useEffect, useRef } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { router } from './app/router';
import { useAuthStore } from './store/authStore';
import { supabase } from './lib/supabase';
import './styles/globals.css';

// React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  const { initialize, setUser } = useAuthStore();
  const isInitialized = useRef(false);

  useEffect(() => {
    // Initialize auth state on app load
    initialize().then(() => {
      isInitialized.current = true;
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth Event]', event);

        // Skip if still initializing to prevent duplicate processing
        if (!isInitialized.current && event === 'SIGNED_IN') {
          console.log('[Auth] Skipping SIGNED_IN - initialization in progress');
          return;
        }

        switch (event) {
          case 'SIGNED_IN':
            // Skip if admin is creating a new user (prevents session switch)
            if (useAuthStore.getState().isCreatingUser) {
              console.log('[Auth] Skipping SIGNED_IN - admin is creating user');
              return;
            }
            // Only process if user changed
            const currentUser = useAuthStore.getState().user;
            if (currentUser?.id !== session?.user?.id) {
              await setUser(session?.user);
            }
            break;

          case 'SIGNED_OUT':
            await setUser(null);
            queryClient.clear();
            break;

          case 'TOKEN_REFRESHED':
            // Token refreshed - no need to refetch profile unless user changed
            // Just log for debugging
            console.log('[Auth] Token refreshed for:', session?.user?.email);
            break;

          case 'USER_UPDATED':
            // Only refetch if user data actually changed
            if (session?.user) {
              await setUser(session.user);
            }
            break;

          default:
            break;
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [initialize, setUser]);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-primary)',
          },
        }}
      />
    </QueryClientProvider>
  );
}

export default App;

