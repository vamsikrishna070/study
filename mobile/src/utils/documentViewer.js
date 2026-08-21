import { Alert, Linking, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * View document in-app via full-screen WebBrowser or system viewer.
 */
export const viewDocument = async (url, title = 'Document') => {
  if (!url) {
    Alert.alert('Document Error', 'Document URL is not available.');
    return;
  }

  try {
    const result = await WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
      controlsColor: '#df6b47',
      toolbarColor: '#ffffff',
      showTitle: true,
      enableBarCollapsing: true,
    });
    return result;
  } catch (error) {
    // Fallback to system URL launcher
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Cannot Open Document', 'No application found to view this document.');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to open document.');
    }
  }
};

/**
 * Download document to device storage and offer to view or save.
 */
export const downloadDocument = async (url, filename = 'document.pdf', onProgress) => {
  if (!url) {
    Alert.alert('Download Error', 'Document URL is not available.');
    return null;
  }

  try {
    const cleanFilename = (filename || 'document.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
    const localUri = `${FileSystem.documentDirectory}${cleanFilename}`;

    let downloadResumable;
    if (onProgress) {
      downloadResumable = FileSystem.createDownloadResumable(
        url,
        localUri,
        {},
        (progress) => {
          const percent = Math.round((progress.totalBytesWritten / progress.totalBytesExpectedToWrite) * 100);
          onProgress(percent);
        }
      );
      const result = await downloadResumable.downloadAsync();
      if (!result || !result.uri) throw new Error('Download failed.');
    } else {
      const result = await FileSystem.downloadAsync(url, localUri);
      if (!result || !result.uri) throw new Error('Download failed.');
    }

    const isSharingAvailable = await Sharing.isAvailableAsync();
    if (isSharingAvailable) {
      Alert.alert(
        'Download Complete',
        `"${cleanFilename}" has been downloaded. Would you like to save or share it now?`,
        [
          { text: 'Later', style: 'cancel' },
          {
            text: 'Save / Open',
            onPress: () => Sharing.shareAsync(localUri, { mimeType: 'application/pdf', dialogTitle: cleanFilename }),
          },
        ]
      );
    } else {
      Alert.alert('Download Complete', `File saved to ${cleanFilename}`);
    }

    return localUri;
  } catch (error) {
    console.error('Download error:', error);
    Alert.alert('Download Failed', error.message || 'Could not download the file.');
    return null;
  }
};

/**
 * Share document with external apps (WhatsApp, Drive, Email, etc.)
 */
export const shareDocument = async (url, filename = 'document.pdf') => {
  if (!url) {
    Alert.alert('Share Error', 'Document URL is not available.');
    return;
  }

  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Sharing Unavailable', 'Sharing is not supported on this device.');
      return;
    }

    const cleanFilename = (filename || 'document.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
    const localUri = `${FileSystem.cacheDirectory}${cleanFilename}`;

    // Download to cache first to share local file
    const downloadRes = await FileSystem.downloadAsync(url, localUri);
    if (downloadRes.uri) {
      await Sharing.shareAsync(downloadRes.uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Share ${cleanFilename}`,
      });
    }
  } catch (error) {
    console.error('Sharing error:', error);
    Alert.alert('Share Failed', 'Could not share the document.');
  }
};
