import {LegalDocumentPage} from '../../components/legal/LegalDocumentPage';
import markdown from '../../content/legal/privacy-policy.md?raw';

export default function PrivacyPolicyPage() {
  return <LegalDocumentPage doc="privacy" markdown={markdown} />;
}
