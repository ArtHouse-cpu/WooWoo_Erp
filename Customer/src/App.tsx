import {BrowserRouter, Navigate, Route, Routes, useLocation} from 'react-router-dom';
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
import ProgramsPage from './app/programs/ProgramsPage';
import OurProgramsPage from './app/programs/OurProgramsPage';
import MyBookingsPage from './app/bookings/MyBookingsPage';
import CspProgramPage from './app/programs/CspProgramPage';
import ActivityPage from './app/activity/ActivityPage';
import PublicInvoicePage from './app/activity/PublicInvoicePage';
import HelpScreen from './app/help/HelpScreen'
import ExhibitionPage from './app/exhibition/ExhibitionPage';
import SuppliesMarketplacePage from './app/supplies/SuppliesMarketplacePage';
import PublicProductPage from './app/supplies/PublicProductPage';
import SpacesMarketplacePage from './app/spaces/SpacesMarketplacePage';
import PublicSpacePage from './app/spaces/PublicSpacePage';
import CvpProgramPage from './app/programs/CvpProgramPage';
import HapProgramPage from './app/programs/HapProgramPage';
import FoodMenuPage from './app/woofoo/FoodMenuPage';


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
  const location = useLocation();
  const publicProgram = location.pathname
    .replace(/\/+$/, '')
    .match(/^\/program\/(csp|hap|cvp)$/i);
  if (publicProgram) {
    return (
      <Navigate
        to={`/program/${publicProgram[1].toLowerCase()}`}
        replace
      />
    );
  }
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
                {/* <Route path="/programs" element={<ProgramsPage />} /> */}
                <Route path="/program/cap" element={<ProgramsPage />} />
                <Route path="/program/csp/dashboard" element={<ProgramsPage />} />
                <Route path="/program/cvp/dashboard" element={<CvpProgramPage />} />
                <Route path="/program/hap/dashboard" element={<HapProgramPage />} />
                <Route path="/booking" element={<MyBookingsPage />} />
                <Route path="/bookings" element={<Navigate to="/booking" replace />} />
                <Route path="/csp-program" element={<CspProgramPage />} />
                <Route path="/activities" element={<ActivityPage />} />

                <Route path="/refer-and-earn" element={<ReferAndEarnPage />} />
                <Route path="/supplies" element={<SuppliesMarketplacePage />} />
              </Route>
            </Route>

            <Route path="/" element={<RootRedirect />} />
            <Route path="/activities/:invoiceId" element={<PublicInvoicePage />} />
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
            <Route path="/exhibition" element={<ExhibitionPage />} />
            <Route path="/woofoo/menu" element={<FoodMenuPage />} />
            <Route path="/food-menu" element={<FoodMenuPage />} />
            <Route path="/menu" element={<FoodMenuPage />} />
            <Route path="/supplies/product/:id" element={<PublicProductPage />} />
            <Route path="/spaces" element={<SpacesMarketplacePage />} />
            <Route path="/spaces/exclusive" element={<SpacesMarketplacePage initialType="Exclusive" />} />
            <Route path="/spaces/coworking" element={<SpacesMarketplacePage initialType="Coworking" />} />
            <Route path="/spaces/space/:id" element={<PublicSpacePage />} />
            <Route path="/exclusive" element={<Navigate to="/spaces/exclusive" replace />} />
            <Route path="/coworking" element={<Navigate to="/spaces/coworking" replace />} />
            <Route path="/programs" element={<ProgramsPage />} />
            <Route path="/program" element={<OurProgramsPage />} />
            <Route path="/program/csp" element={<OurProgramsPage defaultTab="csp" />} />
            <Route path="/program/csp/" element={<OurProgramsPage defaultTab="csp" />} />
            <Route path="/program/cvp" element={<OurProgramsPage defaultTab="cvp" />} />
            <Route path="/program/cvp/" element={<OurProgramsPage defaultTab="cvp" />} />
            <Route path="/program/hap" element={<OurProgramsPage defaultTab="hap" />} />
            <Route path="/program/hap/" element={<OurProgramsPage defaultTab="hap" />} />
            <Route path="/ourprograms" element={<OurProgramsPage />} />
            <Route path="/ourprograms/:tab" element={<OurProgramsPage />} />
            <Route path="/program/:tab" element={<OurProgramsPage />} />
            <Route path="/programs/:tab" element={<OurProgramsPage />} />
            <Route path="*" element={<RootRedirect />} />
            

          </Routes>
          
          
        </AuthBootstrap>
        <Toaster richColors position="top-center" />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
