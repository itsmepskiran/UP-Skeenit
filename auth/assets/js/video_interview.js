// video_interview.js
import { supabase } from './supabase-config.js';
import { backendFetch } from './backend-client.js';

let currentUser = null;
let mediaStream = null;
let recorder = null;
let chunks = [];
let questions = [];
let currentIndex = 0;

/* -------------------------------------------------------
   AUTH CHECK
------------------------------------------------------- */
async function checkAuth() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    window.location.href = 'https://login.skreenit.com/login.html';
    throw new Error('Not authenticated');
  }

  if (data.user.user_metadata?.role !== 'candidate') {
    window.location.href = 'https://login.skreenit.com/login.html';
    throw new Error('Wrong role');
  }

  currentUser = data.user;

  // Persist token for backend
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (token) localStorage.setItem('skreenit_token', token);

  return currentUser;
}

/* -------------------------------------------------------
   LOAD QUESTIONS (OPTIONAL)
------------------------------------------------------- */
async function loadQuestions() {
  const token = localStorage.getItem('skreenit_token');

  try {
    const res = await backendFetch('/candidate/questions', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) return [];

    const data = await res.json();
    return data.questions || [];
  } catch {
    return [];
  }
}

/* -------------------------------------------------------
   UI HELPERS
------------------------------------------------------- */
function qs(sel) {
  return document.querySelector(sel);
}

function updateUI() {
  const qText = qs('#questionText');
  const nextBtn = qs('#nextBtn');
  const prevBtn = qs('#prevBtn');

  if (!questions.length) {
    qText.textContent = 'General Video Interview';
    prevBtn.style.display = 'none';
    nextBtn.style.display = 'none';
    return;
  }

  qText.textContent = `Q${currentIndex + 1}: ${questions[currentIndex].text}`;
  prevBtn.style.display = currentIndex === 0 ? 'none' : 'inline-block';
  nextBtn.style.display = currentIndex === questions.length - 1 ? 'none' : 'inline-block';
}

/* -------------------------------------------------------
   RECORDING LOGIC
------------------------------------------------------- */
async function startRecording() {
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

    const videoEl = qs('#preview');
    videoEl.srcObject = mediaStream;
    videoEl.muted = true;
    videoEl.play();

    recorder = new MediaRecorder(mediaStream, { mimeType: 'video/webm' });
    chunks = [];

    recorder.ondataavailable = (e) => {
      if (e.data?.size) chunks.push(e.data);
    };

    recorder.start();

    qs('#startBtn').disabled = true;
    qs('#stopBtn').disabled = false;
    qs('#uploadBtn').disabled = true;

  } catch (err) {
    alert('Could not access camera/microphone');
  }
}

function stopRecording() {
  try {
    recorder?.stop();
    mediaStream?.getTracks().forEach(t => t.stop());
  } catch {}

  const blob = new Blob(chunks, { type: 'video/webm' });
  const videoEl = qs('#preview');
  videoEl.srcObject = null;
  videoEl.src = URL.createObjectURL(blob);

  qs('#startBtn').disabled = false;
  qs('#stopBtn').disabled = true;
  qs('#uploadBtn').disabled = false;

  return blob;
}

/* -------------------------------------------------------
   UPLOAD LOGIC
------------------------------------------------------- */
async function uploadVideo(blob) {
  const token = localStorage.getItem('skreenit_token');
  const fd = new FormData();

  fd.append('candidate_id', currentUser.id);

  if (questions.length) {
    const q = questions[currentIndex];
    fd.append('question_id', q.id);
    fd.append('video', blob, `response-${q.id}.webm`);

    var endpoint = '/video/response';
  } else {
    fd.append('video', blob);
    var endpoint = '/video/general';
  }

  try {
    const res = await backendFetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd
    });

    if (!res.ok) throw new Error('Upload failed');

    alert('Video uploaded successfully!');
  } catch (err) {
    alert('Failed to upload video');
  }
}

/* -------------------------------------------------------
   NAVIGATION
------------------------------------------------------- */
function nextQuestion() {
  if (currentIndex < questions.length - 1) {
    currentIndex++;
    updateUI();
  }
}

function prevQuestion() {
  if (currentIndex > 0) {
    currentIndex--;
    updateUI();
  }
}

/* -------------------------------------------------------
   INIT
------------------------------------------------------- */
async function init() {
  await checkAuth();

  questions = await loadQuestions();
  updateUI();

  // Bind buttons
  qs('#startBtn').addEventListener('click', startRecording);
  qs('#stopBtn').addEventListener('click', () => {
    const blob = stopRecording();
    qs('#uploadBtn').onclick = () => uploadVideo(blob);
  });

  qs('#nextBtn').addEventListener('click', nextQuestion);
  qs('#prevBtn').addEventListener('click', prevQuestion);
}

document.addEventListener('DOMContentLoaded', init);
