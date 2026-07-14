import {LegalDocumentPage} from '../../components/legal/LegalDocumentPage';
import markdown from '../../content/legal/terms-of-use.md?raw';

export default function TermsOfUsePage() {
  return <LegalDocumentPage doc="terms" markdown={markdown} />;
}
