import React, { createContext, useState, useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createStudySession, updateStudySession } from '../api/studySessions';

const STORAGE_KEY = '@studyarena_active_study_session';

export const StudySessionContext = createContext();

export const StudySessionProvider = ({ children }) => {
  const [activeSession, setActiveSession] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const intervalRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);

  // Calculate elapsed seconds accurately from timestamps
  const calculateElapsed = useCallback((session) => {
    if (!session || !session.startedAt) return 0;
    const startMs = new Date(session.startedAt).getTime();
    const pausedMs = session.totalPausedMs || 0;

    if (session.status === 'paused' && session.pausedAt) {
      const pauseMs = new Date(session.pausedAt).getTime();
      return Math.max(0, Math.floor((pauseMs - startMs - pausedMs) / 1000));
    }

    const nowMs = Date.now();
    return Math.max(0, Math.floor((nowMs - startMs - pausedMs) / 1000));
  }, []);

  // Restore active session on launch
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.startedAt && parsed.status !== 'completed') {
            setActiveSession(parsed);
            setElapsedSeconds(calculateElapsed(parsed));
          }
        }
      } catch (err) {
        console.error('[StudySessionContext] Failed to restore session from storage:', err);
      } finally {
        setIsInitialized(true);
      }
    };
    restoreSession();
  }, [calculateElapsed]);

  // Save session state to AsyncStorage whenever activeSession updates
  useEffect(() => {
    if (!isInitialized) return;
    if (activeSession) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(activeSession)).catch(() => {});
    } else {
      AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    }
  }, [activeSession, isInitialized]);

  // Timer interval for UI tick (calculates from timestamp, not increment)
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (activeSession && activeSession.status === 'running') {
      // Set initial
      setElapsedSeconds(calculateElapsed(activeSession));

      intervalRef.current = setInterval(() => {
        setElapsedSeconds(calculateElapsed(activeSession));
      }, 1000);
    } else if (activeSession && activeSession.status === 'paused') {
      setElapsedSeconds(calculateElapsed(activeSession));
    } else {
      setElapsedSeconds(0);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [activeSession, calculateElapsed]);

  // AppState listener to handle background / foreground transitions seamlessly
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App returned to foreground: recalculate exact timestamp offset immediately
        if (activeSession) {
          setElapsedSeconds(calculateElapsed(activeSession));
        }
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [activeSession, calculateElapsed]);

  // Start new timer session
  const startSession = async ({
    subjectId = null,
    subjectName = '',
    topic = '',
    taskId = null,
    examId = null,
    goal = '',
  }) => {
    const startedAt = new Date().toISOString();
    const newSession = {
      subjectId,
      subjectName,
      topic,
      taskId,
      examId,
      goal,
      startedAt,
      pausedAt: null,
      totalPausedMs: 0,
      status: 'running',
    };

    setActiveSession(newSession);
    setElapsedSeconds(0);
    return newSession;
  };

  // Pause running session
  const pauseSession = () => {
    if (!activeSession || activeSession.status !== 'running') return;
    const pausedAt = new Date().toISOString();
    const updated = {
      ...activeSession,
      status: 'paused',
      pausedAt,
    };
    setActiveSession(updated);
  };

  // Resume paused session
  const resumeSession = () => {
    if (!activeSession || activeSession.status !== 'paused') return;
    const now = Date.now();
    const pausedMs = activeSession.pausedAt
      ? now - new Date(activeSession.pausedAt).getTime()
      : 0;

    const updated = {
      ...activeSession,
      status: 'running',
      pausedAt: null,
      totalPausedMs: (activeSession.totalPausedMs || 0) + Math.max(0, pausedMs),
    };
    setActiveSession(updated);
  };

  // End and prepare final payload for completion
  const endSession = () => {
    if (!activeSession) return null;
    const endedAt = new Date().toISOString();
    let totalPausedMs = activeSession.totalPausedMs || 0;

    if (activeSession.status === 'paused' && activeSession.pausedAt) {
      totalPausedMs += Date.now() - new Date(activeSession.pausedAt).getTime();
    }

    const startMs = new Date(activeSession.startedAt).getTime();
    const endMs = new Date(endedAt).getTime();
    const elapsedMs = Math.max(0, endMs - startMs - totalPausedMs);
    const durationMinutes = Math.max(1, Math.round(elapsedMs / 60000));

    const finalSession = {
      ...activeSession,
      endedAt,
      totalPausedMs,
      durationMinutes,
      elapsedSeconds: Math.floor(elapsedMs / 1000),
      status: 'completed',
    };

    return finalSession;
  };

  // Clear/discard active session
  const discardSession = () => {
    setActiveSession(null);
    setElapsedSeconds(0);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  };

  return (
    <StudySessionContext.Provider
      value={{
        activeSession,
        elapsedSeconds,
        isInitialized,
        startSession,
        pauseSession,
        resumeSession,
        endSession,
        discardSession,
      }}
    >
      {children}
    </StudySessionContext.Provider>
  );
};
