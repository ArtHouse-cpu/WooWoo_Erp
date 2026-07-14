import {LegalDocumentPage} from '../../components/legal/LegalDocumentPage';
import markdown from '../../content/legal/community-guidelines.md?raw';

export default function CommunityGuidelinesPage() {
  return <LegalDocumentPage doc="community" markdown={markdown} />;
}
