import {LegalDocumentPage} from '../../components/legal/LegalDocumentPage';
import markdown from '../../content/legal/membership-terms.md?raw';

export default function MembershipTermsPage() {
  return <LegalDocumentPage doc="membership" markdown={markdown} />;
}
