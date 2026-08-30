import {
  connectPortalAccount,
  getPortalAccountData,
  reSyncPortalData,
  getAcademicCalendarData,
  disconnectPortalAccount,
} from '../../services/portal/srmPortalService.js';
import {
  getCurrentAttendance,
  submitAttendanceCode,
  getTimetable,
} from '../../services/portal/srmAttendanceService.js';

export async function connectPortal(req, res) {
  try {
    const { srmUsername, srmPassword } = req.body;
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
      message = 'SRM Portal is currently unavailable. Please try again later.';
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

export async function getStatus(req, res) {
  try {
    const userId = req.user._id;
    console.log(`[PORTAL] Account lookup for user ${userId}`);
    const data = await getPortalAccountData(userId);
    console.log(`[PORTAL] Account found: ${data.isConnected}, status: ${data.connectionStatus}, enrolled: ${data.enrolledSubjectsCount || 0}`);
    res.json({ success: true, data });
  } catch (error) {
    console.error('[PortalController] getStatus error:', error.message);
    res.status(500).json({ success: false, message: 'We couldn\'t load your SRM Portal status right now. Please try again.' });
  }
}

export async function syncPortal(req, res) {
  try {
    console.log(`[PORTAL] Manual sync request for user ${req.user._id}`);
    const data = await reSyncPortalData(req.user._id);
    res.json({ success: true, data, message: 'Portal data refreshed successfully' });
  } catch (error) {
    console.error('[PortalController] syncPortal error:', error.message);
    if (error.message?.includes('session expired')) {
      return res.status(401).json({ success: false, message: 'Your SRM Portal session has expired. Please re-enter your credentials.', action: 'reconnect' });
    }
    res.status(500).json({ success: false, message: 'We couldn\'t sync your academic information right now. Please try again.' });
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
    console.log(`[PORTAL] GET /api/portal/attendance/today for User ID: ${userId}`);
    const data = await getCurrentAttendance(userId);
    console.log(`[PORTAL] Attendance loaded: ${data.subjectStats?.length || 0} subject-wise logs, ${data.attendance?.length || 0} today slots`);
    res.json({ success: true, data });
  } catch (error) {
    console.error('[PortalController] getTodayAttendance error:', error.message);
    res.status(500).json({ success: false, message: 'We couldn\'t load today\'s attendance right now. Please try again.' });
  }
}

export async function markAttendance(req, res) {
  try {
    const { attendanceCode } = req.body;
    if (!attendanceCode || typeof attendanceCode !== 'string' || !attendanceCode.trim()) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_CODE',
        message: 'Please enter a valid attendance code.',
      });
    }

    console.log(`[PORTAL] Submitting attendance code for user ${req.user._id}...`);
    const result = await submitAttendanceCode(req.user._id, attendanceCode.trim());
    console.log(`[PORTAL] Code submission result: ${result.success ? 'SUCCESS' : result.code}`);
    if (!result.success) {
      const statusCode = result.code === 'PORTAL_SESSION_EXPIRED' ? 401 : 400;
      return res.status(statusCode).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('[PortalController] markAttendance error:', error.message);
    res.status(500).json({
      success: false,
      code: 'PORTAL_UNAVAILABLE',
      message: 'SRM portal is currently unavailable. Please try again.',
    });
  }
}

export async function getTimetableData(req, res) {
  try {
    const userId = req.user._id;
    console.log(`[PORTAL] GET /api/portal/timetable for User ID: ${userId}`);
    const data = await getTimetable(userId);
    const dayCount = Object.keys(data.timetable || {}).length;
    console.log(`[PORTAL] Timetable loaded: ${dayCount} days schedule`);
    res.json({ success: true, data });
  } catch (error) {
    console.error('[PortalController] getTimetableData error:', error.message);
    res.status(500).json({ success: false, message: 'We couldn\'t load the timetable right now. Please try again.' });
  }
}
