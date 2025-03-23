'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Image from 'next/image'
import { Image as ImageType } from '@/lib/supabase'

export default function FavoritesPage() {
  const [images, setImages] = useState<ImageType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user, session } = useAuth()
  const router = useRouter()
  const [selectedImage, setSelectedImage] = useState<ImageType | null>(null)
  
  useEffect(() => {
    // Redirect if not logged in
    if (!user) {
      router.push('/login')
      return
    }
    
    if (!session?.access_token) {
      console.error('No access token available')
      setError('Authentication error. Please try logging in again.')
      return
    }
    
    async function fetchImages() {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch('/api/images', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })
        
        if (!response.ok) {
          throw new Error('Failed to fetch images')
        }
        
        const data = await response.json()
        
        if (data.images) {
          setImages(data.images)
        }
      } catch (error) {
        console.error('Error fetching favorite images:', error)
        setError('Failed to load your favorite images. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    
    fetchImages()
  }, [user, router, session])
  
  const togglePublic = async (imageId: string, isCurrentlyPublic: boolean) => {
    if (!session?.access_token) {
      setError('Authentication error. Please try logging in again.')
      return
    }
    
    try {
      const response = await fetch(`/api/images/${imageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          is_public: !isCurrentlyPublic,
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to update image')
      }
      
      // Update the local state
      setImages(images.map(img => 
        img.id === imageId 
          ? { ...img, is_public: !isCurrentlyPublic } 
          : img
      ))
    } catch (error) {
      console.error('Error updating image:', error)
      setError('Failed to update image visibility. Please try again.')
    }
  }
  
  const deleteImage = async (imageId: string) => {
    if (!session?.access_token) {
      setError('Authentication error. Please try logging in again.')
      return
    }
    
    if (!confirm('Are you sure you want to delete this image?')) {
      return
    }
    
    try {
      const response = await fetch(`/api/images/${imageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete image')
      }
      
      // Update the local state
      setImages(images.filter(img => img.id !== imageId))
    } catch (error) {
      console.error('Error deleting image:', error)
      setError('Failed to delete image. Please try again.')
    }
  }
  
  const removeFavorite = async (imageId: string) => {
    if (!session?.access_token) {
      setError('Authentication error. Please try logging in again.')
      return
    }
    
    try {
      const response = await fetch(`/api/favorites?imageId=${imageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to remove from favorites')
      }
      
      // Update the local state
      setImages(images.filter(img => img.id !== imageId))
    } catch (error) {
      console.error('Error removing favorite:', error)
      setError('Failed to remove from favorites. Please try again.')
    }
  }
  
  const getFileExtension = (url: string, fallbackFormat: string = 'png'): string => {
    try {
      const urlExtension = url.split('?')[0].split('.').pop()?.toLowerCase();
      if (urlExtension && ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(urlExtension)) {
        return urlExtension;
      }
      // If no extension in URL, check if the URL contains format indicators
      if (url.includes('format=png')) return 'png';
      if (url.includes('format=jpg') || url.includes('format=jpeg')) return 'jpg';
      if (url.includes('format=webp')) return 'webp';
      return fallbackFormat;
    } catch (e) {
      return fallbackFormat;
    }
  };
  
  const openImageDetails = (image: ImageType) => {
    setSelectedImage(image);
  };
  
  const closeModal = () => {
    setSelectedImage(null);
  };
  
  const regenerateWithSameSettings = (image: ImageType) => {
    if (!session) {
      setError('Authentication error. Please try logging in again.');
      return;
    }
    
    const { prompt, model_parameters } = image;
    const queryParams = new URLSearchParams();
    
    // Add the prompt to the query parameters
    queryParams.append('prompt', prompt);
    
    // Add model ID if available
    if (model_parameters?.modelId) {
      queryParams.append('modelId', model_parameters.modelId);
    }
    
    // Navigate to generate page with parameters
    router.push(`/generate?${queryParams.toString()}`);
  };
  
  const editPrompt = (image: ImageType) => {
    if (!session) {
      setError('Authentication error. Please try logging in again.');
      return;
    }
    
    const { prompt } = image;
    const queryParams = new URLSearchParams();
    
    // Add the prompt to the query parameters
    queryParams.append('prompt', prompt);
    
    // Navigate to generate page with prompt parameter
    router.push(`/generate?${queryParams.toString()}`);
  };
  
  const ImageDetailsModal = ({ image, onClose }: { image: ImageType, onClose: () => void }) => {
    if (!image) return null;
    
    // Extract model information from parameters
    const modelInfo = typeof image.model_parameters === 'object' ? image.model_parameters : {};
    const modelName = modelInfo.model || 'Unknown model';
    const { width, height, aspect_ratio, guidance_scale, num_inference_steps, output_format } = modelInfo;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto relative">
          <button 
            onClick={onClose}
            className="absolute top-2 right-2 bg-gray-200 rounded-full p-2 hover:bg-gray-300 z-10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
            <div className="relative w-full h-[50vh] md:h-[70vh]">
              <Image
                src={image.image_url}
                alt={image.title || image.prompt}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-contain"
              />
            </div>
            
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold mb-2">{image.title}</h2>
                {image.description && (
                  <p className="text-gray-600 mb-4">{image.description}</p>
                )}
                
                <div className="flex flex-wrap gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => regenerateWithSameSettings(image)}
                    className="px-4 py-2 text-sm bg-purple-100 text-purple-800 rounded-md hover:bg-purple-200 font-medium"
                  >
                    Regenerate
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => editPrompt(image)}
                    className="px-4 py-2 text-sm bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 font-medium"
                  >
                    Edit Prompt
                  </button>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">Generation Details</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Prompt:</span> {image.prompt}</p>
                  <p><span className="font-medium">Created:</span> {new Date(image.created_at).toLocaleString()}</p>
                  <p><span className="font-medium">Model:</span> {modelName}</p>
                  <p><span className="font-medium">File Type:</span> {getFileExtension(image.image_url, (output_format as string) || 'png')}</p>
                  {aspect_ratio && (
                    <p><span className="font-medium">Dimensions:</span> {width}×{height} ({aspect_ratio})</p>
                  )}
                  {guidance_scale && (
                    <p><span className="font-medium">Guidance Scale:</span> {guidance_scale}</p>
                  )}
                  {num_inference_steps && (
                    <p><span className="font-medium">Inference Steps:</span> {num_inference_steps}</p>
                  )}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3 mt-6">
                <button
                  onClick={() => togglePublic(image.id, image.is_public)}
                  className={`px-4 py-2 text-sm rounded-md ${
                    image.is_public
                      ? 'bg-green-100 text-green-800 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  {image.is_public ? 'Make Private' : 'Make Public'}
                </button>
                
                <a
                  href={image.image_url}
                  download={`powershift-headshot.${getFileExtension(image.image_url, (output_format as string) || 'png')}`}
                  className="px-4 py-2 text-sm bg-primary-100 text-primary-800 rounded-md hover:bg-primary-200"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Download
                </a>
                
                <button
                  onClick={() => {
                    removeFavorite(image.id);
                    onClose();
                  }}
                  className="px-4 py-2 text-sm bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200"
                >
                  Unfavorite
                </button>
                
                {image.owner_id === user?.id && (
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this image?')) {
                        deleteImage(image.id);
                        onClose();
                      }
                    }}
                    className="px-4 py-2 text-sm bg-red-100 text-red-800 rounded-md hover:bg-red-200"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  if (!user) {
    return null // Will redirect in useEffect
  }
  
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">My Favorite Images</h1>
      
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
          <p className="text-lg text-gray-600 mb-4">
            You don't have any favorite images yet.
          </p>
          <button
            onClick={() => router.push('/generate')}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            Generate Some Images
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {images.map((image) => (
            <div 
              key={image.id} 
              className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02] hover:border-primary-300 hover:border"
              onClick={() => openImageDetails(image)}
            >
              <div className="relative pt-[75%]">
                <Image
                  src={image.image_url}
                  alt={image.title || image.prompt}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  className="object-contain"
                />
              </div>
              
              <div className="p-4">
                <h3 className="font-medium text-gray-900 mb-1 truncate">{image.title}</h3>
                
                {image.description && (
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                    {image.description}
                  </p>
                )}
                
                <p className="text-xs text-gray-500 line-clamp-1 mb-3">
                  Prompt: {image.prompt}
                </p>
                
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`px-3 py-1 text-xs rounded-md ${
                      image.is_public
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {image.is_public ? 'Public' : 'Private'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {selectedImage && (
        <ImageDetailsModal 
          image={selectedImage} 
          onClose={closeModal} 
        />
      )}
    </div>
  )
} 