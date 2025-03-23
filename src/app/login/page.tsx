import LoginForm from '@/components/auth/LoginForm'
import Link from 'next/link'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold mb-8 text-center">
          PowerShift<span className="text-sm align-top">®</span> Photo App
        </h1>
        
        <LoginForm />
        
        <div className="mt-4 text-center">
          <span className="text-gray-600">Don't have an account? </span>
          <Link href="/signup" className="text-primary-600 hover:text-primary-800 font-medium">
            Sign up
          </Link>
        </div>
        
        <div className="mt-8 text-center">
          <Link href="/" className="text-gray-500 hover:text-gray-700">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  )
} 