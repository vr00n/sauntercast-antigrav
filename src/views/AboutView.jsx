import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Footprints, Users, Mic } from 'lucide-react';
import { APP_VERSION } from '../utils/version';

export const AboutView = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <div className="sticky top-0 bg-white/90 backdrop-blur-md border-b z-10 px-4 py-4 flex items-center justify-between">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 -ml-2 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="font-semibold text-gray-900">About Sauntercast</div>
                <div className="w-10" /> {/* Spacer for balance */}
            </div>

            <div className="max-w-2xl mx-auto p-6 pb-24 space-y-8 animate-fade-in">

                {/* Hero Section */}
                <div className="text-center space-y-4 py-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-red/10 rounded-2xl mb-4">
                        <Footprints className="w-8 h-8 text-brand-red" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Reviving the <br />Shared Journey</h1>
                </div>

                <div className="prose prose-gray mx-auto">
                    <p className="text-lg leading-relaxed text-gray-700">
                        In an era where our connections are increasingly digital and fragmented, we find ourselves "bowling alone" more often than ever—connected yet isolated, scrolling rather than strolling together.
                    </p>

                    <p className="text-lg leading-relaxed text-gray-700">
                        Sauntercast was built on a simple premise: that the oldest form of human connection—<span className="font-semibold text-brand-red">walking and talking</span>—remains the most powerful. We believe that movement unlocks the mind, and that the physical world is the best backdrop for meaningful dialogue.
                    </p>

                    <div className="my-8 p-6 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col gap-4">
                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-white rounded-lg shadow-sm text-blue-500">
                                <Users size={20} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">Rebuilding Community</h3>
                                <p className="text-sm text-gray-600 mt-1">
                                    Authentic social capital isn't built in comment sections. It's built in shared spaces, through shared experiences.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-white rounded-lg shadow-sm text-brand-red">
                                <Mic size={20} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">Deep Dialogue</h3>
                                <p className="text-sm text-gray-600 mt-1">
                                    Capture thoughts with the depth they deserve. Break free from the soundbite and explore ideas fully.
                                </p>
                            </div>
                        </div>
                    </div>

                    <p className="text-lg leading-relaxed text-gray-700">
                        This app isn't just about recording audio or mapping a path. It's an invitation to step out your front door, to rebuild the community ties that strengthen us, and to share your perspective with a depth that 280 characters can never capture.
                    </p>

                    <p className="text-lg leading-relaxed text-gray-700 font-medium">
                        Don't just connect. Go outside. Walk. Talk. Build something real.
                    </p>
                </div>

                <div className="pt-12 border-t text-center space-y-2">
                    <p className="text-sm text-gray-400">Sauntercast {APP_VERSION}</p>
                    <p className="text-xs text-gray-300">Designed for the thoughtful traveler.</p>
                </div>
            </div>
        </div>
    );
};
