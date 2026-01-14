
import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Image as ImageIcon, 
  Download, 
  History, 
  Settings2, 
  RefreshCw,
  X,
  Plus,
  AlertTriangle,
  Key,
  Layers,
  Maximize2,
  CheckCircle2,
  Type as TypeIcon,
  Tag
} from 'lucide-react';
import { AspectRatio, GeneratedPoster } from './types';
import { STYLE_PRESETS, ASPECT_RATIOS, LOADING_MESSAGES } from './constants';
import { generatePosterImage, openKeySelector, generatePosterSlogan, hasApiKey } from './services/gemini';

interface Logo {
  id: string;
  url: string;
}

const App: React.FC = () => {
  // --- States ---
  const [prompt, setPrompt] = useState('');
  const [posterText, setPosterText] = useState('');
  const [styleIndex, setStyleIndex] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.SQUARE);
  const [removeBackground, setRemoveBackground] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSloganLoading, setIsSloganLoading] = useState(false);
  const [aiSlogans, setAiSlogans] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // สถานะการเชื่อมต่อ (Default เป็น false จนกว่าจะเช็คเสร็จหรือกดเชื่อมต่อ)
  const [isKeyReady, setIsKeyReady] = useState(false);
  
  const [productImage, setProductImage] = useState<string | null>(null);
  const [logos, setLogos] = useState<Logo[]>([]);
  const [history, setHistory] = useState<GeneratedPoster[]>([]);
  const [currentPoster, setCurrentPoster] = useState<GeneratedPoster | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // --- Effects ---
  useEffect(() => {
    // เช็คแค่ครั้งเดียวตอนโหลดแอป
    const initCheck = async () => {
      const ok = await hasApiKey();
      setIsKeyReady(ok);
    };
    initCheck();
  }, []);

  // --- Handlers ---
  const handleConnect = async () => {
    setError(null);
    try {
      await openKeySelector();
      // ตามกฎ: ให้ถือว่าเลือกสำเร็จทันทีเพื่อเลี่ยง race condition
      setIsKeyReady(true); 
    } catch (e) {
      console.error(e);
    }
  };

  const processImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });
  };

  const handleProductUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const data = await processImage(file);
      setProductImage(data);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const data = await processImage(file);
      const img = new Image();
      img.src = data;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          for (let i = 0; i < imageData.data.length; i += 4) {
            if (imageData.data[i] > 240 && imageData.data[i+1] > 240 && imageData.data[i+2] > 240) {
              imageData.data[i+3] = 0;
            }
          }
          ctx.putImageData(imageData, 0, 0);
          setLogos(prev => [...prev, { id: Date.now().toString(), url: canvas.toDataURL() }]);
        }
      };
    }
  };

  const handleAiSlogan = async () => {
    if (!prompt.trim()) {
      setError("กรุณาใส่ชื่อหรือรายละเอียดสินค้าก่อน");
      return;
    }
    setIsSloganLoading(true);
    setError(null);
    try {
      const suggestions = await generatePosterSlogan(prompt);
      setAiSlogans(suggestions);
    } catch (e) {
      setError("AI คิดสโลแกนไม่สำเร็จ แต่คุณยังสร้างภาพได้ปกติครับ");
    } finally {
      setIsSloganLoading(false);
    }
  };

  const handleGenerate = async () => {
    // 1. ถ้า Key ยังไม่พร้อม ให้กดเชื่อมต่อก่อน
    if (!isKeyReady) {
      await handleConnect();
      return;
    }

    // 2. ตรวจสอบว่ามีข้อมูลพื้นฐานไหม
    if (!prompt.trim() && !productImage) {
      setError("กรุณาใส่ชื่อสินค้า หรืออัปโหลดรูปภาพสินค้าก่อนเริ่มเนรมิต");
      return;
    }

    setError(null);
    setIsGenerating(true);

    try {
      const result = await generatePosterImage({
        prompt: prompt || "Premium Nan product",
        style: STYLE_PRESETS[styleIndex].label as any,
        aspectRatio,
        highQuality: true,
        baseImage: productImage || undefined,
        removeBackground,
        posterText: posterText
      });

      const newPoster: GeneratedPoster = {
        id: Date.now().toString(),
        url: result,
        prompt: prompt,
        style: STYLE_PRESETS[styleIndex].label as any,
        aspectRatio: aspectRatio,
        timestamp: Date.now()
      };

      setCurrentPoster(newPoster);
      setHistory(prev => [newPoster, ...prev].slice(0, 10));
    } catch (err: any) {
      console.error("Generate error:", err);
      // หาก Error เกี่ยวกับ Key ให้รีเซ็ตสถานะเพื่อให้ผู้ใช้เลือกใหม่
      if (err.message === "KEY_INVALID" || err.message === "KEY_NOT_FOUND") {
        setIsKeyReady(false);
        setError("API Key ไม่ถูกต้องหรือยังไม่ได้ตั้งค่าการชำระเงิน (Paid Project) กรุณาเชื่อมต่อใหม่อีกครั้ง");
        await handleConnect();
      } else {
        setError(err.message || "ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = async () => {
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

    // วาดโลโก้
    const logoSize = canvas.width * 0.15;
    for (let i = 0; i < logos.length; i++) {
      const logoImg = new Image();
      logoImg.src = logos[i].url;
      await new Promise(r => logoImg.onload = r);
      const h = logoSize * (logoImg.height / logoImg.width);
      ctx.drawImage(logoImg, canvas.width - (logoSize + 40), 40 + (i * (h + 20)), logoSize, h);
    }

    // วาดข้อความ
    if (posterText) {
      ctx.font = `bold ${canvas.width * 0.07}px Prompt`;
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 15;
      ctx.fillText(posterText, canvas.width / 2, canvas.height - (canvas.height * 0.12));
    }

    const link = document.createElement('a');
    link.download = `nan-poster-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="min-h-screen bg-[#03060b] text-slate-200 flex flex-col font-['Prompt']">
      {/* Header */}
      <nav className="border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 p-2 rounded-xl shadow-lg shadow-amber-500/20">
            <Sparkles className="w-5 h-5 text-black" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none">AI POSTER PRO</h1>
            <p className="text-[9px] text-amber-500/80 uppercase tracking-widest mt-1">Nan Smart Marketing Engine</p>
          </div>
        </div>
        
        <button 
          onClick={handleConnect}
          className={`px-5 py-2 rounded-full text-[11px] font-bold flex items-center gap-2 border transition-all ${isKeyReady ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-amber-500/50 bg-amber-500 text-black animate-pulse'}`}
        >
          {isKeyReady ? <CheckCircle2 className="w-4 h-4" /> : <Key className="w-4 h-4" />}
          {isKeyReady ? 'เชื่อมต่อแล้ว' : 'กดเชื่อมต่อระบบก่อนใช้งาน'}
        </button>
      </nav>

      <main className="flex-1 container mx-auto p-4 lg:p-8 flex flex-col lg:grid lg:grid-cols-12 gap-8">
        
        {/* Left Panel: Controls */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass rounded-[32px] p-6 space-y-6 border border-white/10 shadow-2xl">
            
            {/* 01. รูปสินค้า */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold text-amber-500 uppercase flex items-center gap-2 tracking-widest"><Layers className="w-4 h-4" /> 01. รูปสินค้า</label>
                <button 
                  onClick={() => setRemoveBackground(!removeBackground)}
                  className={`text-[9px] px-2 py-1 rounded-md border transition-all ${removeBackground ? 'bg-amber-500 text-black border-amber-500' : 'bg-white/5 text-slate-500 border-white/5'}`}
                >
                  {removeBackground ? 'AI ตัดฉากหลังให้' : 'ใช้พื้นหลังเดิม'}
                </button>
              </div>
              <label className="block w-full h-44 border-2 border-dashed border-white/10 rounded-2xl bg-black/40 hover:border-amber-500/50 transition-all cursor-pointer overflow-hidden relative group shadow-inner">
                <input type="file" className="hidden" accept="image/*" onChange={handleProductUpload} />
                {productImage ? (
                  <img src={productImage} className="w-full h-full object-contain p-4 animate-in fade-in" />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 group-hover:text-amber-500 transition-colors">
                    <ImageIcon className="w-10 h-10 mb-2 opacity-20" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">อัปโหลดรูปสินค้าที่นี่</span>
                  </div>
                )}
              </label>
            </div>

            {/* 02. ข้อมูลสินค้า */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold text-amber-500 uppercase flex items-center gap-2 tracking-widest"><TypeIcon className="w-4 h-4" /> 02. ข้อมูลสินค้า</label>
                <button 
                  onClick={handleAiSlogan}
                  disabled={isSloganLoading}
                  className="text-[10px] text-amber-400 font-bold hover:underline disabled:opacity-50 flex items-center gap-1"
                >
                  {isSloganLoading && <RefreshCw className="w-3 h-3 animate-spin" />}
                  AI ช่วยคิดสโลแกน
                </button>
              </div>
              <textarea 
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="พิมพ์ชื่อสินค้า เช่น 'กาแฟคั่วเข้มเมืองน่าน'..."
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs focus:border-amber-500/50 outline-none h-20 resize-none"
              />
              {aiSlogans.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {aiSlogans.map((s, i) => (
                    <button key={i} onClick={() => setPosterText(s)} className="text-[9px] px-2 py-1 bg-white/5 border border-white/5 rounded-lg hover:border-amber-500/50 transition-all">{s}</button>
                  ))}
                </div>
              )}
              <input 
                type="text"
                value={posterText}
                onChange={e => setPosterText(e.target.value)}
                placeholder="ข้อความที่จะแสดงบนภาพ"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs focus:border-amber-500/50 outline-none mt-2 shadow-inner"
              />
            </div>

            {/* Step 3: Style & Ratio */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2"><Settings2 className="w-4 h-4" /> 03. สไตล์</label>
                <select 
                  value={styleIndex}
                  onChange={e => setStyleIndex(Number(e.target.value))}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2.5 text-[11px] focus:border-amber-500/50 outline-none"
                >
                  {STYLE_PRESETS.map((s, i) => <option key={i} value={i}>{s.label}</option>)}
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2"><Maximize2 className="w-4 h-4" /> 04. ขนาด</label>
                <select 
                  value={aspectRatio}
                  onChange={e => setAspectRatio(e.target.value as any)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2.5 text-[11px] focus:border-amber-500/50 outline-none"
                >
                  {ASPECT_RATIOS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </div>
            </div>

            {/* 05. โลโก้แบรนด์ */}
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2"><Tag className="w-4 h-4" /> 05. โลโก้แบรนด์</label>
              <div className="flex flex-wrap gap-3">
                {logos.map(l => (
                  <div key={l.id} className="relative w-14 h-14 bg-white/10 rounded-2xl p-2 border border-white/10 group shadow-lg">
                    <img src={l.url} className="w-full h-full object-contain" />
                    <button onClick={() => setLogos(prev => prev.filter(x => x.id !== l.id))} className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all shadow-lg">
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
                <label className="w-14 h-14 border-2 border-dashed border-white/10 rounded-2xl flex items-center justify-center cursor-pointer hover:border-amber-500/50 transition-all bg-black/20">
                  <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                  <Plus className="w-6 h-6 text-slate-500" />
                </label>
              </div>
            </div>

            {/* Main Action Button */}
            <button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className={`w-full py-5 rounded-[30px] font-black text-sm flex items-center justify-center gap-3 transition-all active:scale-95 shadow-2xl ${isKeyReady ? 'bg-amber-500 text-black shadow-amber-500/20' : 'bg-orange-600 text-white animate-pulse'}`}
            >
              {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              {isGenerating ? 'กำลังสร้างภาพ...' : isKeyReady ? 'เนรมิตโปสเตอร์สินค้า' : 'เชื่อมต่อระบบก่อนใช้งาน'}
            </button>
          </div>
        </div>

        {/* Right Panel: Preview Area */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-white/[0.02] border border-white/5 rounded-[60px] flex-1 min-h-[500px] flex flex-col items-center justify-center relative p-8 shadow-2xl">
            {isGenerating ? (
              <div className="text-center space-y-6">
                <div className="w-20 h-20 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto shadow-lg shadow-amber-500/10"></div>
                <div className="space-y-2">
                  <p className="text-sm font-bold text-amber-500 uppercase tracking-widest animate-pulse">AI กำลังปรุงแต่งฉากหลัง...</p>
                  <p className="text-[9px] text-slate-500 uppercase">กรุณารอสักครู่ (ประมาณ 10-15 วินาที)</p>
                </div>
              </div>
            ) : currentPoster ? (
              <div className="w-full flex flex-col items-center gap-8 animate-in fade-in zoom-in duration-500">
                <div className="relative shadow-2xl rounded-[40px] overflow-hidden border border-white/10 bg-black max-w-full">
                  <img src={currentPoster.url} className="max-h-[600px] w-auto block" />
                  
                  {/* Real-time Overlays */}
                  <div className="absolute top-6 right-6 flex flex-col gap-4">
                    {logos.map(l => <img key={l.id} src={l.url} className="w-14 h-14 object-contain drop-shadow-lg" />)}
                  </div>
                  {posterText && (
                    <div className="absolute bottom-10 inset-x-0 text-center px-8">
                      <p className="text-white text-4xl font-black italic drop-shadow-[0_8px_16px_rgba(0,0,0,0.8)] uppercase tracking-tight">{posterText}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-4">
                  <button onClick={downloadImage} className="bg-white text-black px-10 py-4 rounded-full font-black text-[11px] uppercase tracking-widest flex items-center gap-2 hover:bg-amber-400 transition-all shadow-xl active:scale-95">
                    <Download className="w-4 h-4" /> บันทึกรูปภาพสำเร็จ
                  </button>
                  <button onClick={() => setCurrentPoster(null)} className="bg-white/5 text-white p-4 rounded-full hover:bg-white/10 border border-white/10 transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center group">
                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                   <ImageIcon className="w-10 h-10 text-slate-700" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-600">Preview พื้นที่แสดงผล</p>
              </div>
            )}
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide px-2">
              {history.map(h => (
                <button 
                  key={h.id} 
                  onClick={() => setCurrentPoster(h)}
                  className={`shrink-0 w-24 h-24 rounded-3xl overflow-hidden border-2 transition-all ${currentPoster?.id === h.id ? 'border-amber-500 scale-110 shadow-lg' : 'border-transparent opacity-40 hover:opacity-100'}`}
                >
                  <img src={h.url} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
