
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
  Type,
  Layout,
  AlertTriangle,
  Key,
  Layers,
  Maximize2
} from 'lucide-react';
import { AspectRatio, GeneratedPoster } from './types';
import { STYLE_PRESETS, ASPECT_RATIOS, LOADING_MESSAGES } from './constants';
import { generatePosterImage, openKeySelector, generatePosterSlogan, hasApiKey } from './services/gemini';

interface Logo {
  id: string;
  url: string;
  isProcessed: boolean;
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
  const [isKeyReady, setIsKeyReady] = useState(true);
  
  const [productImage, setProductImage] = useState<string | null>(null);
  const [logos, setLogos] = useState<Logo[]>([]);
  const [history, setHistory] = useState<GeneratedPoster[]>([]);
  const [currentPoster, setCurrentPoster] = useState<GeneratedPoster | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const checkStatus = async () => {
      const ok = await hasApiKey();
      setIsKeyReady(ok);
    };
    checkStatus();
  }, []);

  // ฟังก์ชันลบพื้นหลังโลโก้ (สีขาว/ดำ) อัตโนมัติ
  const processLogo = (url: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = url;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(url);
        
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // ลบพิกเซลที่เกือบขาวหรือเกือบดำ (สำหรับโลโก้ทั่วไป)
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i+1], b = data[i+2];
          // ถ้าเป็นสีขาว (RGB > 240) ให้โปร่งใส
          if (r > 240 && g > 240 && b > 240) data[i+3] = 0;
        }
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL());
      };
    });
  };

  const handleProductUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setProductImage(event.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const processedUrl = await processLogo(event.target?.result as string);
      setLogos(prev => [...prev, { id: Date.now().toString(), url: processedUrl, isProcessed: true }]);
    };
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
      setError("กรุณากรอกรายละเอียดหรืออัปโหลดรูปสินค้าครับ");
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
        removeBackground,
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
      setError(err.message || "เกิดข้อผิดพลาดในการสร้างภาพ");
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

    // วาดโลโก้ (ใส)
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
      <nav className="border-b border-white/5 bg-black/60 backdrop-blur-2xl sticky top-0 z-50 px-6 py-4 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 p-2.5 rounded-2xl shadow-lg shadow-amber-500/20"><Sparkles className="w-5 h-5 text-black" /></div>
          <div>
            <h1 className="text-xl font-black tracking-tight flex items-center gap-2">AI POSTER <span className="bg-white/10 px-2 py-0.5 rounded text-[10px] text-amber-500">FREE PRO</span></h1>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em]">Nan Province Smart Solutions</p>
          </div>
        </div>
        {!isKeyReady && (
          <button onClick={() => openKeySelector()} className="bg-orange-600 text-white px-5 py-2 rounded-full text-[10px] font-black uppercase flex items-center gap-2 animate-pulse shadow-lg">
            <Key className="w-3.5 h-3.5" /> เชื่อมต่อระบบ
          </button>
        )}
      </nav>

      <main className="flex-1 container mx-auto p-4 md:p-8 flex flex-col lg:flex-row gap-10">
        <div className="w-full lg:w-[420px] flex flex-col gap-6">
          <div className="bg-white/[0.03] border border-white/10 rounded-[40px] p-8 space-y-7 shadow-2xl backdrop-blur-sm">
            
            {/* 1. อัปโหลดและลบพื้นหลัง */}
            <section className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-[11px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2"><Layers className="w-4 h-4" /> 01. สินค้าและฉากหลัง</h3>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <span className="text-[10px] font-bold text-slate-500 group-hover:text-amber-500 transition-colors">ลบพื้นหลังเดิม</span>
                  <div className={`w-8 h-4 rounded-full p-1 transition-all ${removeBackground ? 'bg-amber-500' : 'bg-slate-800'}`}>
                    <input type="checkbox" className="hidden" checked={removeBackground} onChange={() => setRemoveBackground(!removeBackground)} />
                    <div className={`w-2 h-2 bg-white rounded-full transition-all ${removeBackground ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </label>
              </div>
              <label className="border-2 border-dashed border-white/10 rounded-3xl h-44 flex flex-col items-center justify-center cursor-pointer hover:border-amber-500/50 transition-all overflow-hidden bg-black/40 group">
                <input type="file" className="hidden" accept="image/*" onChange={handleProductUpload} />
                {productImage ? <img src={productImage} className="w-full h-full object-contain p-2" /> : (
                  <div className="text-center">
                    <div className="bg-white/5 p-4 rounded-full mb-2 group-hover:bg-amber-500/10 transition-colors">
                      <ImageIcon className="w-8 h-8 text-slate-600 group-hover:text-amber-500" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">อัปโหลดรูปสินค้า</p>
                  </div>
                )}
              </label>
            </section>

            {/* 2. รายละเอียดและสโลแกน */}
            <section className="space-y-4">
              <label className="block space-y-2">
                <span className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">02. ชื่อสินค้า / รายละเอียด</span>
                <textarea 
                  value={prompt} 
                  onChange={e => setPrompt(e.target.value)}
                  placeholder="เช่น กาแฟดริปสกัดเย็น หอมกลิ่นภูเขาน่าน..."
                  className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-xs outline-none focus:border-amber-500/50 h-24 transition-all resize-none shadow-inner"
                />
              </label>

              <div className="bg-white/[0.02] p-5 rounded-3xl border border-white/5 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">พาดหัวโปสเตอร์</span>
                  <button onClick={handleAiSlogan} disabled={isSloganLoading} className="text-[10px] text-amber-500 font-black hover:underline disabled:opacity-30 uppercase">
                    {isSloganLoading ? 'กำลังคิด...' : 'AI ช่วยคิด'}
                  </button>
                </div>
                <input 
                  value={posterText} 
                  onChange={e => setPosterText(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-amber-500/30"
                  placeholder="สโลแกนสินค้า..."
                />
                {aiSlogans.length > 0 && (
                  <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto scrollbar-hide pt-2">
                    {aiSlogans.map((s, i) => (
                      <button key={i} onClick={() => setPosterText(s)} className="text-[10px] bg-white/5 p-2.5 rounded-xl text-left hover:bg-amber-500 hover:text-black font-bold transition-all truncate">{s}</button>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* 3. ขนาดและสไตล์ */}
            <section className="space-y-4">
              <h3 className="text-[11px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2"><Maximize2 className="w-4 h-4" /> 03. ขนาดและสไตล์</h3>
              
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {ASPECT_RATIOS.map((ratio) => (
                  <button 
                    key={ratio.id} 
                    onClick={() => setAspectRatio(ratio.id as any)}
                    className={`shrink-0 px-4 py-2 rounded-xl border text-[10px] font-black transition-all ${aspectRatio === ratio.id ? 'bg-white text-black border-white' : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'}`}
                  >
                    {ratio.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                {STYLE_PRESETS.map((style, i) => (
                  <button key={i} onClick={() => setStyleIndex(i)} className={`text-[10px] p-3 rounded-2xl border transition-all font-bold ${styleIndex === i ? 'bg-amber-500 text-black border-amber-500 shadow-xl shadow-amber-500/20' : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'}`}>
                    {style.label}
                  </button>
                ))}
              </div>
            </section>

            {/* 4. โโลโก้แบรนด์ */}
            <section className="space-y-3">
              <span className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">04. โลโก้แบรนด์ (ลบพื้นหลังขาวอัตโนมัติ)</span>
              <div className="flex gap-3 flex-wrap">
                {logos.map(l => (
                  <div key={l.id} className="relative w-14 h-14 bg-white/10 rounded-2xl p-2 group overflow-hidden border border-white/10">
                    <img src={l.url} className="w-full h-full object-contain drop-shadow-md" />
                    <button onClick={() => setLogos(prev => prev.filter(x => x.id !== l.id))} className="absolute inset-0 bg-red-600/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-5 h-5 text-white" />
                    </button>
                  </div>
                ))}
                <label className="w-14 h-14 border-2 border-dashed border-white/10 rounded-2xl flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors">
                  <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                  <Plus className="w-6 h-6 text-slate-600" />
                </label>
              </div>
            </section>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-3xl flex gap-3 items-center animate-shake">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                <p className="text-[10px] text-red-400 font-black uppercase tracking-wider">{error}</p>
              </div>
            )}

            <button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 py-5 rounded-[28px] font-black text-sm text-black flex items-center justify-center gap-3 shadow-2xl shadow-orange-600/40 active:scale-95 transition-all disabled:opacity-50"
            >
              {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              {isGenerating ? 'กำลังสร้างผลงาน...' : 'เนรมิตโปสเตอร์'}
            </button>
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 flex flex-col gap-8">
          <div className="bg-white/[0.02] border border-white/5 rounded-[60px] flex-1 min-h-[600px] relative overflow-hidden flex flex-col items-center justify-center shadow-inner group">
            {isGenerating ? (
              <div className="text-center space-y-8 p-12">
                <div className="relative w-20 h-20 mx-auto">
                  <div className="absolute inset-0 border-4 border-amber-500/10 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                  <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-amber-500 animate-pulse" />
                </div>
                <div className="space-y-3">
                  <p className="text-sm font-black text-white italic tracking-widest uppercase">{LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]}</p>
                  <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.5em]">Gemini 2.5 Intelligence</p>
                </div>
              </div>
            ) : currentPoster ? (
              <div className="relative flex flex-col items-center animate-in fade-in zoom-in duration-700 w-full p-4 lg:p-12">
                <canvas ref={canvasRef} className="hidden" />
                <div className="relative shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] rounded-[45px] overflow-hidden border border-white/10 bg-black group-hover:scale-[1.02] transition-transform duration-500">
                  <img src={currentPoster.url} className="max-h-[650px] w-auto block" />
                  
                  {/* แสดงผลโลโก้บน Preview */}
                  <div className="absolute top-8 right-8 flex flex-col gap-4">
                    {logos.map(l => (
                      <img key={l.id} src={l.url} className="w-16 h-16 object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]" />
                    ))}
                  </div>

                  {/* แสดงผลสโลแกนบน Preview */}
                  {posterText && (
                    <div className="absolute bottom-10 inset-x-0 text-center px-10">
                      <p className="text-white text-4xl lg:text-5xl font-black italic drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] uppercase tracking-tighter leading-[0.9]">{posterText}</p>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-4 mt-12">
                  <button onClick={downloadImage} className="bg-white text-black px-12 py-4 rounded-full font-black text-[11px] uppercase tracking-[0.2em] flex items-center gap-3 hover:bg-amber-400 transition-all shadow-2xl active:scale-95">
                    <Download className="w-5 h-5" /> Download HD
                  </button>
                  <button onClick={() => setCurrentPoster(null)} className="bg-white/5 text-white p-4 rounded-full hover:bg-white/10 transition-all">
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center opacity-10">
                <div className="relative w-32 h-32 mx-auto mb-10">
                  <ImageIcon className="w-full h-full text-white" />
                  <div className="absolute -inset-8 border border-white/20 rounded-full animate-[spin_30s_linear_infinite]"></div>
                  <div className="absolute -inset-16 border border-white/5 rounded-full animate-[spin_45s_linear_infinite_reverse]"></div>
                </div>
                <p className="text-xs uppercase font-black tracking-[0.8em] text-white">Select Product to Begin</p>
              </div>
            )}
          </div>

          {history.length > 0 && (
            <div className="bg-white/[0.03] border border-white/5 rounded-[45px] p-8 shadow-inner">
              <h4 className="text-[10px] font-black text-slate-500 uppercase mb-6 flex items-center gap-2 tracking-[0.3em]"><History className="w-4 h-4 text-amber-500" /> ผลงานล่าสุด</h4>
              <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide">
                {history.map(h => (
                  <button key={h.id} onClick={() => setCurrentPoster(h)} className={`shrink-0 transition-all duration-300 rounded-2xl overflow-hidden border-2 ${currentPoster?.id === h.id ? 'scale-110 border-amber-500 shadow-xl shadow-amber-500/20' : 'opacity-30 hover:opacity-100 border-transparent hover:border-white/20'}`}>
                    <img src={h.url} className="h-24 w-auto" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="p-10 text-center border-t border-white/5 opacity-30 mt-10 bg-black/40">
        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.5em]">© 2025 Nan OTOP Smart Branding Tool - Powered by Gemini Flash</p>
      </footer>
    </div>
  );
};

export default App;
