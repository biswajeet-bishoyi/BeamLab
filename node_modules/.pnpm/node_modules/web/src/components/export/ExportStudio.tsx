import { useState } from 'react';
import { useStore } from '../../store';
import { exportEngineeringData } from '../../utils/export/dataExport';
import { exportBeamProject } from '../../utils/export/projectExport';
import { exportCanvasImage } from '../../utils/export/imageExport';
import { motion } from 'framer-motion';
import { 
  X, FileText, Image as ImageIcon, FileCode2, Presentation, 
  Video, Globe, PackageOpen, Download, ShieldCheck, 
  AlertTriangle, CheckCircle2, Settings
} from 'lucide-react';


type ExportCategory = 'pdf' | 'html' | 'pptx' | 'image' | 'cinema' | 'data' | 'project';

const CATEGORIES: { id: ExportCategory; title: string; icon: React.ReactNode; desc: string }[] = [
  { id: 'pdf', title: 'Engineering Report', icon: <FileText size={20} />, desc: 'PDF documents and blueprints' },
  { id: 'image', title: 'Images', icon: <ImageIcon size={20} />, desc: 'High-res PNG, SVG, WebP' },
  { id: 'data', title: 'Engineering Data', icon: <FileCode2 size={20} />, desc: 'CSV, JSON, YAML' },
  { id: 'project', title: 'Beam Project', icon: <PackageOpen size={20} />, desc: 'Native .beam project package' },
  { id: 'html', title: 'Interactive HTML', icon: <Globe size={20} />, desc: 'Standalone web viewer' },
  { id: 'pptx', title: 'Presentation', icon: <Presentation size={20} />, desc: 'PowerPoint slides' },
  { id: 'cinema', title: 'Cinema', icon: <Video size={20} />, desc: 'MP4, GIF animations' }
];

export function ExportStudio({ onClose }: { onClose: () => void }) {
  const model = useStore(s => s.model);
  const analysisResult = useStore(s => s.analysisResult);

  const [activeTab, setActiveTab] = useState<ExportCategory>('pdf');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);

    try {
      if (activeTab === 'data') {
        // Mock progress
        setExportProgress(50);
        await exportEngineeringData(model, analysisResult);
        setExportProgress(100);
      } else if (activeTab === 'project') {
        setExportProgress(50);
        await exportBeamProject(model);
        setExportProgress(100);
      } else if (activeTab === 'image') {
        setExportProgress(50);
        await exportCanvasImage('png');
        setExportProgress(100);
      } else {
        // Fallback for mocked categories (PDF, PPTX, Cinema)
        await new Promise<void>(resolve => {
          const interval = setInterval(() => {
            setExportProgress(p => {
              if (p >= 100) {
                clearInterval(interval);
                resolve();
                return 100;
              }
              return p + 10;
            });
          }, 100);
        });
      }
    } catch (e) {
      console.error("Export failed:", e);
      alert("Export failed. Make sure you are viewing a valid beam.");
    } finally {
      setTimeout(() => setIsExporting(false), 1000);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[200] bg-slate-50 dark:bg-slate-900 flex flex-col"
    >
      {/* HEADER */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
            <Download size={18} />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white leading-tight">Export Studio</h2>
            <p className="text-xs text-slate-500 font-medium">Publish Engineering Deliverables</p>
          </div>
        </div>
        
        <button 
          onClick={onClose}
          className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
        >
          <X size={20} />
        </button>
      </header>

      {/* MAIN LAYOUT */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT SIDEBAR - CATEGORIES */}
        <div className="w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-2 overflow-y-auto">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">Export Formats</h3>
          
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all ${
                activeTab === cat.id 
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50' 
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-transparent'
              }`}
            >
              <div className={`p-2 rounded-lg ${activeTab === cat.id ? 'bg-blue-100 dark:bg-blue-900/50' : 'bg-slate-100 dark:bg-slate-800'}`}>
                {cat.icon}
              </div>
              <div>
                <div className="font-bold text-sm">{cat.title}</div>
                <div className="text-xs opacity-70 mt-0.5">{cat.desc}</div>
              </div>
            </button>
          ))}
        </div>

        {/* CENTER - PREVIEW & SETTINGS */}
        <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-8 flex flex-col items-center overflow-y-auto relative">
          
          <div className="w-full max-w-4xl flex justify-between items-end mb-6">
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">Live Preview</h1>
              <p className="text-slate-500 text-sm mt-1">Updates instantly as you change settings.</p>
            </div>
            
            <button className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-lg hover:shadow-md transition-all">
              <Settings size={16} /> Advanced Settings
            </button>
          </div>

          {/* MOCK PREVIEW WINDOW */}
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden min-h-[500px] flex flex-col relative">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
            
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center relative z-10">
              <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 text-blue-500 rounded-full flex items-center justify-center mb-6">
                {CATEGORIES.find(c => c.id === activeTab)?.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">
                {CATEGORIES.find(c => c.id === activeTab)?.title} Preview
              </h3>
              <p className="text-slate-500 max-w-md mx-auto">
                This is a structural mock of the Export Studio preview window. 
                Full generation logic for {activeTab.toUpperCase()} files will be wired up here.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR - ANALYZER & QUEUE */}
        <div className="w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-6 flex flex-col">
          
          <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <ShieldCheck className="text-emerald-500" /> Export Quality
          </h3>
          
          {/* Mock Quality Analyzer */}
          <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/30 rounded-xl p-4 mb-8">
            <div className="flex items-end justify-between mb-2">
              <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Readiness Score</span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-500">98%</span>
            </div>
            <div className="w-full h-2 bg-emerald-200 dark:bg-emerald-900/50 rounded-full overflow-hidden mb-4">
              <div className="h-full bg-emerald-500 rounded-full w-[98%]"></div>
            </div>
            
            <ul className="text-xs space-y-2">
              <li className="flex items-start gap-2 text-slate-600 dark:text-slate-400">
                <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" /> All materials defined
              </li>
              <li className="flex items-start gap-2 text-slate-600 dark:text-slate-400">
                <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" /> Model is stable
              </li>
              <li className="flex items-start gap-2 text-slate-600 dark:text-slate-400">
                <AlertTriangle size={14} className="text-yellow-500 shrink-0 mt-0.5" /> Missing project title
              </li>
            </ul>
          </div>

          <div className="mt-auto">
            {isExporting ? (
              <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl mb-4">
                <div className="flex justify-between text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  <span>Generating {activeTab.toUpperCase()}...</span>
                  <span>{exportProgress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-blue-500 rounded-full"
                    animate={{ width: `${exportProgress}%` }}
                  />
                </div>
              </div>
            ) : null}
            
            <button 
              onClick={handleExport}
              disabled={isExporting}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? 'Exporting...' : `Export ${activeTab.toUpperCase()}`}
            </button>
          </div>

        </div>

      </div>
    </motion.div>
  );
}
