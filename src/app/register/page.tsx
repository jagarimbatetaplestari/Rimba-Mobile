'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login?mode=signup');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#040D08] flex items-center justify-center text-white/50 text-xs font-mono">
      Membuka pendaftaran suaka...
    </div>
  );
}
