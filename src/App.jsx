import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  ChevronRight, 
  Target, 
  Users, 
  UserCheck, 
  MessageSquare, 
  Zap, 
  BarChart3, 
  CheckCircle2, 
  ArrowRight,
  Info,
  Mail,
  LocateFixed,
  Layers
} from 'lucide-react';

// --- Components ---

// Map component that handles radius changes
const MapRadiusUpdater = ({ center, radius }) => {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, radius <= 5 ? 12 : radius <= 10 ? 11 : 10);
    }
  }, [center, radius, map]);
  
  return null;
};

const InteractiveMap = ({ zipCode, radius }) => {
  const [center, setCenter] = useState([36.8529, -75.9780]); // Default: Virginia Beach
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Convert radius miles to meters for Leaflet Circle
  const radiusMeters = radius * 1609.34;

  useEffect(() => {
    const geocodeZip = async () => {
      if (!zipCode || zipCode.length < 5) return;
      
      setLoading(true);
      setError('');
      
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?postalcode=${zipCode}&country=US&format=json&limit=1`
        );
        const data = await response.json();
        
        if (data && data.length > 0) {
          setCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
        } else {
          setError('Zip code not found');
        }
      } catch (e) {
        setError('Failed to locate zip code');
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(geocodeZip, 500);
    return () => clearTimeout(debounce);
  }, [zipCode]);

  return (
    <div className="mt-6 h-64 rounded-xl overflow-hidden border border-slate-200 relative">
      {loading && (
        <div className="absolute inset-0 bg-white/70 z-[1000] flex items-center justify-center">
          <div className="text-blue-600 font-medium">Locating...</div>
        </div>
      )}
      {error && (
        <div className="absolute top-2 left-2 bg-red-100 text-red-700 text-xs px-2 py-1 rounded z-[1000]">
          {error}
        </div>
      )}
      <MapContainer
        center={center}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Circle
          center={center}
          radius={radiusMeters}
          pathOptions={{
            color: '#2563eb',
            fillColor: '#3b82f6',
            fillOpacity: 0.2,
            weight: 2
          }}
        />
        <MapRadiusUpdater center={center} radius={radius} />
      </MapContainer>
    </div>
  );
};

const Navigation = ({ setPage }) => (
  <nav className="flex items-center justify-between p-6 border-b border-gray-100 bg-white sticky top-0 z-50">
    <div className="flex items-center gap-2 font-bold text-2xl text-blue-600 cursor-pointer" onClick={() => setPage('home')}>
      <Layers className="w-8 h-8" />
      <span>AccelMail</span>
      <h4 className="text-xs font-regular text-slate-500">Powered by Accel Analysis Business Solutions</h4>
    </div>
    <div className="hidden md:flex gap-8 text-sm font-medium text-gray-600">
      <button onClick={() => setPage('home')} className="hover:text-blue-600">The Method</button>
      <button onClick={() => setPage('quiz')} className="hover:text-blue-600">Self-Diagnosis</button>
      <button className="hover:text-blue-600">Case Studies</button>
    </div>
    <button 
      onClick={() => setPage('launch')}
      className="bg-blue-600 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-blue-700 transition"
    >
      Launch Campaign
    </button>
  </nav>
);

const Hero = ({ setPage }) => (
  <section className="py-20 px-6 max-w-6xl mx-auto text-center">
    <span className="text-blue-600 font-bold tracking-widest uppercase text-xs">Turn Strategy into Real Action</span>
    <h1 className="mt-4 text-5xl md:text-6xl font-extrabold text-slate-900 leading-tight">
      Most businesses don’t have a lead problem—<br/>
      <span className="text-blue-600 underline decoration-blue-200">they have a definition problem.</span>
    </h1>
    <p className="mt-6 text-xl text-slate-600 max-w-3xl mx-auto">
      Stop blasting generic mailers. We help you define your market, identify segments, and reach the right ICPs with messaging that actually converts.
    </p>
    <div className="mt-10 flex flex-col md:flex-row gap-4 justify-center">
      <button 
        onClick={() => {
          document.getElementById('education-model').scrollIntoView({ behavior: 'smooth' });
        }}
        className="px-8 py-4 bg-slate-900 text-white rounded-lg font-bold text-lg flex items-center justify-center gap-2 hover:bg-slate-800 transition"
      >
        Learn the Method (Start Here) <ArrowRight className="w-5 h-5" />
      </button>
      <button 
        onClick={() => setPage('launch')}
        className="px-8 py-4 bg-white text-slate-900 border-2 border-slate-200 rounded-lg font-bold text-lg hover:border-blue-600 transition"
      >
        I’m Ready to Launch
      </button>
    </div>
  </section>
);

const SixLayerModel = () => {
  const [activeLayer, setActiveLayer] = useState(0);
  
  const layers = [
    {
      title: "1. Target Market",
      subtitle: "The Arena",
      icon: <Target className="w-6 h-6" />,
      produce: "Broad geographic & industry boundaries.",
      data: "Zip codes, NAICS codes, Revenue floors.",
      example: "Small businesses in the Hampton Roads area."
    },
    {
      title: "2. Market Segments",
      subtitle: "The Groups",
      icon: <Users className="w-6 h-6" />,
      produce: "Logical sub-categories within your market.",
      data: "Firmographics, headcount, property type.",
      example: "Residential HVAC vs. Commercial HVAC contractors."
    },
    {
      title: "3. ICP (Ideal Customer Profile)",
      subtitle: "The Best-Fit",
      icon: <UserCheck className="w-6 h-6" />,
      produce: "Signals that indicate high-intent or high-value.",
      data: "Specific tech stack, recent permit activity, business age.",
      example: "Contractors with 5+ trucks who haven't updated equipment in 3 years."
    },
    {
      title: "4. Persona",
      subtitle: "The Decision Psychology",
      icon: <Mail className="w-6 h-6" />,
      produce: "The internal motivations and objections of the buyer.",
      data: "Job titles, pain points, daily workflow.",
      example: 'The "Tired Owner" who wants to spend less time on site and more on growth.'
    },
    {
      title: "5. Messaging",
      subtitle: "What You Say",
      icon: <MessageSquare className="w-6 h-6" />,
      produce: "Specific hooks and offers for each persona.",
      data: "Copywriting frameworks, CTA types.",
      example: "Focus on 'Systematizing Your Fleet' rather than 'Buy Our Parts'."
    },
    {
      title: "6. Activation",
      subtitle: "The Outreach",
      icon: <Zap className="w-6 h-6" />,
      produce: "Consistent lists, mailers, and tracking.",
      data: "QR code scans, landing page hits, CRM injection.",
      example: "Monthly direct mail cadence + digital retargeting."
    }
  ];

  return (
    <section id="education-model" className="py-20 bg-slate-50 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-slate-900">The 6-Layer Definition Model</h2>
          <p className="text-slate-600 mt-2">Click each layer to see how strategy transforms into data.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-3">
            {layers.map((layer, idx) => (
              <button
                key={idx}
                onClick={() => setActiveLayer(idx)}
                className={`w-full text-left p-4 rounded-xl transition-all border ${
                  activeLayer === idx 
                  ? "bg-white border-blue-600 shadow-md scale-105" 
                  : "bg-transparent border-transparent hover:bg-slate-200"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`${activeLayer === idx ? "text-blue-600" : "text-slate-400"}`}>
                    {layer.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{layer.title}</h3>
                    <p className="text-sm text-slate-500">{layer.subtitle}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 min-h-[400px] flex flex-col justify-center">
            <div className="mb-6 inline-block p-3 bg-blue-50 text-blue-600 rounded-2xl">
              {layers[activeLayer].icon}
            </div>
            <h3 className="text-2xl font-bold mb-4">{layers[activeLayer].title}</h3>
            
            <div className="space-y-6">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">What you produce</span>
                <p className="text-slate-700 font-medium">{layers[activeLayer].produce}</p>
              </div>
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">How it becomes data</span>
                <p className="text-slate-700 font-medium">{layers[activeLayer].data}</p>
              </div>
              <div className="p-4 bg-slate-50 border-l-4 border-slate-300 italic text-slate-600">
                <span className="font-bold block not-italic text-xs mb-1">Example:</span>
                "{layers[activeLayer].example}"
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const Quiz = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const questions = [
    {
      q: "Can you list your top 3 customer segments right now?",
      options: ["Yes, exactly.", "I have an idea.", "No, not really."]
    },
    {
      q: "Do you have a clean list of prospects that fit your 'Ideal Customer' signals?",
      options: ["Yes, updated monthly.", "I have a list, but it's old.", "No, I need a list."]
    },
    {
      q: "When a prospect gets your mailer, do you have a specific message for their role?",
      options: ["Yes, personalized.", "Somewhat generic.", "One message for everyone."]
    }
  ];

  const handleNext = (idx) => {
    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="max-w-xl mx-auto py-20 px-6">
      <div className="mb-8">
        <div className="h-2 w-full bg-slate-100 rounded-full">
          <div className="h-2 bg-blue-600 rounded-full transition-all" style={{ width: `${((step + 1) / questions.length) * 100}%` }}></div>
        </div>
        <p className="mt-4 text-sm font-bold text-slate-400 uppercase tracking-widest">Step {step + 1} of 3</p>
      </div>
      <h2 className="text-3xl font-bold text-slate-900 mb-8">{questions[step].q}</h2>
      <div className="space-y-4">
        {questions[step].options.map((opt, i) => (
          <button 
            key={i} 
            onClick={() => handleNext(i)}
            className="w-full text-left p-6 border-2 border-slate-200 rounded-2xl hover:border-blue-600 hover:bg-blue-50 transition font-semibold"
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
};

const ProofSection = () => (
  <section className="py-20 px-6 max-w-6xl mx-auto">
    <h2 className="text-3xl font-bold text-center mb-16 underline decoration-blue-100 underline-offset-8">Strategy in Action</h2>
    <div className="grid md:grid-cols-2 gap-8">
      <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200">
        <h3 className="text-xl font-bold mb-4 text-slate-500">The "Blast" Method (Before)</h3>
        <ul className="space-y-3 mb-6">
          <li className="flex items-center gap-2 text-slate-500"><span className="text-red-500">✕</span> 5,000 households in Hampton Roads</li>
          <li className="flex items-center gap-2 text-slate-500"><span className="text-red-500">✕</span> "We buy houses" generic message</li>
          <li className="flex items-center gap-2 text-slate-500"><span className="text-red-500">✕</span> No tracking, just waiting for calls</li>
        </ul>
        <div className="p-4 bg-slate-200 rounded text-sm text-center font-bold text-slate-600">RESULT: 0.1% Response Rate</div>
      </div>
      <div className="bg-blue-600 p-8 rounded-2xl text-white shadow-xl">
        <h3 className="text-xl font-bold mb-4">The AccelMail Method (After)</h3>
        <ul className="space-y-3 mb-6">
          <li className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-blue-200" /> 1,200 High-Intent Property Owners</li>
          <li className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-blue-200" /> 3 Unique Messaging Archetypes</li>
          <li className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-blue-200" /> QR-to-Landing Page Attribution</li>
        </ul>
        <div className="p-4 bg-blue-500 rounded text-sm text-center font-bold text-white">RESULT: 2.8% Response Rate + Data Insights</div>
      </div>
    </div>
  </section>
);

const CampaignTool = () => {
  const [guided, setGuided] = useState(true);
  const [zipCode, setZipCode] = useState('');
  const [radius, setRadius] = useState(5);

  return (
    <div className="max-w-7xl mx-auto py-10 px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h2 className="text-3xl font-bold">Campaign Request</h2>
          <p className="text-slate-500">Configure your high-targeting direct mail program.</p>
        </div>
        <div className="flex items-center gap-3 p-2 bg-slate-100 rounded-lg">
          <span className="text-sm font-bold text-slate-600">Guided Mode</span>
          <button 
            onClick={() => setGuided(!guided)}
            className={`w-12 h-6 rounded-full transition-colors relative ${guided ? 'bg-blue-600' : 'bg-slate-400'}`}
          >
            <div className={`absolute top-1 bg-white w-4 h-4 rounded-full transition-all ${guided ? 'left-7' : 'left-1'}`} />
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            {guided && (
              <div className="mb-6 bg-blue-50 border-l-4 border-blue-600 p-4 text-blue-800 text-sm">
                <p className="font-bold flex items-center gap-2"><Info className="w-4 h-4" /> Why Radius Matters:</p>
                <p>Proximity is often the #1 trust signal for home services. Starting with a tight radius allows for localized testimonials.</p>
              </div>
            )}
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><LocateFixed className="w-5 h-5" /> Geographic Targeting</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <input 
                type="text" 
                placeholder="Zip Code (e.g., 23451)" 
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                className="p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              />
              <select 
                className="p-3 border rounded-lg"
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
              >
                <option value={5}>5 Mile Radius</option>
                <option value={10}>10 Mile Radius</option>
                <option value={15}>15 Mile Radius</option>
                <option value={25}>25 Mile Radius</option>
              </select>
            </div>
            <InteractiveMap zipCode={zipCode} radius={radius} />
          </div>

          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            {guided && (
              <div className="mb-6 bg-blue-50 border-l-4 border-blue-600 p-4 text-blue-800 text-sm">
                <p className="font-bold flex items-center gap-2"><Info className="w-4 h-4" /> Choosing a Segment:</p>
                <p>Residential vs. Commercial requires different psychology. Don't mix them in one mailer or your message will dilute.</p>
              </div>
            )}
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><Users className="w-5 h-5" /> Selection Criteria</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <button className="p-4 border-2 border-slate-100 rounded-xl hover:border-blue-600 text-left transition font-medium">Residential Homeowners</button>
              <button className="p-4 border-2 border-slate-100 rounded-xl hover:border-blue-600 text-left transition font-medium">Property Managers</button>
              <button className="p-4 border-2 border-slate-100 rounded-xl hover:border-blue-600 text-left transition font-medium">Commercial Real Estate</button>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 text-white p-8 rounded-2xl h-fit sticky top-24">
          <h3 className="text-xl font-bold mb-6">Campaign Summary</h3>
          <div className="space-y-4 mb-8">
            <div className="flex justify-between text-sm border-b border-slate-700 pb-2 text-slate-400">
              <span>Selected Segment</span>
              <span className="text-white">TBD</span>
            </div>
            <div className="flex justify-between text-sm border-b border-slate-700 pb-2 text-slate-400">
              <span>Estimated Audience</span>
              <span className="text-white">0</span>
            </div>
            <div className="flex justify-between text-sm border-b border-slate-700 pb-2 text-slate-400">
              <span>Cost Per Touch</span>
              <span className="text-white">$0.00</span>
            </div>
          </div>
          <button className="w-full py-4 bg-blue-600 rounded-xl font-bold hover:bg-blue-700 transition">
            Start Mailer Request
          </button>
          <p className="mt-4 text-xs text-slate-500 text-center">No commitment required. We’ll reach out to finalize data filters.</p>
        </div>
      </div>
    </div>
  );
};

// --- Main App Logic ---

export default function AccelMailApp() {
  const [page, setPage] = useState('home'); // 'home', 'quiz', 'launch', 'results'
  const [emailCaptured, setEmailCaptured] = useState(false);
  const leadEndpoint = import.meta?.env?.VITE_LEAD_ENDPOINT || 'https://script.google.com/macros/s/AKfycbwEOLacSRmhR-EDG0N4FZIZOsFgpgmjSopMdX3XTXFhHQ05sp0CLjQHaoPCj2MFohoEqw/exec';
  const leadToken = import.meta?.env?.VITE_LEAD_TOKEN || '';

  const handleQuizComplete = () => {
    setPage('results');
  };

  const LeadCaptureModal = ({ onClose, source }) => {
    const [fullName, setFullName] = useState('');
    const [workEmail, setWorkEmail] = useState('');
    const [company, setCompany] = useState('');
    const [phone, setPhone] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async () => {
      setSubmitError('');

      const payload = {
        fullName: fullName.trim(),
        workEmail: workEmail.trim(),
        company: company.trim(),
        phone: phone.trim(),
        source: (source || '').toString()
      };

      if (!payload.fullName || !payload.workEmail) {
        setSubmitError('Please enter your name and work email.');
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.workEmail)) {
        setSubmitError('Please enter a valid email address.');
        return;
      }

      if (!leadEndpoint || leadEndpoint.includes('PASTE_')) {
        setSubmitError('Lead endpoint is not configured yet.');
        return;
      }

      setSubmitting(true);
      try {
        const params = new URLSearchParams({
          fullName: payload.fullName,
          workEmail: payload.workEmail,
          company: payload.company,
          phone: payload.phone,
          source: payload.source,
          token: leadToken
        });

        await fetch(leadEndpoint, {
          method: 'POST',
          mode: 'no-cors',
          body: params
        });

        setSubmitted(true);
        setEmailCaptured(true);
        setTimeout(() => {
          onClose();
        }, 600);
      } catch (e) {
        setSubmitError('Something went wrong sending your kit. Please try again.');
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl max-w-md w-full shadow-2xl relative z-[10000]">
          <h3 className="text-2xl font-bold text-slate-900 mb-2">Get the Definition-to-Outreach Kit</h3>
          <p className="text-slate-500 mb-6">Enter your info to get our 1-page segmentation checklist + example high-intent lists.</p>
          <div className="space-y-4">
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Full Name"
              className="w-full p-4 border rounded-xl outline-none focus:ring-2 focus:ring-blue-600"
              disabled={submitting || submitted}
            />
            <input
              type="email"
              value={workEmail}
              onChange={(e) => setWorkEmail(e.target.value)}
              placeholder="Work Email"
              className="w-full p-4 border rounded-xl outline-none focus:ring-2 focus:ring-blue-600"
              disabled={submitting || submitted}
            />
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Company"
              className="w-full p-4 border rounded-xl outline-none focus:ring-2 focus:ring-blue-600"
              disabled={submitting || submitted}
            />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone"
              className="w-full p-4 border rounded-xl outline-none focus:ring-2 focus:ring-blue-600"
              disabled={submitting || submitted}
            />

            {!!submitError && (
              <div className="text-sm text-red-600 font-semibold">{submitError}</div>
            )}
            {submitted && (
              <div className="text-sm text-green-700 font-semibold">Sent! Please check your inbox.</div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting || submitted}
              className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-60"
            >
              {submitting ? 'Sending…' : 'Get the Kit & View Results'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      <Navigation setPage={setPage} />

      {page === 'home' && (
        <>
          <Hero setPage={setPage} />
          <SixLayerModel />
          <ProofSection />
          <div className="bg-blue-600 py-16 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">Unsure where you're stuck?</h2>
            <p className="mb-8 opacity-90">Take our 30-second self-diagnosis quiz to find your biggest leverage point.</p>
            <button 
              onClick={() => setPage('quiz')}
              className="bg-white text-blue-600 px-8 py-3 rounded-full font-bold hover:bg-blue-50 transition"
            >
              Start Diagnostic Quiz
            </button>
          </div>
        </>
      )}

      {page === 'quiz' && <Quiz onComplete={handleQuizComplete} />}

      {page === 'results' && (
        <div className="max-w-4xl mx-auto py-20 px-6">
          <div className="bg-blue-50 p-10 rounded-3xl border-2 border-blue-100">
            <h2 className="text-3xl font-bold mb-4 text-blue-900">Your Diagnosis: The "Data Gap"</h2>
            <p className="text-lg text-blue-800 mb-8">
              You know who your customers are, but you struggle to translate that into a high-intent outreach list. 
              You're currently guessing on geography and demographic filters.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <h4 className="font-bold mb-2">Next Step: Data Build</h4>
                <p className="text-sm text-slate-600 mb-4">Define high-level signals as a first step to a clean, validated list.</p>
                <button 
                  onClick={() => setPage('launch')}
                  className="text-blue-600 font-bold flex items-center gap-2 hover:gap-3 transition-all"
                >
                  Go to Tool <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <h4 className="font-bold mb-2">Next Step: Consult</h4>
                <p className="text-sm text-slate-600 mb-4">Book a virtual session to map out your ICP signals (e.g., property age, permits, revenue).</p>
                <button className="text-blue-600 font-bold flex items-center gap-2 hover:gap-3 transition-all">
                  Book 15-Min Meeting <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {page === 'launch' && <CampaignTool />}

      {!emailCaptured && (page === 'results' || page === 'launch') && (
        <LeadCaptureModal onClose={() => setEmailCaptured(true)} source={page} />
      )}

      <footer className="mt-20 py-12 border-t border-slate-100 text-center text-slate-400 text-sm">
        <p>© 2025 AccelMail Powered by Accel Analysis Business Solutions. All Rights Reserved.</p>
      </footer>
    </div>
  );
}
