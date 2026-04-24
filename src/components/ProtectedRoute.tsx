import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/api/auth';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { getPersistedAccessToken } from '@/lib/api-client';

export const ProtectedRoute = () => {
    const { accessToken, logout } = useAuthStore();
    const [isValidating, setIsValidating] = useState(true);
    const [isValid, setIsValid] = useState(false);

    useEffect(() => {
        const validateSession = async () => {
            const persisted = getPersistedAccessToken();
            if (!accessToken && !persisted) {
                setIsValidating(false);
                setIsValid(false);
                return;
            }

            try {
                // Validate token by calling /auth/me
                await authApi.getMe();
                setIsValid(true);
            } catch (error: any) {
                // Only logout when we are sure the token is invalid (401 from /auth/me).
                const status = Number(error?.status || error?.response?.status || 0);
                console.error('Session validation failed:', { status, message: error?.message });
                if (status === 401) {
                    logout();
                    setIsValid(false);
                } else {
                    // Transient network/backend error: keep the user in-app instead of forcing relogin.
                    setIsValid(true);
                }
            } finally {
                setIsValidating(false);
            }
        };

        validateSession();
    }, [accessToken, logout]);

    // Show loading while validating
    if (isValidating) {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (!isValid) {
        return <Navigate to="/onboarding/login" replace />;
    }

    return <Outlet />;
};
