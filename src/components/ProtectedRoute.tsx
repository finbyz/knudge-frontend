import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/api/auth';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute = () => {
    const { accessToken, logout } = useAuthStore();
    const [isValidating, setIsValidating] = useState(true);
    const [isValid, setIsValid] = useState(false);

    useEffect(() => {
        const validateSession = async () => {
            if (!accessToken) {
                setIsValidating(false);
                setIsValid(false);
                return;
            }

            try {
                // Validate token by calling /auth/me
                await authApi.getMe();
                setIsValid(true);
            } catch (error: any) {
                console.error('Session validation failed:', error);
                // Token is invalid or expired, clear auth state
                logout();
                setIsValid(false);
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
