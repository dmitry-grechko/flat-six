'use client';

import dynamic from 'next/dynamic';
import { forwardRef, useImperativeHandle, useRef } from 'react';
import type { UnifiedSceneProps } from './UnifiedSceneClient';

export type UnifiedViewerHandle = { reset: () => void };
export type UnifiedViewerProps = Omit<UnifiedSceneProps, 'handleRef'>;

const UnifiedScene = dynamic(() => import('./UnifiedSceneClient'), { ssr: false });

const UnifiedViewer = forwardRef<UnifiedViewerHandle, UnifiedViewerProps>(function UnifiedViewer(props, ref) {
  const handleRef = useRef<UnifiedViewerHandle | null>(null);
  useImperativeHandle(ref, () => ({
    reset: () => handleRef.current?.reset(),
  }));
  return <UnifiedScene {...props} handleRef={handleRef} />;
});

export default UnifiedViewer;
