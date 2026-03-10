'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function VerifyEmailPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'checking' | 'success' | 'error'>('checking');

  useEffect(() => {
    // In a real app, verify token from URL and mark email as verified
    // For now, just simulate success after 2 seconds
    const timer = setTimeout(() => {
      setStatus('success');
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="max-w-md w-full space-y-8 text-center">
      <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Verify your email</h2>
      {status === 'checking' && <p className="text-gray-600">Checking verification link...</p>}
      {status === 'success' && (
        <>
          <p className="text-green-600">Your email has been verified!</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Go to Dashboard
          </button>
        </>
      )}
      {status === 'error' && <p className="text-red-600">Invalid or expired verification link.</p>}
    </div>
  );
}