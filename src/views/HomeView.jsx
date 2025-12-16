import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRecordings, deleteRecording } from '../utils/storage';
import { Plus, Clock, MapPin, Trash2, ChevronRight, Upload, HelpCircle, X, Info } from 'lucide-react';
import { format } from 'date-fns';
import { APP_VERSION } from '../utils/version';
import { importRecording } from '../utils/exportImport';

export const HomeView = () => {
    const [recordings, setRecordings] = useState([]);
    const [isImporting, setIsImporting] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const fileInputRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        loadRecordings();
    }, []);

    const loadRecordings = async () => {
        const recs = await getRecordings();
        // Sort by date desc
        setRecordings(recs.sort((a, b) => b.createdAt - a.createdAt));
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this recording?')) {
            await deleteRecording(id);
            loadRecordings();
        }
    };

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsImporting(true);
        try {
            await importRecording(file);
            await loadRecordings();
            alert('Recording imported successfully!');
        } catch (err) {
            alert('Failed to import recording. Invalid file.');
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-24 relative">
            {/* Quick Start Modal */}
            {showHelp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setShowHelp(false)}>
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 relative animate-scale-up" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setShowHelp(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                            <X size={24} />
                        </button>

                        <h2 className="text-xl font-bold mb-4 text-gray-900">How to use Sauntercast</h2>

                        <div className="space-y-4">
                            <div className="flex gap-3">
                                <div className="p-2 bg-red-100 text-brand-red rounded-lg h-fit"><Plus size={20} /></div>
                                <div>
                                    <h3 className="font-semibold text-gray-800">Record a Journey</h3>
                                    <p className="text-sm text-gray-600">Tap the big + button. Walk, talk, and add notes or photos along the way.</p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg h-fit"><MapPin size={20} /></div>
                                <div>
                                    <h3 className="font-semibold text-gray-800">Explore in 3D</h3>
                                    <p className="text-sm text-gray-600">Open a recording to see your path. Toggle "Driving Mode" to follow your route in 3D.</p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <div className="p-2 bg-green-100 text-green-600 rounded-lg h-fit"><Clock size={20} /></div>
                                <div>
                                    <h3 className="font-semibold text-gray-800">AI Transcription</h3>
                                    <p className="text-sm text-gray-600">Tap the document icon in the player to privately transcribe your audio on-device.</p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg h-fit"><Upload size={20} /></div>
                                <div>
                                    <h3 className="font-semibold text-gray-800">Share & Export</h3>
                                    <p className="text-sm text-gray-600">Export your journeys as .saunter files to share with friends or back up locally.</p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowHelp(false)}
                            className="w-full mt-6 bg-brand-red text-white py-3 rounded-xl font-semibold active:scale-95 transition-transform"
                        >
                            Got it!
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-white p-6 pt-12 border-b sticky top-0 z-10 flex justify-between items-end">
                <div>
                    <div className="flex gap-3 mb-1">
                        <button
                            onClick={() => setShowHelp(true)}
                            className="flex items-center gap-1 text-brand-red font-medium text-xs hover:underline"
                        >
                            <HelpCircle size={14} /> Quick Start
                        </button>
                        <button
                            onClick={() => navigate('/about')}
                            className="flex items-center gap-1 text-gray-500 font-medium text-xs hover:text-gray-900 transition-colors"
                        >
                            <Info size={14} /> About
                        </button>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Sauntercast</h1>
                    <p className="text-gray-500 text-sm mt-1">Your audio journeys</p>
                </div>

                <div className="flex gap-2 items-center">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImport}
                        accept=".saunter,.zip"
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isImporting}
                        className="text-brand-red flex flex-col items-center p-2 rounded-lg hover:bg-red-50 transition-colors"
                    >
                        <Upload className="w-5 h-5" />
                        <span className="text-[10px] font-medium">{isImporting ? '...' : 'Import'}</span>
                    </button>
                    <div className="text-[10px] text-gray-300 font-mono self-start ml-2">{APP_VERSION}</div>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {recordings.length === 0 ? (
                    <div className="text-center py-20 text-gray-400">
                        <p>No recordings yet.</p>
                        <p className="text-sm">Tap the + button to start one.</p>
                        <button
                            onClick={() => setShowHelp(true)}
                            className="mt-4 text-brand-red text-sm font-medium underline"
                        >
                            How does it work?
                        </button>
                    </div>
                ) : (
                    recordings.map((rec) => (
                        <div
                            key={rec.id}
                            onClick={() => navigate(`/play/${rec.id}`)}
                            className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 active:scale-[0.98] transition-transform cursor-pointer flex items-center justify-between group"
                        >
                            <div className="flex-1">
                                <h3 className="font-semibold text-gray-900 mb-1">
                                    {format(rec.createdAt, 'MMMM d, yyyy')}
                                </h3>
                                <div className="flex items-center gap-4 text-xs text-gray-500 font-medium">
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> {formatDuration(rec.duration)}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <MapPin className="w-3 h-3" /> {rec.locations.length} points
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={(e) => handleDelete(e, rec.id)}
                                    className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <ChevronRight className="w-5 h-5 text-gray-300" />
                            </div>
                        </div>
                    ))
                )}
            </div>

            <button
                onClick={() => navigate('/record')}
                className="fixed bottom-8 right-6 w-14 h-14 bg-brand-red text-white rounded-full shadow-lg shadow-red-200 flex items-center justify-center hover:scale-110 transition-transform z-20"
            >
                <Plus className="w-8 h-8" />
            </button>
        </div>
    );
};
