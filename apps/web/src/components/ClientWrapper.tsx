'use client';

import { useEffect, useState } from 'react';
import CursorEffect from '@/components/three/CursorEffect';
import LoadingScreen from '@/components/three/LoadingScreen';

export default function ClientWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Add smooth scrolling behavior
    document.documentElement.style.scrollBehavior = 'smooth';
    
    // Clean up
    return () => {
      document.documentElement.style.scrollBehavior = 'auto';
    };
  }, []);

  return (
    <>
      {isLoading && (
        <LoadingScreen onLoadComplete={() => setIsLoading(false)} />
      )}
      <CursorEffect />
      <div style={{ opacity: isLoading ? 0 : 1, transition: 'opacity 0.5s' }}>
        {children}
      </div>
    </>
  );
}