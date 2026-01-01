/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import {AssetType, ProjectAsset} from '../types';
import {
  CheckCircle2Icon,
  PlusIcon,
  SparklesIcon,
  UploadCloudIcon,
  XMarkIcon,
  ClipboardDocumentIcon,
} from './icons';

interface AssetLibraryProps {
  assets: ProjectAsset[];
  onAddAsset: (asset: ProjectAsset) => void;
  onRemoveAsset: (id: string) => void;
  onUpdateAssetImage: (id: string, file: File) => void;
  onAnalyzeScript: () => void;
  isAnalyzing: boolean;
  hasScript: boolean;
}

const AssetLibrary: React.FC<AssetLibraryProps> = ({
  assets,
  onAddAsset,
  onRemoveAsset,
  onUpdateAssetImage,
  onAnalyzeScript,
  isAnalyzing,
  hasScript,
}) => {
  const [allCopied, setAllCopied] = useState(false);
  
  // State for manual entry
  const [addingAssetType, setAddingAssetType] = useState<AssetType | null>(null);
  const [newAssetName, setNewAssetName] = useState('');

  const handleImageUpload = async (
    id: string,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    onUpdateAssetImage(id, file);
  };

  const startAdding = (type: AssetType) => {
    setAddingAssetType(type);
    setNewAssetName('');
  };

  const cancelAdding = () => {
    setAddingAssetType(null);
    setNewAssetName('');
  };

  const confirmAdding = () => {
    if (newAssetName.trim() && addingAssetType) {
      onAddAsset({
        id: `manual-${Date.now()}`,
        name: newAssetName.trim(),
        description: 'Manually added asset',
        type: addingAssetType,
        image: null,
      });
      cancelAdding();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation(); 
      confirmAdding();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      cancelAdding();
    }
  };

  const handleCopyAllAssets = () => {
    if (assets.length === 0) return;
    
    const text = assets.map(a => 
      `[${a.type.toUpperCase()}]\nName: ${a.name}\nDescription: ${a.description}`
    ).join('\n\n');

    navigator.clipboard.writeText(text);
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 2000);
  };

  const sections: {type: AssetType, label: string}[] = [
    {type: 'character', label: 'Characters'},
    {type: 'location', label: 'Locations'},
    {type: 'prop', label: 'Props'},
    {type: 'style', label: 'Styles'},
  ];

  const isEmpty = assets.length === 0;

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-3xl p-8 backdrop-blur-md">
      <div className="flex flex-col mb-8 gap-4">
        <div className="flex justify-between items-start">
            <div>
            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                <SparklesIcon className="w-6 h-6 text-indigo-400" />
                Asset Library
            </h3>
            <p className="text-sm text-gray-500 mt-2 font-medium max-w-xl">
                The core visual registry. Upload images for entities to ensure visual lock across all generated shots.
            </p>
            </div>
            <button
                type="button"
                onClick={handleCopyAllAssets}
                disabled={assets.length === 0}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 text-gray-400 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2">
                {allCopied ? <CheckCircle2Icon className="w-4 h-4 text-green-400" /> : <ClipboardDocumentIcon className="w-4 h-4" />}
                Export Metadata
            </button>
        </div>

        {/* PRIMARY AUTO-DETECT BUTTON */}
        <button
            type="button"
            onClick={onAnalyzeScript}
            disabled={isAnalyzing || !hasScript}
            className={`w-full py-6 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all border-2 font-black uppercase tracking-[0.2em] italic ${
                isAnalyzing ? 'bg-indigo-900/20 border-indigo-500/50 text-indigo-400 cursor-not-allowed' :
                !hasScript ? 'bg-gray-800/30 border-gray-800 text-gray-600 cursor-not-allowed' :
                isEmpty ? 'bg-indigo-600 border-indigo-400 text-white shadow-2xl shadow-indigo-600/40 animate-pulse' :
                'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-indigo-500'
            }`}
        >
            {isAnalyzing ? (
                <>
                <div className="w-6 h-6 border-4 border-t-transparent border-white rounded-full animate-spin"></div>
                Analyzing Narrative Layers...
                </>
            ) : (
                <>
                <SparklesIcon className="w-6 h-6" />
                Auto-Detect Characters & Locations
                </>
            )}
        </button>
      </div>

      {sections.map((section) => {
        const sectionAssets = assets.filter((a) => a.type === section.type);
        const isAddingThisType = addingAssetType === section.type;

        return (
          <div key={section.type} className="mb-8 last:mb-0">
            <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-2">
              <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">
                {section.label}
              </h4>
              <button
                onClick={() => startAdding(section.type)}
                type="button"
                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-black uppercase tracking-widest flex items-center gap-2 bg-indigo-900/10 px-3 py-1 rounded-full border border-indigo-500/20">
                <PlusIcon className="w-3 h-3" /> Manual Add
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {isAddingThisType && (
                 <div className="bg-gray-800 rounded-2xl border border-indigo-500/50 p-4 flex flex-col justify-center gap-3 animate-in fade-in zoom-in-95 duration-200 shadow-xl">
                    <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Identify Entity:</p>
                    <input
                      autoFocus
                      type="text"
                      className="bg-black border border-gray-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 w-full"
                      placeholder="e.g., Detective Stone"
                      value={newAssetName}
                      onChange={(e) => setNewAssetName(e.target.value)}
                      onKeyDown={handleKeyDown}
                    />
                    <div className="flex gap-2 justify-end mt-1">
                      <button 
                        onClick={cancelAdding} 
                        type="button" 
                        className="text-[10px] font-black uppercase px-3 py-2 text-gray-500 hover:text-white">
                        Cancel
                      </button>
                      <button 
                        onClick={confirmAdding} 
                        type="button" 
                        className="text-[10px] font-black uppercase px-4 py-2 bg-indigo-600 text-white rounded-lg">
                        Lock
                      </button>
                    </div>
                 </div>
              )}

              {sectionAssets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  onRemove={() => onRemoveAsset(asset.id)}
                  onUpload={(e) => handleImageUpload(asset.id, e)}
                />
              ))}
              
              {sectionAssets.length === 0 && !isAddingThisType && (
                <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-800 rounded-3xl text-gray-700 text-[10px] font-black uppercase tracking-[0.5em] italic">
                  Registry empty
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const AssetCard: React.FC<{
  asset: ProjectAsset;
  onRemove: () => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({asset, onRemove, onUpload}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyDescription = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const textToCopy = `Name: ${asset.name}\nDescription: ${asset.description}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden flex flex-col transition-all hover:border-indigo-500/50 shadow-lg">
      <button
        onClick={onRemove}
        type="button"
        className="absolute top-2 right-2 z-10 bg-black/60 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <XMarkIcon className="w-3 h-3" />
      </button>

      <div className="aspect-square bg-black relative">
        {asset.image ? (
          <img
            src={`data:${asset.image.mimeType};base64,${asset.image.base64}`}
            alt={asset.name}
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
          />
        ) : (
          <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-900/10 transition-colors">
            <UploadCloudIcon className="w-10 h-10 text-gray-800 mb-2 group-hover:text-indigo-400 transition-colors" />
            <span className="text-[10px] font-black uppercase text-gray-600 tracking-widest">Map Face/Set</span>
            <input
              type="file"
              className="hidden"
              onChange={onUpload}
              accept="image/png, image/jpeg, image/webp"
            />
          </label>
        )}
      </div>

      <div className="p-4 flex-grow flex flex-col">
        <h5 className="text-sm font-black text-white italic uppercase tracking-tighter truncate" title={asset.name}>
          {asset.name}
        </h5>
        <div className="flex items-start justify-between gap-2 mt-2 flex-1">
            <p
            className="text-[10px] text-gray-500 leading-tight line-clamp-2"
            title={asset.description}>
            {asset.description}
            </p>
             <button
                type="button"
                onClick={handleCopyDescription}
                className="text-gray-700 hover:text-indigo-400 transition-colors flex-shrink-0"
                title="Copy Identity">
                {copied ? <CheckCircle2Icon className="w-3 h-3 text-green-400" /> : <ClipboardDocumentIcon className="w-3 h-3" />}
            </button>
        </div>
      </div>
      {asset.image && (
        <div className="absolute top-3 left-3 bg-indigo-600 shadow-xl rounded-full p-1">
            <CheckCircle2Icon className="w-4 h-4 text-white" />
        </div>
      )}
    </div>
  );
};

export default AssetLibrary;