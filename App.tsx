
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Sparkles, 
  Image as ImageIcon, 
  Download, 
  History, 
  Settings2, 
  AlertCircle,
  RefreshCw,
  X,
  Eye,
  EyeOff,
  Plus,
  Type,
  Layout,
  Layers,
  ShieldCheck,
  Wand2,
  Copy,
  Check,
  Key,
  ArrowRight,
  Clock,
  AlertTriangle,
  Eraser,
  Wand
} from 'lucide-react';
import { AspectRatio, PosterStyle, GeneratedPoster, GenerationConfig } from './types';
import { STYLE_PRESETS, ASPECT_RATIOS, LOADING_MESSAGES } from './constants';
import { generatePosterImage, openKeySelector, generatePosterSlogan, hasApiKey } from './services/gemini';

interface Logo {
  id: string;
  url: string;
  visible: boolean;
  isMagicApplied: boolean;
  originalUrl: string;
}

const App: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [posterText, setPosterText] = useState('');
  const [styleIndex, setStyleIndex] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.SQUARE);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSloganLoading, setIsSloganLoading] = useState(false);
  const [aiSlogans, setAiSlogans] = useState<string[]>([]);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isKeySelected, setIsKeySelected] = useState(false);
  
  const [productImage, setProductImage] = useState<string | null>(null);
  const [logos, setLogos] = useState<Logo[]>([]);
  const [removeBg, setRemoveBg] = useState(true);
  
  const [history, setHistory] = useState<GeneratedPoster[]>([]);
  const [currentPoster, setCurrentPoster] = useState<GeneratedPoster | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const checkKey = async () => {
      const selected = await hasApiKey();
      setIsKeySelected(selected);
    };
    checkKey();
    const interval = setInterval(checkKey, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let interval: number;
    if (isGenerating) {
      interval = window.setInterval(() => {
        setLoadingMsgIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  const handleOpenKey = async () => {
    await openKeySelector();
    setIsKeySelected(true);
    setError(null);
  };

  const handleProductUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setProductImage(event.target?.result as string);
    reader.readAsDataURL(file);
  };

  const removeWhiteBackground = (base64: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(base64);
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          // หากพิกเซลใกล้เคียงสีขาว (Threshold 240) ให้ทำให้โปร่งใส
          if (r > 235 && g > 235 && b > 235) {
            data[i + 3] = 0;
          }
        }
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const url = event.target?.result as string;
      const newLogo: Logo = {
        id: Date.now().toString(),
        url: url,
        originalUrl: url,
        visible: true,
        isMagicApplied: false
      };
      setLogos(prev => [...prev, newLogo]);
    };
    reader.readAsDataURL(file);
  };

  const toggleLogoMagic = async (id: string) => {
    const logo = logos.find(l => l.id === id);
    if (!logo) return;
    
    if (logo.isMagicApplied) {
      setLogos(prev => prev.map(l => l.id === id ? { ...l, url: l.originalUrl, isMagicApplied: false } : l));
    } else {
      const transparentUrl = await removeWhiteBackground(logo.originalUrl);
      setLogos(prev => prev.map(l => l.id === id ? { ...l, url: transparentUrl, isMagicApplied: true } : l));
    }
  };

  const removeLogo = (id: string) => setLogos(prev => prev.filter(l => l.id !== id));
  const toggleLogoVisibility = (id: string) => setLogos(prev => prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l));

  const handleAiSlogan = async () => {
    if (!prompt.trim()) {
      setError("กรุณาพิมพ์รายละเอียดสินค้าก่อน เพื่อให้ AI ช่วยคิดคำพาดหัวครับ");
      return;
    }
    setIsSloganLoading(true);
    setError(null);
    setAiSlogans([]);
    try {
      const slogans = await generatePosterSlogan(prompt);
      setAiSlogans(slogans);
    } catch (err: any) {
      if (err.message === "QUOTA_EXCEEDED") setError("QUOTA");
      else setError(err.message || "เกิดข้อผิดพลาด");
    } finally {
      setIsSloganLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && !productImage && !posterText.trim()) {
      setError("กรุณาใส่รายละเอียดสินค้าหรืออัปโหลดรูปภาพก่อนครับ");
      return;
    }

    setError(null);
    setIsGenerating(true);
    
    try {
      const result = await generatePosterImage({
        prompt: prompt || "Product display",
        style: STYLE_PRESETS[styleIndex].prompt as any, 
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
        style: STYLE_PRESETS[styleIndex].label as any,
        aspectRatio,
        timestamp: Date.now()
      };

      setCurrentPoster(newPoster);
      setHistory(prev => [newPoster, ...prev].slice(0, 10));
    } catch (err: any) {
      if (err.message === "QUOTA_EXCEEDED") {
        setError("QUOTA");
      } else if (err.message === "SAFETY_BLOCK") {
        setError("AI ปฏิเสธการสร้างรูปนี้เนื่องจากขัดต่อกฎความปลอดภัย (ลองเปลี่ยนคำบรรยายดูครับ)");
      } else {
        setError(err.message || "เกิดข้อผิดพลาดทางเทคนิค");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = async () => {
    if (!currentPoster || !canvasRef.current) return;
    try {
      setIsGenerating(true);
      await renderFinalImage();
      const link = document.createElement('a');
      link.href = canvasRef.current!.toDataURL('image/png', 1.0);
      link.download = `ai-poster-${Date.now()}.png`;
      link.click();
    } catch (err) {
      setError("ไม่สามารถดาวน์โหลดได้");
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
    await new Promise(r => mainImg.onload = r);
    canvas.width = mainImg.width;
    canvas.height = mainImg.height;
    ctx.drawImage(mainImg, 0, 0);
    
    const logoBaseSize = canvas.width * 0.12;
    const padding = canvas.width * 0.04;
    const visibleLogos = logos.filter(l => l.visible);
    
    for (let i = 0; i < visibleLogos.length; i++) {
      const logoImg = new Image();
      logoImg.src = visibleLogos[i].url;
      await new Promise(r => logoImg.onload = r);
      const aspect = logoImg.height / logoImg.width;
      const w = logoBaseSize;
      const h = logoBaseSize * aspect;
      
      ctx.save();
      // หากยังไม่ได้ลบพื้นหลัง อาจจะเพิ่มเงาบางๆ เพื่อช่วยให้ดูดีขึ้น
      if (!visibleLogos[i].isMagicApplied) {
        ctx.shadowColor = "rgba(0,0,0,0.15)";
        ctx.shadowBlur = 15;
      }
      ctx.drawImage(logoImg, canvas.width - ((i + 1) * (w + padding)), padding, w, h);
      ctx.restore();
    }
  }, [currentPoster, logos]);

  const copySlogan = (text: string, index: number) => {
    setPosterText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#020408] text-slate-200">
      <nav className="glass sticky top-0 z-50 px-6 py-5 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-tr from-amber-500 to-orange-600 p-2 rounded-2xl">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white italic uppercase">AI <span className="text-amber-500">POSTER</span></h1>
            <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Smart Design Studio</p>
          </div>
        </div>
        <button 
          onClick={handleOpenKey}
          className={`flex items-center gap-2 px-5 py-2 rounded-full border transition-all text-[10px] font-black uppercase ${
            isKeySelected ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-slate-800 text-slate-300 border-white/10'
          }`}
        >
          {isKeySelected ? <ShieldCheck className="w-3.5 h-3.5" /> : <Key className="w-3.5 h-3.5" />}
          {isKeySelected ? 'Connected' : 'Set API Key (Free)'}
        </button>
      </nav>

      <main className="flex-1 container mx-auto p-4 md:p-10 flex flex-col lg:flex-row gap-10">
        <div className="w-full lg:w-[440px] flex flex-col gap-6">
          <section className="glass rounded-[40px] p-8 border-white/10 space-y-6">
            <h3 className="text-[11px] font-black text-amber-500 flex items-center gap-3 uppercase tracking-widest border-b border-white/5 pb-4">
              <Layout className="w-4 h-4" /> 01. เตรียมข้อมูล
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">รูปถ่ายสินค้า</label>
                <label className="relative flex flex-col items-center justify-center min-h-[140px] w-full bg-slate-900/40 border-2 border-dashed border-white/10 rounded-[30px] cursor-pointer hover:border-amber-500/50 overflow-hidden group">
                  <input type="file" className="hidden" accept="image/*" onChange={handleProductUpload} />
                  {productImage ? <img src={productImage} className="w-full h-full object-cover" /> : (
                    <div className="text-center opacity-40 group-hover:opacity-100 transition-opacity">
                      <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                      <span className="text-[10px] font-black uppercase">เลือกรูปสินค้า</span>
                    </div>
                  )}
                </label>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex justify-between">
                  <span>โลโก้แบรนด์</span>
                  <span className="text-amber-500 text-[8px]">ใช้ Magic Wand ลบพื้นหลังสีขาว</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {logos.map(logo => (
                    <div key={logo.id} className={`relative aspect-square rounded-xl border p-2 group transition-all ${logo.isMagicApplied ? 'bg-slate-800 border-amber-500/30' : 'bg-white border-white/10'}`}>
                      <img src={logo.url} className={`w-full h-full object-contain ${logo.visible ? 'opacity-100' : 'opacity-20'}`} />
                      <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex flex-wrap items-center justify-center gap-1 p-1">
                        <button onClick={() => toggleLogoVisibility(logo.id)} className="p-1 hover:bg-white/10 rounded-md" title="เปิด/ปิดการแสดงผล">
                          {logo.visible ? <Eye className="w-3 h-3 text-white" /> : <EyeOff className="w-3 h-3 text-slate-400" />}
                        </button>
                        <button onClick={() => toggleLogoMagic(logo.id)} className={`p-1 rounded-md ${logo.isMagicApplied ? 'bg-amber-500 text-black' : 'hover:bg-white/10 text-white'}`} title="Magic Wand ลบสีขาว">
                          <Wand className="w-3 h-3" />
                        </button>
                        <button onClick={() => removeLogo(logo.id)} className="p-1 hover:bg-red-500/20 rounded-md">
                          <X className="w-3 h-3 text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <label className="aspect-square flex flex-col items-center justify-center bg-white/5 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:bg-white/10 transition-all">
                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                    <Plus className="w-5 h-5 text-slate-500" />
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 transition-colors hover:bg-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <Eraser className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-200 uppercase tracking-widest">Remove BG</span>
                    <span className="text-[8px] text-slate-500 font-bold uppercase">ลบฉากหลังสินค้าออก</span>
                  </div>
                </div>
                <button 
                  onClick={() => setRemoveBg(!removeBg)}
                  className={`w-12 h-6 rounded-full transition-all relative ${removeBg ? 'bg-amber-500' : 'bg-slate-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${removeBg ? 'left-7' : 'left-1'}`}></div>
                </button>
              </div>

              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="อธิบายสินค้า (ไทย/Eng): เช่น กาแฟคั่วเข้มจากดอยสะจุก รสชาติกลมกล่อม..."
                className="w-full h-28 bg-slate-900/40 border border-white/10 rounded-2xl p-4 text-sm outline-none focus:ring-2 focus:ring-amber-500 transition-all"
              />

              <div className="bg-amber-500/5 p-4 rounded-2xl border border-amber-500/10">
                <div className="flex justify-between mb-2">
                  <span className="text-[10px] font-black text-amber-500 uppercase">Slogan Text</span>
                  <button onClick={handleAiSlogan} disabled={isSloganLoading} className="text-[9px] font-black flex items-center gap-1 text-amber-500 hover:text-amber-400">
                    {isSloganLoading ? <RefreshCw className="animate-spin w-3 h-3" /> : <Wand2 className="w-3 h-3" />} AI คิดคำ
                  </button>
                </div>
                <input value={posterText} onChange={e => setPosterText(e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-xl p-3 text-xs mb-2 outline-none focus:border-amber-500/50" placeholder="ข้อความบนโปสเตอร์..." />
                {aiSlogans.length > 0 && (
                  <div className="flex flex-col gap-1 mt-2 max-h-32 overflow-y-auto pr-1 scrollbar-hide">
                    {aiSlogans.map((s, i) => (
                      <button key={i} onClick={() => copySlogan(s, i)} className="text-[9px] p-2 bg-white/5 rounded-lg text-left hover:bg-white/10 flex justify-between items-center group">
                        <span className="group-hover:text-amber-500 transition-colors">{s}</span> {copiedIndex === i && <Check className="w-3 h-3 text-amber-500" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="glass rounded-[40px] p-8 border-white/10 space-y-6">
            <h3 className="text-[11px] font-black text-amber-500 flex items-center gap-3 uppercase tracking-widest border-b border-white/5 pb-4">
              <Settings2 className="w-4 h-4" /> 02. ปรับแต่งสไตล์
            </h3>
            
            <div className="grid grid-cols-2 gap-2">
              {STYLE_PRESETS.map((style, idx) => (
                <button
                  key={style.id}
                  onClick={() => setStyleIndex(idx)}
                  className={`text-[10px] py-3 px-2 rounded-xl border font-black uppercase transition-all ${
                    styleIndex === idx ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/10' : 'bg-slate-900/60 border-white/5 text-slate-600'
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {ASPECT_RATIOS.map(ratio => (
                <button key={ratio.id} onClick={() => setAspectRatio(ratio.id as any)} className={`px-4 py-2 rounded-lg border text-[10px] font-black shrink-0 transition-all ${aspectRatio === ratio.id ? 'bg-white text-black border-white shadow-lg' : 'bg-slate-900 text-slate-500 border-white/5'}`}>{ratio.id}</button>
              ))}
            </div>
          </section>

          {error && (
            <div className="p-5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-3xl text-[11px] font-bold animate-pulse flex flex-col gap-3">
              <div className="flex gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error === "QUOTA" ? "คิวเต็มชั่วคราว กรุณารอ 60 วินาทีแล้วลองกดใหม่ครับ" : error}</span>
              </div>
              <button onClick={handleGenerate} className="bg-red-500 text-white py-2.5 rounded-xl text-[10px] flex items-center justify-center gap-2 font-black uppercase tracking-widest"><RefreshCw className="w-3.5 h-3.5" /> ลองใหม่อีกครั้ง</button>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className={`w-full py-5 rounded-[30px] flex items-center justify-center gap-3 font-black uppercase transition-all text-[12px] tracking-[0.2em] ${
              isGenerating ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-xl shadow-orange-600/20 active:scale-95'
            }`}
          >
            {isGenerating ? <RefreshCw className="animate-spin w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            <span>{isGenerating ? "กำลังสร้างรูป..." : "สร้างโปสเตอร์เดี๋ยวนี้"}</span>
          </button>
        </div>

        <div className="flex-1 flex flex-col gap-6">
          <div className="glass rounded-[50px] p-6 min-h-[660px] flex flex-col items-center justify-center border-white/5 relative overflow-hidden shadow-2xl">
            {isGenerating ? (
              <div className="text-center space-y-6 z-10">
                <div className="w-16 h-16 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mx-auto shadow-lg shadow-amber-500/20"></div>
                <h3 className="text-xl font-black text-white italic tracking-widest">{LOADING_MESSAGES[loadingMsgIndex]}</h3>
                <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.4em]">Powered by Gemini AI</p>
              </div>
            ) : currentPoster ? (
              <div className="w-full flex flex-col items-center gap-8 animate-in fade-in zoom-in-95 duration-700">
                <div className="relative max-w-full shadow-[0_40px_80px_rgba(0,0,0,0.6)] rounded-[40px] overflow-hidden border border-white/10 bg-black">
                  <canvas ref={canvasRef} className="hidden" />
                  <img src={currentPoster.url} className="max-h-[580px] w-auto" />
                  <div className="absolute top-8 right-8 flex gap-3 drop-shadow-2xl">
                    {logos.filter(l => l.visible).map(l => <img key={l.id} src={l.url} className="w-14 md:w-20 h-auto object-contain" />)}
                  </div>
                </div>
                <button onClick={downloadImage} className="bg-white text-black px-12 py-5 rounded-[25px] font-black text-[11px] uppercase tracking-[0.3em] flex items-center gap-3 hover:bg-amber-400 hover:scale-105 active:scale-95 transition-all shadow-2xl">
                  <Download className="w-5 h-5" /> Download HD Design
                </button>
              </div>
            ) : (
              <div className="text-center space-y-6 opacity-20 group">
                <ImageIcon className="w-20 h-20 mx-auto text-slate-700 group-hover:text-amber-500/50 transition-colors" />
                <p className="font-black uppercase tracking-[0.4em] text-[10px]">Ready to Design Your Story</p>
              </div>
            )}
          </div>

          {history.length > 0 && (
            <div className="glass rounded-[30px] p-6 border-white/5 shadow-xl">
              <h4 className="text-[10px] font-black text-slate-600 uppercase mb-4 flex items-center gap-2 tracking-widest"><History className="w-3.5 h-3.5" /> ผลงานล่าสุด</h4>
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {history.map(item => (
                  <div key={item.id} onClick={() => setCurrentPoster(item)} className="relative shrink-0 group">
                     <img src={item.url} className={`h-28 w-auto rounded-xl border border-white/5 cursor-pointer transition-all duration-300 ${currentPoster?.id === item.id ? 'border-amber-500 ring-2 ring-amber-500/20' : 'opacity-60 hover:opacity-100 hover:scale-105'}`} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="p-10 text-center text-[9px] text-slate-700 font-bold uppercase tracking-[0.6em] italic opacity-40">
        © 2025 AI POSTER STUDIO | Naresuan Design Hub
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
        .animate-shake { animation: shake 0.3s ease-in-out; }
      ` }} />
    </div>
  );
};

export default App;
