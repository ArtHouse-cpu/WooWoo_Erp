import {LegalDocumentPage} from '../../components/legal/LegalDocumentPage';
import markdown from '../../content/legal/return-refund-cancellation-terms.md?raw';

export default function RefundTermsPage() {
  return <LegalDocumentPage doc="returns" markdown={markdown} />;
}
