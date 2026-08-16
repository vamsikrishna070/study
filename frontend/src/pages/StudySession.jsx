import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Play, Square, Mic, MicOff, Pause, Save, CheckCircle } from 'lucide-react';
import apiClient from '../services/apiClient.js';
import Shell from '../components/Shell.jsx';
import { PageHeading, Button, cx } from '../components/shared.jsx';

export default function StudySession() {
  const [searchParams] = useSearchParams();
  const subjectId = searchParams.get('subject');
  const topicId = searchParams.get('topic');
  const navigate = useNavigate();

  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [time, setTime] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState('');
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  const audioChunks = useRef([]);
  const audioBlobRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isActive && !isPaused) {
      timerRef.current = setInterval(() => {
        setTime(time => time + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isActive, isPaused]);

  const handleStart = () => {
    setIsActive(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
  };

  const handleEnd = async () => {
    setIsActive(false);
    clearInterval(timerRef.current);
    
    if (isRecording) {
      stopRecording();
    }

    try {
      await apiClient.post('/study-sessions', {
        subject: subjectId,
        topic: topicId,
        startedAt: new Date(Date.now() - time * 1000).toISOString(),
        durationMinutes: Math.ceil(time / 60)
      });
      alert('Session saved!');
      navigate('/');
    } catch (error) {
      console.error('Failed to save session');
    }
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs > 0 ? hrs + ':' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => audioChunks.current.push(e.data);
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        audioBlobRef.current = audioBlob;
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
        audioChunks.current = [];
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      alert('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
  };

  const handleSaveAudio = async () => {
    if (!audioBlobRef.current) return;
    setUploading(true);
    try {
      const file = new File([audioBlobRef.current], `voice-memo-${Date.now()}.webm`, { type: 'audio/webm' });
      const { uploadFile } = await import('../services/apiHooks.js');
      const data = await uploadFile(file);
      
      await apiClient.post('/recordings', {
        title: `Voice Memo - ${new Date().toLocaleTimeString()}`,
        audioUrl: data.url,
        subjectId: subjectId || null,
        topic: topicId || ''
      });
      alert('Voice memo saved successfully!');
      setAudioURL('');
      audioBlobRef.current = null;
    } catch (err) {
      alert('Failed to save voice memo.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Shell>
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <div className="w-full max-w-md rounded-[2.5rem] bg-card p-10 text-center shadow-2xl border border-card-border relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent to-primary"></div>
          
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-8">Focus Session</h2>
          
          <div className="font-display text-[5rem] leading-none mb-10 tracking-tighter tabular-nums">
            {formatTime(time)}
          </div>

          <div className="flex items-center justify-center gap-4 mb-8">
            {!isActive ? (
              <Button onClick={handleStart} className="rounded-full w-16 h-16 shadow-lg bg-accent text-accent-foreground hover:bg-accent/90">
                <Play fill="currentColor" size={24}/>
              </Button>
            ) : (
              <>
                <Button onClick={handlePause} variant="quiet" className="rounded-full w-14 h-14 bg-secondary">
                  {isPaused ? <Play fill="currentColor" size={20}/> : <Pause fill="currentColor" size={20}/>}
                </Button>
                <Button onClick={handleEnd} className="rounded-full w-16 h-16 shadow-lg bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  <Square fill="currentColor" size={20}/>
                </Button>
              </>
            )}
          </div>

          <div className="border-t border-border pt-6 mt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Voice Memo</span>
              <button 
                onClick={isRecording ? stopRecording : startRecording}
                className={cx('flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold transition-colors', isRecording ? 'bg-destructive/15 text-destructive' : 'bg-secondary text-secondary-foreground')}
              >
                {isRecording ? <><MicOff size={14}/> Stop Recording</> : <><Mic size={14}/> Record Thoughts</>}
              </button>
            </div>
            
            {audioURL && (
              <div className="mt-4 flex items-center justify-between bg-background p-3 rounded-xl border border-border">
                <audio src={audioURL} controls className="h-8 max-w-[200px]" />
                <Button variant="quiet" onClick={handleSaveAudio} disabled={uploading} className="h-8 px-3 text-xs"><Save size={14} className="mr-1"/> {uploading ? '...' : 'Save'}</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
