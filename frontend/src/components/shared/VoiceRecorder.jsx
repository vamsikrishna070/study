import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Trash2, Check, RefreshCw } from 'lucide-react';
import { cx, Button } from '../shared.jsx';

export default function VoiceRecorder({ onSave, onCancel }) {
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [duration, setDuration] = useState(0);
  const [title, setTitle] = useState('Voice Note');
  const [permissionError, setPermissionError] = useState('');
  
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const startRecording = async () => {
    try {
      setPermissionError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const type = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        chunksRef.current = [];
        stream.getTracks().forEach(track => track.stop());
      };

      chunksRef.current = [];
      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
      
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
      
    } catch (err) {
      setPermissionError('Microphone access denied or not available.');
      console.error(err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (paused) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPaused(!paused);
  };

  const reset = () => {
    setAudioUrl(null);
    setAudioBlob(null);
    setDuration(0);
    setPaused(false);
    clearInterval(timerRef.current);
  };

  const handleSave = () => {
    if (audioBlob) {
      // Create a JS File object from the blob so it can be uploaded easily
      const file = new File([audioBlob], `${title.replace(/\s+/g, '_')}.webm`, { type: audioBlob.type });
      onSave({ file, title, duration, type: 'recording' });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/20 p-6 text-center">
      {permissionError && <p className="mb-4 text-sm text-destructive">{permissionError}</p>}
      
      {!audioUrl && !recording && (
        <div className="flex flex-col items-center space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Mic size={32} />
          </div>
          <p className="text-sm font-medium">Record a voice note</p>
          <div className="flex gap-3">
            <Button variant="quiet" onClick={onCancel}>Cancel</Button>
            <Button onClick={startRecording} className="gap-2">
              <Mic size={16} /> Start Recording
            </Button>
          </div>
        </div>
      )}

      {recording && (
        <div className="flex flex-col items-center space-y-4">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive/30 opacity-75"></span>
            <Mic size={32} />
          </div>
          <p className="font-mono text-2xl font-bold tracking-widest text-destructive">{formatTime(duration)}</p>
          <Button variant="danger" onClick={stopRecording} className="gap-2">
            <Square size={16} fill="currentColor" /> Stop Recording
          </Button>
        </div>
      )}

      {audioUrl && (
        <div className="flex w-full flex-col space-y-5">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-center font-bold focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Enter recording title"
          />
          
          <div className="flex items-center justify-between rounded-full border border-border bg-card px-4 py-3">
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => setPaused(false)}
              className="hidden"
            />
            <button onClick={togglePlayback} className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20">
              {paused ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
            </button>
            <div className="flex-1 px-4">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary transition-all duration-300" style={{ width: paused ? '50%' : '0%' }}></div>
              </div>
            </div>
            <span className="font-mono text-sm">{formatTime(duration)}</span>
          </div>

          <div className="flex justify-center gap-3">
            <Button variant="quiet" onClick={reset} className="gap-2 text-muted-foreground">
              <RefreshCw size={16} /> Retake
            </Button>
            <Button onClick={handleSave} className="gap-2">
              <Check size={16} /> Attach
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
