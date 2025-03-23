'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Image from 'next/image'
import { Image as ImageType } from '@/lib/supabase'

export default function GalleryPage() {
  const [images, setImages] = useState<(ImageType & { username?: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user, session } = useAuth()
  
  useEffect(() => {
    async function fetchPublicImages() {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch('/api/gallery')
        
        if (!response.ok) {
          throw new Error('Failed to fetch public images')
        }
        
        const data = await response.json()
        
        if (data.images) {
          setImages(data.images)
        }
      } catch (error) {
        console.error('Error fetching public images:', error)
        setError('Failed to load public gallery images. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    
    fetchPublicImages()
  }, [])
  
  const addToFavorites = async (imageId: string) => {
    if (!user) {
      return
    }
    
    if (!session?.access_token) {
      setError('Authentication error. Please try logging in again.')
      return
    }
    
    try {
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          imageId,
          authToken: session.access_token
        }),
      })
      
      if (!response.ok) {
        const data = await response.json()
        if (data.error === 'Image is already favorited') {
          alert('This image is already in your favorites!')
        } else {
          throw new Error('Failed to add to favorites')
        }
      } else {
        alert('Added to favorites!')
      }
    } catch (error) {
      console.error('Error adding to favorites:', error)
      setError('Failed to add to favorites. Please try again.')
    }
  }
  
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Public Gallery</h1>
      <p className="text-lg text-gray-600 mb-8">
        Browse the collection of publicly shared headshots created by the PowerShift® community.
      </p>
      
      {error && (
        <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : images.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg text-gray-600">
            No public images available yet. Be the first to share your creations!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {images.map((image) => (
            <div key={image.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="relative aspect-square">
                <Image
                  src={image.image_url}
                  alt={image.title || image.prompt || 'Generated image'}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  className="object-cover"
                  onError={(e) => {
                    // Replace broken images with a placeholder
                    const imgElement = e.currentTarget as HTMLImageElement;
                    imgElement.onerror = null; // Prevent infinite loops
                    imgElement.src = 'https://via.placeholder.com/400x400?text=Image+Not+Available';
                  }}
                />
              </div>
              
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-1 truncate">{image.title}</h3>
                
                <div className="text-sm text-gray-500 mb-2">
                  by {image.username || 'Unknown User'}
                </div>
                
                <p className="text-sm text-gray-700 mb-4 line-clamp-2">
                  {image.description || 'No description provided'}
                </p>
                
                <p className="text-xs text-gray-500 line-clamp-1 mb-3">
                  Prompt: {image.prompt}
                </p>
                
                <div className="flex justify-between items-center">
                  <a
                    href={image.image_url}
                    download="powershift-headshot.png"
                    className="px-3 py-1 text-xs bg-primary-100 text-primary-800 rounded-md hover:bg-primary-200"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Download
                  </a>
                  
                  {user && (
                    <button
                      onClick={() => addToFavorites(image.id)}
                      className="px-3 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200"
                    >
                      Add to Favorites
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 