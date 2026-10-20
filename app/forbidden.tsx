import StatusPage, { PrimaryLink } from './components/StatusPage';
import { BackButton } from './components/StatusActions';

// Shown with a 403 status when a page calls forbidden()
export default function Forbidden() {
  return (
    <>
      <title>沒有存取權限 — SkyWell</title>
      <StatusPage
        kind="forbidden"
        code="403"
        title="沒有存取權限"
        description="您的帳號沒有查看這個頁面的權限。如需使用，請聯絡系統管理員為您開通。"
        actions={
          <>
            <PrimaryLink href="/">回首頁</PrimaryLink>
            <BackButton />
          </>
        }
      />
    </>
  );
}
