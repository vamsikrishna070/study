import {
  connectPortalAccount,
  getPortalAccountData,
  reSyncPortalData,
  getAcademicCalendarData,
  disconnectPortalAccount,
  verifyPortalConnection,
} from '../../services/portal/srmPortalService.js';
import {
  getCurrentAttendance,
  submitAttendanceCode,
  getTimetable,
  getAttendancePlannerData,
} from '../../services/portal/srmAttendanceService.js';

export async function connectPortal(req, res) {
  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {

      }
    }

    let srmUsername = (body && typeof body === 'object')
      ? (body.srmUsername || body.registrationNumber || '')
      : (typeof body === 'string' ? body : '');
    let srmPassword = (body && typeof body === 'object')
      ? (body.srmPassword || body.password || '')
      : '';

    if (typeof srmUsername === 'string') {
      srmUsername = srmUsername.trim().replace(/^["']+|["']+$/g, '');
    }
    if (typeof srmPassword === 'string') {
      srmPassword = srmPassword.trim().replace(/^["']+|["']+$/g, '');
    }

    if (!srmUsername || !srmPassword) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_CREDENTIALS',
        message: 'Registration Number and Password are required.',
      });
    }
    const result = await connectPortalAccount(req.user._id, srmUsername, srmPassword);
    res.json({ success: true, data: result, message: 'SRM Portal connected successfully!' });
  } catch (error) {
    console.error('[PortalController] connectPortal error:', error.message);
    const code = error.code || 'LOGIN_FAILED';
    let statusCode = 500;
    let message = 'Unable to connect to SRM Portal. Please try again.';

    if (code === 'INVALID_CREDENTIALS') {
      statusCode = 400;
      message = 'Registration number or portal password is incorrect.';
    } else if (code === 'CAPTCHA_FAILED') {
      statusCode = 503;
      message = 'SRM Portal verification could not be completed. Please try again.';
    } else if (code === 'PORTAL_UNAVAILABLE') {
      statusCode = 503;
      message = 'SRM Portal is currently unreachable. Please try again later.';
    } else if (code === 'SCRAPE_FAILED' || code === 'SYNC_FAILED') {
      statusCode = 502;
      message = 'Your SRM Portal login succeeded, but some academic data could not be synchronized. Please try again.';
    } else {
      statusCode = 400;
      message = error.message || 'Unable to authenticate with SRM Portal.';
    }

    return res.status(statusCode).json({
      success: false,
      code,
      message,
    });
  }
}

export async function verifyPortal(req, res) {
  try {
    const result = await verifyPortalConnection(req.user._id);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[PortalController] verifyPortal error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Unable to verify portal connection right now. Please try again.',
      data: {
        status: 'failed',
        message: 'Unable to connect to portal',
        isConnected: false,
        isVerified: false,
      },
    });
  }
}

export async function getStatus(req, res) {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const userId = req.user._id;
    const data = await getPortalAccountData(userId);
    res.json({
      success: true,
      cached: true,
      isConnected: Boolean(data.isConnected),
      connectionStatus: data.connectionStatus || 'disconnected',
      isVerified: Boolean(data.isVerified),
      verificationMessage: data.verificationMessage || (data.isConnected ? 'Connected and verified' : 'Portal connection required'),
      syncing: Boolean(data.isSyncing),
      lastSyncedAt: data.lastSuccessfulSync || null,
      data,
    });
  } catch (error) {
    console.error('[PortalController] getStatus error:', error.message);
    res.status(500).json({ success: false, message: 'We couldn\'t load your SRM Portal status right now. Please try again.' });
  }
}

export async function syncPortal(req, res) {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const data = await reSyncPortalData(req.user._id);
    return res.json({
      success: true,
      data,
      cached: Boolean(data.syncWarning),
      lastSyncedAt: data.lastSuccessfulSync || new Date().toISOString(),
      message: 'Portal data refreshed successfully',
    });
  } catch (error) {
    console.error('[PortalController] syncPortal error:', error.message);
    const isSessionErr =
      error.message?.includes('session expired') ||
      error.message?.includes('PORTAL_SESSION_EXPIRED') ||
      error.code === 'INVALID_CREDENTIALS';

    if (isSessionErr) {
      return res.status(401).json({
        success: false,
        code: 'PORTAL_SESSION_EXPIRED',
        message: 'Your SRM Portal session has expired. Please re-enter your credentials.',
        action: 'reconnect',
      });
    }

    return res.status(502).json({
      success: false,
      code: error.code || 'SYNC_FAILED',
      message: error.message || 'We couldn\'t sync your academic information right now. Please try again.',
    });
  }
}

export async function getCalendar(req, res) {
  try {
    const data = getAcademicCalendarData();
    res.json({ success: true, data });
  } catch (error) {
    console.error('[PortalController] getCalendar error:', error.message);
    res.status(500).json({ success: false, message: 'We couldn\'t load the academic calendar right now. Please try again.' });
  }
}

export async function disconnectPortal(req, res) {
  try {
    const result = await disconnectPortalAccount(req.user._id);
    res.json(result);
  } catch (error) {
    console.error('[PortalController] disconnectPortal error:', error.message);
    res.status(500).json({ success: false, message: 'We couldn\'t disconnect your SRM Portal right now. Please try again.' });
  }
}

export async function getTodayAttendance(req, res) {
  try {
    const userId = req.user._id;
    const data = await getCurrentAttendance(userId);
    res.json({
      success: true,
      data,
      cached: data.cached || false,
      lastSyncedAt: data.lastSynced || new Date().toISOString(),
    });
  } catch (error) {
    console.error('[PortalController] getTodayAttendance failed:', error.message);
    res.status(500).json({
      success: false,
      message: "We couldn't load today's attendance right now. Please try again.",
      error: error.message,
    });
  }
}

export async function markAttendance(req, res) {
  try {
    const rawCode = req.body.attendanceCode || req.body.code;
    if (!rawCode || typeof rawCode !== 'string' || !rawCode.trim()) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_CODE',
        message: 'Please enter a valid attendance code.',
      });
    }

    const attendanceCode = rawCode.trim().toUpperCase();
    const result = await submitAttendanceCode(req.user._id, attendanceCode);

    if (!result.success) {
      const statusCode = result.code === 'PORTAL_SESSION_EXPIRED' ? 401 : 400;
      return res.status(statusCode).json(result);
    }

    res.json({
      success: true,
      message: result.message || 'Attendance Captured Successfully!',
      data: result,
    });
  } catch (error) {
    console.error('[ATTENDANCE] Attendance code submission failed:', error.message);
    res.status(500).json({
      success: false,
      code: 'PORTAL_UNAVAILABLE',
      message: 'SRM portal is currently unavailable. Please try again.',
      error: error.message,
    });
  }
}

export async function getTimetableData(req, res) {
  try {
    const userId = req.user._id;
    const data = await getTimetable(userId);
    const dayCount = Object.keys(data.timetable || {}).length;
    res.json({
      success: true,
      data,
      cached: true,
      lastSyncedAt: data.lastSynced || new Date().toISOString(),
    });
  } catch (error) {
    console.error('[PortalController] getTimetableData error:', error.message);
    res.status(500).json({
      success: false,
      message: "We couldn't load the timetable right now. Please try again.",
      error: error.message,
    });
  }
}

export async function getAttendancePlanner(req, res) {
  try {
    const userId = req.user._id;
    const data = await getAttendancePlannerData(userId);
    res.json({
      success: true,
      data,
      cached: true,
      lastSyncedAt: data.lastSynced || new Date().toISOString(),
    });
  } catch (error) {
    console.error('[PortalController] getAttendancePlanner error:', error.message);
    res.status(500).json({
      success: false,
      message: "We couldn't calculate your attendance planner right now. Please try again.",
      error: error.message,
    });
  }
}

