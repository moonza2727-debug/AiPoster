
import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, Image as ImageIcon, Download, RefreshCw, X, Plus,
  Rocket, ShieldCheck, ShieldAlert, Zap, Globe
} from 'lucide-react';
import { AspectRatio, GeneratedPoster } from './types';
import { STYLE_PRESETS, ASPECT_RATIOS } from './constants';
import { generatePosterImage, testConnection } from './services/gemini';

interface Logo { id: string; url: string; }

const App: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [posterText, setPosterText] = useState('');
  const [styleIndex, setStyleIndex] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.SQUARE);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorType, setErrorType] = useState<'NONE' | 'KEY' | 'OTHER'>('NONE');
  const [keyStatus, setKeyStatus] = useState<'testing' | 'valid' | 'invalid' | 'none'>('none');
  const [productImage, setProductImage] = useState<string | null>(null);
  const [logos, setLogos] = useState<Logo[]>([]);
  const [currentPoster, setCurrentPoster] = useState<GeneratedPoster | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const checkKey = async () => {
    setKeyStatus('testing');
    const res = await testConnection();
    setKeyStatus(res.valid ? 'valid' : 'invalid');
  };

  useEffect(() => { checkKey(); }, []);

  const handleGenerate = async () => {
    setErrorType('NONE');
    if (!prompt.trim() && !productImage) {
      setErrorType('OTHER');
      return;
    }
    setIsGenerating(true);
    try {
      const result = await generatePosterImage({
        prompt,
        style: STYLE_PRESETS[styleIndex].label as any, // Use label for better AI context
        aspectRatio,
        highQuality: true,
        baseImage: productImage || undefined,
        posterText
      });
      setCurrentPoster({
        id: Date.now().toString(),
        url: result,
        prompt,
        style: STYLE_PRESETS[styleIndex].label as any,
        aspectRatio,
        timestamp: Date.now()
      });
    } catch (err: any) {
      setErrorType('OTHER');
    } finally {
      setIsGenerating(false);
    }
  };

  const drawToCanvas = async () => {
    if (!currentPoster || !canvasRef.current) return null;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const mainImg = new Image();
    mainImg.crossOrigin = "anonymous";
    mainImg.src = currentPoster.url;
    await new Promise((resolve) => {
      mainImg.onload = resolve;
      mainImg.onerror = resolve;
    });

    canvas.width = mainImg.width;
    canvas.height = mainImg.height;
    ctx.drawImage(mainImg, 0, 0);

    const padding = canvas.width * 0.06;

    if (posterText.trim()) {
      const fontSize = canvas.width * 0.095;
      ctx.font = `bold ${fontSize}px "Prompt", sans-serif`;
      ctx.shadowColor = "rgba(0,0,0,0.9)";
      ctx.shadowBlur = 30;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 10;
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText(posterText, canvas.width / 2, canvas.height - (padding * 2.5));
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
    }

    const logoSize = canvas.width * 0.14;
    let logoXOffset = padding;
    for (const logo of logos) {
      const logoImg = new Image();
      logoImg.src = logo.url;
      await new Promise(r => logoImg.onload = r);
      const h = logoSize * (logoImg.height / logoImg.width);
      ctx.drawImage(logoImg, canvas.width - (logoSize + logoXOffset), padding, logoSize, h);
      logoXOffset += logoSize + 25;
    }

    return canvas.toDataURL('image/png');
  };

  const handleDownload = async () => {
    const dataUrl = await drawToCanvas();
    if (dataUrl) {
      const link = document.createElement('a');
      link.download = `AI-Poster-Pro-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    }
  };

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  useEffect(() => {
    if (currentPoster) {
      const timer = setTimeout(() => {
        drawToCanvas().then(url => setPreviewUrl(url));
      }, 400);
      return () => clearTimeout(timer);
    } else {
      setPreviewUrl(null);
    }
  }, [currentPoster, posterText, logos]);

  return (
    <div className="min-h-screen bg-[#020408] text-slate-200 flex flex-col font-['Prompt']">
      {/* Premium Navbar */}
      <nav className="border-b border-white/5 bg-black/80 backdrop-blur-3xl sticky top-0 z-50 px-8 py-6 flex items-center justify-between shadow-[0_10px_50px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-5">
          <div className="bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 p-3 rounded-[20px] shadow-[0_0_25px_rgba(245,158,11,0.4)]">
            <Sparkles className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight leading-none uppercase italic">POSTER <span className="text-amber-500">PRO</span></h1>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
              <p className="text-[10px] font-black text-slate-500 tracking-[0.3em] uppercase">Hybrid AI Engine Active</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-5">
          <div className={`px-6 py-2.5 rounded-full border-[1.5px] text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all duration-500 ${
            keyStatus === 'valid' ? 'bg-amber-500/5 border-amber-500/20 text-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.1)]' : 'bg-red-500/5 border-red-500/20 text-red-400'
          }`}>
            <Globe className="w-3 h-3" />
            {keyStatus === 'valid' ? 'Gemini Free Tier' : 'Offline'}
          </div>
        </div>
      </nav>

      <main className="flex-1 container mx-auto p-4 lg:p-10 grid lg:grid-cols-12 gap-10 overflow-hidden">
        {/* Sidebar Controls */}
        <div className="lg:col-span-4 space-y-6 h-full overflow-y-auto pr-3 custom-scrollbar pb-20">
          <div className="bg-gradient-to-b from-white/[0.07] to-white/[0.02] rounded-[50px] p-9 space-y-10 border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.6)] backdrop-blur-xl relative overflow-hidden">
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-amber-500/10 blur-[100px] rounded-full pointer-events-none"></div>
            
            <div className="space-y-5">
              <label className="text-[11px] font-black text-amber-500 uppercase tracking-[0.3em] flex items-center justify-between px-1">
                <span>01. โลโก้แบรนด์</span>
              </label>
              <div className="flex flex-wrap gap-4">
                {logos.map(logo => (
                  <div key={logo.id} className="relative w-16 h-16 bg-white rounded-2xl shadow-2xl border border-white/10 group animate-in zoom-in duration-300">
                    <img src={logo.url} className="w-full h-full object-contain p-2" />
                    <button onClick={() => setLogos(l => l.filter(x => x.id !== logo.id))} className="absolute -top-2.5 -right-2.5 bg-red-600 rounded-full p-1.5 shadow-xl opacity-0 group-hover:opacity-100 transition-all border-2 border-black"><X className="w-3 h-3 text-white" /></button>
                  </div>
                ))}
                <label className="w-16 h-16 border-2 border-dashed border-white/10 rounded-2xl flex items-center justify-center cursor-pointer hover:bg-amber-500/5 hover:border-amber-500/50 transition-all duration-300 group">
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => setLogos(prev => [...prev, { id: Date.now().toString(), url: ev.target?.result as string }]);
                      reader.readAsDataURL(file);
                    }
                  }} />
                  <Plus className="w-6 h-6 text-white/10 group-hover:text-amber-500 transition-colors" />
                </label>
              </div>
            </div>

            <div className="space-y-5">
              <label className="text-[11px] font-black text-amber-500 uppercase tracking-[0.3em] px-1">02. ผลิตภัณฑ์หลัก</label>
              <label className="block w-full h-44 border-[1.5px] border-white/10 rounded-[40px] cursor-pointer relative overflow-hidden bg-black/60 hover:border-amber-500/40 transition-all duration-500 group shadow-inner">
                <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => setProductImage(ev.target?.result as string);
                    reader.readAsDataURL(file);
                  }
                }} />
                {productImage ? (
                  <img src={productImage} className="w-full h-full object-contain p-5 animate-in fade-in" />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-30 group-hover:opacity-100 transition-all duration-500">
                    <ImageIcon className="w-8 h-8 text-slate-400 mb-4 group-hover:text-amber-500" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Upload Photo</span>
                  </div>
                )}
              </label>
            </div>

            <div className="space-y-5">
              <label className="text-[11px] font-black text-amber-500 uppercase tracking-[0.3em] px-1">03. พาดหัวภาษาไทย</label>
              <input 
                type="text" 
                value={posterText} 
                onChange={e => setPosterText(e.target.value)} 
                placeholder="เช่น 'น่านนากาแฟ อาราบิก้า 100%'" 
                className="w-full bg-black/80 border border-white/10 rounded-2xl px-7 py-5 text-[13px] outline-none focus:border-amber-500/60 transition-all shadow-inner text-white placeholder:text-slate-700 font-medium" 
              />
            </div>

            <div className="space-y-5">
              <label className="text-[11px] font-black text-amber-500 uppercase tracking-[0.3em] px-1">04. รายละเอียดสินค้า</label>
              <textarea 
                value={prompt} 
                onChange={e => setPrompt(e.target.value)} 
                placeholder="บอกลักษณะสินค้า เพื่อให้ AI ช่วยจินตนาการพื้นหลัง..." 
                className="w-full bg-black/80 border border-white/10 rounded-[30px] p-7 text-[13px] outline-none focus:border-amber-500/60 h-32 resize-none transition-all shadow-inner text-white placeholder:text-slate-700 font-medium leading-relaxed" 
              />
            </div>

            <div className="space-y-5">
              <label className="text-[11px] font-black text-amber-500 uppercase tracking-[0.3em] px-1">05. สไตล์และอัตราส่วน</label>
              <div className="grid grid-cols-2 gap-5">
                <select 
                  value={styleIndex} 
                  onChange={e => setStyleIndex(Number(e.target.value))} 
                  className="w-full bg-black/90 border border-white/10 rounded-2xl px-5 py-5 text-[11px] font-black outline-none hover:border-amber-500/40 transition-all appearance-none text-amber-100 cursor-pointer uppercase"
                >
                  {STYLE_PRESETS.map((s, i) => <option key={i} value={i}>{s.label}</option>)}
                </select>
                <select 
                  value={aspectRatio} 
                  onChange={e => setAspectRatio(e.target.value as any)} 
                  className="w-full bg-black/90 border border-white/10 rounded-2xl px-5 py-5 text-[11px] font-black outline-none hover:border-amber-500/40 transition-all appearance-none text-amber-100 cursor-pointer uppercase"
                >
                  {ASPECT_RATIOS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </div>
            </div>

            <button 
              onClick={handleGenerate} 
              disabled={isGenerating} 
              className="w-full py-7 rounded-[45px] font-black text-[14px] uppercase tracking-[0.3em] flex items-center justify-center gap-4 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_20px_50px_rgba(217,119,6,0.4)] disabled:opacity-50 disabled:grayscale relative overflow-hidden group/btn"
            >
              <div className="absolute inset-0 bg-white/30 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000"></div>
              {isGenerating ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Rocket className="w-6 h-6" />}
              {isGenerating ? 'Gemini is Thinking...' : 'Generate Masterpiece'}
            </button>
          </div>
        </div>

        {/* Result Area */}
        <div className="lg:col-span-8 flex flex-col items-center justify-center bg-[#030508] border border-white/[0.03] rounded-[80px] p-12 relative overflow-hidden h-full shadow-inner">
           <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/[0.03] blur-[150px] rounded-full"></div>
           
           {isGenerating ? (
             <div className="text-center space-y-10 relative z-10">
                <div className="relative">
                    <div className="w-32 h-32 border-4 border-amber-500/10 rounded-full mx-auto"></div>
                    <div className="w-32 h-32 border-t-4 border-amber-500 rounded-full animate-spin mx-auto absolute top-0 left-1/2 -translate-x-1/2 shadow-[0_0_50px_rgba(245,158,11,0.5)]"></div>
                </div>
                <div className="space-y-3">
                  <p className="text-amber-500 font-black text-lg tracking-[0.5em] uppercase animate-pulse">Processing Masterpiece</p>
                  <p className="text-slate-600 text-[11px] uppercase font-bold tracking-[0.2em] max-w-xs mx-auto leading-relaxed">Using Hybrid Intelligence to create your vision for free</p>
                </div>
             </div>
           ) : previewUrl ? (
             <div className="w-full h-full flex flex-col items-center justify-center gap-12 relative z-10 animate-in zoom-in fade-in duration-1000">
               <div className="relative shadow-[0_80px_150px_-40px_rgba(0,0,0,1)] rounded-[60px] overflow-hidden bg-black border border-white/10 max-w-full max-h-[75vh] group/result transition-all duration-700 hover:shadow-amber-500/5">
                 <img src={previewUrl} className="max-h-full w-auto block transition-transform duration-1000 group-hover/result:scale-[1.03]" alt="AI Poster Result" />
               </div>
               <div className="flex gap-6">
                  <button 
                    onClick={handleDownload} 
                    className="bg-white text-black px-20 py-6 rounded-full font-black text-[13px] uppercase tracking-[0.2em] flex items-center gap-4 shadow-[0_20px_40px_rgba(255,255,255,0.1)] hover:scale-105 active:scale-95 transition-all hover:bg-amber-50"
                  >
                    <Download className="w-6 h-6" /> Download 4K HD
                  </button>
                  <button 
                    onClick={() => { setCurrentPoster(null); setPreviewUrl(null); }} 
                    className="bg-white/5 border border-white/10 text-white/50 px-12 py-6 rounded-full font-black text-[13px] uppercase tracking-[0.2em] hover:bg-white/10 transition-all hover:text-white"
                  >
                    New Design
                  </button>
               </div>
             </div>
           ) : (
             <div className="opacity-20 flex flex-col items-center gap-10 relative z-10 select-none text-center">
                <div className="w-40 h-40 bg-white/[0.02] rounded-[60px] flex items-center justify-center border border-white/5 rotate-12 shadow-2xl">
                  <ImageIcon className="w-16 h-16 text-slate-500 -rotate-12" />
                </div>
                <div className="space-y-3">
                  <p className="text-sm font-black tracking-[0.8em] uppercase text-slate-400">Masterpiece Studio</p>
                  <p className="text-[11px] text-slate-600 font-bold uppercase tracking-[0.3em]">Hybrid Engine: No Credit Card Required</p>
                </div>
             </div>
           )}
           <canvas ref={canvasRef} className="hidden" />
        </div>
      </main>
    </div>
  );
};

export default App;
