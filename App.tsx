
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
  const [isKeyReady, setIsKeyReady] = useState(false);
  
  const [productImage, setProductImage] = useState<string | null>(null);
  const [logos, setLogos] = useState<Logo[]>([]);
  const [history, setHistory] = useState<GeneratedPoster[]>([]);
  const [currentPoster, setCurrentPoster] = useState<GeneratedPoster | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // --- Effects ---
  useEffect(() => {
    const checkKey = async () => {
      const ok = await hasApiKey();
      setIsKeyReady(ok);
    };
    checkKey();
    // เช็คซ้ำทุก 2 วินาทีเผื่อผู้ใช้เพิ่งเลือก Key
    const timer = setInterval(checkKey, 2000);
    return () => clearInterval(timer);
  }, []);

  // --- Handlers ---
  const handleConnect = async () => {
    setError(null);
    try {
      await openKeySelector();
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
      // Simple "white to transparent" processing
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
      setError("AI คิดสโลแกนไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setIsSloganLoading(false);
    }
  };

  const handleGenerate = async () => {
    // 1. ตรวจสอบ Key
    if (!isKeyReady) {
      await handleConnect();
      return;
    }

    // 2. ตรวจสอบข้อมูล
    if (!prompt.trim() && !productImage) {
      setError("กรุณาใส่ชื่อสินค้า หรืออัปโหลดรูปภาพสินค้า");
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
      if (err.message === "KEY_INVALID" || err.message === "KEY_NOT_FOUND") {
        setIsKeyReady(false);
        setError("API Key ของคุณไม่ถูกต้อง หรือไม่ได้เปิดใช้งาน Billing (Paid Project)");
      } else {
        setError(err.message || "เกิดข้อผิดพลาดทางเทคนิค กรุณาลองใหม่");
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

    // วาดข้อความ (ถ้ามี)
    if (posterText) {
      ctx.font = `bold ${canvas.width * 0.07}px Prompt`;
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 15;
      ctx.fillText(posterText, canvas.width / 2, canvas.height - (canvas.height * 0.1));
    }

    const link = document.createElement('a');
    link.download = `poster-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="min-h-screen bg-[#03060b] text-slate-200 flex flex-col font-['Prompt']">
      {/* Header */}
      <nav className="border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 p-2 rounded-xl"><Sparkles className="w-5 h-5 text-black" /></div>
          <div>
            <h1 className="text-lg font-bold">AI POSTER PRO</h1>
            <p className="text-[10px] text-amber-500/80 uppercase tracking-widest">Nan Smart Marketing</p>
          </div>
        </div>
        
        <button 
          onClick={handleConnect}
          className={`px-4 py-2 rounded-full text-[11px] font-bold flex items-center gap-2 border transition-all ${isKeyReady ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-amber-500/50 bg-amber-500/10 text-amber-500 animate-pulse'}`}
        >
          {isKeyReady ? <CheckCircle2 className="w-4 h-4" /> : <Key className="w-4 h-4" />}
          {isKeyReady ? 'เชื่อมต่อแล้ว' : 'เชื่อมต่อ API Key'}
        </button>
      </nav>

      <main className="flex-1 container mx-auto p-4 lg:p-8 flex flex-col lg:grid lg:grid-cols-12 gap-8">
        
        {/* Left Panel: Controls */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass rounded-[32px] p-6 space-y-6 border border-white/10">
            
            {/* Step 1: Product Image */}
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
              <label className="block w-full h-40 border-2 border-dashed border-white/10 rounded-2xl bg-black/40 hover:border-amber-500/50 transition-all cursor-pointer overflow-hidden relative group">
                <input type="file" className="hidden" accept="image/*" onChange={handleProductUpload} />
                {productImage ? (
                  <img src={productImage} className="w-full h-full object-contain p-4" />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 group-hover:text-amber-500 transition-colors">
                    <ImageIcon className="w-8 h-8 mb-2" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">คลิกเพื่ออัปโหลด</span>
                  </div>
                )}
              </label>
            </div>

            {/* Step 2: Info & Slogan */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold text-amber-500 uppercase flex items-center gap-2 tracking-widest"><TypeIcon className="w-4 h-4" /> 02. ข้อมูลสินค้า</label>
                <button 
                  onClick={handleAiSlogan}
                  disabled={isSloganLoading}
                  className="text-[10px] text-amber-400 font-bold hover:underline disabled:opacity-50"
                >
                  {isSloganLoading ? 'กำลังคิด...' : 'AI ช่วยคิดสโลแกน'}
                </button>
              </div>
              <textarea 
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="พิมพ์ชื่อสินค้าหรือจุดเด่น เช่น 'กาแฟอาราบิก้าน่าน คั่วกลาง'..."
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs focus:border-amber-500/50 outline-none h-20 resize-none"
              />
              <div className="flex flex-wrap gap-2">
                {aiSlogans.map((s, i) => (
                  <button key={i} onClick={() => setPosterText(s)} className="text-[9px] px-2 py-1 bg-white/5 border border-white/10 rounded-lg hover:border-amber-500/50 transition-all">{s}</button>
                ))}
              </div>
              <input 
                type="text"
                value={posterText}
                onChange={e => setPosterText(e.target.value)}
                placeholder="ข้อความที่อยากให้แสดงบนโปสเตอร์"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:border-amber-500/50 outline-none"
              />
            </div>

            {/* Step 3: Style & Ratio */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2"><Settings2 className="w-4 h-4" /> 03. สไตล์</label>
                <select 
                  value={styleIndex}
                  onChange={e => setStyleIndex(Number(e.target.value))}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[11px] focus:border-amber-500/50 outline-none"
                >
                  {STYLE_PRESETS.map((s, i) => <option key={i} value={i}>{s.label}</option>)}
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2"><Maximize2 className="w-4 h-4" /> 04. ขนาด</label>
                <select 
                  value={aspectRatio}
                  onChange={e => setAspectRatio(e.target.value as any)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[11px] focus:border-amber-500/50 outline-none"
                >
                  {ASPECT_RATIOS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </div>
            </div>

            {/* Step 5: Logos */}
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2"><Tag className="w-4 h-4" /> 05. โลโก้แบรนด์</label>
              <div className="flex flex-wrap gap-2">
                {logos.map(l => (
                  <div key={l.id} className="relative w-12 h-12 bg-white/10 rounded-xl p-1.5 border border-white/10 group">
                    <img src={l.url} className="w-full h-full object-contain" />
                    <button onClick={() => setLogos(prev => prev.filter(x => x.id !== l.id))} className="absolute -top-1.5 -right-1.5 bg-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-all">
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
                <label className="w-12 h-12 border-2 border-dashed border-white/10 rounded-xl flex items-center justify-center cursor-pointer hover:border-amber-500/50 transition-all">
                  <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                  <Plus className="w-5 h-5 text-slate-500" />
                </label>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-2xl flex items-start gap-2 text-red-400">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="text-[10px] font-bold leading-tight">{error}</p>
              </div>
            )}

            {/* Generate Button */}
            <button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 ${isKeyReady ? 'bg-amber-500 text-black' : 'bg-orange-600 text-white animate-pulse'}`}
            >
              {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {isGenerating ? 'กำลังสร้างภาพ...' : isKeyReady ? 'เนรมิตโปสเตอร์' : 'กรุณาเชื่อมต่อ Key'}
            </button>
          </div>
        </div>

        {/* Right Panel: Preview */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-white/[0.02] border border-white/5 rounded-[40px] flex-1 min-h-[500px] flex flex-col items-center justify-center relative p-6">
            {isGenerating ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs font-bold text-amber-500 uppercase tracking-widest animate-pulse">AI กำลังทำงาน...</p>
              </div>
            ) : currentPoster ? (
              <div className="w-full flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-500">
                <div className="relative shadow-2xl rounded-3xl overflow-hidden border border-white/10 bg-black max-w-full">
                  <img src={currentPoster.url} className="max-h-[550px] w-auto" />
                  
                  {/* Visual Overlays */}
                  <div className="absolute top-6 right-6 flex flex-col gap-3">
                    {logos.map(l => <img key={l.id} src={l.url} className="w-14 h-14 object-contain" />)}
                  </div>
                  {posterText && (
                    <div className="absolute bottom-10 inset-x-0 text-center px-6">
                      <p className="text-white text-3xl font-black italic drop-shadow-lg uppercase">{posterText}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-4">
                  <button onClick={downloadImage} className="bg-white text-black px-8 py-3 rounded-full font-bold text-[11px] uppercase tracking-widest flex items-center gap-2 hover:bg-amber-400 transition-all shadow-xl">
                    <Download className="w-4 h-4" /> บันทึกภาพ
                  </button>
                  <button onClick={() => setCurrentPoster(null)} className="bg-white/5 text-white p-3 rounded-full hover:bg-white/10 border border-white/10 transition-all">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center opacity-20">
                <ImageIcon className="w-20 h-20 mx-auto mb-4" />
                <p className="text-[10px] font-bold uppercase tracking-[0.5em]">Preview Area</p>
              </div>
            )}
          </div>

          {/* History Strip */}
          {history.length > 0 && (
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {history.map(h => (
                <button 
                  key={h.id} 
                  onClick={() => setCurrentPoster(h)}
                  className={`shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${currentPoster?.id === h.id ? 'border-amber-500 scale-105 shadow-lg' : 'border-transparent opacity-40 hover:opacity-100'}`}
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
