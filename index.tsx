import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";
import { 
  Loader2, Upload, MapPin, Youtube, User, Play, 
  CheckCircle, AlertCircle, ChevronRight, Video, 
  Dumbbell, LayoutDashboard, Globe, Activity, Star, Verified,
  List, Map as MapIcon, X
} from 'lucide-react';

// --- Types ---

type Sport = 'Tennis' | 'Pickleball' | null;

interface AnalysisResult {
  analysisSection: string;
  drillsSection: string;
  videos: any[];
  coaches: any[];
  places: any[];
}

// --- Mock Data ---

const MOCK_COACHES = [
  {
    name: "Sarah Jenkins",
    title: "Elite Performance Coach",
    rating: 4.9,
    reviews: 124,
    location: "Metro Sports Center",
    tags: ["Technical", "Strategy"],
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah&backgroundColor=b6e3f4"
  },
  {
    name: "Mike Ross",
    title: "USPTA Certified Pro",
    rating: 4.8,
    reviews: 89,
    location: "City Courts Academy",
    tags: ["Beginners", "Footwork"],
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike&backgroundColor=c0aede"
  },
  {
    name: "David Chen",
    title: "High Performance Director",
    rating: 5.0,
    reviews: 215,
    location: "Westside Club",
    tags: ["Advanced", "Competition"],
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=David&backgroundColor=ffdfbf"
  }
];

// --- Helper: Frame Extraction ---

const extractFrames = async (videoFile: File): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const frames: string[] = [];
    const src = URL.createObjectURL(videoFile);
    
    video.src = src;
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = async () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const duration = video.duration;
      // Capture 4 evenly spaced frames
      const timePoints = [duration * 0.2, duration * 0.4, duration * 0.6, duration * 0.8];

      try {
        for (const time of timePoints) {
          video.currentTime = time;
          await new Promise<void>((r) => {
            const seekHandler = () => {
              video.removeEventListener('seeked', seekHandler);
              r();
            };
            video.addEventListener('seeked', seekHandler);
          });
          
          if (context) {
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const base64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
            frames.push(base64);
          }
        }
        URL.revokeObjectURL(src);
        resolve(frames);
      } catch (e) {
        reject(e);
      }
    };

    video.onerror = (e) => reject(e);
  });
};

const getYouTubeVideoId = (url: string): string | null => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

// --- Components ---

const TabButton = ({ active, onClick, icon: Icon, label }: any) => (
  <button
    onClick={onClick}
    className={`flex-1 py-3 px-2 flex flex-col items-center justify-center gap-1 text-xs font-semibold transition-all border-b-2 ${
      active 
        ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' 
        : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'
    }`}
  >
    <Icon className={`w-5 h-5 ${active ? 'stroke-2' : 'stroke-1.5'}`} />
    {label}
  </button>
);

const Card = ({ children, className = "" }: { children?: React.ReactNode, className?: string }) => (
  <div className={`bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden ${className}`}>
    {children}
  </div>
);

const VideoPlayerCard: React.FC<{ video: any }> = ({ video }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Fix generic titles
  let displayTitle = video.web.title;
  if (displayTitle.toLowerCase().trim() === 'youtube.com' || displayTitle.trim() === '') {
    displayTitle = "Instructional Drill Video";
  }

  const videoId = getYouTubeVideoId(video.web.uri);

  if (isPlaying && videoId) {
    return (
      <div className="bg-black rounded-xl overflow-hidden shadow-md aspect-video relative group">
        <iframe
          width="100%"
          height="100%"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
          title={displayTitle}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        ></iframe>
        <button 
          onClick={() => setIsPlaying(false)}
          className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/80 text-white rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div 
      onClick={() => videoId ? setIsPlaying(true) : window.open(video.web.uri, '_blank')}
      className="flex items-start gap-4 p-3 bg-white rounded-xl border border-slate-200 shadow-sm active:bg-slate-50 transition-colors cursor-pointer group"
    >
      <div className="w-28 h-20 bg-slate-100 rounded-lg shrink-0 flex items-center justify-center relative overflow-hidden">
         {/* Use YouTube thumbnail if available */}
         {videoId ? (
            <img 
              src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
              className="w-full h-full object-cover"
              alt="Video thumbnail"
            />
         ) : (
            <img 
              src={`https://www.google.com/s2/favicons?domain=youtube.com&sz=128`} 
              className="w-8 h-8 opacity-50" 
              alt="" 
            />
         )}
         <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/30 transition-colors">
           <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
              <Play className="w-4 h-4 fill-white text-white ml-0.5" />
           </div>
         </div>
      </div>
      <div className="flex-1 min-w-0 py-1">
        <h4 className="font-semibold text-sm text-slate-900 line-clamp-2 leading-snug mb-1">{displayTitle}</h4>
        <div className="flex items-center gap-1 text-xs text-slate-500">
           <Youtube className="w-3 h-3" />
           <span className="truncate">{videoId ? 'Tap to Watch' : 'Watch on YouTube'}</span>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

const App = () => {
  const [currentSport, setCurrentSport] = useState<Sport>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'analysis' | 'videos' | 'places' | 'coaches'>('analysis');
  const [placeViewMode, setPlaceViewMode] = useState<'list' | 'map'>('list');

  // Helper to scroll to results on mobile after analysis
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => setLocation({ lat: p.coords.latitude, lng: p.coords.longitude }),
        (e) => {
          console.warn("Loc denied", e);
          setLocation({ lat: 37.7749, lng: -122.4194 }); 
        }
      );
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
      setResult(null);
      setError(null);
    }
  };

  const startAnalysis = async () => {
    if (!videoFile || !currentSport) return;
    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const frames = await extractFrames(videoFile);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const parts: any[] = frames.map(data => ({
        inlineData: { mimeType: 'image/jpeg', data }
      }));

      // We construct a prompt that explicitly demands tool usage to ensure the other tabs get data.
      // We also use a separator to split the text content easily.
      const prompt = `
        You are an expert ${currentSport} coach.
        
        PART 1: GATHER RESOURCES (Important: You MUST use the available tools first)
        1. Search for "youtube ${currentSport} drills for [major flaw seen in video]" using Google Search.
        2. Search for "top rated ${currentSport} coaches near me" using Google Search.
        3. Search for "${currentSport} courts, parks, and athletic clubs near me. Do NOT include retail stores, shops, or equipment stores." using Google Maps.
        
        PART 2: ANALYZE
        Analyze the user's form from the provided video frames.
        
        OUTPUT FORMAT (Strictly follow this structure):
        
        ## ANALYSIS
        [Write a detailed biomechanical analysis here. Focus on the swing, stance, and contact point.]
        
        ## DRILLS
        [List 3 specific drills to fix the issues. Be instructive.]
      `;
      parts.push({ text: prompt });

      const tools: any[] = [{ googleSearch: {} }];
      let toolConfig = undefined;
      
      if (location) {
        tools.push({ googleMaps: {} });
        toolConfig = { retrievalConfig: { latLng: { latitude: location.lat, longitude: location.lng } } };
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts },
        config: {
          tools,
          toolConfig,
          systemInstruction: "You are a helpful sports coach. Always perform the requested searches before generating the text analysis to ensure you have grounding data. When finding places, strictly exclude retail shops and stores.",
        }
      });

      const fullText = response.text || "";
      
      // Simple parsing based on the strict headers requested
      const analysisSplit = fullText.split('## DRILLS');
      const analysisSection = analysisSplit[0]?.replace('## ANALYSIS', '').trim() || "Analysis unavailable.";
      const drillsSection = analysisSplit[1]?.trim() || "Drills unavailable.";

      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      
      // -- ROBUST FILTERING LOGIC --

      // Helper to determine if a chunk is likely a video
      const isVideoContent = (c: any) => {
        const title = (c.web?.title || "").toLowerCase();
        const uri = (c.web?.uri || "").toLowerCase();
        return title.includes('youtube') || uri.includes('youtube') || uri.includes('youtu.be') || title.includes('video');
      };

      const isShopOrStore = (c: any) => {
        const title = (c.web?.title || c.maps?.title || "").toLowerCase();
        return title.includes('shop') || title.includes('store') || title.includes('outlet') || title.includes('dick\'s') || title.includes('sporting goods');
      };

      // 1. Videos (Strictly YouTube or Video titles)
      const videos = groundingChunks.filter((c: any) => isVideoContent(c));
      
      // 2. Places (Map results) - Exclude shops
      const places = groundingChunks.filter((c: any) => 
        (c.maps || (c.web?.uri?.includes('maps.google'))) && !isShopOrStore(c)
      );

      // 3. Coaches (Everything else that is web based, NOT video, NOT map, NOT shop)
      const apiCoaches = groundingChunks.filter((c: any) => 
        c.web && 
        !isVideoContent(c) && 
        !c.web.uri.includes('maps.google') &&
        !isShopOrStore(c)
      );

      setResult({
        analysisSection,
        drillsSection,
        videos,
        coaches: apiCoaches,
        places
      });
      
      setActiveTab('analysis');
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

    } catch (err: any) {
      console.error(err);
      setError("Analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('###')) return <h3 key={i} className="text-base font-bold text-slate-800 mt-3 mb-1">{line.replace(/###/g, '')}</h3>;
      if (line.startsWith('##')) return <h3 key={i} className="text-lg font-bold text-indigo-700 mt-4 mb-2">{line.replace(/##/g, '')}</h3>;
      if (line.startsWith('**')) return <h4 key={i} className="font-semibold text-slate-900 mt-2">{line.replace(/\*\*/g, '')}</h4>;
      if (line.startsWith('* ')) return <li key={i} className="ml-4 text-slate-600 list-disc text-sm md:text-base">{line.replace('* ', '')}</li>;
      if (line.trim().length === 0) return <br key={i} />;
      return <p key={i} className="text-slate-600 leading-relaxed text-sm md:text-base mb-1">{line.replace(/\*\*/g, '')}</p>;
    });
  };

  // --- View: Landing / Selection ---
  if (!currentSport) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
        <header className="p-6 flex items-center gap-3 bg-white border-b border-slate-200">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-black text-white text-xl italic skew-x-[-10deg] shadow-lg shadow-indigo-200">P</div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">ProForm</h1>
        </header>
        
        <main className="flex-1 px-6 flex flex-col justify-center max-w-md mx-auto w-full pb-10">
          <div className="space-y-3 mb-12">
            <h2 className="text-4xl font-extrabold text-slate-900 leading-tight">
              Master Your <br />
              <span className="text-indigo-600">
                Game Today.
              </span>
            </h2>
            <p className="text-slate-500 text-lg">AI-powered technical analysis & localized coaching resources.</p>
          </div>
          
          <div className="grid gap-4">
            {['Tennis', 'Pickleball'].map((sport) => (
              <button 
                key={sport}
                onClick={() => setCurrentSport(sport as Sport)}
                className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 text-left hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-100 transition-all active:scale-[0.99]"
              >
                <div className="flex justify-between items-center relative z-10">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 mb-1">{sport}</h3>
                    <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wider bg-indigo-50 inline-block px-2 py-1 rounded-md">Analysis Ready</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // --- View: Dashboard ---
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
       {/* Mobile Header */}
       <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
          <button 
            onClick={() => { setCurrentSport(null); setResult(null); setVideoFile(null); }} 
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-black text-white text-lg italic skew-x-[-10deg]">P</div>
            <span className="font-bold text-sm tracking-tight text-slate-900">{currentSport} AI</span>
          </button>
          {result && (
             <button onClick={() => { setVideoFile(null); setResult(null); }} className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full hover:bg-slate-200 transition-colors">New Scan</button>
          )}
        </header>

        <main className="flex-1 w-full max-w-3xl mx-auto pb-24">
          
          {/* Section: Upload & Video Preview */}
          <div className={`p-4 transition-all duration-500 ${result ? 'border-b border-slate-200 bg-white' : 'flex-1 flex flex-col justify-center'}`}>
            <div className="relative rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-inner aspect-[4/3] md:aspect-video">
              {videoUrl ? (
                <>
                  <video src={videoUrl} className="w-full h-full object-contain bg-black" controls playsInline loop />
                  {!isAnalyzing && !result && (
                     <button 
                     onClick={() => { setVideoFile(null); setVideoUrl(null); }}
                     className="absolute top-3 right-3 bg-white/80 hover:bg-white p-2 rounded-full backdrop-blur-md transition text-slate-700 shadow-md"
                   >
                     <Upload className="w-4 h-4" />
                   </button>
                  )}
                </>
              ) : (
                <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-200/50 transition-colors active:bg-slate-200">
                  <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-4 shadow-md text-indigo-600">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="text-base font-bold text-slate-700">Upload Gameplay</span>
                  <span className="text-xs text-slate-500 mt-2">Max 60s recommended</span>
                  <input type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
                </label>
              )}

              {/* Analysis Overlay State */}
              {isAnalyzing && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                  <div className="relative">
                     <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                  </div>
                  <p className="text-indigo-600 font-bold mt-4 animate-pulse">Analyzing Biomechanics...</p>
                  <p className="text-xs text-slate-400 mt-1">Finding local courts & drills...</p>
                </div>
              )}
            </div>

            {/* Action Button (Only show if not analyzed yet) */}
            {!result && videoFile && (
              <button 
                onClick={startAnalysis}
                disabled={isAnalyzing}
                className="w-full mt-6 py-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 text-white font-bold rounded-xl text-lg flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 transition-all"
              >
                {isAnalyzing ? "Processing..." : "Analyze Now"}
              </button>
            )}

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl flex items-center gap-3 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}
          </div>

          {/* Section: Results */}
          {result && (
            <div ref={resultsRef} className="animate-in slide-in-from-bottom-10 fade-in duration-500">
              
              {/* Tabs Navigation */}
              <div className="sticky top-[60px] z-20 bg-white border-b border-slate-200 flex overflow-x-auto no-scrollbar shadow-sm">
                <TabButton 
                  active={activeTab === 'analysis'} 
                  onClick={() => setActiveTab('analysis')} 
                  icon={Activity} 
                  label="Report" 
                />
                <TabButton 
                  active={activeTab === 'videos'} 
                  onClick={() => setActiveTab('videos')} 
                  icon={Youtube} 
                  label={`Drills (${result.videos.length})`} 
                />
                <TabButton 
                  active={activeTab === 'places'} 
                  onClick={() => setActiveTab('places')} 
                  icon={MapPin} 
                  label="Courts" 
                />
                <TabButton 
                  active={activeTab === 'coaches'} 
                  onClick={() => setActiveTab('coaches')} 
                  icon={User} 
                  label="Coaches" 
                />
              </div>

              {/* Tab Content */}
              <div className="p-4 min-h-[50vh] bg-slate-50">
                
                {/* 1. Analysis Tab - Split into 2 Cards */}
                {activeTab === 'analysis' && (
                  <div className="space-y-6">
                    {/* Card 1: Technical Analysis */}
                    <Card className="p-5 border-l-4 border-l-indigo-500">
                      <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3">
                        <div className="p-2 bg-indigo-50 rounded-lg">
                          <Activity className="w-5 h-5 text-indigo-600" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900">Technical Analysis</h2>
                      </div>
                      <div className="prose prose-sm prose-slate max-w-none">
                        {renderMarkdown(result.analysisSection)}
                      </div>
                    </Card>

                    {/* Card 2: Drills */}
                    <Card className="p-5 border-l-4 border-l-emerald-500">
                      <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3">
                        <div className="p-2 bg-emerald-50 rounded-lg">
                          <Dumbbell className="w-5 h-5 text-emerald-600" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900">Recommended Drills</h2>
                      </div>
                      <div className="prose prose-sm prose-slate max-w-none">
                        {renderMarkdown(result.drillsSection)}
                      </div>
                    </Card>

                    <div className="text-center">
                      <p className="text-xs text-slate-400">AI analysis based on visual data. Consult a professional for safety.</p>
                    </div>
                  </div>
                )}

                {/* 2. Videos Tab */}
                {activeTab === 'videos' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center px-1">
                      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Instructional Videos</h3>
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">YouTube</span>
                    </div>
                    {result.videos.length > 0 ? (
                      result.videos.map((vid, i) => (
                        <VideoPlayerCard key={i} video={vid} />
                      ))
                    ) : (
                      <div className="text-center p-12 bg-white rounded-2xl border border-dashed border-slate-300">
                        <Youtube className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                        <p className="text-slate-500">No specific videos found.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Places Tab */}
                {activeTab === 'places' && (
                  <div className="space-y-4">
                     <div className="flex justify-between items-center px-1 mb-2">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Nearby Courts</h3>
                        <div className="flex bg-slate-200 rounded-lg p-1 gap-1">
                          <button 
                            onClick={() => setPlaceViewMode('list')}
                            className={`p-1 rounded-md transition-all ${placeViewMode === 'list' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
                          >
                            <List className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setPlaceViewMode('map')}
                            className={`p-1 rounded-md transition-all ${placeViewMode === 'map' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
                          >
                            <MapIcon className="w-4 h-4" />
                          </button>
                        </div>
                     </div>

                     {placeViewMode === 'map' && location && (
                       <div className="rounded-xl overflow-hidden shadow-sm border border-slate-200 bg-slate-100 h-64 mb-4">
                         {/* Embed Google Maps Search - Compatible iframe method */}
                         <iframe 
                           width="100%" 
                           height="100%" 
                           frameBorder="0" 
                           scrolling="no" 
                           marginHeight={0} 
                           marginWidth={0} 
                           src={`https://maps.google.com/maps?q=${currentSport}+courts+near+${location.lat},${location.lng}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                           title="Map View"
                         ></iframe>
                       </div>
                     )}

                     {result.places.length > 0 ? (
                      result.places.map((place, i) => {
                        const data = place.maps || place.web;
                        return (
                          <a 
                            key={i}
                            href={data.uri}
                            target="_blank"
                            rel="noreferrer"
                            className="block p-4 bg-white rounded-xl border border-slate-200 shadow-sm active:bg-slate-50 transition-colors"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-bold text-slate-900 pr-4">{data.title}</h4>
                              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                                <MapPin className="w-4 h-4 text-blue-500" />
                              </div>
                            </div>
                            <p className="text-xs text-slate-500 font-medium">Open in Google Maps &rarr;</p>
                          </a>
                        );
                      })
                     ) : (
                      <div className="text-center p-12 bg-white rounded-2xl border border-dashed border-slate-300">
                        <MapPin className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                        <p className="text-slate-500">No locations found nearby.</p>
                      </div>
                     )}
                  </div>
                )}

                {/* 4. Coaches Tab */}
                {activeTab === 'coaches' && (
                  <div className="space-y-4">
                     <div className="flex justify-between items-center px-1">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Available Pros</h3>
                        <span className="text-xs bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full font-medium">Verified & Found</span>
                     </div>
                     
                     {/* Render Mock Coaches First (Premium Placement) */}
                     {MOCK_COACHES.map((coach, i) => (
                        <div key={`mock-${i}`} className="flex items-start gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                           <div className="absolute top-0 right-0 bg-amber-400 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg z-10">TOP RATED</div>
                           <img src={coach.image} alt={coach.name} className="w-14 h-14 rounded-full bg-slate-100 object-cover shrink-0 border border-slate-100" />
                           <div className="flex-1 min-w-0">
                             <div className="flex items-center gap-1">
                               <h4 className="font-bold text-sm text-slate-900 truncate">{coach.name}</h4>
                               <Verified className="w-3 h-3 text-blue-500 fill-blue-500 text-white" />
                             </div>
                             <p className="text-xs font-semibold text-indigo-600 truncate">{coach.title}</p>
                             <div className="flex items-center gap-1 mt-1">
                               <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                               <span className="text-xs font-bold text-slate-700">{coach.rating}</span>
                               <span className="text-xs text-slate-400">({coach.reviews})</span>
                             </div>
                             <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                               <MapPin className="w-3 h-3" /> {coach.location}
                             </p>
                           </div>
                           <button className="self-center px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg">Contact</button>
                        </div>
                     ))}

                     {/* Render API Found Coaches */}
                     {result.coaches.map((coach, i) => (
                        <a 
                          key={`api-${i}`}
                          href={coach.web.uri}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm active:bg-slate-50 transition-colors"
                        >
                           <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 border border-slate-100 text-indigo-600 font-bold text-lg">
                             {coach.web.title.substring(0,1)}
                           </div>
                           <div className="flex-1 min-w-0">
                             <h4 className="font-bold text-sm text-slate-900 truncate">{coach.web.title}</h4>
                             <p className="text-xs text-slate-500 truncate mt-0.5">Web Result</p>
                             <div className="flex gap-1 mt-1">
                               <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">Instructor</span>
                             </div>
                           </div>
                           <ChevronRight className="w-5 h-5 text-slate-300" />
                        </a>
                      ))}
                  </div>
                )}

              </div>
            </div>
          )}
        </main>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);