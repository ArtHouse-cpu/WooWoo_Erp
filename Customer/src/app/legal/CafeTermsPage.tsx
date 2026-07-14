import {LegalDocumentPage} from '../../components/legal/LegalDocumentPage';
import markdown from '../../content/legal/cafe-terms.md?raw';

export default function CafeTermsPage() {
  return <LegalDocumentPage doc="cafe" markdown={markdown} />;
}
