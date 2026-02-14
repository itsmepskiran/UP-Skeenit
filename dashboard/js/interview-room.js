import { supabase } from '@shared/js/supabase-config.js';
import { backendGet, backendPost, handleResponse } from '@shared/js/backend-client.js';
import { CONFIG } from '@shared/js/config.js';

const isLocal = CONFIG.IS_LOCAL;
const authBase = isLocal ? '../../auth' : 'https://auth.skreenit.com';
const logoImg = document.getElementById('logoImg');
if(logoImg) logoImg.src = `${authBase}/assets/images/logo.png`;

// State
let questions = [];
let currentIndex = 0;
let mediaRecorder;
let recordedChunks = [];
let stream;
let applicationId;
let isRecording = false;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Auth Check
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { window.location.href = CONFIG.PAGES.LOGIN; return; }

    // 2. Get App ID
    const urlParams = new URLSearchParams(window.location.search);
    applicationId = urlParams.get('application_id');
    if(!applicationId) { alert("Invalid Interview Link"); window.location.href = 'candidate-dashboard.html'; return; }

    // 3. Init
    await loadInterviewData(applicationId);
    await initCamera();
    setupControls();
});

// --- LOAD DATA ---
async function loadInterviewData(appId) {
    try {
        // We need a specific endpoint for candidates to get their OWN app details
        // For now, let's assume we create: GET /candidate/applications/{id}/interview
        const res = await backendGet(`/candidate/applications/${appId}/interview`);
        const data = await handleResponse(res);
        
        questions = data.interview_questions || [];
        
        if(questions.length === 0) {
            alert("No questions found for this interview.");
            window.location.href = 'candidate-dashboard.html';
            return;
        }

        renderQuestion();
    } catch (err) {
        console.error("Load failed", err);
        alert("Failed to load interview. " + err.message);
    }
}

// --- UI LOGIC ---
function renderQuestion() {
    document.getElementById('loadingQuestions').style.display = 'none';
    document.getElementById('questionContent').style.display = 'flex';
    
    // Update Text
    document.getElementById('currentQNum').textContent = currentIndex + 1;
    document.getElementById('totalQNum').textContent = questions.length;
    document.getElementById('questionText').textContent = questions[currentIndex];

    // Update Dots
    const dotsContainer = document.getElementById('stepDots');
    dotsContainer.innerHTML = questions.map((_, i) => `
        <div class="step-dot ${i === currentIndex ? 'active' : ''} ${i < currentIndex ? 'completed' : ''}"></div>
    `).join('');

    // Reset Video UI
    document.getElementById('cameraFeed').style.display = 'block';
    document.getElementById('playbackFeed').style.display = 'none';
    document.getElementById('recordingControls').style.display = 'flex';
    document.getElementById('reviewControls').style.display = 'none';
}

// --- CAMERA LOGIC ---
async function initCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const video = document.getElementById('cameraFeed');
        video.srcObject = stream;
    } catch (err) {
        alert("Camera access denied. Please allow camera access to continue.");
    }
}

function setupControls() {
    const recordBtn = document.getElementById('recordBtn');
    const retakeBtn = document.getElementById('retakeBtn');
    const submitBtn = document.getElementById('submitAnswerBtn');

    recordBtn.addEventListener('click', toggleRecording);
    retakeBtn.addEventListener('click', retakeVideo);
    submitBtn.addEventListener('click', uploadAnswer);
    document.getElementById('exitBtn').addEventListener('click', () => window.location.href = 'candidate-dashboard.html');
}

function toggleRecording() {
    if (!isRecording) {
        startRecording();
    } else {
        stopRecording();
    }
}

function startRecording() {
    recordedChunks = [];
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const videoURL = URL.createObjectURL(blob);
        
        // Show Playback
        const playback = document.getElementById('playbackFeed');
        playback.src = videoURL;
        playback.style.display = 'block';
        document.getElementById('cameraFeed').style.display = 'none';

        // Switch Controls
        document.getElementById('recordingControls').style.display = 'none';
        document.getElementById('reviewControls').style.display = 'flex';
    };

    mediaRecorder.start();
    isRecording = true;
    document.getElementById('recordBtn').classList.add('recording');
}

function stopRecording() {
    mediaRecorder.stop();
    isRecording = false;
    document.getElementById('recordBtn').classList.remove('recording');
}

function retakeVideo() {
    // Reset UI to Camera view
    document.getElementById('playbackFeed').style.display = 'none';
    document.getElementById('cameraFeed').style.display = 'block';
    document.getElementById('reviewControls').style.display = 'none';
    document.getElementById('recordingControls').style.display = 'flex';
}

// --- UPLOAD LOGIC ---
async function uploadAnswer() {
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const fileName = `${applicationId}/${currentIndex}_${Date.now()}.webm`;
    
    // Show Progress
    document.getElementById('uploadProgress').style.display = 'block';
    document.getElementById('reviewControls').style.display = 'none';

    try {
        // 1. Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from('video-responses')
            .upload(fileName, blob);

        if (error) throw error;

        // 2. Save Metadata to DB
        // We send the path to the backend, backend appends it to the JSON array
        await backendPost(`/candidate/applications/${applicationId}/response`, {
            question: questions[currentIndex],
            video_path: data.path
        });

        // 3. Move to Next
        currentIndex++;
        document.getElementById('uploadProgress').style.display = 'none';

        if (currentIndex < questions.length) {
            renderQuestion();
            retakeVideo(); // Reset camera UI
        } else {
            finishInterview();
        }

    } catch (err) {
        console.error("Upload failed", err);
        alert("Upload failed: " + err.message);
        document.getElementById('uploadProgress').style.display = 'none';
        document.getElementById('reviewControls').style.display = 'flex';
    }
}

function finishInterview() {
    document.getElementById('questionContent').style.display = 'none';
    document.getElementById('completionContent').style.display = 'block';
    
    // Stop Camera
    stream.getTracks().forEach(track => track.stop());
}