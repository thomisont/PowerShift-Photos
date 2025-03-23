import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <h1 className="text-6xl font-bold mb-8">
        PowerShift<span className="text-sm align-top">®</span> Photo App
      </h1>
      <p className="text-xl mb-8">
        Generate custom headshots with AI and manage your favorites
      </p>
      <div className="flex space-x-4">
        <Link
          href="/generate"
          className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg"
        >
          Generate Photos
        </Link>
        <Link
          href="/gallery"
          className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-primary-800 rounded-lg"
        >
          View Gallery
        </Link>
      </div>
    </div>
  )
} 