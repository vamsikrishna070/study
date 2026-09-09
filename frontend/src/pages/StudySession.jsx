import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, useParams, Link } from 'react-router-dom';
import {
  Play,
  Square,
  Mic,
  MicOff,
  Pause,
  Save,
  CheckCircle2,
  Clock,
  BookOpen,
  History,
  Target,
  FileText,
  Smile,
  Meh,
  Frown,
  ArrowLeft,
  Calendar,
} from 'lucide-react';
import apiClient from '../services/apiClient.js';
import { uploadFile } from '../services/apiHooks.js';
import Shell from '../components/Shell.jsx';
import { PageHeading, Button, LoadingBlock, QueryState, cx } from '../components/shared.jsx';

export default function StudySession() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const subjectId = searchParams.get('subject');
  const topicId = searchParams.get('topic');
  const navigate = useNavigate();

  // Active timer state
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [time, setTime] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState('');
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [savingSession, setSavingSession] = useState(false);

  // Detail view state for when session ID is present
  const [sessionDetail, setSessionDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(Boolean(id));
  const [detailError, setDetailError] = useState(null);

  const audioChunks = useRef([]);
  const audioBlobRef = useRef(null);
  const timerRef = useRef(null);

  // Fetch session details when on /study-session/:id
  useEffect(() => {
    if (!id) {
      setSessionDetail(null);
      setLoadingDetail(false);
      setDetailError(null);
      return;
    }

    let isMounted = true;
    setLoadingDetail(true);
    setDetailError(null);

    apiClient
      .get(`/study-sessions/${id}`)
      .then((res) => {
        if (!isMounted) return;
        const data = res.data?.data || res.data;
        setSessionDetail(data);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to load study session:', err);
        setDetailError(err?.response?.data?.message || 'Study session not found.');
      })
      .finally(() => {
        if (isMounted) setLoadingDetail(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (isActive && !isPaused) {
      timerRef.current = setInterval(() => {
        setTime((prev) => prev + 1);
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
    setIsPaused((prev) => !prev);
  };

  const handleEnd = async () => {
    setIsActive(false);
    clearInterval(timerRef.current);

    if (isRecording) {
      stopRecording();
    }

    setSavingSession(true);

    try {
      const elapsedMinutes = Math.max(1, Math.ceil(time / 60));
      const res = await apiClient.post('/study-sessions', {
        subject: subjectId || undefined,
        subjectId: subjectId || undefined,
        topic: topicId || undefined,
        startedAt: new Date(Date.now() - time * 1000).toISOString(),
        endedAt: new Date().toISOString(),
        durationMinutes: elapsedMinutes,
        sessionType: 'timer',
        status: 'completed',
      });

      const createdSession = res.data?.data || res.data;
      const createdId = createdSession?._id || createdSession?.id;

      if (createdId) {
        navigate(`/study-session/${createdId}`);
      } else {
        navigate('/study-log');
      }
    } catch (error) {
      console.error('Failed to save study session:', error);
      alert(error?.response?.data?.message || 'Failed to save study session. Please try again.');
    } finally {
      setSavingSession(false);
    }
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs > 0 ? hrs + ':' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (minutes = 0) => {
    if (minutes < 60) return `${minutes} min`;
    const hrs = Math.floor(minutes / 60);
    const rem = minutes % 60;
    if (rem === 0) return `${hrs} hr`;
    return `${hrs} hr ${rem} min`;
  };

  const getProductivityBadge = (rating) => {
    switch (rating) {
      case 'productive':
        return { label: 'Productive', color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400', icon: Smile };
      case 'average':
        return { label: 'Average', color: 'text-muted-foreground bg-muted border-border', icon: Meh };
      case 'difficult':
        return { label: 'Difficult', color: 'text-amber-600 bg-amber-500/10 border-amber-500/20 dark:text-amber-400', icon: Frown };
      default:
        return null;
    }
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
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
    }
    setIsRecording(false);
  };

  const handleSaveAudio = async () => {
    if (!audioBlobRef.current) return;
    setUploading(true);
    try {
      const file = new File([audioBlobRef.current], `voice-memo-${Date.now()}.webm`, { type: 'audio/webm' });
      const data = await uploadFile(file);

      await apiClient.post('/recordings', {
        title: `Voice Memo - ${new Date().toLocaleTimeString()}`,
        audioUrl: data.url,
        subjectId: subjectId || null,
        topic: topicId || '',
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

  // -------------------------------------------------------------
  // VIEW: SINGLE STUDY SESSION PAGE (/study-session/:id)
  // -------------------------------------------------------------
  if (id) {
    return (
      <Shell>
        <div className="max-w-3xl mx-auto space-y-6 py-4">
          <PageHeading
            eyebrow="Activity Record"
            title="Study Session Summary"
            detail="Session recorded successfully and synced with your study progress."
            action={
              <div className="flex gap-2.5">
                <Link to="/study-session">
                  <Button className="h-9 text-xs">
                    <Play size={13} className="fill-current mr-1.5" /> Start New Session
                  </Button>
                </Link>
                <Link to="/study-log">
                  <Button variant="outline" className="h-9 text-xs">
                    <History size={13} className="mr-1.5" /> Study Log
                  </Button>
                </Link>
              </div>
            }
          />

          {loadingDetail ? (
            <LoadingBlock lines={6} />
          ) : detailError || !sessionDetail ? (
            <div className="rounded-2xl border border-card-border bg-card p-10 text-center space-y-4">
              <QueryState error={detailError || 'Study session not found'} label="Study Session" />
              <div className="pt-2">
                <Link to="/study-log">
                  <Button variant="outline" className="text-xs">
                    <ArrowLeft size={13} className="mr-1.5" /> Return to Study Log
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Main Summary Card */}
              <div className="card-lift rounded-2xl border border-card-border bg-card p-6 sm:p-8 relative overflow-hidden shadow-sm">
                <div
                  className="absolute left-0 top-0 bottom-0 w-2"
                  style={{ backgroundColor: sessionDetail.subject?.color || '#3b82f6' }}
                />

                <div className="space-y-6">
                  {/* Header Row */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-3 py-1 font-mono text-xs font-bold uppercase flex items-center gap-1.5">
                        <CheckCircle2 size={13} /> Completed
                      </span>
                      <span className="rounded-full bg-secondary px-3 py-1 font-mono text-xs font-bold text-secondary-foreground uppercase">
                        {sessionDetail.sessionType === 'manual' ? 'Manual Log' : 'Focus Timer'}
                      </span>
                    </div>

                    <span className="font-mono text-xs text-muted-foreground flex items-center gap-1.5">
                      <Calendar size={13} />
                      {new Date(sessionDetail.startedAt || sessionDetail.createdAt).toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  {/* Subject & Duration Highlight */}
                  <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-border/60 pb-6">
                    <div>
                      <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                        {sessionDetail.subject?.name || sessionDetail.subjectName || 'General Study'}
                      </h2>
                      {sessionDetail.topic && (
                        <p className="mt-1.5 text-sm text-muted-foreground flex items-center gap-1.5 font-medium">
                          <BookOpen size={14} className="text-accent shrink-0" />
                          <span>{sessionDetail.topic}</span>
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="font-display text-4xl sm:text-5xl font-bold text-accent tracking-tight">
                        {formatDuration(sessionDetail.durationMinutes || 0)}
                      </div>
                      <span className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
                        Focus Duration
                      </span>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl bg-background p-4 border border-border">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Clock size={12} /> Started Time
                      </p>
                      <p className="mt-1 font-semibold text-sm text-foreground">
                        {new Date(sessionDetail.startedAt || sessionDetail.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </p>
                    </div>

                    <div className="rounded-xl bg-background p-4 border border-border">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Clock size={12} /> Ended Time
                      </p>
                      <p className="mt-1 font-semibold text-sm text-foreground">
                        {sessionDetail.endedAt
                          ? new Date(sessionDetail.endedAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })
                          : 'Recorded'}
                      </p>
                    </div>

                    {sessionDetail.productivity && (
                      <div className="rounded-xl bg-background p-4 border border-border sm:col-span-2">
                        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                          Productivity Level
                        </p>
                        <div className="mt-1.5 flex items-center gap-2">
                          {(() => {
                            const badge = getProductivityBadge(sessionDetail.productivity);
                            if (!badge) return <span className="text-sm font-semibold">{sessionDetail.productivity}</span>;
                            return (
                              <span className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${badge.color}`}>
                                <badge.icon size={13} />
                                {badge.label}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    )}

                    {sessionDetail.goal && (
                      <div className="rounded-xl bg-background p-4 border border-border sm:col-span-2">
                        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Target size={12} /> Session Goal
                        </p>
                        <p className="mt-1.5 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                          {sessionDetail.goal}
                        </p>
                      </div>
                    )}

                    {sessionDetail.notes && (
                      <div className="rounded-xl bg-background p-4 border border-border sm:col-span-2">
                        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <FileText size={12} /> Accomplishments & Notes
                        </p>
                        <p className="mt-1.5 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                          {sessionDetail.notes}
                        </p>
                      </div>
                    )}

                    {sessionDetail.task?.title && (
                      <div className="rounded-xl bg-background p-4 border border-border sm:col-span-2">
                        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Linked Task</p>
                        <p className="mt-1 text-sm font-semibold text-foreground">{sessionDetail.task.title}</p>
                      </div>
                    )}

                    {sessionDetail.exam?.name && (
                      <div className="rounded-xl bg-background p-4 border border-border sm:col-span-2">
                        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Target Exam</p>
                        <p className="mt-1 text-sm font-semibold text-foreground">{sessionDetail.exam.name}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3">
                    <Link to="/study-log">
                      <Button variant="outline" className="text-xs h-9">
                        <History size={13} className="mr-1.5" /> View All Sessions
                      </Button>
                    </Link>

                    <div className="flex items-center gap-2">
                      <Link to="/">
                        <Button variant="quiet" className="text-xs h-9">
                          Dashboard
                        </Button>
                      </Link>
                      <Link to="/study-session">
                        <Button className="text-xs h-9">
                          <Play size={13} className="fill-current mr-1.5" /> Start Another Session
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Shell>
    );
  }

  // -------------------------------------------------------------
  // VIEW: ACTIVE FOCUS TIMER SESSION (/study-session)
  // -------------------------------------------------------------
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
                <Play fill="currentColor" size={24} />
              </Button>
            ) : (
              <>
                <Button onClick={handlePause} variant="quiet" className="rounded-full w-14 h-14 bg-secondary">
                  {isPaused ? <Play fill="currentColor" size={20} /> : <Pause fill="currentColor" size={20} />}
                </Button>
                <Button
                  onClick={handleEnd}
                  disabled={savingSession}
                  className="rounded-full w-16 h-16 shadow-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  <Square fill="currentColor" size={20} />
                </Button>
              </>
            )}
          </div>

          {savingSession && (
            <p className="text-xs font-mono text-accent animate-pulse mb-4">Saving study session…</p>
          )}

          <div className="border-t border-border pt-6 mt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Voice Memo</span>
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={cx(
                  'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold transition-colors',
                  isRecording ? 'bg-destructive/15 text-destructive' : 'bg-secondary text-secondary-foreground'
                )}
              >
                {isRecording ? (
                  <>
                    <MicOff size={14} /> Stop Recording
                  </>
                ) : (
                  <>
                    <Mic size={14} /> Record Thoughts
                  </>
                )}
              </button>
            </div>

            {audioURL && (
              <div className="mt-4 flex items-center justify-between bg-background p-3 rounded-xl border border-border">
                <audio src={audioURL} controls className="h-8 max-w-[200px]" />
                <Button variant="quiet" onClick={handleSaveAudio} disabled={uploading} className="h-8 px-3 text-xs">
                  <Save size={14} className="mr-1" /> {uploading ? '...' : 'Save'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
