import {useLocation, useNavigate, useParams, useSearchParams} from 'react-router-dom';
import {ProgramsBottomSheet} from '../../components/dashboard/ProgramsBottomSheet';
import {useAuthStore} from '../../store/authStore';
import {rememberReturnTo} from '../../utils/returnTo';

const validTabs = new Set(['all', 'csp', 'hap', 'cvp']);

type OurProgramsPageProps = {
  defaultTab?: 'all' | 'csp' | 'hap' | 'cvp';
};

export default function OurProgramsPage({defaultTab}: OurProgramsPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const {tab: routeTab} = useParams<{tab?: string}>();
  const [params] = useSearchParams();

  const rawTab = (defaultTab || routeTab || params.get('tab') || 'all').toLowerCase();
  const initialTab = validTabs.has(rawTab)
    ? (rawTab as 'all' | 'csp' | 'hap' | 'cvp')
    : 'all';

  const handleClose = () => {
    if (isAuthenticated) {
      navigate('/home');
      return;
    }
    const returnTo = `${location.pathname}${location.search}`;
    rememberReturnTo(returnTo);
    navigate('/login', {
      state: {returnTo, from: location},
    });
  };

  return (
    <ProgramsBottomSheet
      asPage
      isOpen
      initialTab={initialTab}
      onClose={handleClose}
    />
  );
}
