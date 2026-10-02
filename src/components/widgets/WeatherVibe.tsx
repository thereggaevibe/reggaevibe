import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CloudSun, MapPin } from "lucide-react";

type Coords = { lat: number; lon: number; label?: string | undefined };

const CONDITIONS: Record<number, string> = {
  0: "Sunny",
  1: "Mostly Sunny",
  2: "Partly Cloudy",
  3: "Cloudy",
  45: "Foggy",
  48: "Freezing Fog",
  51: "Light Drizzle",
  53: "Drizzle",
  55: "Heavy Drizzle",
  61: "Light Rain",
  63: "Rain",
  65: "Heavy Rain",
  71: "Light Snow",
  73: "Snow",
  75: "Heavy Snow",
  80: "Showers",
  81: "Showers",
  82: "Heavy Showers",
  95: "Thunderstorms",
  96: "Thunderstorms",
  99: "Thunderstorms",
};

function useLocation() {
  const [coords, setCoords] = useState<Coords | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fallback = async () => {
      try {
        const res = await fetch("https://ipapi.co/json/");
        const data = (await res.json()) as { latitude?: number; longitude?: number; city?: string; region_code?: string };
        if (!cancelled && typeof data.latitude === "number" && typeof data.longitude === "number") {
          setCoords({
            lat: data.latitude,
            lon: data.longitude,
            label: [data.city, data.region_code].filter(Boolean).join(", ") || undefined,
          });
        }
      } catch {
        if (!cancelled) setCoords({ lat: 18.0179, lon: -76.8099, label: "Kingston, JM" });
      }
    };

    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!cancelled) setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        },
        () => void fallback(),
        { timeout: 6000, maximumAge: 600000 },
      );
    } else {
      void fallback();
    }

    return () => {
      cancelled = true;
    };
  }, []);

  return coords;
}

export function WeatherVibe() {
  const coords = useLocation();

  const { data } = useQuery({
    queryKey: ["weather-vibe", coords?.lat, coords?.lon],
    enabled: !!coords,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { lat, lon } = coords!;
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=auto&forecast_days=1`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("weather unavailable");
      const json = (await res.json()) as {
        current: { temperature_2m: number; weather_code: number };
        daily: { temperature_2m_max: number[]; temperature_2m_min: number[] };
      };

      let label = coords!.label;
      if (!label) {
        try {
          const geo = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
          const g = (await geo.json()) as { city?: string; locality?: string; principalSubdivisionCode?: string };
          const city = g.city || g.locality;
          const region = g.principalSubdivisionCode?.split("-").pop();
          label = [city, region].filter(Boolean).join(", ") || undefined;
        } catch {
          label = undefined;
        }
      }

      return {
        temp: Math.round(json.current.temperature_2m),
        condition: CONDITIONS[json.current.weather_code] ?? "Current",
        high: Math.round(json.daily.temperature_2m_max[0] ?? json.current.temperature_2m),
        low: Math.round(json.daily.temperature_2m_min[0] ?? json.current.temperature_2m),
        label: label ?? "Your area",
      };
    },
  });

  return (
    <div className="flex min-w-[13rem] items-center gap-3 rounded-xl border border-border bg-surface px-4 py-2.5">
      <CloudSun className="size-7 shrink-0 text-gold" aria-hidden="true" />
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-2xl leading-none tracking-tight text-foreground">
            {data ? `${data.temp}°` : "--°"}
          </span>
          <span className="truncate text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {data?.condition ?? "Loading"}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
          <MapPin className="size-3 shrink-0 text-rasta-green" aria-hidden="true" />
          <span className="truncate">{data?.label ?? "Locating"}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[9px] uppercase tracking-widest text-muted-foreground">
          <span className="font-bold text-gold">{data ? `${data.high}° / ${data.low}°` : "—"}</span>
          <span>Powered by AccuWeather</span>
        </div>
      </div>
      <span className="sr-only">WeatherVibe local weather</span>
    </div>
  );
}
