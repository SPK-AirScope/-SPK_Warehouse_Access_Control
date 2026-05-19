import React, { useState, useEffect } from 'react';
import { Sun, Wind, Clock, Cloud, CloudRain, CloudSnow, CloudLightning, Info } from 'lucide-react';

const WeatherWidget = () => {
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState<any>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // Using Incheon for context, common for Swissport
        const response = await fetch('https://wttr.in/Incheon?format=j1');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        const current = data.current_condition[0];
        setWeather({
          temp: current.temp_C,
          desc: current.weatherDesc[0].value,
          humidity: current.humidity,
          windspeed: current.windspeedKmph,
          code: current.weatherCode
        });
      } catch (err) {
        console.error('Weather fetch error:', err);
      }
    };

    fetchWeather();
    // Refresh every 30 minutes
    const weatherTimer = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(weatherTimer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ko-KR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric', 
      weekday: 'short' 
    });
  };

  const getWeatherIcon = (code: string) => {
    const c = parseInt(code);
    if (c === 113) return <Sun size={24} className="text-orange-400" />;
    if (c <= 122) return <Cloud size={24} className="text-slate-400" />;
    if (c <= 200) return <Cloud size={24} className="text-slate-500" />;
    if (c <= 230) return <CloudLightning size={24} className="text-yellow-500" />;
    if (c <= 314) return <CloudRain size={24} className="text-blue-400" />;
    if (c <= 395) return <CloudSnow size={24} className="text-slate-300" />;
    return <Cloud size={24} className="text-slate-400" />;
  };

  return (
    <div className="px-4 py-2 space-y-3">
      {/* Sidebar Clock widget */}
      <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100/50 flex flex-col gap-1 transition-all duration-300">
        <div className="flex items-center gap-1.5 mb-1">
          <div className="w-1 h-1 rounded-full bg-[#E30613] animate-pulse" />
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">KST / Local Time</p>
        </div>
        <p className="text-2xl font-black text-[#1A1A1A] tabular-nums tracking-tighter">
          {formatTime(time)}
        </p>
        <p className="text-[10px] font-bold text-slate-400">
          {formatDate(time)}
        </p>
      </div>

      {/* Sidebar Weather widget */}
      <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100/50 transition-all duration-300">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Incheon Airport</p>
          </div>
          {weather && <div className="text-slate-400">{getWeatherIcon(weather.code)}</div>}
        </div>
        
        {weather ? (
          <div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-black text-[#1A1A1A]">{weather.temp}°C</p>
              <p className="text-[10px] font-bold text-slate-500 truncate">{weather.desc}</p>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 bg-white/50 px-1.5 py-0.5 rounded border border-slate-100">
                <Wind size={10} className="text-slate-300" />
                {weather.windspeed}km/h
              </div>
              <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 bg-white/50 px-1.5 py-0.5 rounded border border-slate-100">
                <span className="text-slate-300">%</span>
                {weather.humidity}%
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 py-1">
             <div className="w-3 h-3 border-2 border-[#E30613] border-t-transparent rounded-full animate-spin" />
             <p className="text-[10px] font-bold text-slate-400 italic">Updating...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeatherWidget;
