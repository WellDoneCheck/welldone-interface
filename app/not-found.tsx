import StatusPage, { PrimaryLink, SecondaryLink } from './components/StatusPage';
import { BackButton } from './components/StatusActions';

export default function NotFound() {
  return (
    <>
      <title>找不到頁面 — SkyWell</title>
      <StatusPage
        kind="not-found"
        code="404"
        title="這裡找不到水井"
        description="您要找的頁面不存在，或已經被移動。請確認網址是否正確，或從地圖重新找起。"
        actions={
          <>
            <PrimaryLink href="/map">前往地圖檢視 →</PrimaryLink>
            <SecondaryLink href="/">回首頁</SecondaryLink>
            <BackButton />
          </>
        }
      />
    </>
  );
}
