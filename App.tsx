
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
  Rocket,
  ShieldCheck,
  Trash2,
  ChevronRight
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
  const [highQuality, setHighQuality] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSloganLoading, setIsSloganLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAiStudio, setIsAiStudio] = useState(false);
  
  const [productImage, setProductImage] = useState<string | null>(null);
  const [logos, setLogos] = useState<Logo[]>([]);
  const [currentPoster, setCurrentPoster] = useState<GeneratedPoster | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if ((window as any).aistudio) {
      setIsAiStudio(true);
    }
  }, []);

  const handleProductUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setProductImage(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const data = ev.target?.result as string;
        setLogos(prev => [...prev, { id: Date.now().toString(), url: data }]);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = (id: string) => {
    setLogos(prev => prev.filter(l => l.id !== id));
  };

  const handleAiSlogan = async () => {
    setError(null);
    if (!prompt.trim()) {
      setError("กรุณาใส่ชื่อสินค้าก่อน");
      return;
    }
    setIsSloganLoading(true);
    try {
      const suggestions = await generatePosterSlogan(prompt);
      if (suggestions.length > 0) {
        setPosterText(suggestions[0]);
      }
    } catch (e: any) {
      setError("AI คิดสโลแกนไม่ได้: " + e.message);
    } finally {
      setIsSloganLoading(false);
    }
  };

  const handleGenerate = async (forceNormal: boolean = false) => {
    setError(null);
    if (!prompt.trim() && !productImage) {
      setError("กรุณาใส่ชื่อสินค้าหรือรูปภาพก่อน");
      return;
    }

    const useHQ = forceNormal ? false : highQuality;
    if (forceNormal) setHighQuality(false);

    setIsGenerating(true);
    try {
      const result = await generatePosterImage({
        prompt: prompt || "Premium Nan product",
        style: STYLE_PRESETS[styleIndex].prompt as any,
        aspectRatio,
        highQuality: useHQ,
        baseImage: productImage || undefined,
        removeBackground,
        posterText: posterText
      });

      setCurrentPoster({
        id: Date.now().toString(),
        url: result,
        prompt: prompt,
        style: STYLE_PRESETS[styleIndex].label as any,
        aspectRatio: aspectRatio,
        timestamp: Date.now()
      });
    } catch (err: any) {
      console.error("Generate Error:", err);
      if (err.message?.includes("429") || err.message?.includes("RESOURCE_EXHAUSTED")) {
        setError("โควตา Gemini Pro เต็ม! ระบบแนะนำให้ใช้โหมด 'คุณภาพมาตรฐาน' แทน");
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
    mainImg.crossOrigin = "anonymous";
    mainImg.src = currentPoster.url;
    await new Promise(r => mainImg.onload = r);

    canvas.width = mainImg.width;
    canvas.height = mainImg.height;
    ctx.drawImage(mainImg, 0, 0);

    const logoSize = canvas.width * 0.15;
    let offsetX = 40;
    for (const logo of logos) {
      const logoImg = new Image();
      logoImg.src = logo.url;
      await new Promise(r => logoImg.onload = r);
      const h = logoSize * (logoImg.height / logoImg.width);
      ctx.drawImage(logoImg, canvas.width - (logoSize + offsetX), 40, logoSize, h);
      offsetX += logoSize + 20;
    }

    const link = document.createElement('a');
    link.download = `ai-poster-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="min-h-screen bg-[#03060b] text-slate-200 flex flex-col font-['Prompt']">
      {/* Navbar */}
      <nav className="border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 p-2 rounded-xl shadow-lg shadow-amber-500/20">
            <Sparkles className="w-5 h-5 text-black" />
          </div>
          <h1 className="text-lg font-bold leading-none tracking-tight">AI POSTER PRO</h1>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10 group">
            <span className={`text-[10px] font-black uppercase tracking-widest ${highQuality ? 'text-amber-500' : 'text-slate-500'}`}>
              โหมด PRO {highQuality ? '(เปิด)' : '(ปิด)'}
            </span>
            <button 
              onClick={() => setHighQuality(!highQuality)}
              className={`w-11 h-6 rounded-full relative transition-all duration-300 ${highQuality ? 'bg-amber-500' : 'bg-slate-700'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg transition-all duration-300 ${highQuality ? 'right-1' : 'left-1'}`} />
            </button>
          </div>
          {isAiStudio && (
            <button onClick={openKeySelector} className="p-2 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-colors">
              <Settings2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </nav>

      <main className="flex-1 container mx-auto p-4 lg:p-8 grid lg:grid-cols-12 gap-8">
        {/* Sidebar Controls */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass rounded-[40px] p-8 space-y-8 border border-white/10 shadow-2xl max-h-[calc(100vh-140px)] overflow-y-auto custom-scrollbar">
            
            {/* 01. รูปภาพสินค้า */}
            <section className="space-y-4">
              <label className="text-[11px] font-black text-amber-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <Layers className="w-4 h-4" /> 01. รูปภาพสินค้า
              </label>
              <div className="relative group">
                <label className="block w-full h-48 border-2 border-dashed border-white/10 rounded-3xl bg-black/40 hover:border-amber-500/50 transition-all cursor-pointer overflow-hidden">
                  <input type="file" className="hidden" accept="image/*" onChange={handleProductUpload} />
                  {productImage ? (
                    <img src={productImage} className="w-full h-full object-contain p-4" alt="Product preview" />
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
                      <ImageIcon className="w-10 h-10 opacity-20" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">อัปโหลดรูปสินค้า</span>
                    </div>
                  )}
                </label>
                {productImage && (
                  <button onClick={() => setProductImage(null)} className="absolute top-3 right-3 bg-red-500 p-1.5 rounded-full shadow-lg hover:scale-110 transition-transform">
                    <X className="w-3 h-3 text-white" />
                  </button>
                )}
              </div>
            </section>

            {/* 02. โลโก้แบรนด์ (ย้ายขึ้นมา) */}
            <section className="space-y-4">
              <label className="text-[11px] font-black text-amber-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> 02. โลโก้แบรนด์
              </label>
              <div className="flex flex-wrap gap-3 p-4 bg-black/40 rounded-3xl border border-white/5">
                {logos.map(logo => (
                  <div key={logo.id} className="relative w-14 h-14 bg-white/5 rounded-xl border border-white/10 p-2 group shadow-inner">
                    <img src={logo.url} className="w-full h-full object-contain" alt="Logo" />
                    <button 
                      onClick={() => removeLogo(logo.id)}
                      className="absolute -top-2 -right-2 bg-red-500 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                    >
                      <X className="w-2.5 h-2.5 text-white" />
                    </button>
                  </div>
                ))}
                <label className="w-14 h-14 border-2 border-dashed border-white/20 rounded-xl flex items-center justify-center cursor-pointer hover:border-amber-500/50 hover:bg-white/5 transition-all">
                  <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                  <Plus className="w-5 h-5 text-slate-500" />
                </label>
              </div>
              <p className="text-[9px] text-slate-500 italic px-2">* แนะนำไฟล์ PNG พื้นหลังโปร่งใส</p>
            </section>

            {/* 03. ข้อมูลและสโลแกน */}
            <section className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-black text-amber-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <TypeIcon className="w-4 h-4" /> 03. ข้อมูลสินค้า
                </label>
                <button 
                  onClick={handleAiSlogan} 
                  disabled={isSloganLoading}
                  className="text-[10px] font-black text-amber-400/80 hover:text-amber-400 flex items-center gap-1 uppercase transition-colors disabled:opacity-30"
                >
                  {isSloganLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  AI ช่วยคิดสโลแกน
                </button>
              </div>
              <textarea 
                value={prompt} 
                onChange={e => setPrompt(e.target.value)} 
                placeholder="ชื่อสินค้าหรือสรรพคุณสั้นๆ..." 
                className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-xs outline-none h-20 focus:border-amber-500/50 transition-all placeholder:opacity-30" 
              />
              <input 
                type="text" 
                value={posterText} 
                onChange={e => setPosterText(e.target.value)} 
                placeholder="คำพาดหัวบนโปสเตอร์ (Headline)" 
                className="w-full bg-black/60 border border-white/10 rounded-2xl px-5 py-4 text-xs outline-none focus:border-amber-500/50 transition-all" 
              />
            </section>

            {/* 04. สไตล์และสัดส่วน */}
            <section className="space-y-4">
              <label className="text-[11px] font-black text-amber-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <Maximize2 className="w-4 h-4" /> 04. ปรับแต่งดีไซน์
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] text-slate-500 uppercase font-bold ml-1">สไตล์ภาพ</label>
                  <select value={styleIndex} onChange={e => setStyleIndex(Number(e.target.value))} className="w-full bg-black border border-white/10 rounded-xl px-3 py-3 text-[10px] outline-none hover:bg-white/5">
                    {STYLE_PRESETS.map((s, i) => <option key={i} value={i}>{s.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] text-slate-500 uppercase font-bold ml-1">ขนาด</label>
                  <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value as any)} className="w-full bg-black border border-white/10 rounded-xl px-3 py-3 text-[10px] outline-none hover:bg-white/5">
                    {ASPECT_RATIOS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                </div>
              </div>
            </section>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 p-5 rounded-3xl space-y-3">
                <div className="flex items-start gap-3 text-red-400">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <p className="text-[11px] font-bold leading-relaxed">{error}</p>
                </div>
                {error.includes("โควตา") && (
                  <button 
                    onClick={() => handleGenerate(true)} 
                    className="w-full py-2 bg-red-500/20 text-red-400 text-[10px] font-bold rounded-xl hover:bg-red-500/30 transition-all"
                  >
                    ลองใหม่อีกครั้งด้วยโหมดปกติ
                  </button>
                )}
              </div>
            )}

            <button 
              onClick={() => handleGenerate()} 
              disabled={isGenerating} 
              className="w-full py-6 rounded-[32px] font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 bg-amber-500 text-black hover:bg-amber-400 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-amber-500/10 disabled:opacity-50"
            >
              {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Rocket className="w-5 h-5" />}
              {isGenerating ? 'กำลังเนรมิต...' : 'เริ่มสร้างโปสเตอร์'}
            </button>
          </div>
        </div>

        {/* Preview Area */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-white/[0.02] border border-white/5 rounded-[60px] flex-1 min-h-[500px] flex flex-col items-center justify-center relative p-8 shadow-2xl overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/5 to-transparent opacity-30"></div>
            
            {isGenerating ? (
              <div className="text-center space-y-8 relative z-10">
                 <div className="w-32 h-32 relative mx-auto">
                    <div className="absolute inset-0 border-4 border-amber-500/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                    <Sparkles className="absolute inset-0 m-auto w-10 h-10 text-amber-500 animate-pulse" />
                 </div>
                 <div className="space-y-3">
                    <p className="text-sm font-black animate-pulse uppercase tracking-[0.3em] text-amber-500">AI ARTIST IS WORKING</p>
                    <p className="text-[10px] text-slate-500 italic max-w-xs mx-auto">"กำลังผสานรูปภาพเข้ากับฉากหลังแบบมืออาชีพ โปรดรอสักครู่"</p>
                 </div>
              </div>
            ) : currentPoster ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-10 animate-in fade-in zoom-in duration-700 relative z-10">
                <div className="relative shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] rounded-[40px] overflow-hidden border border-white/10 bg-black group/poster transition-all">
                  <img src={currentPoster.url} className="max-h-[60vh] w-auto block" alt="Generated Poster" />
                  
                  {/* Real-time Overlay Previews */}
                  <div className="absolute top-6 right-6 flex gap-3">
                    {logos.map(logo => (
                      <img key={logo.id} src={logo.url} className="h-12 w-auto object-contain drop-shadow-2xl" alt="Logo preview" />
                    ))}
                  </div>
                </div>

                <div className="flex gap-4">
                  <button onClick={downloadImage} className="bg-white text-black px-12 py-5 rounded-full font-black text-[11px] uppercase tracking-[0.2em] flex items-center gap-3 hover:scale-110 active:scale-95 transition-all shadow-2xl shadow-white/10">
                    <Download className="w-5 h-5" /> บันทึกผลงาน (Full HD)
                  </button>
                  <button onClick={() => setCurrentPoster(null)} className="bg-white/5 text-white/50 px-8 py-5 rounded-full font-black text-[11px] uppercase tracking-[0.2em] flex items-center gap-3 hover:bg-white/10 hover:text-white transition-all">
                    <Trash2 className="w-5 h-5" /> ล้างหน้าจอ
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-6 relative z-10 opacity-40">
                <div className="w-40 h-40 bg-white/[0.03] rounded-full flex items-center justify-center mx-auto border border-white/5 shadow-inner">
                  <ImageIcon className="w-16 h-16 text-slate-500" />
                </div>
                <div className="space-y-2">
                  <p className="text-[12px] font-black uppercase tracking-[0.8em] text-slate-400">READY TO CREATE</p>
                  <p className="text-[10px] text-slate-600 font-medium">พื้นที่แสดงผลโปสเตอร์ที่คุณออกแบบ</p>
                </div>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>
        </div>
      </main>
      
      <footer className="py-6 text-center text-[10px] text-slate-600 font-medium uppercase tracking-widest border-t border-white/5 bg-black/20">
        © 2025 AI POSTER PRO • NAN OTOP SMART MARKETING
      </footer>
    </div>
  );
};

export default App;
