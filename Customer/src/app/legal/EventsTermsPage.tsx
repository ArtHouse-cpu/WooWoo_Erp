import {LegalDocumentPage} from '../../components/legal/LegalDocumentPage';
import markdown from '../../content/legal/events-terms.md?raw';

export default function EventsTermsPage() {
  return <LegalDocumentPage doc="events" markdown={markdown} />;
}
