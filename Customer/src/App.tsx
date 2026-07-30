import {BrowserRouter, Navigate, Route, Routes} from 'react-router-dom';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {Toaster} from 'sonner';
import {
  AppRoute,
  AuthBootstrap,
  OnboardingRoute,
  ProtectedRoute,
  PublicOnlyRoute,
} from './components/auth/AuthGuards';
import LoginPage from './app/auth/LoginPage';
import VerifyOtpPage from './app/auth/VerifyOtpPage';
import SignupPage from './app/auth/SignupPage';
import ForgotPasswordPage from './app/auth/ForgotPasswordPage';
import ResetPasswordPage from './app/auth/ResetPasswordPage';
import ProfilePage from './app/auth/ProfilePage';
import CreateAccountOnboardingPage from './app/onboarding/CreateAccountOnboardingPage';
import MembershipOnboardingPage from './app/onboarding/MembershipOnboardingPage';
import HomePage from './app/home/HomePage';
import WalletPage from './app/wallet/WalletPage';
import ReferAndEarnPage from './app/refer/ReferAndEarnPage';
import PaymentResultPage from './app/payment/PaymentResultPage';
import PrivacyPolicyPage from './app/legal/PrivacyPolicyPage';
import TermsOfUsePage from './app/legal/TermsOfUsePage';
import MembershipTermsPage from './app/legal/MembershipTermsPage';
import LegalIndexPage from './app/legal/LegalIndexPage';
import ServicesTermsPage from './app/legal/ServicesTermsPage';
import EventsTermsPage from './app/legal/EventsTermsPage';
import CafeTermsPage from './app/legal/CafeTermsPage';
import SpaceTermsPage from './app/legal/SpaceTermsPage';
import CommunityGuidelinesPage from './app/legal/CommunityGuidelinesPage';
import RefundTermsPage from './app/legal/RefundTermsPage';
import {useAuthStore} from './store/authStore';
import {getPostAuthPath} from './utils/onboarding';
import ActivityPage from './app/activity/ActivityPage';
import HelpScreen from './app/help/HelpScreen'


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function RootRedirect() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const customer = useAuthStore(s => s.customer);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={getPostAuthPath(customer)} replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthBootstrap>
          <Routes>
            <Route element={<PublicOnlyRoute />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/verify-otp" element={<VerifyOtpPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/otp-login" element={<Navigate to="/login" replace />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route element={<OnboardingRoute step="profile" />}>
                <Route
                  path="/onboarding/create-account"
                  element={<CreateAccountOnboardingPage />}
                />
              </Route>
              <Route element={<OnboardingRoute step="membership" />}>
                <Route path="/onboarding/membership" element={<MembershipOnboardingPage />} />
              </Route>

              <Route element={<AppRoute />}>
                <Route path="/home" element={<HomePage />} />
                <Route path="/wallet" element={<WalletPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/settings" element={<ProfilePage />} />
                <Route path="/membership" element={<MembershipOnboardingPage />} />
                <Route path="/activities" element={<ActivityPage />} />

                <Route path="/refer-and-earn" element={<ReferAndEarnPage />} />
              </Route>
            </Route>

            <Route path="/" element={<RootRedirect />} />
            <Route path="/payment/result" element={<PaymentResultPage />} />
            <Route path="/legal" element={<LegalIndexPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/Privacy" element={<PrivacyPolicyPage />} />
            <Route path="/terms" element={<TermsOfUsePage />} />
            <Route path="/membershipterms" element={<MembershipTermsPage />} />
            <Route path="/serviceterms" element={<ServicesTermsPage />} />
            <Route path="/eventsterms" element={<EventsTermsPage />} />
            <Route path="/cafeterms" element={<CafeTermsPage />} />
            <Route path="/spaceterms" element={<SpaceTermsPage />} />
            <Route path="/communityguidelines" element={<CommunityGuidelinesPage />} />
            <Route path="/refundterms" element={<RefundTermsPage />} />
            <Route path="/help" element={< HelpScreen/>} />
            <Route path="*" element={<RootRedirect />} />
            

          </Routes>
        </AuthBootstrap>
        <Toaster richColors position="top-center" />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
