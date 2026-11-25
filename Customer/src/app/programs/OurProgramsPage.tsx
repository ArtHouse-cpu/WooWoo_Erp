import {useNavigate, useParams, useSearchParams} from 'react-router-dom';
import {ProgramsBottomSheet} from '../../components/dashboard/ProgramsBottomSheet';
import {useAuthStore} from '../../store/authStore';

const validTabs = new Set(['all', 'csp', 'hap', 'cvp']);

type OurProgramsPageProps = {
  defaultTab?: 'all' | 'csp' | 'hap' | 'cvp';
};

export default function OurProgramsPage({defaultTab}: OurProgramsPageProps) {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const {tab: routeTab} = useParams<{tab?: string}>();
  const [params] = useSearchParams();

  const rawTab = (defaultTab || routeTab || params.get('tab') || 'all').toLowerCase();
  const initialTab = validTabs.has(rawTab)
    ? (rawTab as 'all' | 'csp' | 'hap' | 'cvp')
    : 'all';

  const handleClose = () => {
    navigate(isAuthenticated ? '/home' : '/login');
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
