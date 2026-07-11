import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DEMO_MODE } from '@/lib/demo';
import {
  MANUAL_BUCKET,
  MANUAL_SIGNED_URL_TTL,
  getDocument,
} from '@/lib/documents';
import { userHasDocumentsAccess } from '@/lib/documents-access';

export const dynamic = 'force-dynamic';

/**
 * Resolve a signed (or local) URL for a catalog document.
 *   GET /api/manual/url?doc=981-workshop-manual-v1
 *   GET /api/manual/url          → defaults to workshop Vol 1
 * Requires profiles.documents_access (or demo mode).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const docId = searchParams.get('doc') || '981-workshop-manual-v1';
  const doc = getDocument(docId);
  if (!doc) {
    return NextResponse.json({ error: 'Unknown document' }, { status: 404 });
  }

  if (DEMO_MODE) {
    return NextResponse.json({
      url: doc.localUrl ?? null,
      source: 'local' as const,
      doc: { id: doc.id, title: doc.title },
    });
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const allowed = await userHasDocumentsAccess(supabase, user.id);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Document preview is not enabled for this account.' },
      { status: 403 },
    );
  }

  const { data, error } = await supabase.storage
    .from(MANUAL_BUCKET)
    .createSignedUrl(doc.storagePath, MANUAL_SIGNED_URL_TTL);

  if (error || !data?.signedUrl) {
    const host = req.headers.get('host') ?? '';
    const isLocalHost =
      host.startsWith('localhost') ||
      host.startsWith('127.0.0.1') ||
      host.endsWith('.local');

    if (isLocalHost && doc.localUrl) {
      return NextResponse.json({
        url: doc.localUrl,
        source: 'local' as const,
        fallback: true,
        detail: error?.message,
        doc: { id: doc.id, title: doc.title },
      });
    }
    return NextResponse.json(
      {
        error:
          error?.message === 'Object not found'
            ? `Not in Storage (${doc.storagePath}). Upload with: npm run docs:upload`
            : error?.message || 'Document not available in storage',
        storagePath: doc.storagePath,
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    url: data.signedUrl,
    source: 'storage' as const,
    expiresIn: MANUAL_SIGNED_URL_TTL,
    doc: { id: doc.id, title: doc.title },
  });
}
