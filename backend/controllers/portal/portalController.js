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
    const data = await getPortalAccountData(req.user._id);
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
