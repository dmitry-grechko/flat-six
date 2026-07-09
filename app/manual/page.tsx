import { Suspense } from 'react';
import AppShell from '@/components/shell/AppShell';
import DocumentLibrary from '@/components/views/DocumentLibrary';

export default function ManualPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="padView" style={{ padding: 28, color: '#9A9AA0' }}>Loading documents…</div>}>
        <DocumentLibrary />
      </Suspense>
    </AppShell>
  );
}
