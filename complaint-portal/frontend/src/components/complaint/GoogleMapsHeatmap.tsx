import React, { useEffect, useMemo } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import type { LatLngBoundsExpression } from 'leaflet';
import { Complaint } from '../../types';

interface GoogleMapsHeatmapProps {
  complaints: Complaint[];
  onMarkerClick?: (complaint: Complaint) => void;
  filters?: {
    status?: string[];
    severity?: string[];
  };
}

const getMarkerColor = (status: string): string => {
  switch (status) {
    case 'Done':
      return '#00ff00'; // Bright Neon Green - highly visible
    case 'Under Construction':
      return '#fbbf24'; // Bright Yellow
    case 'Progressed':
      return '#60a5fa'; // Light Blue
    case 'Pending':
    default:
      return '#f87171'; // Light Red
  }
};

const getMarkerOpacity = (status: string): number => {
  // Make Done status highly visible with full opacity
  return status === 'Done' ? 1.0 : 0.85;
};

const getMarkerWeight = (status: string): number => {
  // Make Done status have a much thicker border
  return status === 'Done' ? 4 : 2;
};

const getMarkerRadius = (status: string, baseSeverity: string): number => {
  const severityBonus = baseSeverity === 'Critical' ? 4 : baseSeverity === 'High' ? 2 : 0;
  // Make Done markers larger
  return status === 'Done' ? 12 + severityBonus : 8 + severityBonus;
};

const getMapCenter = (complaints: Complaint[]) => {
  if (complaints.length === 0) {
    return [20.5937, 78.9629] as [number, number];
  }

  const total = complaints.reduce(
    (acc, complaint) => ({ lat: acc.lat + complaint.latitude, lng: acc.lng + complaint.longitude }),
    { lat: 0, lng: 0 }
  );

  return [total.lat / complaints.length, total.lng / complaints.length] as [number, number];
};

const getBounds = (complaints: Complaint[]): LatLngBoundsExpression | null => {
  if (complaints.length === 0) {
    return null;
  }

  return complaints.map((complaint) => [complaint.latitude, complaint.longitude] as [number, number]);
};

const FitBounds: React.FC<{ complaints: Complaint[] }> = ({ complaints }) => {
  const map = useMap();

  useEffect(() => {
    if (complaints.length === 0) {
      return;
    }

    const bounds = getBounds(complaints);
    if (!bounds) {
      return;
    }

    map.fitBounds(bounds, { padding: [30, 30] });
  }, [complaints, map]);

  return null;
};

export const GoogleMapsHeatmap: React.FC<GoogleMapsHeatmapProps> = ({
  complaints,
  onMarkerClick,
  filters,
}) => {
  const filteredComplaints = useMemo(() => {
    return complaints.filter((complaint) => {
      if (filters?.status && !filters.status.includes(complaint.status)) {
        return false;
      }
      if (filters?.severity && !filters.severity.includes(complaint.severity)) {
        return false;
      }
      return true;
    });
  }, [complaints, filters?.severity, filters?.status]);

  const center = useMemo(() => getMapCenter(filteredComplaints), [filteredComplaints]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[24px]">
      <MapContainer center={center} zoom={filteredComplaints.length > 0 ? 7 : 5} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {filteredComplaints.length > 0 && <FitBounds complaints={filteredComplaints} />}
        {filteredComplaints.map((complaint) => {
          const markerColor = getMarkerColor(complaint.status);
          const markerRadius = getMarkerRadius(complaint.status, complaint.severity);
          
          return (
            <CircleMarker
              key={complaint.id}
              center={[complaint.latitude, complaint.longitude]}
              radius={markerRadius}
              pathOptions={{
                color: complaint.status === 'Done' ? '#00cc00' : markerColor, // Darker green border for Done
                fillColor: markerColor,
                fillOpacity: getMarkerOpacity(complaint.status),
                weight: getMarkerWeight(complaint.status),
              }}
              eventHandlers={{
                click: () => onMarkerClick?.(complaint),
              }}
            >
              <Popup>
                <div className="max-w-xs space-y-2 text-sm text-slate-700">
                  <div className="font-semibold text-slate-900">{complaint.complaintId}</div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">{complaint.category}</div>
                  <div className="text-slate-600">
                    <strong>Status:</strong> <span className={complaint.status === 'Done' ? 'text-green-600 font-bold' : ''}>{complaint.status}</span>
                  </div>
                  <div className="text-slate-600">{complaint.address}</div>
                  <div className="text-slate-600">{complaint.description}</div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
      {filteredComplaints.length === 0 && (
        <div className="pointer-events-none absolute left-1/2 top-4 z-[500] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 text-center shadow-lg backdrop-blur">
          <p className="text-sm font-semibold text-slate-800">No report locations yet</p>
          <p className="mt-1 text-xs text-slate-500">New geotagged complaints will appear here.</p>
        </div>
      )}
    </div>
  );
};

export default GoogleMapsHeatmap;
