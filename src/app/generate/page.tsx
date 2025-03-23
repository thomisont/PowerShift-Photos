'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Image from 'next/image'
import LoraModelSelector from '@/components/LoraModelSelector'
import ModelParameterControls from '@/components/ModelParameterControls'
import { ModelParameters, LoraModel } from '@/types/replicate'

export default function GeneratePage() {
  const [prompt, setPrompt] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<string[]>([])
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [selectedForFavorites, setSelectedForFavorites] = useState<boolean[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedLoraId, setSelectedLoraId] = useState<string | null>(null)
  const [parameters, setParameters] = useState<Partial<ModelParameters>>({})
  const [loraModels, setLoraModels] = useState<LoraModel[]>([])
  const [lastUsedModelInfo, setLastUsedModelInfo] = useState<{
    modelId?: string;
    modelName?: string;
    parameters?: Partial<ModelParameters>;
  }>({})
  const [saveSuccess, setSaveSuccess] = useState<{
    show: boolean;
    count: number;
  }>({ show: false, count: 0 });
  const [isRegenerating, setIsRegenerating] = useState(false);
  const { user, session } = useAuth()
  const router = useRouter()
  
  // Ref for the prompt textarea
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Check for URL parameters
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlPrompt = urlParams.get('prompt');
      const urlModelId = urlParams.get('modelId');
      
      // Set prompt from URL if available
      if (urlPrompt) {
        setPrompt(urlPrompt);
      }
      
      // Set model ID from URL if available
      if (urlModelId) {
        setSelectedLoraId(urlModelId);
      }
    }
  }, []);
  
  // Fetch available LoRA models on component mount
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch('/api/lora-models');
        
        if (!response.ok) {
          console.error('Failed to fetch LoRA models');
          return;
        }
        
        const data = await response.json();
        
        if (data.models && Array.isArray(data.models)) {
          setLoraModels(data.models);
        }
      } catch (error) {
        console.error('Error fetching LoRA models:', error);
      }
    };
    
    // Only fetch if user is logged in
    if (user) {
      fetchModels();
    }
  }, [user]);
  
  // Redirect if not logged in
  useEffect(() => {
    if (user === null) {
      console.log('No user found, redirecting to login')
      router.push('/login')
    }
  }, [user, router])
  
  // Update parameters when LoRA model changes
  useEffect(() => {
    if (!selectedLoraId) {
      // Reset to default parameters when no LoRA is selected
      setParameters({
        num_inference_steps: 30,
        guidance_scale: 7.5,
        negative_prompt: "low quality, bad anatomy, blurry, disfigured, ugly",
        width: 1024,
        height: 1024,
        scheduler: "K_EULER"
      });
      return;
    }
    
    const model = loraModels.find(m => m.id === selectedLoraId);
    if (model) {
      // Apply model's default parameters and any user custom parameters if available
      const modelParams = {
        ...model.default_parameters,
        ...(model.custom_parameters || {})
      };
      
      setParameters(modelParams);
    }
  }, [selectedLoraId, loraModels]);
  
  // When new images are generated, initialize all as unselected for favorites
  useEffect(() => {
    if (generatedImages.length > 0) {
      if (generatedImages.length === 1) {
        // For single image, select it by default
        setSelectedForFavorites([true]);
      } else {
        // For multiple images, initialize all as unselected
        setSelectedForFavorites(new Array(generatedImages.length).fill(false));
      }
    } else {
      setSelectedForFavorites([]);
    }
  }, [generatedImages]);
  
  // Toggle selection for a specific image
  const toggleImageSelection = (index: number) => {
    setSelectedForFavorites(prev => {
      const newSelection = [...prev];
      newSelection[index] = !newSelection[index];
      return newSelection;
    });
  };
  
  // Get all selected image URLs
  const getSelectedImageUrls = () => {
    return generatedImages.filter((_, index) => selectedForFavorites[index]);
  };
  
  // Get count of selected images
  const selectedCount = selectedForFavorites.filter(Boolean).length;
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!prompt.trim()) {
      setError('Please enter a prompt')
      return
    }
    
    try {
      setIsGenerating(true)
      setError(null)
      
      // If a LoRA model is selected and has a trigger word, ensure it's in the prompt
      let finalPrompt = prompt;
      if (selectedLoraId) {
        const selectedModel = loraModels.find(m => m.id === selectedLoraId);
        if (selectedModel?.trigger_word && !prompt.includes(selectedModel.trigger_word)) {
          // Add the trigger word to the beginning of the prompt
          finalPrompt = `${selectedModel.trigger_word}, ${prompt}`;
          console.log(`Added trigger word "${selectedModel.trigger_word}" to prompt`);
        }
      }
      
      console.log('Generating image with prompt:', finalPrompt);
      console.log('Using LoRA model ID:', selectedLoraId || 'Default SDXL');
      
      // Include the selected LoRA model ID and parameters in the request
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: finalPrompt,
          loraId: selectedLoraId,
          parameters 
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        const errorMessage = data.error || 'Failed to generate image';
        console.error('Generation error:', errorMessage);
        throw new Error(errorMessage);
      }
      
      if (data.imageUrls && Array.isArray(data.imageUrls) && data.imageUrls.length > 0) {
        // Handle multiple images
        setGeneratedImages(data.imageUrls);
        setSelectedImageIndex(0);
        
        // Store info about the model used
        setLastUsedModelInfo({
          modelId: data.modelId,
          modelName: data.modelName || 'Standard SDXL Model',
          parameters: data.parameters
        });
      } else if (data.imageUrl) {
        // Handle single image (backward compatibility)
        setGeneratedImages([data.imageUrl]);
        setSelectedImageIndex(0);
        
        // Store info about the model used
        setLastUsedModelInfo({
          modelId: data.modelId,
          modelName: data.modelName || 'Standard SDXL Model',
          parameters: data.parameters
        });
      } else {
        throw new Error('No images were generated')
      }
    } catch (error) {
      console.error('Error generating image:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError('An error occurred while generating the image: ' + errorMessage);
    } finally {
      setIsGenerating(false)
    }
  }
  
  // Function to handle image regeneration without hiding the UI
  const handleRegenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt')
      return
    }
    
    try {
      // Store current settings for debugging
      const currentSettings = {
        loraId: selectedLoraId,
        params: JSON.parse(JSON.stringify(parameters))
      };
      console.log('Settings before regeneration:', currentSettings);
      
      // Hide success message when regenerating
      setSaveSuccess({ show: false, count: 0 });
      
      // Verify settings weren't changed
      console.log('Settings immediately after hiding success:', {
        loraId: selectedLoraId,
        params: parameters
      });
      
      setIsRegenerating(true)
      setError(null)
      
      // Don't clear current images until we have new ones
      // Log current settings for debugging
      console.log('Regenerating with current settings:');
      console.log('- Prompt:', prompt);
      console.log('- LoRA Model ID:', selectedLoraId);
      console.log('- Parameters:', JSON.stringify(parameters, null, 2));
      
      // If a LoRA model is selected and has a trigger word, ensure it's in the prompt
      let finalPrompt = prompt;
      if (selectedLoraId) {
        const selectedModel = loraModels.find(m => m.id === selectedLoraId);
        if (selectedModel?.trigger_word && !prompt.includes(selectedModel.trigger_word)) {
          // Add the trigger word to the beginning of the prompt
          finalPrompt = `${selectedModel.trigger_word}, ${prompt}`;
          console.log(`Added trigger word "${selectedModel.trigger_word}" to prompt`);
        }
      }
      
      // Use the stored settings to ensure they haven't been modified
      const loraIdToUse = selectedLoraId || currentSettings.loraId;
      const parametersToUse = parameters || currentSettings.params;
      
      console.log('Regenerating image with prompt:', finalPrompt);
      console.log('Using LoRA model ID:', loraIdToUse || 'Default SDXL');
      console.log('Using parameters:', JSON.stringify(parametersToUse, null, 2));
      
      // Create a copy of parameters to ensure we're not getting reference issues
      const parametersCopy = JSON.parse(JSON.stringify(parametersToUse));
      
      // Include the selected LoRA model ID and parameters in the request
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: finalPrompt,
          loraId: loraIdToUse,
          parameters: parametersCopy 
        }),
      })
      
      // Log the response status
      console.log('Regenerate API response status:', response.status);
      
      const data = await response.json()
      
      // Log the response data for debugging
      console.log('Regenerate API response data:', data);
      
      if (!response.ok) {
        const errorMessage = data.error || 'Failed to generate image';
        console.error('Generation error:', errorMessage);
        throw new Error(errorMessage);
      }
      
      // Log the received parameters
      console.log('Received parameters from API:', data.parameters);
      
      // Only update images after we've successfully generated new ones
      if (data.imageUrls && Array.isArray(data.imageUrls) && data.imageUrls.length > 0) {
        // Handle multiple images
        setGeneratedImages(data.imageUrls);
        setSelectedImageIndex(0);
        
        // Store info about the model used
        setLastUsedModelInfo({
          modelId: data.modelId,
          modelName: data.modelName || 'Standard SDXL Model',
          parameters: data.parameters
        });
      } else if (data.imageUrl) {
        // Handle single image (backward compatibility)
        setGeneratedImages([data.imageUrl]);
        setSelectedImageIndex(0);
        
        // Store info about the model used
        setLastUsedModelInfo({
          modelId: data.modelId,
          modelName: data.modelName || 'Standard SDXL Model',
          parameters: data.parameters
        });
      } else {
        throw new Error('No images were generated')
      }
    } catch (error) {
      console.error('Error generating image:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError('An error occurred while generating the image: ' + errorMessage);
    } finally {
      setIsRegenerating(false)
    }
  }
  
  const handleImageSelect = (index: number) => {
    setSelectedImageIndex(index);
  }
  
  const currentImageUrl = generatedImages.length > 0 ? generatedImages[selectedImageIndex] : null;
  
  const handleSave = async () => {
    if (!user) {
      console.log('No user found, redirecting to login')
      router.push('/login')
      return
    }
    
    const selectedImages = getSelectedImageUrls();
    if (selectedImages.length === 0) {
      setError('No images selected to save')
      return
    }
    
    try {
      setIsSaving(true)
      setError(null)
      
      // Get the current session token
      const authToken = session?.access_token
      
      if (!authToken) {
        throw new Error('Authentication token not available')
      }
      
      // Model parameters - combine LoRA info and parameters used
      const modelParams = {
        ...(lastUsedModelInfo.parameters || {}),
        model: lastUsedModelInfo.modelName || 'Standard SDXL Model',
        modelId: lastUsedModelInfo.modelId,
        timestamp: Date.now() // Add timestamp to prevent caching issues
      }
      
      console.log(`Saving ${selectedImages.length} images with params:`, modelParams)
      
      // Save each selected image
      const savePromises = selectedImages.map(imageUrl => 
        fetch('/api/images', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageUrl,
            prompt,
            title: title || 'Generated Headshot',
            description: description || '',
            isPublic: false,
            modelParameters: modelParams,
            authToken // Include the auth token in the request body
          })
        })
      );
      
      const responses = await Promise.all(savePromises);
      
      // Check if any save operations failed
      const failedSaves = responses.filter(response => !response.ok);
      
      if (failedSaves.length > 0) {
        throw new Error(`Failed to save ${failedSaves.length} out of ${selectedImages.length} images`);
      }
      
      // Success message instead of immediate redirect
      setError(null);
      setSaveSuccess({
        show: true,
        count: selectedImages.length
      });
      
      // Reset selected images
      setSelectedForFavorites(new Array(generatedImages.length).fill(false));
    } catch (error: any) {
      console.error('Error saving images:', error)
      // Display the actual error message from the API if available
      setError(error?.message || 'An error occurred while saving the images. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }
  
  const handleContinueGenerating = () => {
    setSaveSuccess({ show: false, count: 0 });
  };

  const handleViewFavorites = () => {
    router.push('/favorites');
  };
  
  // Function to get file extension from URL or fall back to output_format
  const getFileExtension = (url: string, fallbackFormat: string = 'png'): string => {
    try {
      // Extract file extension from URL
      const urlExtension = url.split('?')[0].split('.').pop()?.toLowerCase();
      
      // If we got a valid extension, return it
      if (urlExtension && ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(urlExtension)) {
        return urlExtension;
      }
      
      // Otherwise return the fallback
      return fallbackFormat;
    } catch (e) {
      // If any error occurs, return the fallback
      return fallbackFormat;
    }
  };
  
  const handleEditPrompt = () => {
    // Scroll to prompt textarea and focus it
    if (promptTextareaRef.current) {
      promptTextareaRef.current.scrollIntoView({ behavior: 'smooth' });
      promptTextareaRef.current.focus();
    }
  };
  
  // If redirecting to login, show minimal content
  if (!user) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Generate a Professional Headshot</h1>
      
      <div data-error-container>
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
            <p className="font-medium">Error:</p>
            <p>{error}</p>
            {error.includes('LoRA') && (
              <div className="mt-2">
                <button
                  onClick={() => setSelectedLoraId(null)}
                  className="text-sm bg-red-200 hover:bg-red-300 text-red-800 py-1 px-3 rounded"
                >
                  Switch to Standard SDXL
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="mb-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-1">
              Describe your desired headshot
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              ref={promptTextareaRef}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              placeholder="e.g., Professional headshot, business attire, neutral background, smiling"
            />
          </div>
          
          {/* LoRA Model Selector */}
          <LoraModelSelector 
            selectedModelId={selectedLoraId}
            onSelectModel={setSelectedLoraId}
          />
          
          {/* Model Parameter Controls */}
          <ModelParameterControls
            selectedModelId={selectedLoraId}
            models={loraModels}
            parameters={parameters}
            onParametersChange={setParameters}
          />
          
          <button
            type="submit"
            disabled={isGenerating}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isGenerating ? 'Generating...' : 'Generate Headshot'}
          </button>
        </form>
      </div>
      
      {isGenerating && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      )}
      
      {currentImageUrl && !isGenerating && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Your Generated Headshot</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="relative w-full max-w-md mx-auto" style={{ minHeight: "300px" }}>
                {isRegenerating ? (
                  <>
                    <Image
                      src={currentImageUrl}
                      alt="Generated headshot"
                      fill
                      sizes="(max-width: 768px) 100vw, 400px"
                      className="rounded-lg object-contain opacity-30"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                    </div>
                  </>
                ) : (
                  <>
                    <Image
                      src={currentImageUrl}
                      alt="Generated headshot"
                      fill
                      sizes="(max-width: 768px) 100vw, 400px"
                      className="rounded-lg object-contain"
                    />
                    {/* Favorite indicator for single image */}
                    {generatedImages.length === 1 && !isRegenerating && (
                      <div 
                        className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer shadow-sm transition-all hover:scale-110 ${
                          selectedForFavorites[0] 
                            ? 'bg-primary-500 text-white hover:bg-primary-600' 
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-500'
                        }`}
                        onClick={() => toggleImageSelection(0)}
                        title={selectedForFavorites[0] ? "Unselect" : "Select for saving"}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                          <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                        </svg>
                      </div>
                    )}
                  </>
                )}
                {lastUsedModelInfo.modelName && (
                  <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-xs">
                    Generated with: {lastUsedModelInfo.modelName}
                  </div>
                )}
              </div>
              
              {/* Thumbnails for multiple images */}
              {generatedImages.length > 1 && (
                <div className={`space-y-2 ${isRegenerating ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Select images to save:</span>
                    <button
                      type="button"
                      onClick={() => {
                        // If all selected, deselect all; otherwise select all
                        const allSelected = selectedForFavorites.every(Boolean);
                        setSelectedForFavorites(new Array(generatedImages.length).fill(!allSelected));
                      }}
                      className="text-xs py-1 px-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded"
                    >
                      {selectedForFavorites.every(Boolean) ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 justify-center">
                    {generatedImages.map((imageUrl, index) => (
                      <div key={index} className="relative">
                        <div 
                          className={`relative w-20 h-20 cursor-pointer border-2 rounded-md overflow-hidden ${index === selectedImageIndex ? 'border-primary-500' : 'border-transparent'}`}
                          onClick={() => handleImageSelect(index)}
                        >
                          <Image
                            src={imageUrl}
                            alt={`Variation ${index + 1}`}
                            fill
                            sizes="80px"
                            className="object-contain"
                          />
                        </div>
                        
                        {/* Favorite selection checkbox */}
                        <div 
                          className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer shadow-sm transition-all hover:scale-110 ${
                            selectedForFavorites[index] 
                              ? 'bg-primary-500 text-white hover:bg-primary-600' 
                              : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-500'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent triggering the parent onClick
                            toggleImageSelection(index);
                          }}
                          title={selectedForFavorites[index] ? "Unselect" : "Select for saving"}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                            <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                          </svg>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Title (optional)
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Give your image a title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Add a description to your image"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              
              {/* Success message placement near save controls - streamlined version */}
              {saveSuccess.show && (
                <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-md">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Saved to Favorites!</p>
                      <p className="text-sm">{saveSuccess.count > 1 ? `${saveSuccess.count} images saved` : 'Image saved'}</p>
                    </div>
                    <button
                      onClick={handleViewFavorites}
                      className="px-3 py-1.5 bg-green-200 hover:bg-green-300 text-green-800 rounded"
                    >
                      View in Favorites
                    </button>
                  </div>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                  onClick={handleSave}
                  disabled={isSaving || selectedCount === 0}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {isSaving 
                    ? 'Saving...' 
                    : generatedImages.length === 1
                      ? selectedForFavorites[0] 
                          ? 'Save to Favorites' 
                          : 'Select to Save'
                      : selectedCount > 1 
                          ? `Save ${selectedCount} to Favorites` 
                          : selectedCount === 0
                            ? 'Select Images to Save'
                            : 'Save to Favorites'}
                </button>
                
                <a
                  href={currentImageUrl}
                  download={`powershift-headshot.${currentImageUrl ? getFileExtension(currentImageUrl, parameters.output_format as string || 'png') : 'png'}`}
                  className="px-4 py-2 border border-primary-600 text-primary-600 rounded-md hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 text-center"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Download
                </a>
                
                <button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={isRegenerating}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {isRegenerating ? 'Generating...' : 'Regenerate'}
                </button>
                
                <button
                  type="button"
                  onClick={handleEditPrompt}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Edit Prompt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 