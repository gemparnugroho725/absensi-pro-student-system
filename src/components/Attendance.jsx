import React, { useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';
import Webcam from 'react-webcam';
import { supabase } from '../lib/supabase';
import { calculateDistance } from '../utils/haversine';
import { Camera, MapPin, CheckCircle2, XCircle, Send, Loader2 } from 'lucide-react';

export default function Attendance() {
  const [npm, setNpm] = useState('');
  const [profile, setProfile] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [distance, setDistance] = useState(null);
  const [inRange, setInRange] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reason, setReason] = useState('');
  const [photo, setPhoto] = useState(null);
  const [message, setMessage] = useState(null);

  const webcamRef = useRef(null);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    setPhoto(imageSrc);
  }, [webcamRef]);

  const checkGeofence = async () => {
    if (!npm) return;
    setLoading(true);
    setMessage(null);
    setPhoto(null);
    setReason('');

    // 1. Fetch Profile
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('npm', npm)
      .single();

    if (error || !data) {
      setMessage({ type: 'error', text: 'NPM not found. Please check and try again.' });
      setLoading(false);
      return;
    }

    setProfile(data);

    // 2. Get Current Location
    if (!navigator.geolocation) {
      setMessage({ type: 'error', text: 'Geolocation is not supported.' });
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCurrentLocation({ lat: latitude, lng: longitude });

        try {
          // 3. Reverse Geocoding via Nominatim
          const geoRes = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
          
          const address = geoRes.data.address;
          // In Indonesia, Kecamatan can be in various fields
          const currentKec = address.city_district || address.suburb || address.borough || address.municipality || address.district || '';
          
          setDistance(calculateDistance(latitude, longitude, data.home_lat, data.home_long));
          
          // Match logic: Case-insensitive comparison
          const normalize = (str) => str?.toLowerCase().replace(/kecamatan\s+/g, '').trim() || '';
          const pKec = normalize(data.kecamatan);
          const cKec = normalize(currentKec);
          
          const isMatch = cKec.includes(pKec) || pKec.includes(cKec) || cKec === pKec;
          
          setInRange(isMatch);
          // Show detected kecamatan in message if it fails
          if (!isMatch) {
            console.log('Detected Location:', address);
          }
          setLoading(false);
        } catch (err) {
          console.error('Geo Error:', err);
          setMessage({ type: 'error', text: 'Gagal memverifikasi alamat. Coba lagi.' });
          setLoading(false);
        }
      },
      (err) => {
        setMessage({ type: 'error', text: 'Location access denied.' });
        setLoading(false);
      }
    );
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    
    // In Condition A: Photo is required
    // In Condition B: Reason is required
    if (inRange && !photo) {
      alert('Please take a photo first!');
      setSubmitting(false);
      return;
    }
    if (!inRange && !reason) {
      alert('Please provide a reason!');
      setSubmitting(false);
      return;
    }

    let photoUrl = null;
    console.log('Attempting upload for profile:', profile);

    if (inRange && photo) {
      try {
        // 1. Convert Base64 to Blob
        const base64Data = photo.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/jpeg' });

        // 2. Upload to Supabase Storage
        const now = new Date();
        const ddmmyyyy = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`;
        const cleanName = profile.full_name.replace(/\s+/g, '').toLowerCase();
        const fileName = `${cleanName}_${npm}_${ddmmyyyy}.jpg`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('attendance-photos')
          .upload(fileName, blob);

        if (uploadError) throw uploadError;

        // 3. Get Public URL
        const { data: { publicUrl } } = supabase.storage
          .from('attendance-photos')
          .getPublicUrl(fileName);
        
        photoUrl = publicUrl;
      } catch (err) {
        console.error('Photo upload failed:', err);
        setMessage({ type: 'error', text: 'Gagal mengupload foto ke Storage.' });
        setSubmitting(false);
        return;
      }
    }

    const { error } = await supabase
      .from('attendance_logs')
      .insert([
        {
          npm: npm,
          status: inRange ? 'In-range' : 'Out-range',
          photo_url: photoUrl,
          reason: inRange ? null : reason,
          lat: currentLocation?.lat,
          long: currentLocation?.lng,
        },
      ]);

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Attendance submitted successfully!' });
      // Reset
      setPhoto(null);
      setReason('');
      setProfile(null);
    }
    setSubmitting(false);
  };

  return (
    <div className="w-full max-w-5xl p-2 sm:p-4 flex flex-col items-center">
      <div className="w-full glass-panel p-6 sm:p-10 rounded-3xl shadow-2xl">
        <h1 className="text-2xl sm:text-3xl font-bold gradient-text mb-8 text-center flex items-center justify-center gap-3">
          <Camera className="text-primary-400" /> Take Attendance
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left Section: Verification */}
          <div className="space-y-8 flex flex-col items-center">
            <div className="w-full space-y-4">
              <label className="text-sm font-semibold text-slate-400 ml-1 block text-center lg:text-left">Identitas Mahasiswa</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Masukkan NPM Anda"
                  className="flex-1 px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none focus:border-primary-500 transition-colors text-center sm:text-left"
                  value={npm}
                  onChange={(e) => setNpm(e.target.value)}
                />
                <button
                  onClick={checkGeofence}
                  disabled={loading || !npm}
                  className="px-8 py-4 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <MapPin size={20} />}
                  Verifikasi
                </button>
              </div>
            </div>

            {profile && !loading && (
              <div className="w-full animate-in fade-in slide-in-from-top-4 duration-500 space-y-6">
                <div className="p-6 bg-slate-800/50 border border-slate-700/50 rounded-2xl flex flex-col sm:flex-row items-center gap-6">
                  <div className="w-20 h-20 bg-primary-500/10 rounded-2xl flex items-center justify-center text-primary-400 shadow-inner">
                    <CheckCircle2 size={40} />
                  </div>
                  <div className="text-center sm:text-left">
                    <h3 className="text-xl font-bold text-white">{profile.full_name}</h3>
                    <p className="text-slate-400 font-mono text-sm">{profile.npm}</p>
                    <div className="mt-2 flex flex-wrap justify-center sm:justify-start gap-2">
                      <span className="px-2 py-0.5 bg-slate-700 rounded text-[10px] uppercase font-bold text-slate-300">{profile.kecamatan}</span>
                    </div>
                  </div>
                </div>

                <div className={`p-6 rounded-2xl border-2 transition-all ${inRange ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
                  <div className="flex items-start gap-4 text-center sm:text-left flex-col sm:flex-row items-center">
                    <div className={`p-3 rounded-xl ${inRange ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                      {inRange ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                    </div>
                    <div className="flex-1">
                      <h4 className={`text-lg font-bold mb-1 ${inRange ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {inRange ? 'Lokasi Sesuai!' : 'Di Luar Jangkauan!'}
                      </h4>
                      <p className="text-sm text-slate-400 leading-relaxed">
                        Terverifikasi di Kecamatan: <span className="text-slate-200 font-semibold">{profile.kecamatan}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Section: Camera & Submit */}
          <div className="space-y-6 flex flex-col items-center">
            {profile && !loading && (
              <div className="w-full space-y-6 animate-in fade-in zoom-in-95 duration-700">
                <div className="relative group w-full max-w-md mx-auto aspect-video sm:aspect-square md:aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-800">
                  {!photo ? (
                    <Webcam
                      audio={false}
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      className="w-full h-full object-cover"
                      videoConstraints={{ facingMode: "user" }}
                    />
                  ) : (
                    <img src={photo} alt="captured" className="w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-0 border-[20px] border-transparent group-hover:border-primary-500/10 transition-all pointer-events-none" />
                </div>

                <div className="flex justify-center gap-4">
                  {!photo ? (
                    <button onClick={capture} className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg active:scale-95">
                      <Camera size={20} /> Ambil Foto
                    </button>
                  ) : (
                    <button onClick={() => setPhoto(null)} className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg active:scale-95">
                      <XCircle size={20} /> Ulangi Foto
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  {!inRange && (
                    <textarea
                      placeholder="Apa alasan Anda absen di luar wilayah?"
                      className="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none focus:border-amber-500 transition-colors resize-none"
                      rows="3"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  )}
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className={`w-full py-5 rounded-2xl font-black text-lg transition-all shadow-xl active:scale-[0.98] flex items-center justify-center gap-3 ${
                      inRange 
                      ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20' 
                      : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
                    }`}
                  >
                    {submitting ? (
                      <Loader2 className="animate-spin" size={24} />
                    ) : (
                      <>SUBMIT ATTENDANCE <Send size={24} /></>
                    )}
                  </button>
                </div>
              </div>
            )}
            
            {!profile && !loading && (
              <div className="w-full h-full min-h-[300px] flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-3xl p-10">
                <div className="w-20 h-20 bg-slate-800/30 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 size={32} />
                </div>
                <p className="text-lg font-medium">Verifikasi NPM untuk memulai</p>
              </div>
            )}
          </div>
        </div>

        {/* Message Feedback */}
        {message && (
          <div className={`mt-8 p-4 rounded-xl border flex items-center justify-center gap-3 animate-bounce ${
            message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            {message.type === 'success' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
            <span className="font-bold">{message.text}</span>
          </div>
        )}
      </div>
    </div>
  );
}
