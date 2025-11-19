import Link from 'next/link';

export function Header() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              From Fed to Chain
            </h1>
            <p className="text-sm text-gray-600">Content Review System</p>
          </div>
          <nav className="flex gap-4">
            <Link
              href="/review"
              className="text-sm font-medium text-gray-800 hover:text-blue-600 transition-colors"
            >
              Review Queue
            </Link>
            <Link
              href="/review/history"
              className="text-sm font-medium text-gray-800 hover:text-blue-600 transition-colors"
            >
              History
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
