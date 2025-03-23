import { useState, useEffect } from 'react';
import { LoraModel } from '@/types/replicate';

interface LoraModelSelectorProps {
  selectedModelId: string | null;
  onSelectModel: (modelId: string | null) => void;
}

export default function LoraModelSelector({ selectedModelId, onSelectModel }: LoraModelSelectorProps) {
  const [models, setModels] = useState<LoraModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Fetch available LoRA models on component mount or when retrying
  useEffect(() => {
    const fetchModels = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Fetching LoRA models, attempt:', retryCount + 1);
        const response = await fetch('/api/lora-models');
        
        // Even if status is not ok, we'll try to parse the response
        // as our updated API will return models: [] instead of failing
        const data = await response.json();
        
        if (data.models && Array.isArray(data.models)) {
          setModels(data.models);
          if (data.models.length === 0 && data.message === "No active session") {
            // This is expected if there's no session yet, don't show as error
            console.log('No active session found, models will load after login');
          }
        } else if (!response.ok) {
          // Only treat as error if response is not OK and models aren't available
          throw new Error(data.error || 'Failed to fetch LoRA models');
        }
      } catch (error) {
        console.error('Error fetching LoRA models:', error);
        setError('Failed to load LoRA models. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchModels();
  }, [retryCount]);

  // Handle model selection
  const handleSelectModel = (modelId: string | null) => {
    onSelectModel(modelId);
  };

  const handleRetry = () => {
    setRetryCount(prevCount => prevCount + 1);
  };
  
  // Lightbulb icon for trigger word tip
  const LightbulbIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
      <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
    </svg>
  );

  // Render trigger word tip if available
  const renderTriggerWordTip = (model: LoraModel) => {
    if (!model.trigger_word) return null;
    
    return (
      <div className="mt-2 flex items-center bg-yellow-50 p-2 rounded-md border border-yellow-200">
        <LightbulbIcon />
        <p className="ml-2 text-xs text-yellow-700">
          The trigger word for this model is <span className="font-bold">{model.trigger_word}</span>. 
          Be sure to include it in your prompt.
        </p>
      </div>
    );
  };

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        LoRA Model Selection
      </label>
      
      {loading ? (
        <div className="h-12 flex items-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600 mr-2"></div>
          <span className="text-sm text-gray-500">Loading available models...</span>
        </div>
      ) : error ? (
        <div className="text-red-500 text-sm p-4 bg-red-50 rounded border border-red-200">
          <p>{error}</p>
          <button 
            onClick={handleRetry}
            className="mt-2 text-xs bg-red-100 hover:bg-red-200 text-red-700 py-1 px-2 rounded"
          >
            Retry Loading Models
          </button>
        </div>
      ) : models.length === 0 ? (
        <div className="text-gray-500 text-sm p-4 bg-gray-50 rounded border border-gray-200">
          <p>No custom LoRA models available. Using standard SDXL model.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div 
            className={`flex items-center rounded-md border p-3 cursor-pointer ${selectedModelId === null ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-300'}`}
            onClick={() => handleSelectModel(null)}
          >
            <div className="flex-1">
              <div className="font-medium">Standard SDXL Model</div>
              <div className="text-sm text-gray-500">Default stable diffusion model without fine-tuning</div>
            </div>
            <div className="ml-3">
              {selectedModelId === null && (
                <div className="bg-primary-500 rounded-full p-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {models.map((model) => (
            <div 
              key={model.id}
              className={`rounded-md border overflow-hidden ${selectedModelId === model.id ? 'border-primary-500' : 'border-gray-300 hover:border-primary-300'}`}
            >
              <div 
                className={`flex items-center p-3 cursor-pointer ${selectedModelId === model.id ? 'bg-primary-50' : ''}`}
                onClick={() => handleSelectModel(model.id)}
              >
                <div className="flex-1">
                  <div className="font-medium">{model.name}</div>
                  <div className="text-sm text-gray-500">{model.description || `Version: ${model.version}`}</div>
                  <div className="text-xs text-gray-400 mt-1">By {model.owner}</div>
                </div>
                <div className="ml-3">
                  {selectedModelId === model.id && (
                    <div className="bg-primary-500 rounded-full p-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Show trigger word tip when this model is selected or if it's the only model */}
              {selectedModelId === model.id || models.length === 1 ? (
                <div className="mt-2 flex items-center bg-yellow-50 p-2 rounded-md border border-yellow-200">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
                  </svg>
                  <p className="ml-2 text-xs text-yellow-700">
                    The trigger word for this model is <span className="font-bold">{model.trigger_word}</span>. 
                    Be sure to include it in your prompt.
                  </p>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 