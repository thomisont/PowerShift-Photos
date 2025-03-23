import { useState, useEffect } from 'react';
import { ModelParameters, LoraModel } from '@/types/replicate';

interface ModelParameterControlsProps {
  selectedModelId: string | null;
  models: LoraModel[];
  parameters: Partial<ModelParameters>;
  onParametersChange: (params: Partial<ModelParameters>) => void;
}

export default function ModelParameterControls({
  selectedModelId,
  models,
  parameters,
  onParametersChange
}: ModelParameterControlsProps) {
  const [expanded, setExpanded] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedModel, setSelectedModel] = useState<LoraModel | null>(null);
  
  // Update selected model when the ID changes
  useEffect(() => {
    if (selectedModelId) {
      const model = models.find(m => m.id === selectedModelId) || null;
      setSelectedModel(model);
    } else {
      setSelectedModel(null);
    }
  }, [selectedModelId, models]);
  
  // Handle number parameter change
  const handleNumberChange = (param: string, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      onParametersChange({
        ...parameters,
        [param]: numValue
      });
    }
  };
  
  // Handle text parameter change
  const handleTextChange = (param: string, value: string) => {
    onParametersChange({
      ...parameters,
      [param]: value
    });
  };
  
  // Handle toggle parameter change
  const handleToggleChange = (param: string, checked: boolean) => {
    onParametersChange({
      ...parameters,
      [param]: checked
    });
  };
  
  if (!expanded) {
    return (
      <div className="mb-6">
        <div 
          className="flex items-center justify-between p-3 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50"
          onClick={() => setExpanded(true)}
        >
          <div>
            <span className="text-sm font-medium text-gray-700">Model Parameters</span>
            <span className="ml-2 text-xs text-gray-500">
              ({Object.keys(parameters).length} parameters configured)
            </span>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
    );
  }
  
  return (
    <div className="mb-6">
      <div className="border border-gray-300 rounded-md overflow-hidden">
        <div 
          className="flex items-center justify-between p-3 bg-gray-50 border-b cursor-pointer"
          onClick={() => setExpanded(false)}
        >
          <span className="text-sm font-medium text-gray-700">Model Parameters</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
        </div>
        
        <div className="p-4 space-y-4">
          {/* Main parameters section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Inference steps */}
            <div>
              <label htmlFor="num_inference_steps" className="block text-sm font-medium text-gray-700 mb-1">
                Inference Steps
              </label>
              <input
                type="number"
                id="num_inference_steps"
                value={parameters.num_inference_steps || 30}
                onChange={(e) => handleNumberChange('num_inference_steps', e.target.value)}
                min={1}
                max={100}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
              <p className="mt-1 text-xs text-gray-500">Higher values = more detail, but slower (20-50 recommended)</p>
            </div>
            
            {/* Guidance scale */}
            <div>
              <label htmlFor="guidance_scale" className="block text-sm font-medium text-gray-700 mb-1">
                Guidance Scale
              </label>
              <input
                type="number"
                id="guidance_scale"
                value={parameters.guidance_scale || 7.5}
                onChange={(e) => handleNumberChange('guidance_scale', e.target.value)}
                min={1}
                max={20}
                step={0.1}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
              <p className="mt-1 text-xs text-gray-500">How closely to follow prompt (7-9 recommended)</p>
            </div>
          </div>
          
          {/* Number of outputs and output format */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Number of outputs */}
            <div>
              <label htmlFor="num_outputs" className="block text-sm font-medium text-gray-700 mb-1">
                Number of Images
              </label>
              <select
                id="num_outputs"
                value={parameters.num_outputs || 1}
                onChange={(e) => handleNumberChange('num_outputs', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value={1}>1 image</option>
                <option value={2}>2 images</option>
                <option value={3}>3 images</option>
                <option value={4}>4 images</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">Generate multiple variations at once</p>
            </div>
            
            {/* Output format */}
            <div>
              <label htmlFor="output_format" className="block text-sm font-medium text-gray-700 mb-1">
                Output Format
              </label>
              <select
                id="output_format"
                value={parameters.output_format || "png"}
                onChange={(e) => handleTextChange('output_format', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="png">PNG (Lossless)</option>
                <option value="jpg">JPG (Smaller size)</option>
                <option value="webp">WebP (Balanced)</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">File format for downloaded images</p>
            </div>
          </div>
          
          {/* Aspect ratio and dimensions */}
          <div>
            <label htmlFor="aspect_ratio" className="block text-sm font-medium text-gray-700 mb-1">
              Aspect Ratio
            </label>
            <select
              id="aspect_ratio"
              value={parameters.aspect_ratio || "1:1"}
              onChange={(e) => handleTextChange('aspect_ratio', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="1:1">1:1 (Square)</option>
              <option value="3:4">3:4 (Portrait)</option>
              <option value="4:3">4:3 (Landscape)</option>
              <option value="16:9">16:9 (Widescreen)</option>
              <option value="9:16">9:16 (Mobile)</option>
              <option value="3:2">3:2</option>
              <option value="2:3">2:3</option>
              <option value="4:5">4:5</option>
              <option value="5:4">5:4</option>
              <option value="21:9">21:9 (Ultrawide)</option>
              <option value="9:21">9:21</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">Choose the aspect ratio for your generated image</p>
          </div>
          
          {/* Custom dimensions - visible only for custom aspect ratio */}
          {parameters.aspect_ratio === "custom" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="width" className="block text-sm font-medium text-gray-700 mb-1">
                  Width
                </label>
                <select
                  id="width"
                  value={parameters.width || 1024}
                  onChange={(e) => handleNumberChange('width', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value={512}>512px</option>
                  <option value={768}>768px</option>
                  <option value={1024}>1024px</option>
                  <option value={1280}>1280px</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="height" className="block text-sm font-medium text-gray-700 mb-1">
                  Height
                </label>
                <select
                  id="height"
                  value={parameters.height || 1024}
                  onChange={(e) => handleNumberChange('height', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value={512}>512px</option>
                  <option value={768}>768px</option>
                  <option value={1024}>1024px</option>
                  <option value={1280}>1280px</option>
                </select>
              </div>
            </div>
          )}
          
          {/* LoRA Parameters */}
          {selectedModel && (
            <div>
              <label htmlFor="lora_scale" className="block text-sm font-medium text-gray-700 mb-1">
                LoRA Strength
              </label>
              <input
                type="range"
                id="lora_scale"
                value={parameters.lora_scale || 0.8}
                onChange={(e) => handleNumberChange('lora_scale', e.target.value)}
                min={0.1}
                max={1.0}
                step={0.05}
                className="w-full"
              />
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Subtle ({parameters.lora_scale || 0.8})</span>
                <span className="text-xs text-gray-500">Strong</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">Adjust the strength of the LoRA effect</p>
            </div>
          )}
          
          {/* Negative prompt */}
          <div>
            <label htmlFor="negative_prompt" className="block text-sm font-medium text-gray-700 mb-1">
              Negative Prompt
            </label>
            <textarea
              id="negative_prompt"
              value={parameters.negative_prompt || "low quality, bad anatomy, blurry, disfigured, ugly"}
              onChange={(e) => handleTextChange('negative_prompt', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              placeholder="Things to avoid in the generated image"
            />
            <p className="mt-1 text-xs text-gray-500">Features you want to exclude from the image</p>
          </div>
          
          {/* Toggle for showing advanced settings */}
          <div className="pt-2 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-gray-600 hover:text-gray-900 flex items-center"
            >
              {showAdvanced ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              )}
              Advanced Settings
            </button>
          </div>
          
          {/* Advanced settings section */}
          {showAdvanced && (
            <div className="pt-2 space-y-4 border-t border-gray-200">
              {/* LoRA Model Variant */}
              <div>
                <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-1">
                  Model Variant
                </label>
                <select
                  id="model"
                  value={parameters.model || "dev"}
                  onChange={(e) => handleTextChange('model', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="dev">Standard (dev) - Higher quality</option>
                  <option value="schnell">Fast (schnell) - Quicker generation</option>
                </select>
              </div>
              
              {/* Seed */}
              <div>
                <label htmlFor="seed" className="block text-sm font-medium text-gray-700 mb-1">
                  Seed
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    id="seed"
                    value={parameters.seed || ''}
                    onChange={(e) => handleNumberChange('seed', e.target.value)}
                    placeholder="Random"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                  <button
                    type="button"
                    onClick={() => onParametersChange({...parameters, seed: Math.floor(Math.random() * 2147483647)})}
                    className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                    title="Generate random seed"
                  >
                    🎲
                  </button>
                  <button
                    type="button"
                    onClick={() => onParametersChange({...parameters, seed: null})}
                    className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                    title="Clear seed (use random each time)"
                  >
                    ✕
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">Set a specific seed for reproducible results (leave empty for random)</p>
              </div>
              
              {/* Scheduler */}
              <div>
                <label htmlFor="scheduler" className="block text-sm font-medium text-gray-700 mb-1">
                  Scheduler
                </label>
                <select
                  id="scheduler"
                  value={parameters.scheduler || "K_EULER"}
                  onChange={(e) => handleTextChange('scheduler', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="DDIM">DDIM</option>
                  <option value="K_EULER">K_EULER</option>
                  <option value="DPMSolverMultistep">DPMSolverMultistep</option>
                  <option value="K_EULER_ANCESTRAL">K_EULER_ANCESTRAL</option>
                  <option value="PNDM">PNDM</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">Algorithm used during the diffusion process</p>
              </div>
              
              {/* Megapixels */}
              <div>
                <label htmlFor="megapixels" className="block text-sm font-medium text-gray-700 mb-1">
                  Resolution
                </label>
                <select
                  id="megapixels"
                  value={parameters.megapixels || "1"}
                  onChange={(e) => handleTextChange('megapixels', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="1">1 MP (Standard)</option>
                  <option value="0.25">0.25 MP (Faster, lower quality)</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">Higher resolution gives better results but takes longer</p>
              </div>
              
              {/* Performance options */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="go_fast"
                    checked={parameters.go_fast || false}
                    onChange={(e) => handleToggleChange('go_fast', e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="go_fast" className="ml-2 block text-sm text-gray-700">
                    Go Fast Mode (quicker but lower quality)
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="disable_safety_checker"
                    checked={parameters.disable_safety_checker || false}
                    onChange={(e) => handleToggleChange('disable_safety_checker', e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="disable_safety_checker" className="ml-2 block text-sm text-gray-700">
                    Disable Safety Checker
                  </label>
                </div>
              </div>
            </div>
          )}
          
          {/* Save custom parameters button for specific LoRA */}
          {selectedModel && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/lora-models', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        lora_id: selectedModel.id,
                        custom_parameters: parameters
                      }),
                    });
                    
                    if (!response.ok) {
                      throw new Error('Failed to save parameters');
                    }
                    
                    alert('Custom parameters saved successfully');
                  } catch (error) {
                    console.error('Error saving parameters:', error);
                    alert('Failed to save parameters. Please try again.');
                  }
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md border border-gray-300 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Save as My Default Settings for {selectedModel.name}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 