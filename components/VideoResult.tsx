
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * @meta {"generator": "VEOPromptGenerator", "version": "0.2.0"}
*/
import React, {useEffect, useState, useRef} from 'react';
import {
  ApiCallSummary,
  IngredientImage,
  LogEntry,
  ProjectAsset,
  ScenePlan,
  Shot,
  ShotBook,
  ShotStatus,
  VeoShotWrapper,
  VeoStatus,
} from '../types';
import ActivityLog from './ActivityLog';
import {
  ArrowPathIcon,
  CheckCircle2Icon,
  ClipboardDocumentIcon,
  ClockIcon,
  FileArchiveIcon,
  FilePenLineIcon,
  FilmIcon,
  SaveIcon,
  SparklesIcon,
  XMarkIcon,
  RectangleStackIcon,
  InfoIcon,
  StopCircleIcon,
  ClapperboardIcon,
  MessageSquarePlusIcon,
  TerminalIcon,
  VideoIcon,
  SettingsIcon,
  FastForwardIcon,
  ImagePlusIcon,
  LinkIcon,
  KeyIcon,
  UploadCloudIcon,
  PlusIcon,
} from './icons';

interface ShotCardProps {
  shot: Shot;
  onUpdateShot: (shot: Shot) => void;
  onGenerateSpecificKeyframe: (shotId: string) => void; 
  onRefineShot: (shotId: string, feedback: string) => void; 
  allAssets: ProjectAsset[];
  onToggleAssetForShot: (shotId: string, assetId: string) => void;
  onGenerateVideo: (shotId: string, useKeyframe: boolean) => void;
  onExtendVeoVideo: (originalShotId: string, prompt: string) => void; 
  onUploadAdHocAsset: (shotId: string, file: File) => void; 
  onRemoveAdHocAsset: (shotId: string, index: number) => void;
  onApproveShot: (shotId: string, approved: boolean) => void;
  isProcessing: boolean;
}

const ShotCard: React.FC<ShotCardProps> = ({
  shot, onUpdateShot, onGenerateSpecificKeyframe, onRefineShot, allAssets, onToggleAssetForShot, onGenerateVideo, onExtendVeoVideo, onUploadAdHocAsset, onRemoveAdHocAsset, onApproveShot, isProcessing
}) => {
  const [editedJson, setEditedJson] = useState('');
  const [referenceUrl, setReferenceUrl] = useState(shot.veoReferenceUrl || '');
  const [useKeyframeAsReference, setUseKeyframeAsReference] = useState(shot.veoUseKeyframeAsReference ?? true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isExtensionSegment = shot.veoJson?.unit_type === 'extend';

  useEffect(() => {
    setEditedJson(shot.veoJson ? JSON.stringify(shot.veoJson, null, 2) : '');
  }, [shot.veoJson]);

  const renderImagePlaceholder = () => {
    if (isExtensionSegment && !shot.keyframePromptText && !shot.keyframeImage) {
        return <div className="flex flex-col items-center text-indigo-400"><FastForwardIcon className="w-12 h-12 mb-2" /><span className="text-sm font-semibold">Extension Segment</span></div>;
    }
    if (shot.status === ShotStatus.GENERATING_IMAGE || shot.status === ShotStatus.GENERATING_JSON) return <div className="flex flex-col items-center text-gray-400"><FilmIcon className="w-12 h-12 mb-2 animate-pulse" /><span className="text-sm">Processing...</span></div>;
    return (
        <button 
            onClick={() => onGenerateSpecificKeyframe(shot.id)}
            disabled={isProcessing}
            className="flex flex-col items-center text-indigo-500 hover:text-indigo-400 transition-colors"
        >
            <ImagePlusIcon className="w-12 h-12 mb-2" />
            <span className="text-xs font-black uppercase tracking-widest">Gen Still</span>
        </button>
    );
  };

  return (
    <div className={`rounded-xl p-4 md:p-6 border transition-all ${shot.isApproved ? 'bg-indigo-900/10 border-indigo-500/40 shadow-xl' : 'bg-gray-800/50 border-gray-700'}`}>
      <div className="flex flex-col md:flex-row items-start gap-4 md:gap-6">
        <div className="w-full md:w-1/3">
          <div className="aspect-video bg-black rounded-lg overflow-hidden border border-gray-700 mb-3 flex items-center justify-center relative group">
            {shot.veoStatus === VeoStatus.COMPLETED && shot.veoVideoUrl ? (
                <video src={shot.veoVideoUrl} controls className="w-full h-full object-cover" />
            ) : shot.keyframeImage ? (
              <img src={`data:image/png;base64,${shot.keyframeImage}`} className="w-full h-full object-cover" />
            ) : renderImagePlaceholder()}
            
            {(shot.veoStatus === VeoStatus.GENERATING || shot.veoStatus === VeoStatus.QUEUED || shot.status === ShotStatus.GENERATING_IMAGE) && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                    <p className="text-white text-[10px] font-black uppercase tracking-widest animate-pulse">Agent Active</p>
                </div>
            )}

            {!isExtensionSegment && shot.keyframeImage && (
                 <button 
                  onClick={() => onGenerateSpecificKeyframe(shot.id)} 
                  disabled={isProcessing || shot.isApproved}
                  className="absolute bottom-2 right-2 p-2 bg-indigo-600 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-indigo-500 disabled:opacity-30"
                  title="Regenerate Still"
                 >
                    <ArrowPathIcon className="w-4 h-4" />
                 </button>
            )}
          </div>
          
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-indigo-300">{shot.id}</h3>
            {shot.isApproved && <span className="bg-green-900/40 text-green-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-500/30">LOCKED</span>}
          </div>
          <p className="text-xs text-gray-400 font-mono mb-2">{shot.sceneName?.toUpperCase()}</p>
          <p className="text-sm p-3 rounded-lg bg-black/40 border border-gray-700/50 text-gray-300 italic">"{shot.pitch}"</p>
          
          {/* Asset Section */}
          <div className="mt-4">
              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">Guidance Ingredients</p>
              <div className="flex flex-wrap gap-2">
                {/* Global Assets */}
                {allAssets.map(asset => {
                    const isSelected = shot.selectedAssetIds.includes(asset.id);
                    if (!asset.image) return null;
                    return (
                        <button 
                            key={asset.id} 
                            onClick={() => onToggleAssetForShot(shot.id, asset.id)}
                            disabled={shot.isApproved}
                            className={`relative w-10 h-10 rounded border overflow-hidden transition-all ${isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/50 scale-110' : 'border-gray-800 opacity-40 grayscale hover:grayscale-0'}`}
                        >
                            <img src={`data:${asset.image.mimeType};base64,${asset.image.base64}`} className="w-full h-full object-cover" title={asset.name} />
                            {isSelected && <div className="absolute inset-0 bg-indigo-600/20"></div>}
                        </button>
                    );
                })}
                
                {/* Ad-Hoc Assets */}
                {shot.adHocAssets?.map((img, idx) => (
                    <div key={idx} className="relative w-10 h-10 rounded border border-pink-500 overflow-hidden group/adhoc">
                        <img src={`data:${img.mimeType};base64,${img.base64}`} className="w-full h-full object-cover" />
                        <button 
                            onClick={() => onRemoveAdHocAsset(shot.id, idx)}
                            className="absolute inset-0 bg-red-900/80 opacity-0 group-hover/adhoc:opacity-100 flex items-center justify-center text-white"
                        >
                            <XMarkIcon className="w-3 h-3" />
                        </button>
                    </div>
                ))}

                {/* Upload Button */}
                <button 
                    onClick={() => fileInputRef.current?.click()} 
                    disabled={shot.isApproved}
                    className="w-10 h-10 rounded border border-gray-700 border-dashed flex items-center justify-center text-gray-500 hover:text-indigo-400 hover:border-indigo-500 transition-all"
                >
                    <PlusIcon className="w-4 h-4" />
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onUploadAdHocAsset(shot.id, file);
                        e.target.value = '';
                    }} 
                />
              </div>
          </div>
        </div>

        <div className="w-full md:w-2/3">
          <div className="flex-grow h-64 overflow-auto bg-black/60 rounded-lg p-3 border border-gray-700 font-mono text-[11px] relative group">
            <pre><code>{shot.veoJson ? JSON.stringify(shot.veoJson, null, 2) : 'Awaiting breakdown...'}</code></pre>
            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => navigator.clipboard.writeText(JSON.stringify(shot.veoJson, null, 2))} className="p-1.5 bg-gray-800 rounded hover:bg-gray-700"><ClipboardDocumentIcon className="w-3.5 h-3.5" /></button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4 items-center">
            {!shot.isApproved && <button onClick={() => onApproveShot(shot.id, true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-lg text-xs uppercase tracking-tighter shadow-lg shadow-indigo-600/20">Lock Sequence</button>}
            {shot.isApproved && <button onClick={() => onApproveShot(shot.id, false)} className="px-4 py-2 bg-gray-700 text-gray-400 rounded-lg text-xs font-bold border border-gray-600">Unlock</button>}
            
            <div className="h-6 w-px bg-gray-700 mx-2"></div>
            
            {shot.veoStatus !== VeoStatus.COMPLETED && (
                <div className="flex gap-2 flex-grow">
                    <button onClick={() => onGenerateVideo(shot.id, useKeyframeAsReference)} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-tighter transition-all ${shot.isApproved ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg' : 'bg-gray-800 text-gray-500 opacity-50'}`}>Gen Video</button>
                    <div className="relative flex-grow">
                        <LinkIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
                        <input type="text" value={referenceUrl} onChange={(e) => { setReferenceUrl(e.target.value); onUpdateShot({...shot, veoReferenceUrl: e.target.value}); }} placeholder="Cloud Reference Link..." className="w-full bg-black/40 border border-gray-700 rounded-lg pl-8 pr-2 py-2 text-[10px] text-gray-300 font-mono focus:border-indigo-500 focus:outline-none" />
                    </div>
                </div>
            )}
            {shot.veoStatus === VeoStatus.COMPLETED && (
                <div className="flex items-center gap-2 text-green-400 bg-green-950/20 border border-green-500/30 px-4 py-2 rounded-lg">
                    <CheckCircle2Icon className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Video Verified</span>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface ShotBookDisplayProps {
  shotBook: ShotBook; logEntries: LogEntry[]; projectName: string | null; scenePlans: ScenePlan[] | null; apiCallSummary: ApiCallSummary; appVersion: string; onNewProject: () => void; onUpdateShot: (shot: Shot) => void; onGenerateSpecificKeyframe: (shotId: string) => void;  onRefineShot: (shotId: string, feedback: string) => void;
  allAssets: ProjectAsset[]; onToggleAssetForShot: (shotId: string, assetId: string) => void; allIngredientImages: IngredientImage[]; onUpdateShotIngredients: (shotId: string, newImages: IngredientImage[]) => void;
  onExportAllJsons: () => void; onExportHtmlReport: () => void;  onSaveProject: () => void; onDownloadKeyframesZip: () => void; onExportPackage: () => void; onShowStorageInfo: () => void;
  isProcessing: boolean; onStopGeneration: () => void;
  veoApiKey: string; onSetVeoApiKey: (key: string) => void; onGenerateVideo: (shotId: string, useKeyframe: boolean) => void; onExtendVeoVideo: (originalShotId: string, prompt: string) => void; 
  onUploadAdHocAsset: (shotId: string, file: File) => void;  onRemoveAdHocAsset: (shotId: string, index: number) => void; onApproveShot: (shotId: string, approved: boolean) => void;
  gcpToken: string; onSetGcpToken: (token: string) => void; onFetchVeoSecret: () => void; onCloudSync: () => void; ownerEmail: string;
  onGenerateAllKeyframes: () => void;
}

const ShotBookDisplay: React.FC<ShotBookDisplayProps> = ({
  shotBook, logEntries, projectName, scenePlans, apiCallSummary, appVersion, onNewProject, onUpdateShot, onGenerateSpecificKeyframe,  onRefineShot, allAssets, onToggleAssetForShot,
  onSaveProject, onExportPackage, onShowStorageInfo, isProcessing, onStopGeneration, veoApiKey, onSetVeoApiKey, onGenerateVideo, onExtendVeoVideo, onUploadAdHocAsset, onRemoveAdHocAsset, onApproveShot,
  gcpToken, onSetGcpToken, onFetchVeoSecret, onCloudSync, ownerEmail, onGenerateAllKeyframes
}) => {
  const [showSettings, setShowSettings] = useState(false);
  
  const groupedShots = (shotBook || []).reduce((acc, shot) => {
      const parts = shot.id.split('_');
      const sceneId = parts.length > 1 ? parts[0] : 'intro';
      if (!acc[sceneId]) acc[sceneId] = [];
      acc[sceneId].push(shot);
      return acc;
  }, {} as Record<string, Shot[]>);

  const missingAnyKeyframes = shotBook.some(s => !s.keyframeImage && s.veoJson?.unit_type !== 'extend');

  return (
    <div className="w-full h-full flex flex-col gap-4 p-1">
      <header className="flex-shrink-0 bg-[#1f1f1f] border border-gray-700 rounded-2xl shadow-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${gcpToken ? 'bg-indigo-600' : 'bg-gray-800'}`}><UploadCloudIcon className="w-6 h-6 text-white" /></div>
            <div>
                <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">{projectName || 'UNNAMED_UNIT'}</h2>
                    <span className="bg-gray-800 text-gray-500 text-[9px] font-bold px-2 py-0.5 rounded border border-gray-700">v{appVersion}</span>
                </div>
                <p className="text-[10px] text-gray-500 font-mono">VAULT: projects/{projectName || '...'}/state.json</p>
            </div>
        </div>
        
        <div className="flex flex-wrap gap-3">
          {missingAnyKeyframes && (
              <button 
                onClick={onGenerateAllKeyframes} 
                disabled={isProcessing}
                className="px-5 py-3 bg-pink-900/30 border border-pink-500/50 text-pink-400 hover:bg-pink-900/50 hover:text-white text-xs font-black uppercase italic tracking-tighter rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-pink-500/10"
              >
                <SparklesIcon className="w-4 h-4" /> Develop All Stills
              </button>
          )}

          <div className="relative">
              <button onClick={() => setShowSettings(!showSettings)} className={`p-3 rounded-xl transition-all border ${veoApiKey ? 'bg-indigo-900/20 border-indigo-500/50 text-indigo-400' : 'bg-red-900/30 border-red-500 text-red-300'}`}><KeyIcon className="w-5 h-5" /></button>
              {showSettings && (
                  <div className="absolute top-full right-0 mt-3 w-80 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-6 z-50 backdrop-blur-xl animate-in zoom-in-95">
                      <div className="flex justify-between items-center mb-6">
                        <h4 className="font-black text-white uppercase italic text-md flex items-center gap-2">
                          <KeyIcon className="w-4 h-4 text-indigo-400" /> API Vault
                        </h4>
                        <button onClick={() => setShowSettings(false)}><XMarkIcon className="w-5 h-5 text-gray-500" /></button>
                      </div>
                      <div className="space-y-4">
                          <div>
                            <label className="block text-[10px] text-gray-500 mb-2 font-black uppercase tracking-widest">GCP Master Token</label>
                            <input type="password" value={gcpToken} onChange={(e) => onSetGcpToken(e.target.value)} placeholder="Bearer Token..." className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none" />
                          </div>
                          <div className="py-2 border-t border-gray-800">
                             <button onClick={onFetchVeoSecret} disabled={!gcpToken} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white text-[10px] font-black py-3 rounded-lg uppercase italic tracking-tighter transition-all">Decrypt Session Credentials</button>
                          </div>
                          <div className="pt-2 border-t border-gray-800">
                            <label className="block text-[10px] text-indigo-400 mb-2 font-black uppercase tracking-widest">Kie.ai (Veo) API Key</label>
                            <input type="password" value={veoApiKey} onChange={(e) => onSetVeoApiKey(e.target.value)} placeholder="Kie API Key..." className="w-full bg-black border border-indigo-900/50 rounded-lg px-3 py-2 text-xs text-indigo-300 font-mono focus:border-indigo-500 focus:outline-none" />
                            <p className="text-[8px] text-gray-600 mt-2 leading-tight">This key is used for actual video production via kie.ai. It is usually retrieved automatically after Vault decryption.</p>
                          </div>
                      </div>
                  </div>
              )}
          </div>
          
          <button onClick={onCloudSync} disabled={!gcpToken} className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 text-white text-xs font-black uppercase italic tracking-tighter rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2"><SaveIcon className="w-4 h-4" /> Sync to Vault</button>
          <button onClick={onExportPackage} className="px-5 py-3 bg-gray-800 hover:bg-gray-700 text-white text-xs font-black uppercase italic tracking-tighter rounded-xl border border-gray-700 flex items-center gap-2"><RectangleStackIcon className="w-4 h-4" /> Package</button>
          <button onClick={onNewProject} className="px-5 py-3 bg-gray-800 hover:bg-gray-700 text-gray-400 text-xs font-black uppercase italic tracking-tighter rounded-xl border border-gray-700">Abort</button>
        </div>
      </header>

      <div className="flex-grow w-full flex flex-col md:flex-row gap-4 overflow-hidden">
        <div className="w-full md:w-2/3 h-full flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
          {(Object.entries(groupedShots) as [string, Shot[]][]).map(([sceneId, shots]) => (
            <div key={sceneId} className="mb-8">
              <div className="bg-gray-900/60 p-4 rounded-xl border-l-4 border-indigo-500 flex justify-between items-center mb-4 backdrop-blur-sm">
                <h3 className="text-lg font-black text-white uppercase italic tracking-widest">{sceneId.replace(/_/g, ' ')}</h3>
                <span className="text-[10px] font-mono text-gray-500">{shots.length} UNITS</span>
              </div>
              <div className="flex flex-col gap-6">
                {shots.map((shot) => (
                  <ShotCard 
                    key={shot.id} 
                    shot={shot} 
                    onUpdateShot={onUpdateShot} 
                    onGenerateSpecificKeyframe={onGenerateSpecificKeyframe} 
                    onRefineShot={onRefineShot} 
                    allAssets={allAssets} 
                    onToggleAssetForShot={onToggleAssetForShot} 
                    onGenerateVideo={onGenerateVideo} 
                    onExtendVeoVideo={onExtendVeoVideo} 
                    onUploadAdHocAsset={onUploadAdHocAsset} 
                    onRemoveAdHocAsset={onRemoveAdHocAsset} 
                    onApproveShot={onApproveShot}
                    isProcessing={isProcessing}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="w-full md:w-1/3 h-full border-l border-gray-800 pl-2"><ActivityLog entries={logEntries} /></div>
      </div>
    </div>
  );
};

export default ShotBookDisplay;
