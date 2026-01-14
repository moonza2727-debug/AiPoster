
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
  Wand,
  ExternalLink
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

  // ตรวจสอบ Key อย่างต่อเนื่อง
  useEffect(() => {
    const checkKey = async () => {
      const selected = await hasApiKey();
      setIsKeySelected(selected);
    };
    checkKey();
    const interval = setInterval(checkKey, 2000);
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
    const success = await openKeySelector();
    if (success) {
      setIsKeySelected(true);
      setError(null);
    }
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
          const r = data[i], g = data[i+1], b = data[i+2];
          if (r > 230 && g > 230 && b > 230) {
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

  const toggleLogoVisibility = (id: string) => {
    setLogos(prev => prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
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

  const handleAiSlogan = async () => {
    if (!prompt.trim()) {
      setError("กรุณาพิมพ์รายละเอียดสินค้าก่อน เพื่อให้ AI ช่วยคิดคำพาดหัวครับ");
      return;
    }
    setIsSloganLoading(true);
    setError(null);
    try {
      const slogans = await generatePosterSlogan(prompt);
      setAiSlogans(slogans);
    } catch (err: any) {
      if (err.message === "MISSING_KEY") setError("กรุณากดปุ่มสีส้มเพื่อเชื่อมต่อ API Key ก่อนครับ");
      else if (err.message === "QUOTA_EXCEEDED") setError("ขออภัย คิวเต็มชั่วคราว กรุณารอ 1 นาทีครับ");
      else setError("เกิดข้อผิดพลาดในการคิดคำพาดหัว");
    } finally {
      setIsSloganLoading(false);
    }
  };

  const handleGenerate = async () => {
    const apiAvailable = await hasApiKey();
    if (!apiAvailable) {
      handleOpenKey();
      return;
    }
    if (!prompt.trim() && !productImage) {
      setError("กรุณาใส่ชื่อสินค้าหรือรูปสินค้าก่อนกดปุ่มครับ");
      return;
    }

    setError(null);
    setIsGenerating(true);
    
    try {
      const result = await generatePosterImage({
        prompt: prompt || "Product display",
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
      console.error("Generate Error:", err);
      if (err.message === "QUOTA_EXCEEDED") setError("QUOTA");
      else if (err.message === "SAFETY_BLOCK") setError("AI ปฏิเสธรูปนี้เนื่องจากขัดต่อกฎความปลอดภัย (ลองเปลี่ยนคำบรรยายดูครับ)");
      else if (err.message === "MISSING_KEY") setError("กรุณาเชื่อมต่อ API Key ก่อนใช้งานครับ");
      else if (err.message === "API_RETURNED_NO_IMAGE") setError("AI ไม่ส่งรูปกลับมา (อาจเพราะรูปสินค้าซับซ้อนไป หรือ Prompt ไม่ชัดเจน ลองใหม่ดูครับ)");
      else setError("เกิดข้อผิดพลาดทางเทคนิค กรุณาลองใหม่");
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
          <div className="bg-gradient-to-tr from-amber-500 to-orange-600 p-2 rounded-2xl shadow-lg shadow-orange-500/20">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white italic uppercase">AI <span className="text-amber-500">POSTER</span></h1>
            <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Nan Smart Creative</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a 
            href="https://ai.google.dev/gemini-api/docs/billing" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hidden md:flex items-center gap-1 text-[9px] font-bold text-slate-500 hover:text-white transition-colors"
          >
            Billing Info <ExternalLink className="w-2.5 h-2.5" />
          </a>
          <button 
            onClick={handleOpenKey}
            className={`flex items-center gap-2 px-5 py-2 rounded-full border transition-all text-[10px] font-black uppercase ${
              isKeySelected 
                ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                : 'bg-orange-500/20 text-orange-400 border-orange-500/50 animate-pulse shadow-lg shadow-orange-500/20'
            }`}
          >
            {isKeySelected ? <ShieldCheck className="w-3.5 h-3.5" /> : <Key className="w-3.5 h-3.5" />}
            {isKeySelected ? 'Key Connected' : 'Connect Key to Start'}
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
                  <span className="text-amber-500 text-[8px] animate-pulse">กดคทาวิเศษเพื่อลบพื้นหลัง</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {logos.map(logo => (
                    <div key={logo.id} className={`relative aspect-square rounded-xl border p-2 group transition-all ${logo.isMagicApplied ? 'bg-slate-800 border-amber-500/40' : 'bg-white border-white/10'}`}>
                      <img src={logo.url} className={`w-full h-full object-contain ${logo.visible ? 'opacity-100' : 'opacity-20'}`} />
                      <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex flex-wrap items-center justify-center gap-1">
                        <button onClick={() => toggleLogoVisibility(logo.id)} className="p-1 hover:bg-white/10 rounded-md">
                          {logo.visible ? <Eye className="w-3.5 h-3.5 text-white" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
                        </button>
                        <button onClick={() => toggleLogoMagic(logo.id)} className={`p-1 rounded-md ${logo.isMagicApplied ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30' : 'hover:bg-white/10 text-white'}`}>
                          <Wand className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setLogos(prev => prev.filter(l => l.id !== logo.id))} className="p-1 hover:bg-red-500/20 rounded-md">
                          <X className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <label className="aspect-square flex flex-col items-center justify-center bg-white/5 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:bg-white/10 transition-all">
                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                    <Plus className="w-6 h-6 text-slate-600" />
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <Eraser className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-200 uppercase tracking-widest">Replace Background</span>
                    <span className="text-[8px] text-slate-500 font-bold uppercase">สร้างพื้นหลังใหม่โดย AI</span>
                  </div>
                </div>
                <button 
                  onClick={() => setRemoveBg(!removeBg)}
                  className={`w-12 h-6 rounded-full transition-all relative ${removeBg ? 'bg-amber-600' : 'bg-slate-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${removeBg ? 'left-7' : 'left-1'}`}></div>
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">รายละเอียดสินค้า (ไทย/Eng)</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="เช่น กาแฟดริปเข้มข้น หอมกลิ่นภูเขา เมืองน่าน..."
                  className="w-full h-24 bg-slate-900/40 border border-white/10 rounded-2xl p-4 text-sm outline-none focus:ring-2 focus:ring-amber-500/50 transition-all placeholder:text-slate-700"
                />
              </div>

              <div className="bg-amber-500/5 p-4 rounded-2xl border border-amber-500/10 shadow-inner">
                <div className="flex justify-between mb-2">
                  <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2"><Type className="w-3 h-3" /> Poster Text</span>
                  <button onClick={handleAiSlogan} disabled={isSloganLoading} className="text-[9px] font-black flex items-center gap-1 text-amber-500 hover:text-amber-400 disabled:opacity-30">
                    {isSloganLoading ? <RefreshCw className="animate-spin w-3 h-3" /> : <Wand2 className="w-3 h-3" />} AI ช่วยคิดคำ
                  </button>
                </div>
                <input value={posterText} onChange={e => setPosterText(e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-xl p-3 text-xs mb-2 outline-none focus:border-amber-500/50 transition-all" placeholder="พิมพ์ข้อความที่ต้องการบนภาพ..." />
                {aiSlogans.length > 0 && (
                  <div className="flex flex-col gap-1 mt-2 max-h-32 overflow-y-auto pr-1 scrollbar-hide">
                    {aiSlogans.map((s, i) => (
                      <button key={i} onClick={() => copySlogan(s, i)} className="text-[9px] p-2.5 bg-white/5 rounded-lg text-left hover:bg-white/10 flex justify-between items-center group transition-colors">
                        <span className="group-hover:text-amber-500">{s}</span> {copiedIndex === i && <Check className="w-3.5 h-3.5 text-amber-500" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="glass rounded-[40px] p-8 border-white/10 space-y-6 shadow-xl">
            <h3 className="text-[11px] font-black text-amber-500 flex items-center gap-3 uppercase tracking-widest border-b border-white/5 pb-4">
              <Settings2 className="w-4 h-4" /> 02. สไตล์งานดีไซน์
            </h3>
            
            <div className="grid grid-cols-2 gap-2">
              {STYLE_PRESETS.map((style, idx) => (
                <button
                  key={style.id}
                  onClick={() => setStyleIndex(idx)}
                  className={`text-[9px] py-3.5 px-2 rounded-xl border font-black uppercase transition-all ${
                    styleIndex === idx ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20 scale-[1.02]' : 'bg-slate-900/60 border-white/5 text-slate-600 hover:bg-slate-800'
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {ASPECT_RATIOS.map(ratio => (
                <button key={ratio.id} onClick={() => setAspectRatio(ratio.id as any)} className={`px-4 py-2.5 rounded-xl border text-[9px] font-black shrink-0 transition-all ${aspectRatio === ratio.id ? 'bg-white text-black border-white shadow-lg' : 'bg-slate-900/80 text-slate-500 border-white/5 hover:text-slate-300'}`}>{ratio.id}</button>
              ))}
            </div>
          </section>

          {error && (
            <div className="p-5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-3xl text-[10px] font-bold animate-pulse flex flex-col gap-3">
              <div className="flex gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error === "QUOTA" ? "ขออภัย คิวแน่นมากครับ กรุณารอ 1 นาทีครับ" : error}</span>
              </div>
              <button onClick={handleGenerate} className="bg-red-500 text-white py-2.5 rounded-xl text-[9px] flex items-center justify-center gap-2 font-black uppercase tracking-widest hover:bg-red-600 transition-colors shadow-lg"><RefreshCw className="w-3.5 h-3.5" /> ลองใหม่อีกครั้ง</button>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className={`w-full py-6 rounded-[35px] flex items-center justify-center gap-4 font-black uppercase transition-all text-[12px] tracking-[0.2em] shadow-2xl relative overflow-hidden group ${
              isGenerating 
                ? 'bg-slate-900 text-slate-600 cursor-not-allowed' 
                : !isKeySelected 
                  ? 'bg-orange-600 text-white animate-bounce shadow-orange-600/30' 
                  : 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-orange-600/30 active:scale-95'
            }`}
          >
            {isGenerating ? <RefreshCw className="animate-spin w-5 h-5" /> : !isKeySelected ? <Key className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            <span className="relative z-10">{isGenerating ? "AI กำลังวาดภาพ..." : !isKeySelected ? "คลิกเพื่อเชื่อมต่อ Key" : "สร้างโปสเตอร์เดี๋ยวนี้"}</span>
            {!isGenerating && isKeySelected && <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>}
          </button>
        </div>

        <div className="flex-1 flex flex-col gap-6">
          <div className="glass rounded-[50px] p-8 min-h-[680px] flex flex-col items-center justify-center border-white/5 relative overflow-hidden shadow-2xl">
            {isGenerating ? (
              <div className="text-center space-y-8 z-10 animate-in fade-in duration-500">
                <div className="relative">
                  <div className="w-20 h-20 border-4 border-amber-500/10 border-t-amber-500 rounded-full animate-spin mx-auto shadow-2xl shadow-amber-500/20"></div>
                  <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-amber-500 animate-pulse" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-black text-white italic tracking-widest">{LOADING_MESSAGES[loadingMsgIndex]}</h3>
                  <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.4em] opacity-50">Powered by Gemini 2.5 Flash</p>
                </div>
              </div>
            ) : currentPoster ? (
              <div className="w-full flex flex-col items-center gap-10 animate-in fade-in zoom-in-95 duration-1000">
                <div className="relative max-w-full shadow-[0_50px_100px_rgba(0,0,0,0.8)] rounded-[45px] overflow-hidden border border-white/10 bg-black group">
                  <canvas ref={canvasRef} className="hidden" />
                  <img src={currentPoster.url} className="max-h-[580px] w-auto transition-transform duration-700 group-hover:scale-[1.02]" />
                  <div className="absolute top-8 right-8 flex gap-4 drop-shadow-2xl">
                    {logos.filter(l => l.visible).map(l => (
                      <img key={l.id} src={l.url} className="w-16 md:w-24 h-auto object-contain animate-in slide-in-from-right-10 duration-500" />
                    ))}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[10px] font-black uppercase text-amber-500 tracking-widest">Preview Design</p>
                  </div>
                </div>
                <button onClick={downloadImage} className="group bg-white text-black px-16 py-5 rounded-[30px] font-black text-[12px] uppercase tracking-[0.3em] flex items-center gap-4 hover:bg-amber-400 hover:scale-105 active:scale-95 transition-all shadow-[0_20px_40px_rgba(255,255,255,0.1)]">
                  <Download className="w-5 h-5 group-hover:translate-y-1 transition-transform" /> Save Final HD Image
                </button>
              </div>
            ) : (
              <div className="text-center space-y-8 opacity-20 hover:opacity-40 transition-opacity cursor-default">
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

          {history.length > 0 && (
            <div className="glass rounded-[40px] p-8 border-white/5 shadow-2xl">
              <h4 className="text-[11px] font-black text-slate-500 uppercase mb-6 flex items-center gap-3 tracking-[0.2em]"><History className="w-4 h-4 text-amber-500" /> Recent Creations</h4>
              <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide">
                {history.map(item => (
                  <div key={item.id} onClick={() => setCurrentPoster(item)} className="relative shrink-0 group">
                     <div className={`relative rounded-2xl overflow-hidden border-2 transition-all duration-500 cursor-pointer ${currentPoster?.id === item.id ? 'border-amber-500 shadow-lg shadow-amber-500/30 scale-105' : 'border-white/5 opacity-40 hover:opacity-100'}`}>
                        <img src={item.url} className="h-32 w-auto object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Eye className="w-6 h-6 text-white" />
                        </div>
                     </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="p-12 text-center">
        <div className="flex items-center justify-center gap-4 mb-4 opacity-40">
           <div className="h-[1px] w-12 bg-slate-800"></div>
           <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400">AI Poster Studio Pro</p>
           <div className="h-[1px] w-12 bg-slate-800"></div>
        </div>
        <p className="text-[8px] text-slate-700 font-bold uppercase tracking-[0.2em]">Designed for OTOP Entrepreneurs | Nan Innovation Hub</p>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        @keyframes pulse-soft { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
        .animate-pulse-soft { animation: pulse-soft 3s ease-in-out infinite; }
      ` }} />
    </div>
  );
};

export default App;
