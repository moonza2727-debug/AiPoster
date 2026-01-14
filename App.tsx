
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
  Trash2
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
        setLogos(prev => [...prev, { id: Date.now().toString(), url: ev.target?.result as string }]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async (forceNormal: boolean = false) => {
    setError(null);
    if (!prompt.trim() && !productImage) {
      setError("กรุณากรอกชื่อสินค้าหรืออัปโหลดรูปภาพ");
      return;
    }

    const useHQ = forceNormal ? false : highQuality;
    if (forceNormal) setHighQuality(false);

    setIsGenerating(true);
    try {
      const result = await generatePosterImage({
        prompt,
        style: STYLE_PRESETS[styleIndex].prompt as any,
        aspectRatio,
        highQuality: useHQ,
        baseImage: productImage || undefined,
        removeBackground: true,
        posterText
      });

      setCurrentPoster({
        id: Date.now().toString(),
        url: result,
        prompt,
        style: STYLE_PRESETS[styleIndex].label as any,
        aspectRatio,
        timestamp: Date.now()
      });
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
        setError("⚠️ โควตาฟรีของ Google เต็มชั่วคราว! กรุณารอ 1 นาที หรือลอง 'เปลี่ยนคำอธิบายสินค้า' เล็กน้อยแล้วลองใหม่ครับ");
      } else {
        setError("❌ เกิดข้อผิดพลาด: " + msg);
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

    // Draw Logos
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
    link.download = `poster-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="min-h-screen bg-[#03060b] text-slate-200 flex flex-col font-['Prompt']">
      <nav className="border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 p-2 rounded-xl shadow-lg">
            <Sparkles className="w-5 h-5 text-black" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">AI POSTER PRO</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-3 px-4 py-2 rounded-full border border-white/10 ${highQuality ? 'bg-amber-500/10' : 'bg-white/5'}`}>
            <span className={`text-[10px] font-black uppercase ${highQuality ? 'text-amber-500' : 'text-slate-500'}`}>
              โหมดคุณภาพสูงสุด {highQuality ? '(เปิด)' : '(ปิด)'}
            </span>
            <button 
              onClick={() => setHighQuality(!highQuality)}
              className={`w-10 h-5 rounded-full relative transition-all ${highQuality ? 'bg-amber-500' : 'bg-slate-700'}`}
            >
              <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${highQuality ? 'right-1' : 'left-1'}`} />
            </button>
          </div>
          {isAiStudio && (
            <button onClick={openKeySelector} className="p-2 bg-white/5 rounded-full border border-white/10">
              <Settings2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </nav>

      <main className="flex-1 container mx-auto p-4 lg:p-8 grid lg:grid-cols-12 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          <div className="glass rounded-[40px] p-6 space-y-6 border border-white/10 shadow-2xl h-[calc(100vh-160px)] overflow-y-auto custom-scrollbar">
            
            {/* Step 1: Product Image */}
            <div className="bg-white/5 p-4 rounded-3xl border border-white/5 space-y-3">
              <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                <Layers className="w-4 h-4" /> 01. รูปภาพสินค้า
              </label>
              <label className="block w-full h-32 border-2 border-dashed border-white/10 rounded-2xl hover:border-amber-500/50 transition-all cursor-pointer relative overflow-hidden bg-black/20">
                <input type="file" className="hidden" accept="image/*" onChange={handleProductUpload} />
                {productImage ? (
                  <img src={productImage} className="w-full h-full object-contain p-2" />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-1">
                    <ImageIcon className="w-6 h-6 opacity-20" />
                    <span className="text-[9px] font-bold">อัปโหลดรูปสินค้า</span>
                  </div>
                )}
              </label>
            </div>

            {/* Step 2: LOGO (CRITICAL - Moved Up) */}
            <div className="bg-amber-500/5 p-4 rounded-3xl border border-amber-500/20 space-y-3">
              <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> 02. ใส่โลโก้แบรนด์
              </label>
              <div className="flex flex-wrap gap-2">
                {logos.map(logo => (
                  <div key={logo.id} className="relative w-12 h-12 bg-white p-1 rounded-lg border border-white/20">
                    <img src={logo.url} className="w-full h-full object-contain" />
                    <button onClick={() => setLogos(l => l.filter(x => x.id !== logo.id))} className="absolute -top-2 -right-2 bg-red-500 p-1 rounded-full">
                      <X className="w-2 h-2 text-white" />
                    </button>
                  </div>
                ))}
                <label className="w-12 h-12 border-2 border-dashed border-amber-500/30 rounded-lg flex items-center justify-center cursor-pointer hover:bg-amber-500/10">
                  <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                  <Plus className="w-4 h-4 text-amber-500" />
                </label>
              </div>
              <p className="text-[8px] text-amber-500/60 font-bold">* แนะนำไฟล์พื้นหลังใส (PNG)</p>
            </div>

            {/* Step 3: Text */}
            <div className="bg-white/5 p-4 rounded-3xl border border-white/5 space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                  <TypeIcon className="w-4 h-4" /> 03. ข้อความ/สโลแกน
                </label>
                <button onClick={async () => {
                  if (!prompt) return;
                  setIsSloganLoading(true);
                  const s = await generatePosterSlogan(prompt);
                  setPosterText(s[0]);
                  setIsSloganLoading(false);
                }} disabled={isSloganLoading} className="text-[9px] text-amber-400 font-bold hover:underline">
                  AI ช่วยคิดสโลแกน
                </button>
              </div>
              <textarea 
                value={prompt} 
                onChange={e => setPrompt(e.target.value)} 
                placeholder="ชื่อสินค้า/คุณสมบัติ..." 
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs outline-none h-16 focus:border-amber-500/50" 
              />
              <input 
                type="text" 
                value={posterText} 
                onChange={e => setPosterText(e.target.value)} 
                placeholder="คำพาดหัวที่จะโชว์บนภาพ..." 
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs outline-none focus:border-amber-500/50" 
              />
            </div>

            {/* Step 4: Style */}
            <div className="bg-white/5 p-4 rounded-3xl border border-white/5 space-y-3">
              <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                <Maximize2 className="w-4 h-4" /> 04. สไตล์ภาพ
              </label>
              <div className="grid grid-cols-1 gap-2">
                <select value={styleIndex} onChange={e => setStyleIndex(Number(e.target.value))} className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-[10px] outline-none">
                  {STYLE_PRESETS.map((s, i) => <option key={i} value={i}>{s.label}</option>)}
                </select>
                <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value as any)} className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-[10px] outline-none">
                  {ASPECT_RATIOS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex flex-col gap-2">
                <div className="flex items-start gap-2 text-red-400">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="text-[10px] font-bold leading-relaxed">{error}</p>
                </div>
                {error.includes("โควตา") && (
                  <button onClick={() => handleGenerate(true)} className="w-full py-2 bg-red-500/20 text-red-400 text-[9px] font-black rounded-lg hover:bg-red-500/30">
                    ลองอีกครั้ง (โหมดคุณภาพมาตรฐาน)
                  </button>
                )}
              </div>
            )}

            <button 
              onClick={() => handleGenerate()} 
              disabled={isGenerating} 
              className="w-full py-5 rounded-3xl font-black text-[12px] uppercase tracking-widest flex items-center justify-center gap-3 bg-amber-500 text-black hover:bg-amber-400 active:scale-95 transition-all shadow-xl disabled:opacity-50"
            >
              {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Rocket className="w-5 h-5" />}
              {isGenerating ? 'กำลังสร้างภาพ...' : 'เริ่มสร้างโปสเตอร์'}
            </button>
          </div>
        </div>

        {/* Preview Area */}
        <div className="lg:col-span-8 flex flex-col items-center justify-center bg-white/[0.02] border border-white/5 rounded-[60px] p-8 min-h-[500px] relative overflow-hidden shadow-inner">
           {isGenerating ? (
             <div className="text-center space-y-6">
                <div className="w-20 h-20 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-amber-500 font-black animate-pulse text-xs tracking-widest uppercase">AI กำลังทำงาน...</p>
             </div>
           ) : currentPoster ? (
             <div className="w-full flex flex-col items-center gap-8 animate-in zoom-in duration-500">
               <div className="relative shadow-2xl rounded-[40px] overflow-hidden border border-white/10 bg-black">
                 <img src={currentPoster.url} className="max-h-[60vh] w-auto block" />
                 {/* Live Logo Overlay */}
                 <div className="absolute top-4 right-4 flex gap-2">
                   {logos.map(l => <img key={l.id} src={l.url} className="h-10 w-auto object-contain drop-shadow-xl" />)}
                 </div>
               </div>
               <div className="flex gap-4">
                 <button onClick={downloadImage} className="bg-white text-black px-10 py-4 rounded-full font-black text-[11px] uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-all">
                   <Download className="w-5 h-5" /> ดาวน์โหลดภาพ
                 </button>
                 <button onClick={() => setCurrentPoster(null)} className="bg-white/10 text-white/50 px-6 py-4 rounded-full font-black text-[11px] uppercase tracking-widest hover:bg-white/20 transition-all">
                   ล้างหน้าจอ
                 </button>
               </div>
             </div>
           ) : (
             <div className="opacity-20 text-center space-y-4">
                <ImageIcon className="w-20 h-20 mx-auto" />
                <p className="text-xs font-black tracking-widest uppercase">พร้อมสร้างงานศิลปะ</p>
             </div>
           )}
           <canvas ref={canvasRef} className="hidden" />
        </div>
      </main>
    </div>
  );
};

export default App;
