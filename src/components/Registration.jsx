import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabase } from '../lib/supabase';
import { MapPin, User, KeyIcon, Globe, Map as MapIcon, Home } from 'lucide-react';

// Fix Leaflet marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function LocationMarker({ position, setPosition }) {
  const map = useMap();
  
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  return position === null ? null : (
    <Marker position={position} />
  );
}

export default function Registration({ onNavigate }) {
  const [fullName, setFullName] = useState('');
  const [npm, setNpm] = useState('');
  const [position, setPosition] = useState({ lat: -6.2088, lng: 106.8456 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Regional Data States
  const [provinces, setProvinces] = useState([]);
  const [regencies, setRegencies] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [villages, setVillages] = useState([]);

  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedRegency, setSelectedRegency] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedVillage, setSelectedVillage] = useState('');

  useEffect(() => {
    // Load Provinces
    axios.get('https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json')
      .then(res => setProvinces(res.data));
  }, []);

  const handleProvinceChange = (id) => {
    setSelectedProvince(id);
    setSelectedRegency('');
    setSelectedDistrict('');
    setSelectedVillage('');
    axios.get(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${id}.json`)
      .then(res => setRegencies(res.data));
  };

  const handleRegencyChange = (id) => {
    setSelectedRegency(id);
    setSelectedDistrict('');
    setSelectedVillage('');
    axios.get(`https://www.emsifa.com/api-wilayah-indonesia/api/districts/${id}.json`)
      .then(res => setDistricts(res.data));
  };

  const handleDistrictChange = (id) => {
    setSelectedDistrict(id);
    setSelectedVillage('');
    axios.get(`https://www.emsifa.com/api-wilayah-indonesia/api/villages/${id}.json`)
      .then(res => setVillages(res.data));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate Regional Selection
    if (!selectedProvince || !selectedRegency || !selectedDistrict || !selectedVillage) {
      setError('Mohon lengkapi data wilayah Anda.');
      setLoading(false);
      return;
    }

    // Get Text Names for Database
    const provinceName = provinces.find(p => p.id === selectedProvince)?.name;
    const regencyName = regencies.find(r => r.id === selectedRegency)?.name;
    const districtName = districts.find(d => d.id === selectedDistrict)?.name;
    const villageName = villages.find(v => v.id === selectedVillage)?.name;

    // Direct Insert into Profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([
        {
          npm,
          full_name: fullName,
          home_lat: position.lat,
          home_long: position.lng,
          provinsi: provinceName,
          kabupaten: regencyName,
          kecamatan: districtName,
          kelurahan: villageName,
        },
      ]);

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    alert('Registrasi Berhasil!');
    onNavigate('attendance');
    setLoading(false);
  };

  return (
    <div className="w-full max-w-5xl p-2 sm:p-4 flex flex-col items-center">
      <div className="w-full glass-panel p-6 sm:p-10 rounded-3xl shadow-2xl">
        <h1 className="text-2xl sm:text-3xl font-bold gradient-text mb-8 text-center">Student Registration</h1>
        
        <form onSubmit={handleRegister} className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left Session: Info */}
          <div className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-primary-400 flex items-center justify-center lg:justify-start gap-2">
                <User size={20} /> Personal Information
              </h2>
              <div className="grid grid-cols-1 gap-4">
                <input type="text" required placeholder="Full Name" className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl outline-none focus:border-primary-500 transition-colors" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                <input type="text" required placeholder="NPM" className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl outline-none focus:border-primary-500 transition-colors" value={npm} onChange={(e) => setNpm(e.target.value)} />
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-primary-400 flex items-center justify-center lg:justify-start gap-2">
                <Globe size={20} /> Regional Data
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <select required className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 outline-none focus:border-primary-500 transition-colors" value={selectedProvince} onChange={(e) => handleProvinceChange(e.target.value)}>
                  <option value="">Pilih Provinsi</option>
                  {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select required className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 outline-none focus:border-primary-500 transition-colors" value={selectedRegency} onChange={(e) => handleRegencyChange(e.target.value)} disabled={!selectedProvince}>
                  <option value="">Pilih Kota/Kab</option>
                  {regencies.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <select required className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 outline-none focus:border-primary-500 transition-colors" value={selectedDistrict} onChange={(e) => handleDistrictChange(e.target.value)} disabled={!selectedRegency}>
                  <option value="">Pilih Kecamatan</option>
                  {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <select required className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 outline-none focus:border-primary-500 transition-colors" value={selectedVillage} onChange={(e) => setSelectedVillage(e.target.value)} disabled={!selectedDistrict}>
                  <option value="">Pilih Kelurahan</option>
                  {villages.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Right Section: Map */}
          <div className="space-y-6 flex flex-col items-center">
            <h2 className="text-lg font-semibold text-primary-400 flex items-center justify-center lg:justify-start gap-2 w-full">
              <Home size={20} /> Map Location
            </h2>
            <div className="w-full h-[300px] sm:h-[400px] border-2 border-slate-700 rounded-2xl overflow-hidden shadow-inner">
              <MapContainer center={[-6.2088, 106.8456]} zoom={13} scrollWheelZoom={true}>
                <TileLayer attribution='&copy; <a href="https://osm.org">OSM</a>' url="https://{s}.tile.osm.org/{z}/{x}/{y}.png" />
                <LocationMarker position={position} setPosition={setPosition} />
              </MapContainer>
            </div>
            {error && <p className="w-full p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center rounded-xl">{error}</p>}
            <button type="submit" disabled={loading} className="w-full py-4 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold rounded-2xl transition-all shadow-xl shadow-primary-500/20 active:scale-95 flex items-center justify-center gap-2">
              {loading ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" /> : 'Complete Registration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
