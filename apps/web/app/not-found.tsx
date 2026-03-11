'use client';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow text-center">
        <h2 className="text-2xl font-bold mb-4">Page not found</h2>
        <p className="text-gray-600">The page you are looking for doesn't exist or has been moved.</p>
      </div>
    </div>
  );
}