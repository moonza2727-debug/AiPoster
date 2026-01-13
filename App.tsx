
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Sparkles, 
  Image as ImageIcon, 
  Download, 
  History, 
  Settings2, 
  AlertCircle,
  RefreshCw,
  Zap,
  X,
  Eye,
  EyeOff,
  Plus,
  Type,
  Layout,
  Info,
  Layers,
  ShieldCheck,
  Wand2,
  Copy,
  Check
} from 'lucide-react';
import { AspectRatio, PosterStyle, GeneratedPoster, GenerationConfig } from './types';
import { STYLE_PRESETS, ASPECT_RATIOS, LOADING_MESSAGES } from './constants';
import { generatePosterImage, openKeySelector, generatePosterSlogan } from './services/gemini';

interface Logo {
  id: string;
  url: string;
  visible: boolean;
}

const App: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [posterText, setPosterText] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<PosterStyle>(PosterStyle.OTOP_PREMIUM);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.SQUARE);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSloganLoading, setIsSloganLoading] = useState(false);
  const [aiSlogans, setAiSlogans] = useState<string[]>([]);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
  const [productImage, setProductImage] = useState<string | null>(null);
  const [logos, setLogos] = useState<Logo[]>([]);
  const [removeBg, setRemoveBg] = useState(true);
  
  const [history, setHistory] = useState<GeneratedPoster[]>([]);
  const [currentPoster, setCurrentPoster] = useState<GeneratedPoster | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let interval: number;
    if (isGenerating) {
      interval = window.setInterval(() => {
        setLoadingMsgIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  const handleProductUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setProductImage(event.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const newLogo: Logo = {
        id: Date.now().toString(),
        url: event.target?.result as string,
        visible: true
      };
      setLogos(prev => [...prev, newLogo]);
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = (id: string) => setLogos(prev => prev.filter(l => l.id !== id));
  const toggleLogoVisibility = (id: string) => setLogos(prev => prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l));

  const handleAiSlogan = async () => {
    if (!prompt.trim()) {
      setError("กรุณาพิมพ์รายละเอียดสินค้าก่อน เพื่อให้ AI ช่วยคิดคำพาดหัวครับ");
      return;
    }
    setIsSloganLoading(true);
    setAiSlogans([]);
    try {
      const slogans = await generatePosterSlogan(prompt);
      setAiSlogans(slogans);
    } catch (err: any) {
      setError("AI ช่วยคิดคำไม่ได้ในขณะนี้ กรุณาลองใหม่");
    } finally {
      setIsSloganLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && !productImage && !posterText.trim()) {
      setError("กรุณาใส่ข้อมูลเพื่อเริ่มการออกแบบครับ");
      return;
    }

    setError(null);
    setIsGenerating(true);
    
    try {
      const result = await generatePosterImage({
        prompt: prompt || "Premium product display",
        style: selectedStyle,
        aspectRatio,
        highQuality: true,
        baseImage: productImage || undefined,
        removeBackground: removeBg,
        posterText: posterText 
      });

      const newPoster: GeneratedPoster = {
        id: Date.now().toString(),
        url: result,
        prompt,
        style: selectedStyle,
        aspectRatio,
        timestamp: Date.now()
      };

      setCurrentPoster(newPoster);
      setHistory(prev => [newPoster, ...prev].slice(0, 10));
    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI");
    } finally {
      setIsGenerating(false);
    }
  };

  const renderFinalImage = useCallback(async () => {
    if (!currentPoster || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const mainImg = new Image();
    mainImg.crossOrigin = "anonymous";
    mainImg.src = currentPoster.url;
    
    await new Promise((resolve, reject) => { 
      mainImg.onload = resolve; 
      mainImg.onerror = reject;
    });

    canvas.width = mainImg.width;
    canvas.height = mainImg.height;
    ctx.drawImage(mainImg, 0, 0);

    const visibleLogos = logos.filter(l => l.visible);
    const logoSize = canvas.width * 0.14;
    const padding = canvas.width * 0.04;
    
    for (let i = 0; i < visibleLogos.length; i++) {
      const logoImg = new Image();
      logoImg.src = visibleLogos[i].url;
      await new Promise((resolve, reject) => { 
        logoImg.onload = resolve; 
        logoImg.onerror = reject;
      });
      const aspect = logoImg.height / logoImg.width;
      const w = logoSize;
      const h = logoSize * aspect;
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.4)";
      ctx.shadowBlur = 15;
      ctx.shadowOffsetY = 5;
      ctx.drawImage(logoImg, canvas.width - ((i + 1) * (w + padding)), padding, w, h);
      ctx.restore();
    }
  }, [currentPoster, logos]);

  const downloadImage = async () => {
    if (!currentPoster) return;
    try {
      setIsGenerating(true);
      await renderFinalImage();
      const link = document.createElement('a');
      link.href = canvasRef.current!.toDataURL('image/png', 1.0);
      link.download = `poster-ai-${Date.now()}.png`;
      link.click();
    } catch (err) {
      setError("ไม่สามารถดาวน์โหลดภาพได้ในขณะนี้");
    } finally {
      setIsGenerating(false);
    }
  };

  const copySlogan = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setPosterText(text);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#020408] text-slate-200 selection:bg-amber-500/30">
      {/* Navbar */}
      <nav className="glass sticky top-0 z-50 px-6 md:px-12 py-5 flex items-center justify-between border-b border-white/5 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-tr from-amber-500 to-orange-600 p-2.5 rounded-2xl shadow-lg shadow-orange-600/20">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-white uppercase italic">AI <span className="text-amber-500">POSTER</span></h1>
            <p className="text-[9px] uppercase tracking-[0.3em] text-slate-500 font-bold flex items-center gap-2">
               <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
               Smart Design Studio
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex flex-col items-end mr-4">
            <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1">
              <ShieldCheck className="w-2.5 h-2.5" /> Public System
            </span>
            <span className="text-[10px] font-black text-amber-500 uppercase tracking-tighter">AI-POWERED STUDIO</span>
          </div>
          <div className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span className="text-[10px] font-black text-amber-500 uppercase">PRO</span>
          </div>
        </div>
      </nav>

      <main className="flex-1 container mx-auto p-4 md:p-10 flex flex-col lg:flex-row gap-10">
        <div className="w-full lg:w-[440px] flex flex-col gap-6 shrink-0 lg:sticky lg:top-28 lg:self-start">
          
          <section className="glass rounded-[40px] p-8 border-white/10 space-y-8 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full"></div>
            <h3 className="text-[11px] font-black text-amber-500 flex items-center gap-3 uppercase tracking-[0.3em] border-b border-white/5 pb-5">
              <Layout className="w-4 h-4" /> 01. อัปโหลดรูปและโลโก้
            </h3>

            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] text-slate-500 uppercase font-black tracking-widest ml-1">รูปถ่ายสินค้า (Product)</label>
                <label className="relative flex flex-col items-center justify-center min-h-[160px] w-full bg-slate-900/40 border-2 border-dashed border-white/10 rounded-[32px] cursor-pointer hover:border-amber-500/50 transition-all group overflow-hidden">
                  <input type="file" className="hidden" accept="image/*" onChange={handleProductUpload} />
                  {productImage ? (
                    <div className="relative w-full h-full">
                      <img src={productImage} className="w-full h-full object-cover" alt="Product" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                         <span className="text-[10px] font-black text-white uppercase tracking-widest">คลิกเพื่อเปลี่ยนรูป</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center group-hover:scale-110 transition-transform">
                      <ImageIcon className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                      <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest">อัปโหลดรูปสินค้า</span>
                    </div>
                  )}
                </label>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] text-slate-500 uppercase font-black tracking-widest ml-1">โลโก้แบรนด์ (Logos)</label>
                <div className="grid grid-cols-4 gap-4">
                  {logos.map(logo => (
                    <div key={logo.id} className="relative group aspect-square bg-slate-900/60 rounded-2xl border border-white/10 p-2 shadow-inner">
                      <img src={logo.url} className={`w-full h-full object-contain ${logo.visible ? 'opacity-100' : 'opacity-20'}`} alt="Logo" />
                      <button onClick={() => removeLogo(logo.id)} className="absolute -top-2 -right-2 bg-red-500 p-1.5 rounded-full shadow-lg hover:scale-110 transition-transform"><X className="w-3 h-3 text-white" /></button>
                      <button onClick={() => toggleLogoVisibility(logo.id)} className="absolute -top-2 -left-2 bg-slate-800 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg">
                        {logo.visible ? <Eye className="w-3 h-3 text-white" /> : <EyeOff className="w-3 h-3 text-white" />}
                      </button>
                    </div>
                  ))}
                  <label className="aspect-square flex flex-col items-center justify-center bg-white/5 border-2 border-dashed border-white/10 rounded-2xl cursor-pointer hover:bg-white/10 transition-all group">
                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                    <Plus className="w-6 h-6 text-slate-700 group-hover:text-amber-500 transition-colors" />
                  </label>
                </div>
              </div>
            </div>
          </section>

          <section className="glass rounded-[40px] p-8 border-white/10 space-y-8 shadow-xl">
            <h3 className="text-[11px] font-black text-amber-500 flex items-center gap-3 uppercase tracking-[0.3em] border-b border-white/5 pb-5">
              <Settings2 className="w-4 h-4" /> 02. ปรับแต่งเนื้อหา AI
            </h3>

            <div className="space-y-6">
              <div className="space-y-3">
                 <label className="text-[10px] text-slate-500 uppercase font-black tracking-widest ml-1">รายละเอียดสินค้า</label>
                 <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="เช่น: เครื่องดื่มเพื่อสุขภาพ ผสมน้ำผึ้งแท้..."
                  className="w-full h-24 bg-slate-900/40 border border-white/10 rounded-2xl p-5 text-sm outline-none resize-none focus:ring-2 focus:ring-amber-500 transition-all placeholder:text-slate-700"
                />
              </div>

              <div className="bg-amber-500/5 p-6 rounded-[32px] border border-amber-500/10 shadow-inner">
                <div className="flex items-center justify-between mb-4">
                  <label className="flex items-center gap-2 text-[10px] text-amber-500 uppercase font-black tracking-widest">
                    <Type className="w-4 h-4" /> ข้อความหลัก
                  </label>
                  <button 
                    onClick={handleAiSlogan}
                    disabled={isSloganLoading}
                    className="flex items-center gap-2 bg-amber-500 text-slate-950 px-3 py-1 rounded-full text-[9px] font-black hover:bg-amber-400 transition-all disabled:opacity-50"
                  >
                    {isSloganLoading ? <RefreshCw className="animate-spin w-3 h-3" /> : <Wand2 className="w-3 h-3" />}
                    AI ช่วยคิดคำ
                  </button>
                </div>
                
                <input
                  type="text"
                  value={posterText}
                  onChange={(e) => setPosterText(e.target.value)}
                  placeholder="เช่น: PREMIUM QUALITY"
                  className="w-full bg-slate-950 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none text-white focus:ring-2 focus:ring-amber-500 transition-all mb-4"
                />

                {aiSlogans.length > 0 && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-500">
                    <p className="text-[8px] text-slate-600 uppercase font-black tracking-widest mb-1">เลือกคำที่ชอบ:</p>
                    <div className="flex flex-col gap-2">
                      {aiSlogans.map((s, idx) => (
                        <button 
                          key={idx}
                          onClick={() => copySlogan(s, idx)}
                          className={`text-[9px] w-full flex items-center justify-between px-4 py-2.5 rounded-xl border transition-all text-left ${
                            posterText === s ? 'bg-amber-500/10 border-amber-500/50 text-amber-500' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                          }`}
                        >
                          <span className="truncate">{s}</span>
                          {copiedIndex === idx ? <Check className="w-3 h-3 shrink-0" /> : <Copy className="w-3 h-3 shrink-0 opacity-40" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <label className="text-[10px] text-slate-500 uppercase font-black tracking-widest ml-1">ขนาดภาพ</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {ASPECT_RATIOS.map((ratio) => (
                    <button
                      key={ratio.id}
                      onClick={() => setAspectRatio(ratio.id as AspectRatio)}
                      className={`text-[10px] py-3 rounded-xl border font-black transition-all ${
                        aspectRatio === ratio.id ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-lg scale-105' : 'bg-slate-900/60 border-white/5 text-slate-500 hover:bg-white/5'
                      }`}
                    >
                      {ratio.id}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] text-slate-500 uppercase font-black tracking-widest ml-1">สไตล์งานดีไซน์</label>
                <div className="grid grid-cols-2 gap-2">
                  {STYLE_PRESETS.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setSelectedStyle(style.label as PosterStyle)}
                      className={`text-[10px] py-4 px-3 rounded-2xl border font-black uppercase tracking-tighter transition-all ${
                        selectedStyle === style.label ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-xl' : 'bg-slate-900/60 border-white/5 text-slate-600 hover:text-slate-400'
                      }`}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-5 bg-slate-900/40 rounded-3xl border border-white/5">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-200 uppercase tracking-widest">Remove Background</span>
                  <span className="text-[9px] text-slate-600 font-bold italic">ลบฉากหลังสินค้าออกอัตโนมัติ</span>
                </div>
                <input type="checkbox" checked={removeBg} onChange={() => setRemoveBg(!removeBg)} className="w-5 h-5 accent-amber-500 rounded-md cursor-pointer" />
              </div>
            </div>

            {error && (
              <div className="p-5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-3xl text-[10px] flex gap-3 font-bold animate-shake">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className={`w-full py-6 rounded-[35px] flex items-center justify-center gap-4 font-black uppercase tracking-[0.4em] transition-all text-[11px] shadow-2xl ${
                isGenerating ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:shadow-orange-600/40 active:scale-95 shadow-orange-600/10'
              }`}
            >
              {isGenerating ? <RefreshCw className="animate-spin w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
              <span>{isGenerating ? "กำลังสร้างสรรค์..." : "สร้างโปสเตอร์อัจฉริยะ"}</span>
            </button>
          </section>
        </div>

        <div className="flex-1 flex flex-col gap-10">
          <div className="glass rounded-[60px] p-6 md:p-14 flex flex-col items-center justify-center min-h-[660px] border-white/5 relative overflow-hidden shadow-2xl">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
            
            {isGenerating ? (
              <div className="text-center space-y-10 z-10 animate-pulse">
                <div className="w-24 h-24 border-[3px] border-amber-500/10 border-t-amber-500 rounded-full animate-spin mx-auto shadow-lg shadow-amber-500/20"></div>
                <div className="space-y-4">
                  <h3 className="text-2xl font-black text-white uppercase tracking-[0.2em] italic max-w-lg mx-auto leading-relaxed">{LOADING_MESSAGES[loadingMsgIndex]}</h3>
                  <p className="text-slate-600 text-[10px] font-black tracking-[0.5em] uppercase">Powered by Gemini AI Engine</p>
                </div>
              </div>
            ) : currentPoster ? (
              <div className="w-full flex flex-col gap-10 items-center animate-in fade-in zoom-in-95 duration-1000">
                <div className="relative group max-w-full shadow-[0_50px_100px_rgba(0,0,0,0.8)] rounded-[50px] overflow-hidden border border-white/10 bg-black p-2 transition-transform hover:scale-[1.01] cursor-zoom-in">
                  <canvas ref={canvasRef} className="hidden" />
                  <img src={currentPoster.url} alt="Result" className="max-h-[600px] w-auto rounded-[46px] object-contain shadow-2xl" />
                  <div className="absolute top-10 right-10 flex flex-row-reverse gap-4 drop-shadow-2xl pointer-events-none">
                    {logos.filter(l => l.visible).map((logo) => (
                      <img key={logo.id} src={logo.url} className="w-20 md:w-28 h-auto object-contain" alt="Logo Overlay" />
                    ))}
                  </div>
                </div>
                <div className="flex flex-col items-center gap-4">
                   <button 
                    onClick={downloadImage} 
                    className="bg-white text-slate-950 px-16 py-6 rounded-[35px] font-black text-xs uppercase tracking-[0.5em] flex items-center gap-4 hover:bg-amber-400 transition-all shadow-2xl hover:scale-105 active:scale-95"
                  >
                    <Download className="w-6 h-6" /> DOWNLOAD FINAL DESIGN
                  </button>
                  <div className="flex items-center gap-3">
                     <div className="px-4 py-1.5 bg-slate-900/80 rounded-full border border-white/5 flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">ASPECT: {currentPoster.aspectRatio}</span>
                     </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center max-w-md space-y-12 z-10">
                <div className="w-32 h-32 bg-slate-950 rounded-[45px] flex items-center justify-center mx-auto border border-white/5 shadow-2xl relative group">
                  <ImageIcon className="w-14 h-14 text-slate-800 group-hover:text-amber-500/50 transition-colors" />
                  <div className="absolute inset-0 bg-amber-500/5 blur-[100px] rounded-full group-hover:bg-amber-500/10 transition-colors"></div>
                </div>
                <div className="space-y-5">
                  <h3 className="text-4xl font-black text-white uppercase tracking-tighter italic">AI DESIGN STUDIO</h3>
                  <p className="text-slate-500 text-sm font-bold uppercase tracking-widest leading-loose">
                    สร้างสรรค์ผลงานโฆษณาระดับมืออาชีพ <br/> ด้วยขุมพลัง AI รุ่นล่าสุด
                  </p>
                </div>
              </div>
            )}
          </div>

          <section className="glass rounded-[40px] p-8 border-white/5 shadow-2xl overflow-hidden relative">
            <div className="flex items-center gap-4 mb-6">
              <History className="w-4 h-4 text-slate-600" />
              <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.6em]">ผลงานล่าสุดของคุณ</h4>
              <div className="h-px flex-1 bg-white/5"></div>
            </div>
            <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide px-2 snap-x snap-mandatory">
              {history.map(item => (
                <div 
                  key={item.id} 
                  onClick={() => setCurrentPoster(item)} 
                  className={`min-w-[140px] aspect-[3/4] rounded-[28px] overflow-hidden cursor-pointer border-2 transition-all duration-500 snap-center ${
                    currentPoster?.id === item.id ? 'border-amber-500 scale-105 shadow-xl shadow-amber-500/20' : 'border-transparent opacity-40 hover:opacity-100'
                  }`}
                >
                  <img src={item.url} className="w-full h-full object-cover" alt="History Item" />
                </div>
              ))}
              {history.length === 0 && <p className="text-[10px] text-slate-800 font-black uppercase tracking-[0.5em] italic py-10 w-full text-center">Your creative journey begins here</p>}
            </div>
          </section>
        </div>
      </main>

      <footer className="p-12 text-center border-t border-white/5 bg-black/40">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap items-center justify-center gap-10 text-[10px] text-slate-700 font-black uppercase tracking-[0.5em]">
            <span>PROFESSIONAL DESIGN</span>
            <div className="hidden md:block w-1.5 h-1.5 bg-slate-800 rounded-full"></div>
            <span>FAST GENERATION</span>
            <div className="hidden md:block w-1.5 h-1.5 bg-slate-800 rounded-full"></div>
            <span>HD EXPORT</span>
          </div>
          <div className="h-px w-24 bg-white/5"></div>
          <div className="flex flex-col gap-2">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
              AI Smart Poster Tool
            </p>
            <p className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">
              © 2025 AI Creative Design
            </p>
          </div>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
        .animate-shake { animation: shake 0.3s ease-in-out; }
        .snap-x { scroll-snap-type: x mandatory; }
        .snap-center { scroll-snap-align: center; }
      ` }} />
    </div>
  );
};

export default App;
