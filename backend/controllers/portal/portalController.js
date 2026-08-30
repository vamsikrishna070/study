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
      return res.status(400).json({ success: false, message: 'Registration Number and Password are required' });
    }
    const result = await connectPortalAccount(req.user._id, srmUsername, srmPassword);
    res.json({ success: true, data: result, message: 'SRM Portal connected successfully!' });
  } catch (error) {
    console.error('[PortalController] connectPortal error:', error);
    const isCredentialError = /invalid|credential|password|username|registration/i.test(error.message || '');
    if (isCredentialError) {
      return res.status(400).json({
        success: false,
        message: 'The SRM Portal credentials you entered are incorrect.',
      });
    }
    return res.status(503).json({
      success: false,
      message: 'The SRM Portal is temporarily unavailable. Please try again later.',
    });
  }
}

export async function getStatus(req, res) {
  try {
    const userId = req.user._id;
    console.log(`[DEBUG /api/portal/status] Auth User ID: ${userId}`);
    const data = await getPortalAccountData(userId);
    console.log(`[DEBUG /api/portal/status] Account Found: ${data.isConnected}, Username: ${data.srmUsername || 'N/A'}, Status: ${data.connectionStatus || 'N/A'}`);
    res.json({ success: true, data });
  } catch (error) {
    console.error('[PortalController] getStatus error:', error);
    res.status(500).json({ success: false, message: 'We couldn\'t load your SRM Portal status right now. Please try again.' });
  }
}

export async function syncPortal(req, res) {
  try {
    const data = await reSyncPortalData(req.user._id);
    res.json({ success: true, data, message: 'Portal data refreshed successfully' });
  } catch (error) {
    console.error('[PortalController] syncPortal error:', error);
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
    console.error('[PortalController] getCalendar error:', error);
    res.status(500).json({ success: false, message: 'We couldn\'t load the academic calendar right now. Please try again.' });
  }
}

export async function disconnectPortal(req, res) {
  try {
    const result = await disconnectPortalAccount(req.user._id);
    res.json(result);
  } catch (error) {
    console.error('[PortalController] disconnectPortal error:', error);
    res.status(500).json({ success: false, message: 'We couldn\'t disconnect your SRM Portal right now. Please try again.' });
  }
}

export async function getTodayAttendance(req, res) {
  try {
    const userId = req.user._id;
    console.log(`[DEBUG /api/portal/attendance/today] Auth User ID: ${userId}`);
    const data = await getCurrentAttendance(userId);
    console.log(`[DEBUG /api/portal/attendance/today] Day Order: ${data.dayOrder}, Class Count: ${data.attendance?.length || 0}`);
    res.json({ success: true, data });
  } catch (error) {
    console.error('[PortalController] getTodayAttendance error:', error);
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

    console.log(`[DEBUG /api/portal/attendance/mark] Auth User ID: ${req.user._id}, Submitting Code...`);
    const result = await submitAttendanceCode(req.user._id, attendanceCode.trim());
    console.log(`[DEBUG /api/portal/attendance/mark] Result: ${result.success ? 'SUCCESS' : result.code}`);
    if (!result.success) {
      const statusCode = result.code === 'PORTAL_SESSION_EXPIRED' ? 401 : 400;
      return res.status(statusCode).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('[PortalController] markAttendance error:', error);
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
    console.log(`[DEBUG /api/portal/timetable] Auth User ID: ${userId}`);
    const data = await getTimetable(userId);
    const dayCount = Object.keys(data.timetable || {}).length;
    console.log(`[DEBUG /api/portal/timetable] Timetable Days: ${dayCount}`);
    res.json({ success: true, data });
  } catch (error) {
    console.error('[PortalController] getTimetableData error:', error);
    res.status(500).json({ success: false, message: 'We couldn\'t load the timetable right now. Please try again.' });
  }
}
