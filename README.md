# Sauntercast Antigrav 🚶🎙️

Sauntercast is a location-aware audio recording application that allows users to capture their walks ("saunters") with synchronized audio, GPS paths, and multimedia annotations. It is designed to run entirely in the browser, leveraging modern Web APIs for a seamless, secure, and offline-capable experience.

## 🌟 Key Features

### 🎙️ Recording
- **Location-Aware Audio**: Records microphone input while tracking GPS coordinates in real-time.
- **Smart Pause**: Pause and resume recordings without losing synchronization between audio and location.
- **Smart Clustering**: Automatically filters and clusters GPS points when stationary to prevent map clutter.
- **Annotations**: Add text notes and **photos** 📸 to specific moments in your journey.

### 🎧 Playback
- **Interactive Map**: Watch your path retrace itself on a 3D map as the audio plays.
- ** synchronized scrubbing**: Jumping to a point in the audio instantly moves the map to that location, and clicking the map jumps the audio to that moment.
- **Annotation Markers**: View your notes and photos on the map.

### 🚀 Publishing & Sharing
- **GitHub Integration**: Publish your saunters directly to a GitHub repository (gh-pages) as a static JSON file.
- **Audio Upload**: Audio is converted to Base64 and stored within the JSON, ensuring a single-file portable format.
- **Security**: 
    - **Client-Side Encryption**: Option to password-protect your saunters using AES-256-GCM.
    - **Token Safety**: GitHub Tokens are stored locally in the browser (`localStorage`) and never exposed in the code.

### 💾 Export/Import
- **Portable Format**: Export saunters as `.saunter` (ZIP) files containing the audio, metadata, and images.
- **Offline Capable**: The app works offline, allowing you to record and save saunters locally (IndexedDB) before syncing or exporting.

---

## 🛠️ Tech Stack

- **Framework**: React + Vite
- **Styling**: Tailwind CSS + Lucide React (Icons)
- **Maps**: React Map GL (Mapbox)
- **State/Storage**: IndexedDB (LocalForage), LocalStorage
- **APIs**: Web Audio API, Geolocation API, GitHub API

---

## 🤖 Replication Prompt

To recreate this project using an AI coding assistant, use the following prompt:

```markdown
Build a React-based web application called "Sauntercast" for recording and sharing location-aware audio walks.

### Core Architecture:
1.  **Framework**: Use Vite + React.
2.  **Styling**: Tailwind CSS for UI, Lucide React for icons.
3.  **Map**: Use `react-map-gl` (Mapbox) for visualizing paths.

### Feature Requirements:

**1. Recorder View:**
*   **Audio & GPS**: Start recording microphone input and GPS location simultaneously.
*   **Sync**: Store an array of location points `{lat, lng, timestamp}`.
*   **Pause/Resume**: Allow pausing the recording. Ensure the final playback skips the paused duration so audio and map remain synced.
*   **Smart GPS Filter**: If the user is stationary (accuracy > 20m and movement < 10m), do not add new points to avoid "GPS jitter/bird's nest" on the map.
*   **Annotations**: Allow users to add "Notes" during recording. 
    *   Support Text input.
    *   Support **Image Upload** (store as base64/dataURL).
    *   Save annotation with the current timestamp and location.
*   **Live Map**: Show the current path being drawn on the map in real-time `(line-gradient: green -> red)`.

**2. Storage & Data Model:**
*   Use `localforage` or IndexedDB to save recordings locally.
*   Data Structure:
    ```json
    {
      "id": "uuid",
      "startTime": 123456789,
      "duration": 120, // seconds
      "audioBlob": Blob,
      "locations": [{ "lat": 40.7, "lng": -74.0, "timestamp": 0 }, ...],
      "annotations": [{ "id": "...", "timestamp": 5000, "text": "...", "image": "data:image/...", "location": {...} }]
    }
    ```

**3. Player View:**
*   Load a recording by ID.
*   **Playback**: Play the audio. Update a marker on the map to show the location corresponding to the current audio time.
*   **Scrubbing**: 
    *   Slider controls audio time.
    *   Clicking the map finds the closest location point and jumps the audio to that timestamp.
*   **Visuals**: Display the full path. Show markers for annotations. Hovering/Clicking an annotation marker should show the text/photo.
*   **Transcript (Optional)**: Use an OpenAI Whisper washer or similar to transcribe audio.

**4. Publishing (GitHub Pages):**
*   Allow users to "Publish" a recording.
*   **Auth**: Ask user for a GitHub Personal Access Token (store in `localStorage`, never commit it).
*   **Mechanism**: 
    *   Convert `audioBlob` to Base64 string.
    *   Create a JSON file `saunters/{id}.json` in a specific GitHub repo.
    *   Update an `index.json` list.
*   **Security**: Provide an option to "Password Protect". Use `crypto.subtle` (AES-GCM) to encrypt the JSON content before uploading if a password is set.

**5. Import/Export:**
*   **Export**: Generate a ZIP file (`.saunter`) containing `metadata.json` and `audio.webm`.
*   **Import**: specific Parse `.saunter` files and restore them to local storage.

### UI Guidelines:
*   Make it mobile-responsive (it's for walking!).
*   Use a clean, "Island" style floating UI for controls.
*   Use meaningful micro-animations.
```

---

## 📦 Installation & Setup

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/vr00n/sauntercast-antigrav.git
    cd sauntercast-antigrav
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Run locally**:
    ```bash
    npm run dev
    ```

4.  **Build & Deploy**:
    ```bash
    npm run build
    npm run deploy
    ```

> **Note**: For maps to work, you need to provide a Mapbox Access Token in `src/components/MapDisplay.jsx` or via `.env`.

---

*Verified on macOS, Chrome/Safari. v0.2.0-beta.*
