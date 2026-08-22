import { Platform } from 'react-native';
import { Paths, File, Directory } from 'expo-file-system';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { getOrCreateDirectory, getSafeFilename } from './documentService';

const AUDIO_DOCS_DIR_NAME = 'audio';

class AudioPlayerManager {
  constructor() {
    this.currentPlayer = null;
    this.currentUri = null;
    this.currentResolvedUri = null;
    this.currentScheme = null;
    this.currentSize = null;
    this.statusCallback = null;
    this.subscription = null;
    this.audioModeSet = false;
  }

  async ensureAudioMode() {
    if (this.audioModeSet) return;
    try {
      if (typeof setAudioModeAsync === 'function') {
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: false,
        });
        this.audioModeSet = true;
      }
    } catch (e) {
      console.warn('[AUDIO DEBUG] setAudioModeAsync notice:', e?.message || e);
    }
  }

  /**
   * Resolves raw audio URI (content://, file://, https://) to a verified playable source
   * @param {string} rawUri
   * @returns {Promise<{ playableUri: string, scheme: string, exists: boolean, size: number }>}
   */
  async resolvePlayableUri(rawUri) {
    if (!rawUri || typeof rawUri !== 'string') {
      throw new Error('Invalid or missing audio URI.');
    }

    const trimmed = rawUri.trim();

    // 1. Android content:// URI: reliably copy into persistent app storage
    if (trimmed.startsWith('content://')) {
      const audioDir = getOrCreateDirectory('document', AUDIO_DOCS_DIR_NAME);
      const targetFilename = `audio_${Date.now()}.m4a`;
      const targetFile = new File(audioDir, targetFilename);

      try {
        const srcFile = new File(trimmed);
        try {
          srcFile.copy(targetFile);
        } catch (copyErr) {
          console.warn('[AUDIO DEBUG] File.copy() failed, trying arrayBuffer stream fallback:', copyErr?.message);
          const buffer = await srcFile.arrayBuffer();
          if (buffer && buffer.byteLength > 0) {
            targetFile.write(new Uint8Array(buffer));
          }
        }
      } catch (err) {
        console.error('[AUDIO DEBUG] REAL EXCEPTION during content:// copy:', err);
        throw new Error(`Failed to copy content URI to persistent storage: ${err?.message || err}`);
      }

      const exists = targetFile.exists;
      const size = targetFile.size || 0;

      if (!exists || size === 0) {
        throw new Error(`Content URI copy resulted in missing or 0-byte file (target: ${targetFile.uri})`);
      }

      return {
        playableUri: targetFile.uri,
        scheme: 'content://',
        exists: true,
        size,
      };
    }

    // 2. Local file:// URI: verify exists === true and size > 0
    if (trimmed.startsWith('file://')) {
      const file = new File(trimmed);
      const exists = file.exists;
      const size = file.size || 0;

      if (!exists || size === 0) {
        throw new Error(`Local file does not exist or is empty (URI: ${trimmed}, exists: ${exists}, size: ${size})`);
      }

      return {
        playableUri: file.uri,
        scheme: 'file://',
        exists: true,
        size,
      };
    }

    // 3. Remote URL (https:// or http://)
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      try {
        new URL(trimmed);
      } catch (urlErr) {
        throw new Error(`Invalid HTTP/HTTPS URL: ${trimmed}`);
      }

      return {
        playableUri: trimmed,
        scheme: trimmed.startsWith('https://') ? 'https://' : 'http://',
        exists: true,
        size: -1,
      };
    }

    // 4. Fallback for relative or local paths
    const fallbackFile = new File(trimmed);
    const exists = fallbackFile.exists;
    const size = fallbackFile.size || 0;

    return {
      playableUri: fallbackFile.uri || trimmed,
      scheme: 'relative',
      exists,
      size,
    };
  }

  /**
   * Plays the audio URI using Expo SDK 54 expo-audio API
   * @param {string} rawUri
   * @param {Function} onStatusUpdate - Callback receiving { status, currentTime, duration, error }
   */
  async play(rawUri, onStatusUpdate) {
    let resolvedUri = '';
    let scheme = '';
    let exists = false;
    let size = 0;
    let playerCreated = false;
    let status = 'idle';

    if (!rawUri || typeof rawUri !== 'string') {
      console.log(`[AUDIO DEBUG]\nrawUri: ${rawUri}\nresolvedUri: \nscheme: invalid\nexists: false\nsize: 0\nplayerCreated: false\nstatus: error`);
      console.error('[AUDIO DEBUG] REAL EXCEPTION: No audio URI provided.');
      onStatusUpdate?.({ status: 'error', error: 'No audio URI provided.' });
      return;
    }

    const trimmed = rawUri.trim();

    // If currently paused on this exact URI, resume
    if (this.currentUri === trimmed && this.currentPlayer) {
      try {
        this.statusCallback = onStatusUpdate;
        this.currentPlayer.play();
        this.emitStatus({
          status: 'playing',
          currentTime: this.currentPlayer.currentTime || 0,
          duration: this.currentPlayer.duration || 0,
        });
        console.log(`[AUDIO DEBUG]\nrawUri: ${trimmed}\nresolvedUri: ${this.currentResolvedUri}\nscheme: ${this.currentScheme}\nexists: true\nsize: ${this.currentSize}\nplayerCreated: true\nstatus: playing (resumed)`);
        return;
      } catch (resumeErr) {
        console.error('[AUDIO DEBUG] REAL EXCEPTION on player.play() (resume):', resumeErr);
      }
    }

    // Stop and release previous player
    await this.stop();

    this.currentUri = trimmed;
    this.statusCallback = onStatusUpdate;
    this.emitStatus({ status: 'loading' });

    try {
      await this.ensureAudioMode();

      // Resolve playable URI
      const resolved = await this.resolvePlayableUri(trimmed);
      resolvedUri = resolved.playableUri;
      scheme = resolved.scheme;
      exists = resolved.exists;
      size = resolved.size;
      this.currentResolvedUri = resolvedUri;
      this.currentScheme = scheme;
      this.currentSize = size;

      // Create AudioPlayer
      let player;
      try {
        player = createAudioPlayer(resolvedUri);
        playerCreated = !!player;
      } catch (createErr) {
        console.error('[AUDIO DEBUG] REAL EXCEPTION on createAudioPlayer():', createErr);
        console.log(`[AUDIO DEBUG]\nrawUri: ${trimmed}\nresolvedUri: ${resolvedUri}\nscheme: ${scheme}\nexists: ${exists}\nsize: ${size}\nplayerCreated: false\nstatus: error`);
        this.emitStatus({ status: 'error', error: `createAudioPlayer failed: ${createErr?.message || createErr}` });
        await this.stop();
        return;
      }

      this.currentPlayer = player;

      // Status listener using SDK 54 AudioStatus fields
      this.subscription = player.addListener('playbackStatusUpdate', (audioStatus) => {
        if (!audioStatus) return;

        if (audioStatus.error) {
          console.error('[AUDIO DEBUG] REAL EXCEPTION from playbackStatusUpdate:', audioStatus.error);
          this.emitStatus({
            status: 'error',
            error: audioStatus.error,
            currentTime: audioStatus.currentTime || 0,
            duration: audioStatus.duration || 0,
          });
          return;
        }

        if (audioStatus.didJustFinish) {
          this.emitStatus({
            status: 'finished',
            currentTime: audioStatus.duration || 0,
            duration: audioStatus.duration || 0,
          });
        } else if (audioStatus.playing) {
          this.emitStatus({
            status: 'playing',
            currentTime: audioStatus.currentTime || 0,
            duration: audioStatus.duration || 0,
          });
        } else if (audioStatus.isLoaded && !audioStatus.playing) {
          this.emitStatus({
            status: 'paused',
            currentTime: audioStatus.currentTime || 0,
            duration: audioStatus.duration || 0,
          });
        }
      });

      // Start playback
      try {
        player.play();
        status = 'playing';
      } catch (playErr) {
        console.error('[AUDIO DEBUG] REAL EXCEPTION on player.play():', playErr);
        console.log(`[AUDIO DEBUG]\nrawUri: ${trimmed}\nresolvedUri: ${resolvedUri}\nscheme: ${scheme}\nexists: ${exists}\nsize: ${size}\nplayerCreated: ${playerCreated}\nstatus: error`);
        this.emitStatus({ status: 'error', error: `player.play failed: ${playErr?.message || playErr}` });
        await this.stop();
        return;
      }

      console.log(`[AUDIO DEBUG]\nrawUri: ${trimmed}\nresolvedUri: ${resolvedUri}\nscheme: ${scheme}\nexists: ${exists}\nsize: ${size}\nplayerCreated: ${playerCreated}\nstatus: ${status}`);

      this.emitStatus({ status: 'playing' });
    } catch (err) {
      console.error('[AUDIO DEBUG] REAL EXCEPTION during audio preparation:', err);
      console.log(`[AUDIO DEBUG]\nrawUri: ${trimmed}\nresolvedUri: ${resolvedUri}\nscheme: ${scheme}\nexists: ${exists}\nsize: ${size}\nplayerCreated: ${playerCreated}\nstatus: error`);
      this.emitStatus({ status: 'error', error: err?.message || String(err) });
      await this.stop();
    }
  }

  /**
   * Pauses the currently playing audio
   */
  async pause() {
    if (this.currentPlayer) {
      try {
        if (typeof this.currentPlayer.pause === 'function') {
          this.currentPlayer.pause();
        }
        this.emitStatus({
          status: 'paused',
          currentTime: this.currentPlayer.currentTime || 0,
          duration: this.currentPlayer.duration || 0,
        });
      } catch (e) {
        console.error('[AUDIO DEBUG] REAL EXCEPTION on player.pause():', e);
      }
    }
  }

  /**
   * Resumes playback
   */
  async resume() {
    if (this.currentPlayer) {
      try {
        if (typeof this.currentPlayer.play === 'function') {
          this.currentPlayer.play();
        }
        this.emitStatus({
          status: 'playing',
          currentTime: this.currentPlayer.currentTime || 0,
          duration: this.currentPlayer.duration || 0,
        });
      } catch (e) {
        console.error('[AUDIO DEBUG] REAL EXCEPTION on player.resume():', e);
      }
    }
  }

  /**
   * Stops and releases the player to free native resources
   */
  async stop() {
    try {
      if (this.subscription) {
        if (typeof this.subscription.remove === 'function') {
          this.subscription.remove();
        }
        this.subscription = null;
      }

      if (this.currentPlayer) {
        try {
          if (typeof this.currentPlayer.pause === 'function') {
            this.currentPlayer.pause();
          }
        } catch (_) {}

        try {
          if (typeof this.currentPlayer.release === 'function') {
            this.currentPlayer.release();
          } else if (typeof this.currentPlayer.remove === 'function') {
            this.currentPlayer.remove();
          }
        } catch (_) {}

        this.currentPlayer = null;
      }
    } catch (e) {
      console.error('[AUDIO DEBUG] REAL EXCEPTION during player stop/release:', e);
    } finally {
      this.currentUri = null;
      this.currentResolvedUri = null;
      this.currentScheme = null;
      this.currentSize = null;
      this.statusCallback = null;
    }
  }

  emitStatus(statusObj) {
    if (typeof this.statusCallback === 'function') {
      try {
        this.statusCallback(statusObj);
      } catch (e) {
        console.error('[AUDIO DEBUG] REAL EXCEPTION inside statusCallback:', e);
      }
    }
  }

  getCurrentUri() {
    return this.currentUri;
  }
}

export const globalAudioPlayer = new AudioPlayerManager();
