'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

export default function Navbar() {
  const { user, signOut } = useAuth()
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  
  const handleSignOut = async () => {
    await signOut()
  }
  
  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="font-bold text-xl text-primary-800">
                PowerShift<span className="text-xs align-top">®</span>
              </Link>
            </div>
            
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  pathname === '/'
                    ? 'border-primary-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Home
              </Link>
              
              <Link
                href="/generate"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  pathname === '/generate'
                    ? 'border-primary-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Generate
              </Link>
              
              <Link
                href="/gallery"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  pathname === '/gallery'
                    ? 'border-primary-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Gallery
              </Link>
              
              {user && (
                <Link
                  href="/favorites"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    pathname === '/favorites'
                      ? 'border-primary-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  My Favorites
                </Link>
              )}
            </div>
          </div>
          
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {user ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">
                  {user.email}
                </span>
                <button
                  onClick={handleSignOut}
                  className="px-3 py-1 text-sm text-primary-600 border border-primary-600 rounded-md hover:bg-primary-50"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  href="/login"
                  className="px-3 py-1 text-sm text-primary-600 border border-primary-600 rounded-md hover:bg-primary-50"
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  className="px-3 py-1 text-sm text-white bg-primary-600 border border-primary-600 rounded-md hover:bg-primary-700"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
          
          <div className="flex items-center sm:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none"
            >
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            <Link
              href="/"
              className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                pathname === '/'
                  ? 'border-primary-500 text-primary-700 bg-primary-50'
                  : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'
              }`}
            >
              Home
            </Link>
            
            <Link
              href="/generate"
              className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                pathname === '/generate'
                  ? 'border-primary-500 text-primary-700 bg-primary-50'
                  : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'
              }`}
            >
              Generate
            </Link>
            
            <Link
              href="/gallery"
              className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                pathname === '/gallery'
                  ? 'border-primary-500 text-primary-700 bg-primary-50'
                  : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'
              }`}
            >
              Gallery
            </Link>
            
            {user && (
              <Link
                href="/favorites"
                className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                  pathname === '/favorites'
                    ? 'border-primary-500 text-primary-700 bg-primary-50'
                    : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'
                }`}
              >
                My Favorites
              </Link>
            )}
          </div>
          
          <div className="pt-4 pb-3 border-t border-gray-200">
            {user ? (
              <div className="space-y-3 px-4">
                <div className="text-base font-medium text-gray-800">{user.email}</div>
                <button
                  onClick={handleSignOut}
                  className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="space-y-3 px-4">
                <Link
                  href="/login"
                  className="block text-center w-full px-4 py-2 text-base font-medium text-primary-600 border border-primary-600 rounded-md hover:bg-primary-50"
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  className="block text-center w-full px-4 py-2 text-base font-medium text-white bg-primary-600 border border-primary-600 rounded-md hover:bg-primary-700"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
} 