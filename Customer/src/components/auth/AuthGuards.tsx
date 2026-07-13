import {useEffect} from 'react';
import {Navigate, Outlet, useLocation} from 'react-router-dom';
import {authApi} from '../../services/auth.service';
import {useAuthStore} from '../../store/authStore';
import {
  getPostAuthPath,
  needsMembershipOnboarding,
  needsOnboarding,
  needsProfileSetup,
} from '../../utils/onboarding';

export function AuthBootstrap({children}: {children: React.ReactNode}) {
  const {isLoading, setSession, setLoading, logout} = useAuthStore();

  useEffect(() => {
    let mounted = true;
    const bootstrap = async () => {
      try {
        const refresh = await authApi.refreshToken();
        if (!mounted) return;
        if (refresh.data.token && refresh.data.data) {
          setSession({
            customer: refresh.data.data,
            token: refresh.data.token,
          });
          return;
        }
        logout();
      } catch {
        if (mounted) logout();
      } finally {
        if (mounted) setLoading(false);
      }
    };
    bootstrap();
    return () => {
      mounted = false;
    };
  }, [logout, setLoading, setSession]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-blue/20 border-t-brand-blue" />
      </div>
    );
  }

  return <>{children}</>;
}

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{from: location}} />;
  }
  return <Outlet />;
}

/** Authenticated users who still need Create Account / Membership */
export function OnboardingRoute({step}: {step: 'profile' | 'membership'}) {
  const customer = useAuthStore(s => s.customer);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (step === 'profile') {
    if (!needsProfileSetup(customer)) {
      return <Navigate to={getPostAuthPath(customer)} replace />;
    }
    return <Outlet />;
  }

  if (needsProfileSetup(customer)) {
    return <Navigate to="/onboarding/create-account" replace />;
  }
  if (!needsMembershipOnboarding(customer)) {
    return <Navigate to="/home" replace />;
  }
  return <Outlet />;
}

/** App pages after onboarding is fully complete */
export function AppRoute() {
  const customer = useAuthStore(s => s.customer);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (needsOnboarding(customer)) {
    return <Navigate to={getPostAuthPath(customer)} replace />;
  }
  return <Outlet />;
}

export function PublicOnlyRoute() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const customer = useAuthStore(s => s.customer);
  if (isAuthenticated) {
    return <Navigate to={getPostAuthPath(customer)} replace />;
  }
  return <Outlet />;
}
