import { createContext, useContext, useState, useEffect } from 'react';

const LocationContext = createContext(null);

export function LocationProvider({ children }) {
  const [location, setLocation] = useState(null); // { lat, lng }
  const [locationName, setLocationName] = useState('');
  const [locationError, setLocationError] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationMeta, setLocationMeta] = useState({
    source: 'browser_geolocation',
    accuracy: null,
    lastUpdated: null,
    reverseGeocoded: false,
  });

  const updateAddressFromCoordinates = async (loc) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${loc.lat}&lon=${loc.lng}&format=json`
      );
      const data = await res.json();
      const area = data.address?.suburb || data.address?.city_district || data.address?.city || data.address?.town || '';
      const city = data.address?.city || data.address?.town || data.address?.county || '';
      setLocationName(area ? `${area}, ${city}` : city);
      setLocationMeta((current) => ({ ...current, reverseGeocoded: true }));
    } catch {}
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const loc = { lat: coords.latitude, lng: coords.longitude };
        setLocation(loc);
        setLocationError(null);
        setLocating(false);
        setLocationMeta({
          source: 'browser_geolocation',
          accuracy: coords.accuracy ?? null,
          lastUpdated: new Date().toISOString(),
          reverseGeocoded: false,
        });
        updateAddressFromCoordinates(loc);
      },
      (err) => {
        setLocating(false);
        if (err.code === 1) setLocationError('Location access denied');
        else setLocationError('Could not get location');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Auto-detect on mount
  useEffect(() => { detectLocation(); }, []);

  // Watch position for real-time updates
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        setLocation({ lat: coords.latitude, lng: coords.longitude });
        setLocationMeta((current) => ({
          ...current,
          source: 'browser_geolocation',
          accuracy: coords.accuracy ?? current.accuracy,
          lastUpdated: new Date().toISOString(),
        }));
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 30000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return (
    <LocationContext.Provider value={{ location, locationName, locationError, locating, locationMeta, detectLocation }}>
      {children}
    </LocationContext.Provider>
  );
}

export const useLocation = () => useContext(LocationContext);
