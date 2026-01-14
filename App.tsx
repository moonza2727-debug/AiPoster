
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
  Check,
  AlertTriangle,
  Key
} from 'lucide-react';
import { AspectRatio, GeneratedPoster } from './types';
import { STYLE_PRESETS, ASPECT_RATIOS, LOADING_MESSAGES } from './constants';
import { generatePosterImage, openKeySelector, generatePosterSlogan, hasApiKey } from './services/gemini';

interface Logo {
  id: string;
  url: string;
}

const App: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [posterText, setPosterText] = useState('');
  const [styleIndex, setStyleIndex] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.SQUARE);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSloganLoading, setIsSloganLoading] = useState(false);
  const [aiSlogans, setAiSlogans] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(true);
  
  const [productImage, setProductImage] = useState<string | null>(null);
  const [logos, setLogos] = useState<Logo[]>([]);
  const [history, setHistory] = useState<GeneratedPoster[]>([]);
  const [currentPoster, setCurrentPoster] = useState<GeneratedPoster | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const checkKey = async () => {
      const exists = await hasApiKey();
      setHasKey(exists);
    };
    checkKey();
    const timer = setInterval(checkKey, 3000);
    return () => clearInterval(timer);
  }, []);

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
    reader.onload = (event) => setLogos(prev => [...prev, { id: Date.now().toString(), url: event.target?.result as string }]);
    reader.readAsDataURL(file);
  };

  const handleAiSlogan = async () => {
    if (!prompt.trim()) return;
    setIsSloganLoading(true);
    try {
      const res = await generatePosterSlogan(prompt);
      setAiSlogans(res);
    } finally {
      setIsSloganLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && !productImage) {
      setError("กรุณากรอกข้อมูลสินค้าหรืออัปโหลดรูปภาพก่อนครับ");
      return;
    }
    setError(null);
    setIsGenerating(true);
    try {
      const result = await generatePosterImage({
        prompt: prompt || "Modern commercial product",
        style: STYLE_PRESETS[styleIndex].label as any, 
        aspectRatio,
        highQuality: true,
        baseImage: productImage || undefined,
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
      if (err.message === "MISSING_KEY") {
        setError("ไม่พบ API Key กรุณากดปุ่มรูปกุญแจเพื่อเชื่อมต่อ");
      } else {
        setError(err.message || "เกิดข้อผิดพลาดในการสร้างภาพ");
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
      ctx.drawImage(logoImg, canvas.width - (logoSize + 40), 40 + (i * (logoSize + 20)), logoSize, logoSize * (logoImg.height / logoImg.width));
    }

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `poster-${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-[#020408] text-slate-200 flex flex-col font-['Prompt']">
      {/* Header */}
      <nav className="border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 p-2 rounded-xl"><Sparkles className="w-5 h-5 text-black" /></div>
          <h1 className="text-xl font-bold tracking-tight">AI POSTER <span className="text-amber-500">FREE</span></h1>
        </div>
        {!hasKey && (
          <button onClick={() => openKeySelector()} className="bg-orange-500 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 animate-pulse">
            <Key className="w-4 h-4" /> เชื่อมต่อ Key เพื่อเริ่มใช้
          </button>
        )}
      </nav>

      <main className="flex-1 container mx-auto p-4 md:p-8 flex flex-col lg:flex-row gap-8">
        {/* Sidebar Controls */}
        <div className="w-full lg:w-[400px] flex flex-col gap-6">
          <div className="bg-white/5 border border-white/10 rounded-[32px] p-6 space-y-6">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">1. อัปโหลดสินค้า</label>
              <label className="border-2 border-dashed border-white/10 rounded-2xl h-32 flex flex-col items-center justify-center cursor-pointer hover:border-amber-500/50 transition-all overflow-hidden relative">
                <input type="file" className="hidden" accept="image/*" onChange={handleProductUpload} />
                {productImage ? <img src={productImage} className="w-full h-full object-contain" /> : <ImageIcon className="w-8 h-8 text-slate-700" />}
              </label>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">2. รายละเอียดสินค้า</label>
              <textarea 
                value={prompt} 
                onChange={e => setPrompt(e.target.value)}
                placeholder="เช่น กาแฟดริปสกัดเย็น..."
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-amber-500 h-24"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">3. ข้อความบนภาพ</label>
                <button onClick={handleAiSlogan} className="text-[9px] text-amber-500 font-bold hover:underline">AI ช่วยคิด</button>
              </div>
              <input 
                value={posterText} 
                onChange={e => setPosterText(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm outline-none mb-2"
                placeholder="สโลแกนสินค้า..."
              />
              {aiSlogans.length > 0 && (
                <div className="grid grid-cols-1 gap-1 max-h-32 overflow-y-auto pr-2">
                  {aiSlogans.map((s, i) => (
                    <button key={i} onClick={() => setPosterText(s)} className="text-[10px] bg-white/5 p-2 rounded-lg text-left hover:bg-white/10 truncate">{s}</button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">4. เลือกสไตล์</label>
              <div className="grid grid-cols-2 gap-2">
                {STYLE_PRESETS.slice(0, 6).map((style, i) => (
                  <button key={i} onClick={() => setStyleIndex(i)} className={`text-[10px] p-2 rounded-lg border transition-all ${styleIndex === i ? 'bg-amber-500 text-black border-amber-500' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                    {style.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex gap-3 items-start">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-red-400 font-medium leading-relaxed">{error}</p>
              </div>
            )}

            <button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-600 py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-3 shadow-xl shadow-orange-600/20 active:scale-95 transition-all disabled:opacity-50"
            >
              {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {isGenerating ? 'กำลังสร้างภาพ...' : 'เริ่มสร้างโปสเตอร์'}
            </button>
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 flex flex-col gap-6">
          <div className="bg-white/5 border border-white/10 rounded-[40px] flex-1 min-h-[500px] relative overflow-hidden flex items-center justify-center">
            {isGenerating ? (
              <div className="text-center space-y-4">
                <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mx-auto"></div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]}</p>
              </div>
            ) : currentPoster ? (
              <div className="relative group max-w-full">
                <canvas ref={canvasRef} className="hidden" />
                <img src={currentPoster.url} className="max-h-[600px] w-auto rounded-2xl shadow-2xl" />
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                  {logos.map(l => <img key={l.id} src={l.url} className="w-12 h-12 object-contain bg-white/20 backdrop-blur rounded-lg p-1" />)}
                </div>
                {posterText && (
                  <div className="absolute bottom-6 inset-x-0 text-center px-4">
                    <p className="text-white text-2xl font-black italic drop-shadow-lg uppercase tracking-tight">{posterText}</p>
                  </div>
                )}
                <button onClick={downloadImage} className="absolute bottom-4 right-4 bg-white text-black p-3 rounded-full shadow-xl hover:scale-110 transition-all">
                  <Download className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="text-center opacity-20">
                <ImageIcon className="w-16 h-16 mx-auto mb-4" />
                <p className="text-xs uppercase font-bold tracking-[0.3em]">Ready to Create</p>
              </div>
            )}
          </div>

          {history.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-[32px] p-6">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2"><History className="w-3 h-3" /> ประวัติการสร้าง</h4>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {history.map(h => (
                  <button key={h.id} onClick={() => setCurrentPoster(h)} className="shrink-0">
                    <img src={h.url} className="h-20 w-auto rounded-lg border border-white/10 hover:border-amber-500 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="p-8 text-center border-t border-white/5">
        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">© 2025 AI Poster Free - Powered by Gemini AI</p>
      </footer>
    </div>
  );
};

export default App;
