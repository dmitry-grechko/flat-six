import AppShell from '@/components/shell/AppShell';
import Downloads from '@/components/views/Downloads';
import { buildDownloadsCatalog } from '@/lib/downloads';
import { getLatestDesktopAssets } from '@/lib/github-release';

export const revalidate = 300;

export default async function DownloadsPage() {
  const assets = await getLatestDesktopAssets();
  const items = buildDownloadsCatalog(assets);

  return (
    <AppShell>
      <Downloads items={items} />
    </AppShell>
  );
}
