
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
  ExternalLink,
  CheckCircle2,
  Clock,
  ArrowRightCircle,
  HelpCircle,
  Check,
  MonitorOff,
  StepForward,
  Zap
} from 'lucide-react';
import { AspectRatio, GeneratedPoster } from './types';
import { STYLE_PRESETS, ASPECT_RATIOS } from './constants';
import { generatePosterImage, openKeySelector } from './services/gemini';

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
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [isAiStudio, setIsAiStudio] = useState(false);
  const [hasPrivateKey, setHasPrivateKey] = useState(false);
  const [productImage, setProductImage] = useState<string | null>(null);
  const [logos, setLogos] = useState<Logo[]>([]);
  const [currentPoster, setCurrentPoster] = useState<GeneratedPoster | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const checkKeyStatus = async () => {
      const win = window as any;
      if (win.aistudio) {
        setIsAiStudio(true);
        const hasKey = await win.aistudio.hasSelectedApiKey?.();
        setHasPrivateKey(!!hasKey);
      }
    };
    checkKeyStatus();
    const interval = setInterval(checkKeyStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const resetQuotaError = () => {
    setError(null);
    setCooldown(0);
  };

  const handleGenerate = async () => {
    if (cooldown > 0) return;
    setError(null);
    if (!prompt.trim() && !productImage) {
      setError("กรุณากรอกชื่อสินค้าหรืออัปโหลดรูปภาพครับ");
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generatePosterImage({
        prompt,
        style: STYLE_PRESETS[styleIndex].prompt as any,
        aspectRatio,
        highQuality,
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
      setError(null);
    } catch (err: any) {
      const msg = err.message || "";
      console.error("Generate Error Details:", err);
      
      if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("Quota")) {
        setError("QUOTA_ERROR");
        setCooldown(60); 
      } else if (msg.includes("404") || msg.includes("not found")) {
        setError("KEY_NOT_FOUND");
        if (isAiStudio) await openKeySelector();
      } else {
        setError(msg || "เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่");
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
    link.download = `poster-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="min-h-screen bg-[#020408] text-slate-200 flex flex-col font-['Prompt']">
      <nav className="border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 p-2 rounded-xl shadow-lg shadow-amber-500/20">
            <Sparkles className="w-5 h-5 text-black" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">AI POSTER PRO</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowTutorial(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500 text-black text-[11px] font-black uppercase tracking-widest hover:bg-amber-400 transition-all shadow-xl shadow-amber-500/10 animate-pulse"
          >
            <HelpCircle className="w-4 h-4" /> ดูวิธีแก้: ถ้าติดหน้าป๊อปอัป
          </button>
          
          <div className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${hasPrivateKey ? 'bg-green-500/10 border-green-500/30 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.1)]' : 'bg-white/5 border-white/10 text-slate-500'}`}>
            {hasPrivateKey ? <CheckCircle2 className="w-3.5 h-3.5" /> : <RefreshCw className="w-3.5 h-3.5 animate-spin opacity-50" />}
            <span className="text-[10px] font-black uppercase tracking-widest">
              {hasPrivateKey ? 'API KEY ACTIVE' : 'WAITING FOR KEY'}
            </span>
          </div>

          {isAiStudio && (
            <button onClick={openKeySelector} className="p-2.5 bg-white/5 hover:bg-amber-500 hover:text-black rounded-full border border-white/10 transition-all group">
              <Settings2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </nav>

      {showTutorial && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6 overflow-y-auto">
          <div className="bg-[#0a0c10] border border-white/10 rounded-[40px] max-w-4xl w-full p-8 relative shadow-2xl space-y-8 animate-in zoom-in duration-300">
            <button onClick={() => setShowTutorial(false)} className="absolute top-6 right-6 p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
            
            <div className="space-y-4 text-center">
              <div className="flex items-center justify-center gap-4 text-amber-500">
                <MonitorOff className="w-10 h-10" />
                <h2 className="text-3xl font-black uppercase tracking-tight">แก้ปัญหา "ป๊อปอัปเด้งซ้ำ"</h2>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed max-w-2xl mx-auto italic">
                "ถ้าคุณกดปุ่มกลางจอ มันจะเด้งถามหา Project ตลอดเวลา... ให้เปลี่ยนมาทำตามนี้ครับ"
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-6 rounded-3xl bg-red-500/10 border border-red-500/20 space-y-4">
                <div className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center font-black text-lg">1</div>
                <h3 className="text-red-400 text-xs font-black uppercase tracking-widest">ปิดป๊อปอัปทิ้ง</h3>
                <p className="text-[12px] text-slate-300 leading-relaxed">
                  ถ้าเห็นหน้าต่าง <b>"No Cloud Projects"</b> ให้กดปิดทิ้งทันที อย่าไปกด Import ครับ
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-blue-500/10 border border-blue-500/20 space-y-4">
                <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-black text-lg">2</div>
                <h3 className="text-blue-400 text-xs font-black uppercase tracking-widest">กดปุ่ม "ขวาบน"</h3>
                <p className="text-[12px] text-slate-300 leading-relaxed">
                  มองไปที่ **มุมขวาบน** ของหน้าจอ (แถวรูปโปรไฟล์) จะเห็นปุ่ม <b>"Create API key"</b> สีเทาๆ เล็กๆ ครับ
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-green-500/10 border border-green-500/20 space-y-4">
                <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center font-black text-lg">3</div>
                <h3 className="text-green-400 text-xs font-black uppercase tracking-widest">เลือก "New Project"</h3>
                <p className="text-[12px] text-slate-300 leading-relaxed">
                  เลือกบรรทัดแรก: <b>"Create API key in new project"</b> แล้วรอระบบเจนรหัสให้จนเสร็จครับ
                </p>
              </div>
            </div>

            <div className="bg-amber-500/5 border border-amber-500/20 p-6 rounded-3xl">
               <div className="flex items-center gap-4 text-amber-500 mb-4">
                 <StepForward className="w-5 h-5" />
                 <h3 className="text-[11px] font-black uppercase tracking-widest text-white">ขั้นตอนหลังได้ Key มาแล้ว</h3>
               </div>
               <p className="text-[13px] text-slate-400 leading-relaxed">
                 เมื่อเจนรหัสเสร็จแล้ว ให้กลับมาที่หน้านี้ แล้วกดที่ปุ่ม <b>"Settings" (รูปเฟือง)</b> ที่มุมขวาบนของแอปเรา แล้วเลือกรหัสที่เพิ่งสร้างมาครับ ระบบก็จะเริ่มทำงานทันที!
               </p>
            </div>

            <div className="flex gap-4">
               <button onClick={() => setShowTutorial(false)} className="flex-1 py-5 bg-amber-500 text-black font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl hover:bg-amber-400 transition-all">เข้าใจแล้วครับ!</button>
               <a href="https://aistudio.google.com/app/apikey" target="_blank" className="flex-1 py-5 bg-white/5 text-white font-bold text-xs flex items-center justify-center gap-2 rounded-2xl hover:bg-white/10 transition-colors border border-white/5">ไปหน้า Google AI Studio <ExternalLink className="w-4 h-4" /></a>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 container mx-auto p-4 lg:p-8 grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-4">
          <div className="glass rounded-[40px] p-6 space-y-6 border border-white/10 shadow-2xl h-[calc(100vh-140px)] overflow-y-auto custom-scrollbar">
            
            {/* Poster Builder UI */}
            <div className="bg-amber-500/10 p-5 rounded-[30px] border border-amber-500/20 space-y-4 shadow-inner">
              <label className="text-[11px] font-black text-amber-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> 01. โลโก้แบรนด์
              </label>
              <div className="flex flex-wrap gap-3">
                {logos.map(logo => (
                  <div key={logo.id} className="relative w-14 h-14 bg-white p-1 rounded-xl border border-white/20 shadow-md">
                    <img src={logo.url} className="w-full h-full object-contain" />
                    <button onClick={() => setLogos(l => l.filter(x => x.id !== logo.id))} className="absolute -top-2 -right-2 bg-red-500 p-1 rounded-full shadow-lg hover:scale-110 transition-transform">
                      <X className="w-2.5 h-2.5 text-white" />
                    </button>
                  </div>
                ))}
                <label className="w-14 h-14 border-2 border-dashed border-amber-500/40 rounded-xl flex items-center justify-center cursor-pointer hover:bg-amber-500/10 transition-all group">
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => setLogos(prev => [...prev, { id: Date.now().toString(), url: ev.target?.result as string }]);
                      reader.readAsDataURL(file);
                    }
                  }} />
                  <Plus className="w-5 h-5 text-amber-500 group-hover:scale-110 transition-transform" />
                </label>
              </div>
            </div>

            <div className="bg-white/5 p-5 rounded-[30px] border border-white/5 space-y-3">
              <label className="text-[11px] font-black text-amber-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <Layers className="w-4 h-4" /> 02. รูปภาพสินค้า
              </label>
              <label className="block w-full h-36 border-2 border-dashed border-white/10 rounded-3xl hover:border-amber-500/50 transition-all cursor-pointer relative overflow-hidden bg-black/40 shadow-inner group">
                <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => setProductImage(ev.target?.result as string);
                    reader.readAsDataURL(file);
                  }
                }} />
                {productImage ? (
                  <img src={productImage} className="w-full h-full object-contain p-3" />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                    <ImageIcon className="w-8 h-8" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-center">อัปโหลดภาพสินค้า</span>
                  </div>
                )}
              </label>
            </div>

            <div className="bg-white/5 p-5 rounded-[30px] border border-white/5 space-y-4">
              <label className="text-[11px] font-black text-amber-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <TypeIcon className="w-4 h-4" /> 03. ข้อความในโปสเตอร์
              </label>
              <textarea 
                value={prompt} 
                onChange={e => setPrompt(e.target.value)} 
                placeholder="ชื่อสินค้า/สรรพคุณ..." 
                className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-xs outline-none h-20 focus:border-amber-500/50 transition-all" 
              />
              <input 
                type="text" 
                value={posterText} 
                onChange={e => setPosterText(e.target.value)} 
                placeholder="พาดหัวบนภาพ (เช่น 'โปรแรง 1 แถม 1')" 
                className="w-full bg-black/60 border border-white/10 rounded-2xl px-5 py-3 text-xs outline-none focus:border-amber-500/50 transition-all" 
              />
            </div>

            <div className="bg-white/5 p-5 rounded-[30px] border border-white/5 space-y-4">
              <label className="text-[11px] font-black text-amber-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <Maximize2 className="w-4 h-4" /> 04. สไตล์และโหมด
              </label>
              <div className="grid grid-cols-1 gap-3">
                <select value={styleIndex} onChange={e => setStyleIndex(Number(e.target.value))} className="w-full bg-black/80 border border-white/10 rounded-2xl px-4 py-3 text-[11px] outline-none hover:bg-black transition-colors">
                  {STYLE_PRESETS.map((s, i) => <option key={i} value={i}>{s.label}</option>)}
                </select>
                <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value as any)} className="w-full bg-black/80 border border-white/10 rounded-2xl px-4 py-3 text-[11px] outline-none hover:bg-black transition-colors">
                  {ASPECT_RATIOS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
                <div className={`p-4 rounded-2xl border transition-all ${highQuality ? 'bg-amber-500/10 border-amber-500/40' : 'bg-black/40 border-white/5'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${highQuality ? 'text-amber-500' : 'text-slate-400'}`}>โหมดคุณภาพสูงสุด (Pro)</span>
                    <button 
                      onClick={() => setHighQuality(!highQuality)}
                      className={`w-10 h-5 rounded-full relative transition-all ${highQuality ? 'bg-amber-500' : 'bg-slate-700'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${highQuality ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {error === "QUOTA_ERROR" ? (
              <div className="bg-amber-500/10 border border-amber-500/30 p-6 rounded-[30px] space-y-5 animate-in slide-in-from-bottom duration-500 shadow-xl">
                <div className="flex items-start gap-3 text-amber-500">
                  <AlertTriangle className="w-6 h-6 shrink-0 mt-1" />
                  <div className="space-y-1">
                    <p className="text-xs font-black uppercase tracking-wider">โควตาเต็มแล้วครับ (รอ {cooldown}วิ)</p>
                    <p className="text-[10px] leading-relaxed italic text-slate-400">ถ้าเพิ่งสร้าง Key ใหม่มา ให้กดปุ่มด้านล่างเพื่อเริ่มใหม่ทันทีครับ</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={resetQuotaError} className="w-full py-4 bg-amber-500 text-black rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] transition-all">
                     <Zap className="w-4 h-4 fill-current" /> ฉันเปลี่ยน Key ใหม่แล้ว (เริ่มใหม่ทันที)
                  </button>
                  <button onClick={() => setShowTutorial(true)} className="w-full py-3 bg-white/5 text-white/40 rounded-xl text-[9px] font-bold uppercase tracking-widest hover:text-white transition-colors">
                     ยังหาปุ่มไม่เจอ? กดดูวิธีแก้
                  </button>
                </div>
              </div>
            ) : error === "KEY_NOT_FOUND" ? (
              <div className="bg-red-500/10 border border-red-500/30 p-6 rounded-[30px] space-y-4 animate-in shake duration-300">
                <div className="flex items-start gap-3 text-red-500">
                  <AlertTriangle className="w-6 h-6 shrink-0" />
                  <p className="text-xs font-black uppercase tracking-wider">ไม่พบ API Key หรือ Key ไม่ถูกต้อง</p>
                </div>
                <button onClick={() => isAiStudio ? openKeySelector() : setShowTutorial(true)} className="w-full py-4 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                   {isAiStudio ? "เลือก API Key ใหม่อีกครั้ง" : "ดูวิธีเจนรหัสใหม่"}
                </button>
              </div>
            ) : error && (
              <div className="bg-red-500/10 border border-red-500/20 p-5 rounded-[30px] flex items-start gap-3 text-red-400 animate-in shake duration-500">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-[11px] font-bold leading-relaxed">{error}</p>
              </div>
            )}

            <button 
              onClick={handleGenerate} 
              disabled={isGenerating || cooldown > 0} 
              className="w-full py-6 rounded-[35px] font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 bg-amber-500 text-black hover:bg-amber-400 hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-amber-500/20 disabled:opacity-50 disabled:scale-100 disabled:grayscale"
            >
              {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : cooldown > 0 ? <Clock className="w-5 h-5" /> : <Rocket className="w-5 h-5" />}
              {isGenerating ? 'กำลังสร้างภาพ...' : cooldown > 0 ? `รออีก ${cooldown} วินาที` : 'เริ่มสร้างโปสเตอร์'}
            </button>
          </div>
        </div>

        {/* Preview Area */}
        <div className="lg:col-span-8 flex flex-col items-center justify-center bg-white/[0.02] border border-white/5 rounded-[60px] p-8 min-h-[500px] relative overflow-hidden shadow-inner group">
           <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/5 to-transparent opacity-20"></div>
           
           <div className="absolute top-8 left-8 flex items-center gap-3 opacity-40">
              <div className={`w-2 h-2 rounded-full ${highQuality ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-blue-500'}`} />
              <span className="text-[9px] font-black uppercase tracking-[0.2em]">Model: {highQuality ? 'Gemini 3 Pro' : 'Gemini 2.5 Flash'}</span>
           </div>

           {isGenerating ? (
             <div className="text-center space-y-8 relative z-10">
                <div className="w-24 h-24 relative mx-auto">
                    <div className="absolute inset-0 border-4 border-amber-500/10 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                    <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-amber-500 animate-pulse" />
                </div>
                <div className="space-y-2">
                  <p className="text-amber-500 font-black animate-pulse text-xs tracking-[0.4em] uppercase">AI is Creating Your Art</p>
                  <p className="text-[10px] text-slate-600 font-medium italic">"กำลังดึงข้อมูล... โปรดรอสักครู่"</p>
                </div>
             </div>
           ) : currentPoster ? (
             <div className="w-full h-full flex flex-col items-center gap-10 animate-in zoom-in duration-500 relative z-10">
               <div className="relative shadow-[0_50px_100px_-20px_rgba(0,0,0,0.6)] rounded-[40px] overflow-hidden border border-white/10 bg-black">
                 <img src={currentPoster.url} className="max-h-[60vh] w-auto block" alt="Generated Poster" />
                 <div className="absolute top-6 right-6 flex gap-3">
                   {logos.map(logo => (
                     <img key={logo.id} src={logo.url} className="h-12 w-auto object-contain drop-shadow-2xl" />
                   ))}
                 </div>
               </div>

               <div className="flex flex-wrap justify-center gap-4">
                 <button onClick={downloadImage} className="bg-white text-black px-12 py-5 rounded-full font-black text-[11px] uppercase tracking-[0.2em] flex items-center gap-3 hover:scale-110 active:scale-95 transition-all shadow-2xl">
                   <Download className="w-5 h-5" /> ดาวน์โหลดภาพจริง
                 </button>
                 <button onClick={() => setCurrentPoster(null)} className="bg-white/5 text-white/40 px-8 py-5 rounded-full font-black text-[11px] uppercase tracking-[0.2em] hover:bg-red-500/20 hover:text-red-400 transition-all">
                   ล้างหน้าจอ
                 </button>
               </div>
             </div>
           ) : (
             <div className="text-center space-y-6 relative z-10 opacity-30">
                <div className="w-44 h-44 bg-white/[0.03] rounded-full flex items-center justify-center mx-auto border border-white/5 shadow-inner">
                  <ImageIcon className="w-20 h-20 text-slate-600" />
                </div>
                <p className="text-xs font-black tracking-[0.8em] uppercase text-slate-500 text-center">Ready to Design<br/><span className="text-[9px] font-medium tracking-normal lowercase opacity-50">อัปโหลดภาพสินค้าและกดเริ่มสร้างได้เลย</span></p>
             </div>
           )}
           <canvas ref={canvasRef} className="hidden" />
        </div>
      </main>
    </div>
  );
};

export default App;
