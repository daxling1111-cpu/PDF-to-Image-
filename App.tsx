
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { 
  FileUp, 
  Download, 
  Trash2, 
  Image as ImageIcon, 
  Loader2, 
  Sparkles, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Maximize2, 
  Plus, 
  Files, 
  Menu, 
  X, 
  Settings2, 
  ZoomIn,
  ZoomOut,
  Sun,
  Moon,
  Heart,
  ChevronRight,
  Archive,
  CheckSquare,
  Square
} from 'lucide-react';
import { ConversionStatus, ConvertedPage, PDFMetadata, ExportFormat, AIAnalysis, PDFProject } from './types';
import { loadPDF, convertPageToImage } from './services/pdfService';
import { analyzePDFContent } from './services/geminiService';

type Language = 'en' | 'km';
type Theme = 'light' | 'dark';

const translations = {
  en: {
    welcome: "Welcome to Y.C PDF Converter",
    uploadTitle: "Drop your PDF files here",
    uploadDesc: "Supports large documents. No size limits. Convert pages to high-quality images instantly.",
    browseFiles: "Select Files",
    filesQueue: "Conversion Queue",
    addMore: "Add More",
    convertQueue: "Process Queue",
    winEdition: "Professional Edition",
    convertAll: "Convert All Pages",
    convertSelected: "Process Selection",
    zipAll: "Download All (ZIP)",
    zipSelected: "Download Selection",
    resolution: "Output Resolution",
    gallery: "Generated Images",
    analysis: "AI Insights",
    pageRange: "Range (e.g. 1-5, 10)",
    select: "Select",
    selectAll: "Select All",
    clear: "Clear All",
    ready: "Ready",
    pending: "Processing...",
    error: "Failed",
    pages: "PAGES",
    credit: "Built with Precision",
    themeLight: "LIGHT MODE",
    themeDark: "DARK MODE"
  },
  km: {
    welcome: "សូមស្វាគមន៏មកកាន Y.C PDF",
    uploadTitle: "ដាក់ឯកសារ PDF ទីនេះ",
    uploadDesc: "បំប្លែង PDF ទៅជារូបភាពច្បាស់ៗ។ មិនកំណត់ទំហំ និងចំនួនទំព័រ។",
    browseFiles: "ជ្រើសរើសឯកសារ",
    filesQueue: "បញ្ជីការងារ",
    addMore: "បន្ថែមទៀត",
    convertQueue: "បំប្លែងទាំងអស់",
    winEdition: "កំណែអាជីព",
    convertAll: "បំប្លែងគ្រប់ទំព័រ",
    convertSelected: "បំប្លែងដែលបានរើស",
    zipAll: "ទាញយក ZIP ទាំងអស់",
    zipSelected: "ទាញយក ZIP ដែលរើស",
    resolution: "កម្រិតរូបភាព (DPI)",
    gallery: "រូបភាពលទ្ធផល",
    analysis: "ការវិភាគដោយ AI",
    pageRange: "ចន្លោះទំព័រ",
    select: "រើស",
    selectAll: "រើសទាំងអស់",
    clear: "សម្អាតចោល",
    ready: "រួចរាល់",
    pending: "កំពុងដំណើរការ...",
    error: "មានបញ្ហា",
    pages: "ទំព័រ",
    credit: "រៀបចំឡើងដោយយកចិត្តទុកដាក់",
    themeLight: "ពន្លឺ",
    themeDark: "DARK MODE"
  }
};

const TypewriterHeader: React.FC<{ lang: Language }> = ({ lang }) => {
  const fullText = translations[lang].welcome;
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    // Reset when language changes
    setDisplayText('');
    setIndex(0);
    setIsDeleting(false);
  }, [lang]);

  useEffect(() => {
    let timer: number;
    
    const handleType = () => {
      const currentText = fullText;
      const speed = isDeleting ? 40 : 100;

      if (!isDeleting && index < currentText.length) {
        // Typing
        setDisplayText(currentText.substring(0, index + 1));
        setIndex(index + 1);
      } else if (isDeleting && index > 0) {
        // Deleting
        setDisplayText(currentText.substring(0, index - 1));
        setIndex(index - 1);
      } else if (!isDeleting && index === currentText.length) {
        // Finished typing, wait before deleting
        timer = window.setTimeout(() => setIsDeleting(true), 3000);
        return;
      } else if (isDeleting && index === 0) {
        // Finished deleting, start over
        setIsDeleting(false);
      }

      timer = window.setTimeout(handleType, speed);
    };

    timer = window.setTimeout(handleType, 100);
    return () => clearTimeout(timer);
  }, [index, isDeleting, fullText]);

  return (
    <div className="min-h-[4rem] sm:min-h-[6rem] flex items-center justify-center">
      <h1 className={`text-4xl sm:text-6xl lg:text-7xl font-black text-slate-900 dark:text-white tracking-tighter mb-4 ${lang === 'km' ? 'font-bayon' : ''}`}>
        {displayText}
        <span className="inline-block w-[4px] h-[0.9em] bg-indigo-600 ml-1 animate-pulse align-middle" />
      </h1>
    </div>
  );
};

const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>('en');
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('yc-pdf-theme') as Theme) || 'light');
  const [projects, setProjects] = useState<PDFProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('png');
  const [dpi, setDpi] = useState<number>(300); 
  const [activeTab, setActiveTab] = useState<'gallery' | 'ai'>('gallery');
  const [selectedPreview, setSelectedPreview] = useState<ConvertedPage | null>(null);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const t = translations[language];
  const pdfRefs = useRef<Map<string, any>>(new Map());

  const activeProject = useMemo(() => projects.find(p => p.id === activeProjectId), [projects, activeProjectId]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('yc-pdf-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles: File[] = e.target.files ? Array.from(e.target.files) : [];
    if (selectedFiles.length === 0) return;
    
    for (const file of selectedFiles) {
      if (file.type !== 'application/pdf') continue;
      const id = crypto.randomUUID();
      const placeholder: PDFProject = {
        id, file, metadata: { name: file.name, size: file.size, totalPages: 0 },
        status: ConversionStatus.LOADING, pages: [], selectedPages: [], progress: 0, aiAnalysis: null, error: null
      };
      setProjects(prev => [...prev, placeholder]);
      try {
        const { pdf, metadata } = await loadPDF(file);
        pdfRefs.current.set(id, pdf);
        setProjects(prev => prev.map(p => p.id === id ? { ...p, metadata, status: ConversionStatus.IDLE } : p));
        if (!activeProjectId) setActiveProjectId(id);
      } catch (err) {
        setProjects(prev => prev.map(p => p.id === id ? { ...p, status: ConversionStatus.ERROR, error: "Load failed" } : p));
      }
    }
  };

  const removeProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    pdfRefs.current.delete(id);
    if (activeProjectId === id) {
      const remaining = projects.filter(p => p.id !== id);
      setActiveProjectId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const convertProject = async (projectId: string, targetPages?: number[]) => {
    const project = projects.find(p => p.id === projectId);
    const pdf = pdfRefs.current.get(projectId);
    if (!project || !pdf) return;

    const total = project.metadata.totalPages;
    const pagesToConvert = targetPages || Array.from({ length: total }, (_, i) => i + 1);
    
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: ConversionStatus.CONVERTING, progress: 0 } : p));
    const scale = dpi / 72;
    let completedCount = 0;

    try {
      for (const pageNum of pagesToConvert) {
        if (project.pages.some(pg => pg.pageNumber === pageNum)) {
          completedCount++;
          continue;
        }

        const page = await convertPageToImage(pdf, pageNum, scale, exportFormat);
        setProjects(prev => prev.map(p => {
          if (p.id === projectId) {
            const newPages = [...p.pages, page].sort((a, b) => a.pageNumber - b.pageNumber);
            return { ...p, pages: newPages, progress: Math.round(((++completedCount) / pagesToConvert.length) * 100) };
          }
          return p;
        }));

        if (pageNum === 1 && !project.aiAnalysis) {
          analyzePDFContent(page.dataUrl).then(analysis => {
            setProjects(prev => prev.map(p => p.id === projectId ? { ...p, aiAnalysis: analysis } : p));
          }).catch(() => {});
        }
      }
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: ConversionStatus.COMPLETED } : p));
    } catch (err) {
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: ConversionStatus.ERROR, error: "Error during conversion" } : p));
    }
  };

  const downloadProjectZip = async (project: PDFProject, onlySelected: boolean = false) => {
    // @ts-ignore
    const zip = new JSZip();
    const folder = zip.folder(project.metadata.name.replace(/\.[^/.]+$/, "") + "_Export");
    const pagesToZip = onlySelected ? project.pages.filter(pg => project.selectedPages.includes(pg.pageNumber)) : project.pages;
    
    if (pagesToZip.length === 0) return;

    pagesToZip.forEach((page) => {
      const filename = `Page_${page.pageNumber.toString().padStart(3, '0')}.${exportFormat}`;
      folder.file(filename, page.dataUrl.split(',')[1], { base64: true });
    });

    const content = await zip.generateAsync({ type: "blob" });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `${project.metadata.name.replace('.pdf', '')}_converted.zip`;
    link.click();
  };

  return (
    <div className={`flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden ${language === 'km' ? 'font-battambang' : 'font-sans'} transition-colors duration-300`}>
      {/* Sidebar - Mobile Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar - File Queue */}
      <aside className={`fixed inset-y-0 left-0 w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-40 transition-transform duration-300 lg:static lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${projects.length === 0 ? 'hidden' : 'flex'}`}>
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Files className="w-5 h-5 text-indigo-600" />
            <h2 className="font-bold text-slate-800 dark:text-slate-100">{t.filesQueue}</h2>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-slate-400"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {projects.map((p) => (
            <div key={p.id} onClick={() => setActiveProjectId(p.id)} className={`group relative p-4 rounded-2xl border cursor-pointer transition-all ${activeProjectId === p.id ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800'}`}>
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-xl ${activeProjectId === p.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate dark:text-slate-100">{p.metadata.name}</p>
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">{p.metadata.totalPages} {t.pages} • {(p.metadata.size / 1024 / 1024).toFixed(1)}MB</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); removeProject(p.id); }} className="p-1 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {p.status === ConversionStatus.CONVERTING && (
                <div className="mt-3 h-1 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${p.progress}%` }}></div>
                </div>
              )}
            </div>
          ))}
          
          <label className="block w-full cursor-pointer">
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col items-center gap-2 hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/10 transition-all">
              <Plus className="w-5 h-5 text-slate-300" />
              <span className="text-xs font-bold text-slate-400">{t.addMore}</span>
            </div>
            <input type="file" multiple className="hidden" accept="application/pdf" onChange={handleFileChange} />
          </label>
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <button onClick={() => projects.forEach(p => convertProject(p.id))} disabled={projects.length === 0} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
            <Layers className="w-4 h-4" /> {t.convertQueue}
          </button>
          <div className="mt-4 flex items-center justify-center gap-1.5 opacity-30">
            <Heart className="w-3 h-3 text-red-500 fill-red-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest dark:text-white">{t.credit}</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-6 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-4">
            {projects.length > 0 && (
              <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
                <Menu className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none">
                <Archive className="text-white w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black text-slate-900 dark:text-white leading-none tracking-tight">YC PDF</span>
                <span className="text-[10px] font-bold text-indigo-500 tracking-[0.2em]">{t.winEdition}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={toggleTheme} 
              className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:scale-105 active:scale-95 group"
            >
              <div className={`p-1.5 rounded-full ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}>
                {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </div>
              <span className={`text-sm font-black tracking-widest ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'} ${language === 'km' ? 'font-bayon' : ''}`}>
                {theme === 'dark' ? t.themeDark : t.themeLight}
              </span>
            </button>

            <div className="hidden sm:flex bg-slate-100 dark:bg-slate-800 p-1 rounded-full border border-slate-200 dark:border-slate-700">
              <button onClick={() => setLanguage('km')} className={`px-4 py-1.5 rounded-full text-[10px] font-black transition-all ${language === 'km' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>KM</button>
              <button onClick={() => setLanguage('en')} className={`px-4 py-1.5 rounded-full text-[10px] font-black transition-all ${language === 'en' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>EN</button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {!activeProject ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center max-w-4xl mx-auto">
              <TypewriterHeader lang={language} />
              <p className="text-slate-500 dark:text-slate-400 text-lg mb-12 max-w-2xl">{t.uploadDesc}</p>
              
              <label className="w-full max-w-2xl cursor-pointer group">
                <div className="relative bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] p-20 flex flex-col items-center transition-all group-hover:border-indigo-400 group-hover:bg-indigo-50/10 shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-950 rounded-full flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500 relative z-10">
                    <FileUp className="w-10 h-10 text-indigo-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 relative z-10">{t.uploadTitle}</h3>
                  <div className="mt-8 px-10 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-200 dark:shadow-none relative z-10 group-hover:bg-indigo-700 transition-colors">
                    {t.browseFiles}
                  </div>
                </div>
                <input type="file" multiple className="hidden" accept="application/pdf" onChange={handleFileChange} />
              </label>
            </div>
          ) : (
            <div className="p-6 lg:p-10 max-w-[1600px] mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col lg:flex-row gap-6 mb-8">
                <div className="flex-1 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 shadow-xl shadow-slate-200/20 dark:shadow-none flex items-center gap-6">
                  <div className="bg-indigo-50 dark:bg-indigo-900/50 p-5 rounded-3xl">
                    <FileText className="w-10 h-10 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white truncate pr-4">{activeProject.metadata.name}</h2>
                    <div className="flex items-center gap-4 mt-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                      <span className="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">{activeProject.metadata.totalPages} {t.pages}</span>
                      <span>{(activeProject.metadata.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                  </div>
                </div>

                <div className="w-full lg:w-80 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 shadow-xl shadow-slate-200/20 dark:shadow-none flex flex-col justify-center">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-indigo-600">
                      <Settings2 className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t.resolution}</span>
                    </div>
                    <span className="text-sm font-black dark:text-white">{dpi} DPI</span>
                  </div>
                  <input 
                    type="range" min="72" max="600" step="1" value={dpi} 
                    onChange={(e) => setDpi(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-600" 
                  />
                  <div className="flex justify-between mt-2 text-[8px] font-black text-slate-300 uppercase tracking-widest">
                    <span>Draft</span>
                    <span>HD+</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 mb-6 sticky top-0 z-10 py-2">
                <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-md">
                   <button onClick={() => setActiveTab('gallery')} className={`px-6 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${activeTab === 'gallery' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none' : 'text-slate-500'}`}>
                     <ImageIcon className="w-4 h-4" /> {t.gallery}
                   </button>
                   {activeProject.aiAnalysis && (
                     <button onClick={() => setActiveTab('ai')} className={`px-6 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${activeTab === 'ai' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none' : 'text-slate-500'}`}>
                       <Sparkles className="w-4 h-4" /> {t.analysis}
                     </button>
                   )}
                </div>

                <div className="flex-1" />

                <div className="flex items-center gap-3">
                  <button onClick={() => convertProject(activeProject.id)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-2xl font-black text-sm shadow-xl shadow-indigo-100 dark:shadow-none flex items-center gap-2 transition-all active:scale-95">
                    <Layers className="w-4 h-4" /> {t.convertAll}
                  </button>
                  {activeProject.pages.length > 0 && (
                    <button onClick={() => downloadProjectZip(activeProject)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-2xl font-black text-sm shadow-xl shadow-emerald-100 dark:shadow-none flex items-center gap-2 transition-all active:scale-95">
                      <Download className="w-4 h-4" /> ZIP
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 p-8 min-h-[500px] shadow-xl shadow-slate-200/20 dark:shadow-none">
                {activeTab === 'gallery' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
                    {Array.from({ length: activeProject.metadata.totalPages }, (_, i) => i + 1).map((pageNum) => {
                      const page = activeProject.pages.find(pg => pg.pageNumber === pageNum);
                      return (
                        <div key={pageNum} className="group flex flex-col">
                          <div className="relative aspect-[3/4] bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden transition-all hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1">
                            {page ? (
                              <>
                                <img src={page.dataUrl} className="w-full h-full object-contain p-4" loading="lazy" />
                                <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-4">
                                  <button onClick={() => { setSelectedPreview(page); setPreviewZoom(1); }} className="p-4 bg-white rounded-2xl text-slate-900 hover:scale-110 transition-transform">
                                    <Maximize2 className="w-6 h-6" />
                                  </button>
                                  <a href={page.dataUrl} download={`Page_${pageNum}.${exportFormat}`} className="p-4 bg-indigo-600 rounded-2xl text-white hover:scale-110 transition-transform">
                                    <Download className="w-6 h-6" />
                                  </a>
                                </div>
                              </>
                            ) : (
                              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 gap-4">
                                {activeProject.status === ConversionStatus.CONVERTING ? (
                                  <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
                                ) : (
                                  <ImageIcon className="w-12 h-12 opacity-20" />
                                )}
                                <span className="text-[10px] font-black uppercase tracking-widest">{t.pending}</span>
                              </div>
                            )}
                          </div>
                          <div className="mt-4 flex items-center justify-between px-2">
                             <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Page {pageNum}</span>
                             {page && <span className="text-[10px] font-bold text-indigo-500 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/40 rounded-full">HQ</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="max-w-4xl mx-auto space-y-12 py-8">
                    <div className="flex flex-col items-center text-center">
                      <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-3xl mb-6">
                        <Sparkles className="w-12 h-12 text-indigo-600" />
                      </div>
                      <h3 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-4">{activeProject.aiAnalysis?.suggestedTitle}</h3>
                      <p className="text-xl text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">{activeProject.aiAnalysis?.summary}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="bg-slate-50 dark:bg-slate-800 p-8 rounded-[2.5rem]">
                        <h4 className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                           <CheckCircle2 className="w-4 h-4" /> Key Points
                        </h4>
                        <ul className="space-y-4">
                          {activeProject.aiAnalysis?.keyPoints.map((point, i) => (
                            <li key={i} className="flex items-start gap-4">
                              <span className="flex-shrink-0 w-6 h-6 bg-white dark:bg-slate-700 rounded-lg flex items-center justify-center text-[10px] font-black text-indigo-600 shadow-sm">{i+1}</span>
                              <p className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed">{point}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white flex flex-col justify-center relative overflow-hidden">
                        <Archive className="absolute -right-4 -bottom-4 w-40 h-40 opacity-10" />
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 opacity-80">Quick Action</h4>
                        <p className="text-2xl font-bold mb-8 leading-tight">Generate a high-res gallery of all pages in this document with a single click.</p>
                        <button onClick={() => convertProject(activeProject.id)} className="w-full bg-white text-indigo-600 py-4 rounded-2xl font-black text-sm shadow-xl hover:scale-105 active:scale-95 transition-all">
                          Process Everything
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal Preview */}
      {selectedPreview && (
        <div className="fixed inset-0 z-[100] bg-slate-900/98 dark:bg-slate-950/98 backdrop-blur-3xl flex flex-col animate-in fade-in zoom-in-95 duration-300">
           <div className="h-24 flex items-center justify-between px-8 text-white shrink-0">
              <div className="flex items-center gap-4">
                <span className="bg-indigo-600 px-6 py-2 rounded-2xl text-xs font-black tracking-widest uppercase">Page {selectedPreview.pageNumber}</span>
                <span className="text-white/40 font-mono text-sm">{selectedPreview.width} x {selectedPreview.height} px</span>
              </div>
              <button onClick={() => setSelectedPreview(null)} className="p-3 hover:bg-white/10 rounded-2xl transition-all">
                <X className="w-10 h-10" />
              </button>
           </div>
           
           <div className="flex-1 overflow-auto flex items-center justify-center p-12 custom-scrollbar">
              <div className="relative shadow-2xl rounded-lg bg-white overflow-hidden transition-transform duration-200" style={{ transform: `scale(${previewZoom})` }}>
                <img src={selectedPreview.dataUrl} className="max-h-[85vh] w-auto shadow-2xl" />
              </div>
           </div>

           <div className="h-32 flex items-center justify-center gap-6 pb-8">
              <div className="flex bg-white/10 p-2 rounded-3xl backdrop-blur-md">
                <button onClick={() => setPreviewZoom(z => Math.max(0.5, z - 0.2))} className="p-4 hover:bg-white/10 rounded-2xl text-white transition-all"><ZoomOut className="w-6 h-6" /></button>
                <button onClick={() => setPreviewZoom(1)} className="px-6 text-xs font-black text-white uppercase tracking-widest">100%</button>
                <button onClick={() => setPreviewZoom(z => Math.min(4, z + 0.2))} className="p-4 hover:bg-white/10 rounded-2xl text-white transition-all"><ZoomIn className="w-6 h-6" /></button>
              </div>
              <a href={selectedPreview.dataUrl} download={`Page_${selectedPreview.pageNumber}.${exportFormat}`} className="bg-indigo-600 text-white px-12 py-5 rounded-[2rem] font-black text-sm shadow-2xl shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3">
                <Download className="w-5 h-5" /> Download Image
              </a>
           </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
};

export default App;
