/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, {useRef, useState} from 'react';
import {ProjectAsset, LogType} from '../types';
import { ArrowRightIcon, FileUploadIcon, FileAudioIcon, RectangleStackIcon, UploadCloudIcon, ClapperboardIcon, CheckCircle2Icon } from './icons';
import AssetLibrary from './AssetLibrary';
import { ingestScriptFile } from '../services/geminiService';
import { transcribeAudio } from '../services/audioService';

interface ProjectSetupFormProps {
  onGenerate: (script: string, createKeyframes: boolean) => void;
  isGenerating: boolean;
  onLoadProject: (jsonString: string) => void;
  onArchiveProject: (jsonString: string) => void;
  assets: ProjectAsset[];
  onAnalyzeScriptForAssets: (script: string) => void;
  isAnalyzingAssets: boolean;
  onAddAsset: (asset: ProjectAsset) => void;
  onRemoveAsset: (id: string) => void;
  onUpdateAssetImage: (id: string, file: File) => void;
  onAddLogEntry?: (message: string, type: LogType) => void;
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });

const ProjectSetupForm: React.FC<ProjectSetupFormProps> = ({
  onGenerate, isGenerating, assets, onAnalyzeScriptForAssets, isAnalyzingAssets, onAddAsset, onRemoveAsset, onUpdateAssetImage, onLoadProject, onArchiveProject, onAddLogEntry
}) => {
  const [script, setScript] = useState('');
  const [createKeyframes, setCreateKeyframes] = useState(true);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [processingType, setProcessingType] = useState<'reading' | 'listening'>('reading');
  
  const scriptFileInputRef = useRef<HTMLInputElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const projectFileInputRef = useRef<HTMLInputElement>(null);
  const archiveFileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (script.trim() && !isGenerating) onGenerate(script, createKeyframes);
  };

  const handleScriptFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setProcessingType('reading');
    if (onAddLogEntry) onAddLogEntry(`Script Agent: Ingesting ${file.name}...`, LogType.INFO);

    try {
        if (file.type === 'text/plain' || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) setScript(event.target.result as string);
                setIsProcessingFile(false);
            };
            reader.readAsText(file);
        } else {
            const base64 = await fileToBase64(file);
            const extractedText = await ingestScriptFile(base64, file.type);
            setScript(extractedText);
            if (onAddLogEntry) onAddLogEntry(`Script Ingestion Successful: ${file.name} parsed.`, LogType.SUCCESS);
        }
    } catch (err) {
        if (onAddLogEntry) onAddLogEntry(`Ingestion Error: ${(err as Error).message}`, LogType.ERROR);
    } finally {
        setIsProcessingFile(false);
        e.target.value = '';
    }
  };

  const handleAudioFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setProcessingType('listening');
    if (onAddLogEntry) onAddLogEntry(`Audio Agent: Transcribing ${file.name} to screenplay...`, LogType.INFO);

    try {
        const base64 = await fileToBase64(file);
        const { result } = await transcribeAudio(base64, file.type);
        setScript(result);
        if (onAddLogEntry) onAddLogEntry(`Transcription Successful: ${file.name} converted to script.`, LogType.SUCCESS);
    } catch (err) {
        if (onAddLogEntry) onAddLogEntry(`Transcription Error: ${(err as Error).message}`, LogType.ERROR);
    } finally {
        setIsProcessingFile(false);
        e.target.value = '';
    }
  };

  const handleProjectFileChange = (e: React.ChangeEvent<HTMLInputElement>, callback: (s: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) callback(event.target.result as string);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const hasUnmappedAssets = assets.length > 0 && assets.some(a => !a.image);

  return (
    <div className="w-full max-w-5xl p-1 bg-transparent flex flex-col gap-12 pb-32">
      {/* Narrative beats (Section 01) */}
      <section className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <div className="flex items-center gap-3 mb-6">
            <span className="w-8 h-8 rounded-full bg-pink-900 text-pink-400 flex items-center justify-center font-black text-xs">01</span>
            <h2 className="text-sm font-black text-gray-500 uppercase tracking-widest">Script Manifest</h2>
        </div>
        <div className="bg-gray-900/40 border border-gray-800 rounded-3xl p-8 backdrop-blur-xl">
            <div className="flex justify-between items-center mb-6">
                <p className="text-xs text-gray-500 font-medium">Upload PDF, Docx, or Audio to generate the VEO timeline.</p>
                <div className="flex gap-2">
                    <button type="button" onClick={() => scriptFileInputRef.current?.click()} className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 text-gray-400" title="Upload PDF/Doc/Text"><FileUploadIcon className="w-4 h-4" /></button>
                    <button type="button" onClick={() => audioFileInputRef.current?.click()} className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 text-gray-400" title="Transcribe Audio Episode"><FileAudioIcon className="w-4 h-4" /></button>
                </div>
            </div>
            <div className="relative">
                <textarea 
                    value={script} onChange={(e) => setScript(e.target.value)}
                    placeholder="INT. STUDIO - DAY. Your story begins here..."
                    className={`w-full h-48 bg-black/40 border border-gray-800 rounded-2xl p-6 text-gray-300 focus:outline-none focus:border-indigo-500 transition-all font-serif italic text-lg leading-relaxed shadow-inner ${isProcessingFile ? 'opacity-30' : ''}`}
                    disabled={isProcessingFile}
                />
                {isProcessingFile && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-indigo-400">
                        <div className={`w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin ${processingType === 'listening' ? 'border-pink-500' : ''}`}></div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] animate-pulse">
                            {processingType === 'listening' ? 'Listening to Audio...' : 'Reading Document...'}
                        </p>
                    </div>
                )}
            </div>
            <div className="mt-4 flex justify-end">
                 <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Characters and Locations will be detected in the next section.</p>
            </div>
        </div>
      </section>

      {/* Visual Identity (Section 02) - NOW MORE PROMINENT */}
      <section className="animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-indigo-900 text-indigo-400 flex items-center justify-center font-black text-xs">02</span>
                  <h2 className="text-sm font-black text-gray-500 uppercase tracking-widest">World Artifacts & Entities</h2>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <button 
                  onClick={() => projectFileInputRef.current?.click()}
                  className="flex-1 md:flex-none px-4 py-2 bg-gray-900 border border-gray-800 rounded-xl text-[10px] font-black uppercase text-gray-400 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                    <RectangleStackIcon className="w-4 h-4" /> Ingest Archive
                </button>
                <button 
                  onClick={() => archiveFileInputRef.current?.click()}
                  className="flex-1 md:flex-none px-4 py-2 bg-indigo-950/30 border border-indigo-500/30 rounded-xl text-[10px] font-black uppercase text-indigo-400 hover:bg-indigo-900/40 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                    <UploadCloudIcon className="w-4 h-4" /> Cloud Archive
                </button>
              </div>
              <input type="file" ref={projectFileInputRef} onChange={(e) => handleProjectFileChange(e, onLoadProject)} accept=".json" className="hidden" />
              <input type="file" ref={archiveFileInputRef} onChange={(e) => handleProjectFileChange(e, onArchiveProject)} accept=".json" className="hidden" />
          </div>
          <AssetLibrary 
            assets={assets} onAddAsset={onAddAsset} onRemoveAsset={onRemoveAsset} onUpdateAssetImage={onUpdateAssetImage} 
            onAnalyzeScript={() => onAnalyzeScriptForAssets(script)} isAnalyzing={isAnalyzingAssets} hasScript={!!script.trim()} 
          />
      </section>

      {/* Final Production Step */}
      <section className="mt-8 p-12 bg-indigo-900/10 border-2 border-dashed border-indigo-500/20 rounded-[3rem] flex flex-col items-center gap-8 text-center animate-in zoom-in-95 duration-1000">
          <div className="max-w-2xl">
              <div className="flex justify-center gap-3 mb-4">
                   <ClapperboardIcon className="w-8 h-8 text-indigo-400" />
                   <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase">Director's Pre-Flight</h2>
              </div>
              <p className="text-gray-400 text-lg">Ensure your **Asset Library** is locked for maximum continuity. The Director Agent will fuzzy-map these references to every generated shot.</p>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-6 w-full max-w-2xl">
              <label className="flex-1 flex items-center gap-4 cursor-pointer group bg-black/40 border border-gray-800 p-4 rounded-2xl w-full">
                  <input type="checkbox" checked={createKeyframes} onChange={(e) => setCreateKeyframes(e.target.checked)} className="hidden" />
                  <div className={`w-14 h-7 rounded-full transition-all border-2 flex items-center ${createKeyframes ? 'bg-indigo-600 border-indigo-400' : 'bg-gray-800 border-gray-700'}`}>
                      <div className={`w-5 h-5 bg-white rounded-full transition-all ${createKeyframes ? 'ml-7' : 'ml-1'}`}></div>
                  </div>
                  <div className="text-left">
                      <span className="block text-xs font-black uppercase text-gray-300 group-hover:text-white">Auto-Generate Stills</span>
                      <span className="block text-[10px] text-gray-500">2K Production Concept Art</span>
                  </div>
              </label>

              <button 
                onClick={handleSubmit} 
                disabled={!script.trim() || isGenerating || isProcessingFile} 
                className={`flex-1 w-full px-12 py-6 font-black rounded-[2rem] uppercase italic tracking-tighter text-xl transition-all shadow-2xl flex items-center justify-center gap-4 ${!script.trim() || isGenerating ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-600/30'}`}
              >
                  Initiate Breakdown <ArrowRightIcon className="w-6 h-6" />
              </button>
          </div>

          {hasUnmappedAssets && (
              <div className="flex items-center gap-2 px-4 py-2 bg-yellow-900/20 border border-yellow-500/30 rounded-full text-yellow-500 text-[10px] font-bold uppercase tracking-widest animate-pulse">
                  Unmapped Entities Detected in Library - Upload Images for Continuity
              </div>
          )}
      </section>

      <input type="file" ref={scriptFileInputRef} className="hidden" onChange={handleScriptFileChange} accept=".pdf,.docx,.doc,.txt,.md" />
      <input type="file" ref={audioFileInputRef} className="hidden" onChange={handleAudioFileChange} accept="audio/*" />
    </div>
  );
};

export default ProjectSetupForm;