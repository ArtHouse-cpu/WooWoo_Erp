import {LegalDocumentPage} from '../../components/legal/LegalDocumentPage';
import markdown from '../../content/legal/space-terms.md?raw';

export default function SpaceTermsPage() {
  return <LegalDocumentPage doc="space" markdown={markdown} />;
}
