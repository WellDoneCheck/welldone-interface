import StatusPage, { SecondaryLink } from './components/StatusPage';
import { LoginButton } from './components/StatusActions';

// Shown with a 401 status when a page calls unauthorized()
export default function Unauthorized() {
  return (
    <>
      <title>需要登入 — SkyWell</title>
      <StatusPage
        kind="unauthorized"
        code="401"
        title="請先登入"
        description="這個頁面需要登入後才能查看。登入後即可繼續使用水井辨識、驗證與資料匯出等功能。"
        actions={
          <>
            <LoginButton />
            <SecondaryLink href="/">回首頁</SecondaryLink>
          </>
        }
      />
    </>
  );
}
