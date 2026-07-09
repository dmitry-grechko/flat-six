import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DEMO_MODE } from '@/lib/demo';
import {
  MANUAL_BUCKET,
  MANUAL_SIGNED_URL_TTL,
  getDocument,
} from '@/lib/documents';

export const dynamic = 'force-dynamic';

/**
 * Resolve a signed (or local) URL for a catalog document.
 *   GET /api/manual/url?doc=981-workshop-manual
 *   GET /api/manual/url          → defaults to workshop manual
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const docId = searchParams.get('doc') || '981-workshop-manual';
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

  const { data, error } = await supabase.storage
    .from(MANUAL_BUCKET)
    .createSignedUrl(doc.storagePath, MANUAL_SIGNED_URL_TTL);

  if (error || !data?.signedUrl) {
    if (doc.localUrl) {
      return NextResponse.json({
        url: doc.localUrl,
        source: 'local' as const,
        fallback: true,
        detail: error?.message,
        doc: { id: doc.id, title: doc.title },
      });
    }
    return NextResponse.json(
      { error: error?.message || 'Document not available in storage' },
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
