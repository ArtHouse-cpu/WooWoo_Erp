import {useNavigate, useSearchParams} from 'react-router-dom';
import {ProgramsBottomSheet} from '../../components/dashboard/ProgramsBottomSheet';

const tabs = new Set(['all', 'csp', 'hap', 'cvp']);

export default function OurProgramsPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const requested = params.get('tab') || 'all';
  const initialTab = tabs.has(requested) ? (requested as 'all' | 'csp' | 'hap' | 'cvp') : 'all';

  return (
    <ProgramsBottomSheet
      asPage
      isOpen
      initialTab={initialTab}
      onClose={() => navigate('/home')}
    />
  );
}
