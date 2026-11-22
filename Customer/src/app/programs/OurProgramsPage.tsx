import {useNavigate, useParams, useSearchParams} from 'react-router-dom';
import {ProgramsBottomSheet} from '../../components/dashboard/ProgramsBottomSheet';

const validTabs = new Set(['all', 'csp', 'hap', 'cvp']);

type OurProgramsPageProps = {
  defaultTab?: 'all' | 'csp' | 'hap' | 'cvp';
};

export default function OurProgramsPage({defaultTab}: OurProgramsPageProps) {
  const navigate = useNavigate();
  const {tab: routeTab} = useParams<{tab?: string}>();
  const [params] = useSearchParams();

  const rawTab = (defaultTab || routeTab || params.get('tab') || 'all').toLowerCase();
  const initialTab = validTabs.has(rawTab)
    ? (rawTab as 'all' | 'csp' | 'hap' | 'cvp')
    : 'all';

  const handleClose = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/home');
    }
  };

  return (
    <ProgramsBottomSheet
      asPage
      isOpen
      asPage
      initialTab={initialTab}
      onClose={handleClose}
    />
  );
}
