import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Circle, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Target, 
  Users, 
  UserCheck, 
  MessageSquare, 
  Zap, 
  CheckCircle2, 
  ArrowRight,
  Info,
  Mail,
  LocateFixed,
  Layers,
  Calendar,
  Building2,
  Home,
  MapPin,
  Clock
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

// Click handler component for map
const MapClickHandler = ({ onMapClick }) => {
  const map = useMap();
  
  useEffect(() => {
    const handleClick = (e) => {
      onMapClick([e.latlng.lat, e.latlng.lng]);
    };
    map.on('click', handleClick);
    return () => map.off('click', handleClick);
  }, [map, onMapClick]);
  
  return null;
};

const InteractiveMap = ({ centroid, onCentroidChange, radius, onRadiusChange, onBoundaryChange }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [addressInput, setAddressInput] = useState('');
  const [filledBoundaryType, setFilledBoundaryType] = useState('zcta');
  const [filledGeoJson, setFilledGeoJson] = useState(null);

  // Convert radius miles to meters for Leaflet Circle
  const radiusMeters = radius * 1609.34;

  const geocodeAddress = async () => {
    if (!addressInput.trim()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addressInput)}&format=json&limit=1&countrycodes=us`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'AccelMail/1.0'
          }
        }
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const newCenter = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        onCentroidChange(newCenter, data[0].display_name);
      } else {
        setError('Address not found. Try a city name or zip code.');
      }
    } catch (e) {
      console.error('Geocoding error:', e);
      setError('Failed to locate address. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMapClick = (coords) => {
    onCentroidChange(coords, `${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}`);
  };

  useEffect(() => {
    if (!filledBoundaryType || filledBoundaryType === 'none') {
      setFilledGeoJson(null);
      if (onBoundaryChange) {
        onBoundaryChange({ type: 'radius', ids: [], count: 0 });
      }
      return;
    }

    let cancelled = false;

    const fetchZctas = async () => {
      setLoading(true);
      setError('');

      try {
        const boundaryConfigs = {
          zcta: {
            queryUrl: 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/PUMA_TAD_TAZ_UGA_ZCTA/MapServer/1/query',
            outFields: 'ZCTA5,BASENAME',
            idField: 'ZCTA5'
          },
          county: {
            queryUrl: 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/State_County/MapServer/11/query',
            outFields: 'GEOID,NAME',
            idField: 'GEOID'
          },
          place: {
            queryUrl: 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Places_CouSub_ConCity_SubMCD/MapServer/4/query',
            outFields: 'GEOID,NAME',
            idField: 'GEOID'
          },
          tract: {
            queryUrl: 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Tracts_Blocks/MapServer/8/query',
            outFields: 'GEOID,BASENAME',
            idField: 'GEOID'
          },
          msa: {
            queryUrl: 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/CBSA/MapServer/3/query',
            outFields: 'GEOID,NAME,BASENAME',
            idField: 'GEOID'
          }
        };

        const cfg = boundaryConfigs[filledBoundaryType] || boundaryConfigs.zcta;

        const url = new URL(cfg.queryUrl);
        url.searchParams.set('f', 'geojson');
        url.searchParams.set('where', '1=1');
        url.searchParams.set('returnGeometry', 'true');
        url.searchParams.set('outFields', cfg.outFields);
        url.searchParams.set('geometryType', 'esriGeometryPoint');
        url.searchParams.set('inSR', '4326');
        url.searchParams.set('outSR', '4326');
        url.searchParams.set('spatialRel', 'esriSpatialRelIntersects');
        url.searchParams.set('geometry', `${centroid[1]},${centroid[0]}`);
        url.searchParams.set('distance', String(radiusMeters));
        url.searchParams.set('units', 'esriSRUnit_Meter');

        const response = await fetch(url.toString(), {
          headers: {
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`TIGERweb request failed (${response.status})`);
        }

        const geojson = await response.json();

        if (cancelled) return;

        // Validate GeoJSON before setting
        if (!geojson || geojson.type !== 'FeatureCollection' || !Array.isArray(geojson.features)) {
          throw new Error('Invalid GeoJSON response');
        }

        setFilledGeoJson(geojson);

        const ids = Array.isArray(geojson?.features)
          ? geojson.features
              .map((f) => (f?.properties?.[cfg.idField] || '').toString().trim())
              .filter(Boolean)
          : [];

        if (onBoundaryChange) {
          onBoundaryChange({ type: filledBoundaryType, ids, count: ids.length });
        }
      } catch (e) {
        if (cancelled) return;
        setFilledGeoJson(null);
        setError('Could not load filled areas. Showing radius instead.');
        if (onBoundaryChange) {
          onBoundaryChange({ type: 'radius', ids: [], count: 0 });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const debounce = setTimeout(fetchZctas, 500);

    return () => {
      cancelled = true;
      clearTimeout(debounce);
    };
  }, [centroid, radiusMeters, filledBoundaryType, onBoundaryChange]);

  return (
    <div className="mt-6 space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Enter address, city, or zip code..."
          value={addressInput}
          onChange={(e) => setAddressInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && geocodeAddress()}
          className="flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
        />
        <button
          onClick={geocodeAddress}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading ? 'Finding...' : 'Set Location'}
        </button>
      </div>
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-slate-600">Radius:</label>
        <select 
          className="p-2 border rounded-lg text-sm"
          value={radius}
          onChange={(e) => onRadiusChange(Number(e.target.value))}
        >
          <option value={5}>5 Miles</option>
          <option value={10}>10 Miles</option>
          <option value={15}>15 Miles</option>
          <option value={25}>25 Miles</option>
          <option value={50}>50 Miles</option>
        </select>
        <label className="text-sm font-medium text-slate-600">Filled Area:</label>
        <select
          className="p-2 border rounded-lg text-sm"
          value={filledBoundaryType}
          onChange={(e) => setFilledBoundaryType(e.target.value)}
        >
          <option value="none">None (radius only)</option>
          <option value="zcta">ZIP Codes (ZCTA)</option>
          <option value="county">Counties</option>
          <option value="place">Cities / Places</option>
          <option value="tract">Census Tracts</option>
          <option value="msa">Metro Areas (MSA)</option>
        </select>
      </div>
      <p className="text-xs text-slate-500 flex items-center gap-1">
        <MapPin className="w-3 h-3" /> Or click on the map to place your market center
      </p>
      {error && (
        <div className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded">
          {error}
        </div>
      )}
      <div className="h-72 rounded-xl overflow-hidden border border-slate-200 relative">
        {loading && (
          <div className="absolute inset-0 bg-white/70 z-[1000] flex items-center justify-center">
            <div className="text-blue-600 font-medium">Locating...</div>
          </div>
        )}
        <MapContainer
          center={centroid}
          zoom={10}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Circle
            center={centroid}
            radius={radiusMeters}
            pathOptions={{
              color: '#2563eb',
              fillColor: '#3b82f6',
              fillOpacity: 0.2,
              weight: 2
            }}
          />
          {filledBoundaryType !== 'none' && filledGeoJson && filledGeoJson.features?.length > 0 && (
            <GeoJSON
              key={`${filledBoundaryType}-${centroid[0]}-${centroid[1]}-${radius}-${filledGeoJson.features.length}`}
              data={filledGeoJson}
              style={() => ({
                color: '#2563eb',
                weight: 1,
                fillColor: '#3b82f6',
                fillOpacity: 0.12
              })}
            />
          )}
          <Circle
            center={centroid}
            radius={500}
            pathOptions={{
              color: '#1d4ed8',
              fillColor: '#1d4ed8',
              fillOpacity: 0.6,
              weight: 2
            }}
          />
          <MapRadiusUpdater center={centroid} radius={radius} />
          <MapClickHandler onMapClick={handleMapClick} />
        </MapContainer>
      </div>
      {centroid && (
        <div className="text-sm text-slate-600 bg-slate-50 p-2 rounded flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-600" />
          <span><strong>Market Center:</strong> {centroid[0].toFixed(5)}, {centroid[1].toFixed(5)} • <strong>Radius:</strong> {radius} miles</span>
        </div>
      )}
    </div>
  );
};

const Navigation = ({ setPage }) => (
  <nav className="flex items-center justify-between p-6 border-b border-gray-100 bg-white sticky top-0 z-50">
    <div className="flex items-center gap-2 font-bold text-2xl text-blue-600 cursor-pointer" onClick={() => setPage('home')}>
      <Layers className="w-8 h-8" />
      <span>AccelMail</span>
      <a href="https://accelanalysis.com" target="_blank" rel="noopener noreferrer" className="text-xs font-regular text-slate-500 hover:text-blue-600 transition">Powered by Accel Analysis Business Solutions</a>
    </div>
    <div className="hidden md:flex gap-8 text-sm font-medium text-gray-600">
      <button onClick={() => setPage('home')} className="hover:text-blue-600">The Method</button>
      <button onClick={() => setPage('quiz')} className="hover:text-blue-600">Self-Diagnosis</button>
      <button onClick={() => setPage('casestudies')} className="hover:text-blue-600">Case Studies</button>
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
      Stop blasting generic outreach. We help you connect data to real prospects. Identify market segments, refine messaging, then launch outreach to real targets, so you can stop wondering – Where are my customers really at?.
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
        Let's Go!
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
              {activeLayer < 5 && (
                <button 
                  onClick={() => setActiveLayer(activeLayer + 1)}
                  className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Next Step <ArrowRight className="w-4 h-4" />
                </button>
              )}
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

const CaseStudies = ({ setPage }) => (
  <div className="max-w-4xl mx-auto py-20 px-6 text-center">
    <div className="bg-slate-50 p-12 rounded-3xl border border-slate-200">
      <Clock className="w-16 h-16 text-blue-600 mx-auto mb-6" />
      <h2 className="text-3xl font-bold text-slate-900 mb-4">Case Studies Coming Soon</h2>
      <p className="text-lg text-slate-600 mb-8 max-w-xl mx-auto">
        We're updating our case studies with fresh results and new client success stories. Check back soon to see real-world examples of the AccelMail method in action.
      </p>
      <button 
        onClick={() => setPage('home')}
        className="px-8 py-3 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700 transition"
      >
        Return Home
      </button>
    </div>
  </div>
);

const CampaignTool = ({ centroid, onCentroidChange, audienceType, setAudienceType, radius, onRadiusChange, onBoundaryChange, submitCampaignDetails, quoteBusinessName, setQuoteBusinessName, quoteContactName, setQuoteContactName, quoteContactPhone, setQuoteContactPhone }) => {
  const [guided, setGuided] = useState(true);
  const [scheduling, setScheduling] = useState(false);

  const calendarLink = 'https://outlook.office.com/book/AccelAnalysis1@NETORGFT15328873.onmicrosoft.com/s/LUKxf3eKv0igPKL4Tbkb-A2?ismsaljsauthenabled';

  return (
    <div className="max-w-7xl mx-auto py-10 px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h2 className="text-3xl font-bold">Quote Request</h2>
          <p className="text-slate-500">Provide some basic info below. We'll begin the analysis and prepare a quote to share on our virtual meeting.</p>
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
                <p className="font-bold flex items-center gap-2"><Info className="w-4 h-4" /> Define Your Market Center:</p>
                <p>Set the geographic center of your target market. You can enter an address or click directly on the map to place your market pin.</p>
              </div>
            )}
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><LocateFixed className="w-5 h-5" /> Market Reach</h3>
            <InteractiveMap centroid={centroid} onCentroidChange={onCentroidChange} radius={radius} onRadiusChange={onRadiusChange} onBoundaryChange={onBoundaryChange} />
          </div>

          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            {guided && (
              <div className="mb-6 bg-blue-50 border-l-4 border-blue-600 p-4 text-blue-800 text-sm">
                <p className="font-bold flex items-center gap-2"><Info className="w-4 h-4" /> Audience Focus:</p>
                <p>Business and Consumer audiences require different messaging strategies. Select your primary audience type to ensure your outreach resonates.</p>
              </div>
            )}
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><Users className="w-5 h-5" /> Audience Focus</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <button 
                onClick={() => setAudienceType('business')}
                className={`p-6 border-2 rounded-xl text-left transition font-medium flex items-center gap-4 ${
                  audienceType === 'business' 
                    ? 'border-blue-600 bg-blue-50' 
                    : 'border-slate-100 hover:border-blue-600'
                }`}
              >
                <Building2 className={`w-8 h-8 ${audienceType === 'business' ? 'text-blue-600' : 'text-slate-400'}`} />
                <div>
                  <div className="text-lg font-bold">Business</div>
                  <div className="text-sm text-slate-500">B2B targeting for commercial audiences</div>
                </div>
              </button>
              <button 
                onClick={() => setAudienceType('consumer')}
                className={`p-6 border-2 rounded-xl text-left transition font-medium flex items-center gap-4 ${
                  audienceType === 'consumer' 
                    ? 'border-blue-600 bg-blue-50' 
                    : 'border-slate-100 hover:border-blue-600'
                }`}
              >
                <Home className={`w-8 h-8 ${audienceType === 'consumer' ? 'text-blue-600' : 'text-slate-400'}`} />
                <div>
                  <div className="text-lg font-bold">Consumer</div>
                  <div className="text-sm text-slate-500">B2C targeting for residential audiences</div>
                </div>
              </button>
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            {guided && (
              <div className="mb-6 bg-blue-50 border-l-4 border-blue-600 p-4 text-blue-800 text-sm">
                <p className="font-bold flex items-center gap-2"><Info className="w-4 h-4" /> Contact Details:</p>
                <p>Add a few details so we know who to prepare the quote for.</p>
              </div>
            )}
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><Building2 className="w-5 h-5" /> Your Details</h3>
            <div className="space-y-4">
              <input
                type="text"
                value={quoteBusinessName}
                onChange={(e) => setQuoteBusinessName(e.target.value)}
                placeholder="Business Name"
                className="w-full p-4 border rounded-xl outline-none focus:ring-2 focus:ring-blue-600"
              />
              <input
                type="text"
                value={quoteContactName}
                onChange={(e) => setQuoteContactName(e.target.value)}
                placeholder="Contact Name"
                className="w-full p-4 border rounded-xl outline-none focus:ring-2 focus:ring-blue-600"
              />
              <input
                type="tel"
                value={quoteContactPhone}
                onChange={(e) => setQuoteContactPhone(e.target.value)}
                placeholder="Contact Phone"
                className="w-full p-4 border rounded-xl outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-900 text-white p-8 rounded-2xl h-fit sticky top-24">
          <h3 className="text-xl font-bold mb-4">Get Started</h3>
          <div className="space-y-4 mb-6">
            <p className="text-slate-300 text-sm leading-relaxed">
              <strong className="text-white">Stop mailing everyone.</strong> Reach specific targets who actually fit your ideal customer profile.
            </p>
            <p className="text-slate-300 text-sm leading-relaxed">
              <strong className="text-white">You control your spend</strong> because you control:
            </p>
            <ul className="text-slate-400 text-sm space-y-2 ml-4">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <span><strong className="text-slate-200">How many</strong> prospects you want to reach</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <span><strong className="text-slate-200">How far</strong> your market extends</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <span><strong className="text-slate-200">How often</strong> you want outreach</span>
              </li>
            </ul>
          </div>
          <button
            type="button"
            onClick={() => {
              const meetingWindow = window.open(calendarLink, '_blank', 'noopener,noreferrer');
              setScheduling(true);
              Promise.resolve(submitCampaignDetails ? submitCampaignDetails('schedule_meeting') : null)
                .catch(() => null)
                .finally(() => setScheduling(false));
              if (!meetingWindow) {
                window.location.href = calendarLink;
              }
            }}
            className="w-full py-4 bg-blue-600 rounded-xl font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-60"
            disabled={scheduling}
          >
            <Calendar className="w-5 h-5" />
            {scheduling ? 'Opening Calendar…' : 'Schedule a Meeting'}
          </button>
          <p className="mt-4 text-xs text-slate-500 text-center">Scheduling submits your market and audience selections so we can prepare for the call.</p>
        </div>
      </div>
    </div>
  );
};

// --- Main App Logic ---

export default function AccelMailApp() {
  const [page, setPage] = useState('home'); // 'home', 'quiz', 'launch', 'results'
  const [emailCaptured, setEmailCaptured] = useState(false);
  const [centroid, setCentroid] = useState([36.8529, -75.9780]); // Default: Virginia Beach
  const [audienceType, setAudienceType] = useState(null); // 'business' or 'consumer'
  const [radius, setRadius] = useState(10); // Default: 10 miles
  const [boundarySelection, setBoundarySelection] = useState({ type: 'radius', ids: [], count: 0 });
  const [quoteBusinessName, setQuoteBusinessName] = useState('');
  const [quoteContactName, setQuoteContactName] = useState('');
  const [quoteContactPhone, setQuoteContactPhone] = useState('');
  const leadEndpoint = import.meta?.env?.VITE_LEAD_ENDPOINT || 'https://script.google.com/macros/s/AKfycbwEOLacSRmhR-EDG0N4FZIZOsFgpgmjSopMdX3XTXFhHQ05sp0CLjQHaoPCj2MFohoEqw/exec';
  const leadToken = import.meta?.env?.VITE_LEAD_TOKEN || '';

  const submitCampaignDetails = async (sourceOverride) => {
    if (!leadEndpoint || leadEndpoint.includes('PASTE_')) return;

    const source = (sourceOverride || page || '').toString();
    const params = new URLSearchParams({
      fullName: '',
      workEmail: '',
      company: '',
      phone: '',
      businessName: quoteBusinessName.trim(),
      contactName: quoteContactName.trim(),
      contactPhone: quoteContactPhone.trim(),
      source,
      marketCenterLat: centroid ? centroid[0].toString() : '',
      marketCenterLng: centroid ? centroid[1].toString() : '',
      audienceType: audienceType || '',
      radius: (radius == null ? '' : String(radius)),
      boundaryType: (boundarySelection?.type || '').toString(),
      boundaryIds: Array.isArray(boundarySelection?.ids) ? boundarySelection.ids.join(',') : '',
      boundaryCount: (boundarySelection?.count == null ? '' : String(boundarySelection.count)),
      token: leadToken
    });

    await fetch(leadEndpoint, {
      method: 'POST',
      mode: 'no-cors',
      body: params
    });
  };

  const handleCentroidChange = (coords) => {
    setCentroid(coords);
  };

  const handleQuizComplete = () => {
    setPage('results');
  };

  const LeadCaptureModal = ({ onClose, source, centroid, audienceType, radius }) => {
    const [fullName, setFullName] = useState('');
    const [workEmail, setWorkEmail] = useState('');
    const [company, setCompany] = useState('');
    const [phone, setPhone] = useState('');
    const [callbackTime, setCallbackTime] = useState('');
    const [contactConsent, setContactConsent] = useState(false);
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
        callbackTime: (callbackTime || '').toString(),
        source: (source || '').toString(),
        marketCenterLat: centroid ? centroid[0].toString() : '',
        marketCenterLng: centroid ? centroid[1].toString() : '',
        audienceType: audienceType || '',
        radius: (radius == null ? '' : String(radius)),
        boundaryType: (boundarySelection?.type || '').toString(),
        boundaryIds: Array.isArray(boundarySelection?.ids) ? boundarySelection.ids.join(',') : '',
        boundaryCount: (boundarySelection?.count == null ? '' : String(boundarySelection.count))
      };

      if (!payload.fullName || !payload.workEmail) {
        setSubmitError('Please enter your name and work email.');
        return;
      }

      if (!contactConsent) {
        setSubmitError('Please confirm you consent to be contacted.');
        return;
      }

      if (!payload.callbackTime) {
        setSubmitError('Please select the best time to call you back.');
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
          callbackTime: payload.callbackTime,
          source: payload.source,
          marketCenterLat: payload.marketCenterLat,
          marketCenterLng: payload.marketCenterLng,
          audienceType: payload.audienceType,
          radius: payload.radius,
          boundaryType: payload.boundaryType,
          boundaryIds: payload.boundaryIds,
          boundaryCount: payload.boundaryCount,
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
        setSubmitError('Something went wrong sending your one-pager. Please try again.');
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl max-w-md w-full shadow-2xl relative z-[10000]">
          <h3 className="text-2xl font-bold text-slate-900 mb-2">Schedule a Call to Define My Market</h3>
          <p className="text-slate-500 mb-2">We'll also email you our From Definition-to-Outreach 1-pager.</p>
          <button
            type="button"
            disabled={submitting}
            onClick={() => {
              setSubmitError('');
              onClose();
              if (source !== 'launch') setPage('launch');
            }}
            className="text-xs text-blue-600 hover:text-blue-700 font-semibold underline underline-offset-2 mb-6"
          >
            Click Here to Request a Quote & Virtual Meeting Instead
          </button>
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

            <select
              value={callbackTime}
              onChange={(e) => setCallbackTime(e.target.value)}
              className="w-full p-4 border rounded-xl outline-none focus:ring-2 focus:ring-blue-600 bg-white"
              disabled={submitting || submitted}
            >
              <option value="" disabled>Best time to call back</option>
              <option value="Morning (8-12)">Morning (8-12)</option>
              <option value="Afternoon (12-4)">Afternoon (12-4)</option>
              <option value="Evening (4-7)">Evening (4-7)</option>
            </select>

            <label className="flex items-start gap-3 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={contactConsent}
                onChange={(e) => setContactConsent(e.target.checked)}
                disabled={submitting || submitted}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
              />
              <span>I consent to be contacted about AccelMail.</span>
            </label>

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
              {submitting ? 'Sending…' : 'Get the One-pager'}
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

      {page === 'casestudies' && <CaseStudies setPage={setPage} />}

      {page === 'launch' && (
        <CampaignTool 
          centroid={centroid} 
          onCentroidChange={handleCentroidChange} 
          audienceType={audienceType} 
          setAudienceType={setAudienceType}
          radius={radius}
          onRadiusChange={setRadius}
          onBoundaryChange={setBoundarySelection}
          submitCampaignDetails={submitCampaignDetails}
          quoteBusinessName={quoteBusinessName}
          setQuoteBusinessName={setQuoteBusinessName}
          quoteContactName={quoteContactName}
          setQuoteContactName={setQuoteContactName}
          quoteContactPhone={quoteContactPhone}
          setQuoteContactPhone={setQuoteContactPhone}
        />
      )}

      {!emailCaptured && (page === 'results' || page === 'launch') && (
        <LeadCaptureModal 
          onClose={() => setEmailCaptured(true)} 
          source={page} 
          centroid={centroid}
          audienceType={audienceType}
          radius={radius}
        />
      )}

      <footer className="mt-20 py-12 border-t border-slate-100 text-center text-slate-400 text-sm">
        <p>© 2025 AccelMail Powered by <a href="https://accelanalysis.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition">Accel Analysis Business Solutions</a>. All Rights Reserved.</p>
      </footer>
    </div>
  );
}
