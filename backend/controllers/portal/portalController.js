import {
  connectPortalAccount,
  getPortalAccountData,
  reSyncPortalData,
  getAcademicCalendarData,
  disconnectPortalAccount,
} from '../../services/portal/srmPortalService.js';

export async function connectPortal(req, res) {
  try {
    const { srmUsername, srmPassword } = req.body;
    if (!srmUsername || !srmPassword) {
      return res.status(400).json({ success: false, message: 'Registration Number and Password are required' });
    }
    const result = await connectPortalAccount(req.user._id, srmUsername, srmPassword);
    res.json({ success: true, data: result, message: 'SRM Portal connected successfully!' });
  } catch (error) {
    const isCredentialError = /invalid srm|invalid registration|password/i.test(error.message || '');
    const statusCode = isCredentialError ? 400 : 503;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Unable to connect to the SRM AP portal. Please verify your registration number and password.',
    });
  }
}

export async function getStatus(req, res) {
  try {
    const data = await getPortalAccountData(req.user._id);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to load SRM portal status' });
  }
}

export async function syncPortal(req, res) {
  try {
    const data = await reSyncPortalData(req.user._id);
    res.json({ success: true, data, message: 'Portal data refreshed successfully' });
  } catch (error) {
    if (error.message?.includes('session expired')) {
      return res.status(401).json({ success: false, message: error.message, action: 'reconnect' });
    }
    res.status(500).json({ success: false, message: error.message || 'Failed to sync portal data' });
  }
}

export async function getCalendar(req, res) {
  try {
    const data = getAcademicCalendarData();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to load academic calendar' });
  }
}

export async function disconnectPortal(req, res) {
  try {
    const result = await disconnectPortalAccount(req.user._id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to disconnect SRM portal' });
  }
}
