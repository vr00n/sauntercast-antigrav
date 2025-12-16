import React, { useEffect, useState, useRef, useMemo } from 'react';
import Map, { Source, Layer, Marker, NavigationControl } from 'react-map-gl';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MessageSquare, MapPin, Star, Flag, AlertTriangle, Navigation, Layers, Locate, Globe, Map as MapIcon } from 'lucide-react';

const MAPBOX_TOKEN = "pk.eyJ1IjoidnIwMG4tbnljc2J1cyIsImEiOiJjbDB5cHhoeHgxcmEyM2ptdXVkczk1M2xlIn0.qq6o-6TMurwke-t1eyetBw";

export const MapDisplay = ({ locations, currentLocation, annotations, onMapClick }) => {
    const mapRef = useRef(null);
    const [viewMode, setViewMode] = useState('follow'); // 'follow' | 'overhead'
    const [mapStyle, setMapStyle] = useState('streets-v12'); // 'streets-v12' | 'satellite-streets-v12'
    const [isAutoCentering, setIsAutoCentering] = useState(true);

    const [viewState, setViewState] = useState(() => {
        // Initialize with first location if available to avoid "jump" from NYC
        if (locations && locations.length > 0) {
            return {
                latitude: locations[0].lat,
                longitude: locations[0].lng,
                zoom: 17, // Start zoomed in for follow mode
                pitch: 60, // Start angled for follow mode
                bearing: 0
            };
        }
        return {
            latitude: 40.785091,
            longitude: -73.968285,
            zoom: 15,
            pitch: 0,
            bearing: 0
        };
    });

    // Calculate heading based on last two points
    const heading = useMemo(() => {
        if (locations.length < 2) return 0;
        const last = locations[locations.length - 1];
        const prev = locations[locations.length - 2];

        // Simple bearing calculation
        const y = Math.sin(last.lng - prev.lng) * Math.cos(last.lat);
        const x = Math.cos(prev.lat) * Math.sin(last.lat) -
            Math.sin(prev.lat) * Math.cos(last.lat) * Math.cos(last.lng - prev.lng);
        const theta = Math.atan2(y, x);
        return (theta * 180 / Math.PI + 360) % 360; // Degrees
    }, [locations]);

    // Update view state when current location changes
    useEffect(() => {
        if (currentLocation && isAutoCentering) {
            setViewState(prev => ({
                ...prev,
                latitude: currentLocation.lat,
                longitude: currentLocation.lng,
                zoom: viewMode === 'follow' ? 17 : 15,
                pitch: viewMode === 'follow' ? 60 : 0,
                bearing: viewMode === 'follow' ? heading : 0,
                transitionDuration: 1000
            }));
        }
    }, [currentLocation, viewMode, heading, isAutoCentering]);

    // Handle view mode changes
    useEffect(() => {
        // When switching modes, force auto-centering
        setIsAutoCentering(true);
    }, [viewMode]);

    // Path GeoJSON with line metrics for gradient
    const geojson = useMemo(() => ({
        type: 'Feature',
        properties: {},
        geometry: {
            type: 'LineString',
            coordinates: locations.map(l => [l.lng, l.lat])
        }
    }), [locations]);

    const handleMapClick = (e) => {
        if (onMapClick) {
            onMapClick({ lat: e.lngLat.lat, lng: e.lngLat.lng });
        }
    };

    const handleRecenter = () => {
        setIsAutoCentering(true);
        if (currentLocation) {
            setViewState(prev => ({
                ...prev,
                latitude: currentLocation.lat,
                longitude: currentLocation.lng,
                zoom: viewMode === 'follow' ? 17 : 15,
                pitch: viewMode === 'follow' ? 60 : 0,
                bearing: viewMode === 'follow' ? heading : 0,
                transitionDuration: 1000
            }));
        }
    };

    const toggleMapStyle = () => {
        setMapStyle(prev => prev === 'streets-v12' ? 'satellite-streets-v12' : 'streets-v12');
    };

    return (
        <div className="relative h-full w-full">
            <Map
                {...viewState}
                onMove={evt => {
                    setViewState(evt.viewState);
                    // If the user interacts (drags, etc), disable auto-centering
                    if (evt.originalEvent) {
                        setIsAutoCentering(false);
                    }
                }}
                ref={mapRef}
                style={{ width: '100%', height: '100%' }}
                mapStyle={`mapbox://styles/mapbox/${mapStyle}`}
                mapboxAccessToken={MAPBOX_TOKEN}
                onClick={handleMapClick}
                terrain={{ source: 'mapbox-dem', exaggeration: 1.5 }}
            >
                {/* 3D Terrain Source */}
                <Source
                    id="mapbox-dem"
                    type="raster-dem"
                    url="mapbox://mapbox.mapbox-terrain-dem-v1"
                    tileSize={512}
                    maxzoom={14}
                />

                {/* Path Line with Gradient */}
                {/* Note: line-gradient requires source 'lineMetrics: true' which is enabled by default in react-map-gl for GeoJSON if data is a Feature? No, we must specify in Source component */}
                <Source id="path-data" type="geojson" data={geojson} lineMetrics={true}>
                    <Layer
                        id="path-layer"
                        type="line"
                        layout={{
                            'line-join': 'round',
                            'line-cap': 'round'
                        }}
                        paint={{
                            'line-width': 6,
                            'line-gradient': [
                                'interpolate',
                                ['linear'],
                                ['line-progress'],
                                0, '#22c55e', // Green at start
                                0.5, '#eab308', // Yellow middle
                                1, '#ef4444' // Red at end (current)
                            ],
                            'line-opacity': 0.9
                        }}
                    />
                </Source>

                {/* User Location Marker */}
                {currentLocation && (
                    <Marker
                        longitude={currentLocation.lng}
                        latitude={currentLocation.lat}
                        anchor="center"
                    >
                        <div className="relative flex items-center justify-center w-8 h-8">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500 border-2 border-white shadow-sm"></span>
                        </div>
                    </Marker>
                )}

                {/* Annotations */}
                {annotations?.map(ann => ann.location && (
                    <Marker
                        key={ann.id}
                        longitude={ann.location.lng}
                        latitude={ann.location.lat}
                        anchor="bottom"
                        onClick={(e) => {
                            e.originalEvent.stopPropagation();
                            // Optional: Show popup here
                        }}
                    >
                        <div className="flex flex-col items-center group cursor-pointer hover:scale-110 transition-transform">
                            <div className="bg-white/90 backdrop-blur px-2 py-1 rounded-md shadow text-xs font-semibold mb-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                {ann.text || ann.type}
                            </div>
                            <div className="text-brand-red bg-white p-1 rounded-full shadow-md">
                                {ann.type === 'comment' && <MessageSquare size={16} fill="currentColor" className="text-brand-red" />}
                                {ann.type === 'star' && <Star size={16} fill="currentColor" className="text-yellow-500" />}
                                {ann.type === 'flag' && <Flag size={16} fill="currentColor" className="text-orange-500" />}
                                {ann.type === 'alert' && <AlertTriangle size={16} fill="currentColor" className="text-brand-red" />}
                                {ann.type === 'map-pin' && <MapPin size={16} fill="currentColor" className="text-brand-red" />}
                                {ann.type === 'icon' && <MapPin size={16} fill="currentColor" className="text-brand-red" />}
                            </div>
                        </div>
                    </Marker>
                ))}

                <NavigationControl position="bottom-left" />
            </Map>

            {/* View Controls */}
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">

                {/* Map Style Toggle */}
                <button
                    onClick={toggleMapStyle}
                    className="p-3 bg-white rounded-xl shadow-lg border border-gray-100 hover:bg-gray-50 active:scale-95 transition-all text-gray-700"
                    title="Toggle Satellite"
                >
                    <div className="flex flex-col items-center">
                        {mapStyle === 'streets-v12' ? (
                            <Globe className="w-6 h-6 text-green-600" />
                        ) : (
                            <MapIcon className="w-6 h-6 text-gray-600" />
                        )}
                        <span className="text-[10px] font-bold mt-1">
                            {mapStyle === 'streets-v12' ? 'Sat' : 'Map'}
                        </span>
                    </div>
                </button>

                <button
                    onClick={() => setViewMode(prev => prev === 'follow' ? 'overhead' : 'follow')}
                    className="p-3 bg-white rounded-xl shadow-lg border border-gray-100 hover:bg-gray-50 active:scale-95 transition-all text-gray-700"
                >
                    {viewMode === 'follow' ? (
                        <div className="flex flex-col items-center">
                            <Navigation className="w-6 h-6 fill-current text-blue-500 rotate-45" />
                            <span className="text-[10px] font-bold mt-1">Driving</span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center">
                            <Layers className="w-6 h-6 text-gray-600" />
                            <span className="text-[10px] font-bold mt-1">Free</span>
                        </div>
                    )}
                </button>

                {/* Recenter Button - Only show if we are NOT auto-centering */}
                {!isAutoCentering && (
                    <button
                        onClick={handleRecenter}
                        className="p-3 bg-white rounded-xl shadow-lg border border-gray-100 hover:bg-gray-50 active:scale-95 transition-all text-blue-500 animate-slide-up"
                    >
                        <div className="flex flex-col items-center">
                            <Locate className="w-6 h-6" />
                            <span className="text-[10px] font-bold mt-1">Center</span>
                        </div>
                    </button>
                )}
            </div>
        </div>
    );
};
