import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import { MessageSquare, MapPin, Star, Flag, AlertTriangle } from 'lucide-react';

// Custom Icons
const createIcon = (type) => {
    const iconMarkup = renderToStaticMarkup(
        <div className="text-brand-red">
            {type === 'comment' && <MessageSquare size={20} fill="currentColor" className="text-brand-red" />}
            {type === 'star' && <Star size={20} fill="currentColor" className="text-yellow-500" />}
            {type === 'flag' && <Flag size={20} fill="currentColor" className="text-orange-500" />}
            {type === 'alert' && <AlertTriangle size={20} fill="currentColor" className="text-brand-red" />}
            {(!['comment', 'star', 'flag', 'alert'].includes(type)) && <MapPin size={20} fill="currentColor" className="text-brand-red" />}
        </div>
    );

    return L.divIcon({
        html: `<div class="annotation-marker w-8 h-8">${iconMarkup}</div>`,
        className: '', // Remove default class
        iconSize: [32, 32],
        iconAnchor: [16, 32], // Bottom center
        popupAnchor: [0, -32]
    });
};

const userIcon = L.divIcon({
    html: `
    <div class="user-marker">
      <div class="user-marker-pulse"></div>
      <div class="user-marker-dot"></div>
    </div>
  `,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16] // Center
});

const RecenterMap = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.setView(center);
        }
    }, [center, map]);
    return null;
};

const MapEvents = ({ onClick }) => {
    useMapEvents({
        click(e) {
            if (onClick) onClick(e.latlng);
        },
    });
    return null;
};

export const MapDisplay = ({ locations, currentLocation, annotations, onMapClick, center }) => {
    const path = locations.map(l => [l.lat, l.lng]);
    const mapCenter = center || (currentLocation ? [currentLocation.lat, currentLocation.lng] : [40.785091, -73.968285]);

    return (
        <MapContainer
            center={mapCenter}
            zoom={15}
            className="h-full w-full z-0"
            zoomControl={false}
        >
            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />

            {/* The full path */}
            <Polyline positions={path} color="#FF3B30" weight={4} />

            {/* Current position marker */}
            {currentLocation && (
                <Marker position={[currentLocation.lat, currentLocation.lng]} icon={userIcon} />
            )}

            {/* Annotations */}
            {annotations?.map((ann) => (
                ann.location && (
                    <Marker
                        key={ann.id}
                        position={[ann.location.lat, ann.location.lng]}
                        icon={createIcon(ann.type)}
                    >
                        <Popup>{ann.text || ann.type}</Popup>
                    </Marker>
                )
            ))}

            <RecenterMap center={currentLocation ? [currentLocation.lat, currentLocation.lng] : null} />
            <MapEvents onClick={onMapClick} />
        </MapContainer>
    );
};
