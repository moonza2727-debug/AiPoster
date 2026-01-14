
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Sparkles, 
  Image as ImageIcon, 
  Download, 
  History, 
  Settings2, 
  RefreshCw,
  X,
  Plus,
  Type,
  Layout,
  ShieldCheck,
  Wand2,
  Check,
  Key,
  AlertTriangle,
  Eraser,
  Wand,
  ExternalLink
} from 'lucide-react';
import { AspectRatio, GeneratedPoster } from './types';
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

  // ตรวจสอบสถานะ Key ทุกๆ 2 วินาที
  useEffect(() => {
    const checkStatus = async () => {
      const selected = await hasApiKey();
      setIsKeySelected(selected);
    };
    checkStatus();
    const interval = setInterval(checkStatus, 2000);
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
    setError(null);
    await openKeySelector();
    // สมมติว่าสำเร็จทันทีเพื่อลดผลกระทบจาก Race Condition
    setIsKeySelected(true);
  };

  const handleProductUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setProductImage(event.target?.result as string);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      setLogos(prev => [...prev, {
        id: Date.now().toString(),
        url,
        originalUrl: url,
        visible: true,
        isMagicApplied: false
      }]);
    };
    reader.readAsDataURL(file);
  };

  const handleAiSlogan = async () => {
    if (!prompt.trim()) {
      setError("กรุณาพิมพ์รายละเอียดสินค้าก่อนครับ");
      return;
    }
    setIsSloganLoading(true);
    setError(null);
    try {
      const slogans = await generatePosterSlogan(prompt);
      setAiSlogans(slogans);
    } catch (err: any) {
      if (err.message === "MISSING_KEY") {
        handleOpenKey();
        setError("กรุณาเลือก API Key อีกครั้งครับ (ต้องเป็น Paid Project)");
      } else setError("เกิดข้อผิดพลาดในการคิดคำ");
    } finally {
      setIsSloganLoading(false);
    }
  };

  const handleGenerate = async () => {
    // ตรวจสอบสถานะเบื้องต้น
    const keyReady = await hasApiKey();
    if (!keyReady) {
      handleOpenKey();
      return;
    }

    if (!prompt.trim() && !productImage) {
      setError("กรุณาใส่ชื่อสินค้าหรือรูปสินค้าก่อนครับ");
      return;
    }

    setError(null);
    setIsGenerating(true);
    
    try {
      const result = await generatePosterImage({
        prompt: prompt || "Premium product",
        style: STYLE_PRESETS[styleIndex].label as any, 
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
      if (err.message === "MISSING_KEY" || err.message === "KEY_INVALID") {
        setIsKeySelected(false);
        setError("ไม่พบ API Key หรือ Key ไม่ถูกต้อง กรุณากดเลือก Key ใหม่อีกครั้งครับ");
        handleOpenKey();
      } else if (err.message === "QUOTA_EXCEEDED") {
        setError("ขณะนี้มีการใช้งานหนาแน่น กรุณารอสัก 1 นาทีแล้วกดใหม่ครับ");
      } else {
        setError(err.message || "เกิดข้อผิดพลาดในการสร้างภาพ");
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
      link.download = `poster-${Date.now()}.png`;
      link.click();
    } catch (err) {
      setError("ไม่สามารถบันทึกรูปได้");
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
      ctx.drawImage(logoImg, canvas.width - ((i + 1) * (w + padding)), padding, w, h);
    }
  }, [currentPoster, logos]);

  return (
    <div className="min-h-screen flex flex-col bg-[#020408] text-slate-200">
      <nav className="glass sticky top-0 z-[100] px-6 py-5 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-tr from-amber-500 to-orange-600 p-2 rounded-2xl shadow-lg shadow-orange-500/20">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white italic uppercase">AI <span className="text-amber-500">POSTER</span></h1>
            <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Nan Smart Creative</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="hidden md:flex items-center gap-1 text-[9px] font-bold text-slate-500 hover:text-white transition-colors">
            Billing Info <ExternalLink className="w-2.5 h-2.5" />
          </a>
          <button 
            type="button"
            onClick={handleOpenKey}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full border transition-all text-[11px] font-black uppercase ${
              isKeySelected ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-orange-500 border-orange-600 text-white animate-pulse shadow-lg shadow-orange-500/30'
            }`}
          >
            {isKeySelected ? <ShieldCheck className="w-4 h-4" /> : <Key className="w-4 h-4" />}
            {isKeySelected ? 'Connected' : 'Select API Key'}
          </button>
        </div>
      </nav>

      <main className="flex-1 container mx-auto p-4 md:p-10 flex flex-col lg:flex-row gap-10">
        <div className="w-full lg:w-[440px] flex flex-col gap-6">
          <section className="glass rounded-[40px] p-8 border-white/10 space-y-6 shadow-2xl">
            <h3 className="text-[11px] font-black text-amber-500 flex items-center gap-3 uppercase tracking-widest border-b border-white/5 pb-4">
              <Layout className="w-4 h-4" /> 01. ข้อมูลสินค้า
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">รูปสินค้าจริง</label>
                <label className="relative flex flex-col items-center justify-center min-h-[160px] w-full bg-slate-900/60 border-2 border-dashed border-white/10 rounded-[30px] cursor-pointer hover:border-amber-500/50 overflow-hidden group transition-all">
                  <input type="file" className="hidden" accept="image/*" onChange={handleProductUpload} />
                  {productImage ? <img src={productImage} className="w-full h-full object-cover" /> : (
                    <div className="text-center opacity-40 group-hover:opacity-100 transition-opacity">
                      <ImageIcon className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                      <span className="text-[10px] font-black uppercase tracking-widest">คลิกเพื่อเลือกรูปสินค้า</span>
                    </div>
                  )}
                </label>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex justify-between">
                  <span>โลโก้แบรนด์</span>
                  <span className="text-amber-500 text-[8px] animate-pulse">กดเพื่อเพิ่ม</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {logos.map(logo => (
                    <div key={logo.id} className="relative aspect-square rounded-xl border border-white/10 bg-white p-2 group overflow-hidden">
                      <img src={logo.url} className="w-full h-full object-contain" />
                      <button onClick={() => setLogos(prev => prev.filter(l => l.id !== logo.id))} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                  <label className="aspect-square flex items-center justify-center bg-white/5 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:bg-white/10 transition-all">
                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                    <Plus className="w-6 h-6 text-slate-600" />
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-lg"><Eraser className="w-4 h-4 text-amber-500" /></div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-200 uppercase tracking-widest">Replace Background</span>
                    <span className="text-[8px] text-slate-500 font-bold uppercase">ตัดพื้นหลังออโต้โดย AI</span>
                  </div>
                </div>
                <button onClick={() => setRemoveBg(!removeBg)} className={`w-12 h-6 rounded-full transition-all relative ${removeBg ? 'bg-amber-600' : 'bg-slate-700'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${removeBg ? 'left-7' : 'left-1'}`}></div>
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">รายละเอียดสินค้า</label>
                <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="เช่น กาแฟดริปเข้มข้น หอมกลิ่นภูเขา..." className="w-full h-24 bg-slate-900/40 border border-white/10 rounded-2xl p-4 text-sm outline-none focus:ring-2 focus:ring-amber-500/50 transition-all" />
              </div>

              <div className="bg-amber-500/5 p-4 rounded-2xl border border-amber-500/10">
                <div className="flex justify-between mb-2">
                  <span className="text-[10px] font-black text-amber-500 uppercase flex items-center gap-2"><Type className="w-3 h-3" /> Poster Text</span>
                  <button onClick={handleAiSlogan} disabled={isSloganLoading} className="text-[9px] font-black flex items-center gap-1 text-amber-500 hover:text-amber-400 disabled:opacity-30">
                    {isSloganLoading ? <RefreshCw className="animate-spin w-3 h-3" /> : <Wand2 className="w-3 h-3" />} AI ช่วยคิดคำ
                  </button>
                </div>
                <input value={posterText} onChange={e => setPosterText(e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-xl p-3 text-xs outline-none focus:border-amber-500/50 transition-all" placeholder="พิมพ์ข้อความที่ต้องการบนภาพ..." />
                {aiSlogans.length > 0 && (
                  <div className="flex flex-col gap-1 mt-2 max-h-32 overflow-y-auto scrollbar-hide">
                    {aiSlogans.map((s, i) => (
                      <button key={i} onClick={() => {setPosterText(s); setCopiedIndex(i); setTimeout(() => setCopiedIndex(null), 1500)}} className="text-[9px] p-2.5 bg-white/5 rounded-lg text-left hover:bg-white/10 flex justify-between items-center group">
                        <span className="group-hover:text-amber-500">{s}</span> {copiedIndex === i && <Check className="w-3.5 h-3.5 text-amber-500" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {error && (
            <div className="p-5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-3xl text-[10px] font-bold flex flex-col gap-3">
              <div className="flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0" /><span>{error}</span></div>
              <button onClick={handleGenerate} className="bg-red-500 text-white py-2.5 rounded-xl text-[9px] font-black uppercase shadow-lg hover:bg-red-600 transition-colors">
                 {error.includes("Key") ? "เลือก API Key ใหม่" : "ลองใหม่"}
              </button>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className={`w-full py-6 rounded-[35px] flex items-center justify-center gap-4 font-black uppercase transition-all text-[12px] tracking-[0.2em] shadow-2xl relative overflow-hidden group ${
              isGenerating ? 'bg-slate-900 text-slate-600 cursor-not-allowed' : 'bg-gradient-to-r from-amber-600 to-orange-600 text-white active:scale-95'
            }`}
          >
            {isGenerating ? <RefreshCw className="animate-spin w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            <span>{isGenerating ? "AI กำลังวาดภาพ..." : "สร้างโปสเตอร์เดี๋ยวนี้"}</span>
          </button>
        </div>

        <div className="flex-1 flex flex-col gap-6">
          <div className="glass rounded-[50px] p-8 min-h-[680px] flex flex-col items-center justify-center border-white/5 relative overflow-hidden shadow-2xl">
            {isGenerating ? (
              <div className="text-center space-y-8 z-10 animate-in fade-in duration-500">
                <div className="w-20 h-20 border-4 border-amber-500/10 border-t-amber-500 rounded-full animate-spin mx-auto shadow-amber-500/20"></div>
                <div className="space-y-3">
                  <h3 className="text-xl font-black text-white italic tracking-widest">{LOADING_MESSAGES[loadingMsgIndex]}</h3>
                  <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.4em]">Gemini 2.5 Flash Powered</p>
                </div>
              </div>
            ) : currentPoster ? (
              <div className="w-full flex flex-col items-center gap-10 animate-in fade-in zoom-in-95 duration-1000">
                <div className="relative max-w-full shadow-2xl rounded-[45px] overflow-hidden border border-white/10 bg-black">
                  <canvas ref={canvasRef} className="hidden" />
                  <img src={currentPoster.url} className="max-h-[580px] w-auto transition-transform duration-700" />
                  <div className="absolute top-8 right-8 flex gap-4 drop-shadow-2xl">
                    {logos.filter(l => l.visible).map(l => (
                      <img key={l.id} src={l.url} className="w-16 md:w-24 h-auto object-contain" />
                    ))}
                  </div>
                </div>
                <button onClick={downloadImage} className="bg-white text-black px-16 py-5 rounded-[30px] font-black text-[12px] uppercase tracking-[0.3em] flex items-center gap-4 hover:bg-amber-400 transition-all shadow-xl">
                  <Download className="w-5 h-5" /> Save Final HD Image
                </button>
              </div>
            ) : (
              <div className="text-center space-y-8 opacity-20 hover:opacity-40 transition-opacity">
                <div className="relative mx-auto w-32 h-32 flex items-center justify-center">
                   <ImageIcon className="w-24 h-24 text-slate-700" />
                   <div className="absolute inset-0 border-2 border-dashed border-slate-800 rounded-full animate-[spin_20s_linear_infinite]"></div>
                </div>
                <div className="space-y-2">
                  <p className="font-black uppercase tracking-[0.5em] text-[11px] text-white">Creative Studio Canvas</p>
                  <p className="text-[9px] uppercase tracking-widest text-slate-500">อัปโหลดรูปและใส่รายละเอียดเพื่อเริ่มต้น</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="p-12 text-center opacity-40">
        <p className="text-[8px] text-slate-700 font-bold uppercase tracking-[0.2em]">Designed for OTOP Entrepreneurs | Nan Innovation Hub</p>
      </footer>
    </div>
  );
};

export default App;
