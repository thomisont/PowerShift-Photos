import SignupForm from '@/components/auth/SignupForm'
import Link from 'next/link'

export default function SignupPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold mb-8 text-center">
          PowerShift<span className="text-sm align-top">®</span> Photo App
        </h1>
        
        <SignupForm />
        
        <div className="mt-4 text-center">
          <span className="text-gray-600">Already have an account? </span>
          <Link href="/login" className="text-primary-600 hover:text-primary-800 font-medium">
            Log in
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