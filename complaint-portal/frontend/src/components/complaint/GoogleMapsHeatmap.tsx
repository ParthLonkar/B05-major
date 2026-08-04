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
    case 'Completed':
      return '#22c55e';
    case 'In Progress':
      return '#eab308';
    case 'Assigned':
      return '#3b82f6';
    case 'Pending':
    default:
      return '#ef4444';
  }
};

const getMapCenter = (complaints: Complaint[]) => {
  if (complaints.length === 0) {
    return [28.7041, 77.1025] as [number, number];
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

  if (filteredComplaints.length === 0) {
    return (
      <div className="flex h-full flex-col gap-4 overflow-y-auto bg-slate-950 p-4 text-white">
        <div className="rounded-[28px] border border-slate-700/70 bg-slate-900/70 p-4 text-sm text-slate-300">
          No complaint locations are available for the selected filters.
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden rounded-[24px]">
      <MapContainer center={center} zoom={7} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds complaints={filteredComplaints} />
        {filteredComplaints.map((complaint) => (
          <CircleMarker
            key={complaint.id}
            center={[complaint.latitude, complaint.longitude]}
            radius={8 + (complaint.severity === 'Critical' ? 4 : complaint.severity === 'High' ? 2 : 0)}
            pathOptions={{
              color: getMarkerColor(complaint.status),
              fillColor: getMarkerColor(complaint.status),
              fillOpacity: 0.8,
              weight: 2,
            }}
            eventHandlers={{
              click: () => onMarkerClick?.(complaint),
            }}
          >
            <Popup>
              <div className="max-w-xs space-y-2 text-sm text-slate-700">
                <div className="font-semibold text-slate-900">{complaint.complaintId}</div>
                <div className="text-xs uppercase tracking-wide text-slate-500">{complaint.category}</div>
                <div className="text-slate-600">{complaint.address}</div>
                <div className="text-slate-600">{complaint.description}</div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
};

export default GoogleMapsHeatmap;