import React, { useMemo } from 'react';

export const StatsDisplay = ({ recording, currentLocation, currentTime, isLive = false }) => {
    // Basic stats calculation
    // Speed: m/s -> km/h
    const speed = currentLocation?.speed ? (currentLocation.speed * 3.6).toFixed(1) : 0;
    const altitude = currentLocation?.altitude ? currentLocation.altitude.toFixed(1) : '-';
    const accuracy = currentLocation?.accuracy ? Math.round(currentLocation.accuracy) : '-';

    // Total distance calculation (approximate)
    // If live, we calculate it from the locations array direct
    // If playback, we pre-calculate efficiently

    const calculateDistance = (locs) => {
        if (!locs || locs.length < 2) return 0;
        let dist = 0;
        for (let i = 1; i < locs.length; i++) {
            const lat1 = locs[i - 1].lat;
            const lon1 = locs[i - 1].lng;
            const lat2 = locs[i].lat;
            const lon2 = locs[i].lng;
            const R = 6371e3; // metres
            const φ1 = lat1 * Math.PI / 180;
            const φ2 = lat2 * Math.PI / 180;
            const Δφ = (lat2 - lat1) * Math.PI / 180;
            const Δλ = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            dist += R * c;
        }
        return (dist / 1000).toFixed(2); // km
    };

    // Calculate distance differently based on live vs playback context
    const totalDist = useMemo(() => {
        if (isLive) {
            // For live, we might want to just calculate it on the fly or just assume the array updates trigger this
            // It might be expensive for 1000s of points, but for now let's try it
            return calculateDistance(recording?.locations || []);
        } else {
            // For playback, recording.locations is static
            return calculateDistance(recording?.locations || []);
        }
    }, [recording?.locations, isLive]);

    return (
        <div className="absolute top-16 left-4 bg-black/80 backdrop-blur-md text-white p-3 rounded-xl shadow-lg z-10 text-xs font-mono space-y-1 animate-slide-right max-w-[150px] pointer-events-none">
            <div className="font-bold border-b border-gray-600 pb-1 mb-1 text-gray-400">NERD STATS</div>
            <div className="flex justify-between gap-4">
                <span className="text-gray-400">Speed:</span>
                <span>{speed} km/h</span>
            </div>
            <div className="flex justify-between gap-4">
                <span className="text-gray-400">Acc:</span>
                <span>±{accuracy} m</span>
            </div>
            <div className="flex justify-between gap-4">
                <span className="text-gray-400">Alt:</span>
                <span>{altitude} m</span>
            </div>
            <div className="flex justify-between gap-4">
                <span className="text-gray-400">Dist:</span>
                <span>{totalDist} km</span>
            </div>
            <div className="flex justify-between gap-4">
                <span className="text-gray-400">Pts:</span>
                <span>{recording?.locations?.length || 0}</span>
            </div>
            {recording?.id && (
                <div className="flex justify-between gap-4">
                    <span className="text-gray-400">ID:</span>
                    <span className="truncate w-12">{recording.id.slice(0, 6)}</span>
                </div>
            )}
        </div>
    );
};
