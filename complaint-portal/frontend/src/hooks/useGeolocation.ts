/**
 * Custom hook for geolocation functionality
 * Handles GPS coordinates fetching and location permissions
 */

import { useState, useEffect, useCallback } from 'react';

export interface Location {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

interface UseGeolocationReturn {
  location: Location | null;
  error: string | null;
  loading: boolean;
  requestLocation: () => void;
  setLocation: (location: Location) => void;
}

const safeParseLocation = (value: string | null): Location | null => {
  if (!value) return null;

  try {
    return JSON.parse(value) as Location;
  } catch {
    return null;
  }
};

export const useGeolocation = (): UseGeolocationReturn => {
  const [location, setLocationState] = useState<Location | null>(() => {
    return safeParseLocation(sessionStorage.getItem('userLocation'));
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const newLocation: Location = {
          latitude,
          longitude,
          accuracy,
          timestamp: position.timestamp,
        };
        setLocationState(newLocation);
        sessionStorage.setItem('userLocation', JSON.stringify(newLocation));
        setLoading(false);
      },
      (err) => {
        console.error('Geolocation error:', err);
        let errorMessage = 'Unable to get your location';

        if (err.code === err.PERMISSION_DENIED) {
          errorMessage = 'Permission to access location was denied. Please enable location access in your browser settings.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          errorMessage = 'Location information is not available.';
        } else if (err.code === err.TIMEOUT) {
          errorMessage = 'The request to get user location timed out.';
        }

        setError(errorMessage);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  useEffect(() => {
    if (!location) {
      requestLocation();
    }
  }, [location, requestLocation]);

  const setLocation = useCallback((newLocation: Location) => {
    setLocationState(newLocation);
    sessionStorage.setItem('userLocation', JSON.stringify(newLocation));
    setError(null);
  }, []);

  return {
    location,
    error,
    loading,
    requestLocation,
    setLocation,
  };
};