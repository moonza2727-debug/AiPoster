
import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Image as ImageIcon, 
  Download, 
  Settings2, 
  RefreshCw,
  X,
  Plus,
  AlertTriangle,
  Layers,
  Maximize2,
  Type as TypeIcon,
  Tag,
  Rocket
} from 'lucide-react';
import { AspectRatio, GeneratedPoster } from './types';
import { STYLE_PRESETS, ASPECT_RATIOS } from './constants';
import { generatePosterImage, openKeySelector, generatePosterSlogan } from './services/gemini';

interface Logo {
  id: string;
  url: string;
}

const App: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [posterText, setPosterText] = useState('');
  const [styleIndex, setStyleIndex] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.SQUARE);
  const [removeBackground, setRemoveBackground] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSloganLoading, setIsSloganLoading] = useState(false);
  const [aiSlogans, setAiSlogans] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isAiStudio, setIsAiStudio] = useState(false);
  
  const [productImage, setProductImage] = useState<string | null>(null);
  const [logos, setLogos] = useState<Logo[]>([]);
  const [history, setHistory] = useState<GeneratedPoster[]>([]);
  const [currentPoster, setCurrentPoster] = useState<GeneratedPoster | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ตรวจสอบว่ารันอยู่ใน AI Studio หรือไม่
  useEffect(() => {
    if ((window as any).aistudio) {
      setIsAiStudio(true);
    }
  }, []);

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
    setError(null);
    if (!prompt.trim()) {
      setError("กรุณาใส่ชื่อสินค้าก่อนเพื่อให้ AI ช่วยคิด");
      return;
    }
    setIsSloganLoading(true);
    try {
      const suggestions = await generatePosterSlogan(prompt);
      setAiSlogans(suggestions);
    } catch (e: any) {
      console.error("Slogan fail:", e);
      setError("ไม่สามารถขอสโลแกนได้ กรุณาตรวจสอบ API_KEY");
    } finally {
      setIsSloganLoading(false);
    }
  };

  const handleGenerate = async () => {
    setError(null);

    if (!prompt.trim() && !productImage) {
      setError("กรุณาใส่ชื่อสินค้า หรืออัปโหลดรูปภาพสินค้า");
      return;
    }

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
      console.error("Generate error:", err);
      setError("เกิดข้อผิดพลาด: โปรดตรวจสอบว่าคุณได้กด Redeploy ใน Vercel หลังจากตั้งค่า Environment Variable แล้วหรือยัง?");
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

    const logoSize = canvas.width * 0.15;
    for (let i = 0; i < logos.length; i++) {
      const logoImg = new Image();
      logoImg.src = logos[i].url;
      await new Promise(r => logoImg.onload = r);
      const h = logoSize * (logoImg.height / logoImg.width);
      ctx.drawImage(logoImg, canvas.width - (logoSize + 40), 40 + (i * (h + 20)), logoSize, h);
    }

    if (posterText) {
      ctx.font = `bold ${canvas.width * 0.07}px Prompt`;
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 15;
      ctx.fillText(posterText, canvas.width / 2, canvas.height - (canvas.height * 0.12));
    }

    const link = document.createElement('a');
    link.download = `ai-poster-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="min-h-screen bg-[#03060b] text-slate-200 flex flex-col font-['Prompt']">
      <nav className="border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 p-2 rounded-xl shadow-lg shadow-amber-500/20">
            <Sparkles className="w-5 h-5 text-black" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none">AI POSTER PRO</h1>
            <p className="text-[9px] text-amber-500/80 uppercase tracking-widest mt-1">Smart Marketing Engine</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           {isAiStudio && (
             <button onClick={openKeySelector} className="text-[10px] bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full border border-white/10 transition-all flex items-center gap-2">
               <Settings2 className="w-3 h-3" /> ตั้งค่า Key
             </button>
           )}
        </div>
      </nav>

      <main className="flex-1 container mx-auto p-4 lg:p-8 flex flex-col lg:grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="glass rounded-[32px] p-6 space-y-6 border border-white/10 shadow-2xl">
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-amber-500 uppercase flex items-center gap-2 tracking-widest"><Layers className="w-4 h-4" /> 01. รูปสินค้า</label>
              <div className="flex items-center justify-between bg-black/40 p-2 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 px-2">{removeBackground ? 'เปิดระบบตัดฉากหลัง' : 'ใช้รูปต้นฉบับ'}</span>
                <button 
                  onClick={() => setRemoveBackground(!removeBackground)}
                  className={`w-10 h-5 rounded-full transition-all relative ${removeBackground ? 'bg-amber-500' : 'bg-slate-700'}`}
                >
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${removeBackground ? 'right-1' : 'left-1'}`} />
                </button>
              </div>
              <label className="block w-full h-44 border-2 border-dashed border-white/10 rounded-2xl bg-black/40 hover:border-amber-500/50 transition-all cursor-pointer overflow-hidden relative group">
                <input type="file" className="hidden" accept="image/*" onChange={handleProductUpload} />
                {productImage ? (
                  <img src={productImage} className="w-full h-full object-contain p-4" />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 group-hover:text-amber-500 transition-colors">
                    <ImageIcon className="w-10 h-10 mb-2 opacity-20" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">คลิกเพื่อเพิ่มรูปสินค้า</span>
                  </div>
                )}
              </label>
            </div>

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
                placeholder="ชื่อสินค้าหรือคำอธิบายสั้นๆ..."
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs focus:border-amber-500/50 outline-none h-16 resize-none"
              />
              <div className="flex flex-wrap gap-1.5">
                {aiSlogans.map((s, i) => (
                  <button key={i} onClick={() => setPosterText(s)} className="text-[9px] px-2 py-1 bg-white/5 border border-white/10 rounded-lg hover:border-amber-500/50 transition-all">{s}</button>
                ))}
              </div>
              <input 
                type="text"
                value={posterText}
                onChange={e => setPosterText(e.target.value)}
                placeholder="ข้อความที่ต้องการโชว์บนภาพ"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs focus:border-amber-500/50 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2"><Settings2 className="w-4 h-4" /> 03. สไตล์</label>
                <select 
                  value={styleIndex}
                  onChange={e => setStyleIndex(Number(e.target.value))}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-2 py-2.5 text-[10px] focus:border-amber-500/50 outline-none"
                >
                  {STYLE_PRESETS.map((s, i) => <option key={i} value={i}>{s.label}</option>)}
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2"><Maximize2 className="w-4 h-4" /> 04. ขนาด</label>
                <select 
                  value={aspectRatio}
                  onChange={e => setAspectRatio(e.target.value as any)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-2 py-2.5 text-[10px] focus:border-amber-500/50 outline-none"
                >
                  {ASPECT_RATIOS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2"><Tag className="w-4 h-4" /> 05. โลโก้แบรนด์</label>
              <div className="flex flex-wrap gap-3">
                {logos.map(l => (
                  <div key={l.id} className="relative w-12 h-12 bg-white/10 rounded-xl p-2 border border-white/10 group shadow-lg">
                    <img src={l.url} className="w-full h-full object-contain" />
                    <button onClick={() => setLogos(prev => prev.filter(x => x.id !== l.id))} className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all">
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
                <label className="w-12 h-12 border-2 border-dashed border-white/10 rounded-xl flex items-center justify-center cursor-pointer hover:border-amber-500/50 transition-all bg-black/20">
                  <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                  <Plus className="w-5 h-5 text-slate-500" />
                </label>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-start gap-3 text-red-400 animate-in fade-in slide-in-from-top-2">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-[11px] font-bold leading-relaxed">{error}</p>
              </div>
            )}

            <button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className={`w-full py-5 rounded-[24px] font-black text-sm flex items-center justify-center gap-3 transition-all active:scale-95 bg-amber-500 text-black shadow-xl shadow-amber-500/20 disabled:opacity-50 hover:bg-amber-400`}
            >
              {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Rocket className="w-5 h-5" />}
              {isGenerating ? 'กำลังเนรมิตภาพ...' : 'เนรมิตโปสเตอร์เดี๋ยวนี้!'}
            </button>
          </div>
        </div>

        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-white/[0.02] border border-white/5 rounded-[60px] flex-1 min-h-[500px] flex flex-col items-center justify-center relative p-8 shadow-2xl overflow-hidden">
            {isGenerating ? (
              <div className="text-center space-y-6">
                <div className="relative">
                   <div className="w-24 h-24 border-4 border-amber-500/20 rounded-full mx-auto"></div>
                   <div className="w-24 h-24 border-4 border-amber-500 border-t-transparent rounded-full animate-spin absolute top-0 left-1/2 -ml-12"></div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-bold text-amber-500 uppercase tracking-widest animate-pulse">AI กำลังทำงานอย่างหนัก...</p>
                  <p className="text-[10px] text-slate-500 uppercase">อาจใช้เวลา 10-20 วินาที โปรดอย่าเพิ่งกดซ้ำ</p>
                </div>
              </div>
            ) : currentPoster ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-8 animate-in fade-in zoom-in duration-500">
                <div className="relative shadow-2xl rounded-[32px] overflow-hidden border border-white/10 bg-black max-w-full">
                  <img src={currentPoster.url} className="max-h-[65vh] w-auto block" />
                  <div className="absolute top-6 right-6 flex flex-col gap-4">
                    {logos.map(l => <img key={l.id} src={l.url} className="w-16 h-16 object-contain drop-shadow-xl" />)}
                  </div>
                  {posterText && (
                    <div className="absolute bottom-10 inset-x-0 text-center px-8">
                      <p className="text-white text-3xl md:text-5xl font-black italic drop-shadow-[0_8px_16px_rgba(0,0,0,0.9)] uppercase tracking-tight">{posterText}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-4">
                  <button onClick={downloadImage} className="bg-white text-black px-12 py-4 rounded-full font-black text-[12px] uppercase tracking-widest flex items-center gap-2 hover:bg-amber-400 transition-all shadow-xl active:scale-95">
                    <Download className="w-5 h-5" /> บันทึกภาพผลลัพธ์
                  </button>
                  <button onClick={() => setCurrentPoster(null)} className="bg-white/5 text-white p-4 rounded-full hover:bg-white/10 border border-white/10 transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center opacity-30">
                <div className="w-32 h-32 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                   <ImageIcon className="w-16 h-16 text-slate-700" />
                </div>
                <p className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-600">พื้นที่แสดงผลโปสเตอร์</p>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>

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
