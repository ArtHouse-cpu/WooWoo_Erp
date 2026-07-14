import {LegalDocumentPage} from '../../components/legal/LegalDocumentPage';
import markdown from '../../content/legal/services-terms.md?raw';

export default function ServicesTermsPage() {
  return <LegalDocumentPage doc="services" markdown={markdown} />;
}
