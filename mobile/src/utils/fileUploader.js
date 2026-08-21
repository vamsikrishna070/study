import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import client from '../api/client';

/**
 * Uploads a local file { uri, name, mimeType } to the backend /upload endpoint
 * @param {Object} file { uri: string, name: string, mimeType: string, type: string }
 * @returns {Promise<Object>} Backend response data: { url, publicId, originalName, mimeType, size }
 */
export const uploadFileToServer = async (file) => {
  if (!file || !file.uri) {
    throw new Error('Invalid file provided for upload.');
  }

  const formData = new FormData();
  
  // React Native requires uri, name, and type for FormData file upload
  const fileObj = {
    uri: file.uri,
    name: file.name || file.originalName || 'file_' + Date.now(),
    type: file.mimeType || file.type || 'application/octet-stream',
  };

  formData.append('file', fileObj);

  const response = await client.post('/upload', formData);
  return response.data?.data || response.data;
};

/**
 * Pick any document (PDF, DOCX, PPT, etc.) and upload it to the server
 * @param {Object} options DocumentPicker options
 * @returns {Promise<Object|null>} Uploaded file metadata or null if cancelled
 */
export const pickAndUploadDocument = async (options = {}) => {
  const result = await DocumentPicker.getDocumentAsync({
    type: options.type || '*/*',
    copyToCacheDirectory: true,
    ...options,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  const uploaded = await uploadFileToServer({
    uri: asset.uri,
    name: asset.name,
    mimeType: asset.mimeType || 'application/pdf',
    size: asset.size,
  });

  return {
    ...uploaded,
    originalName: uploaded.originalName || asset.name,
    mimeType: uploaded.mimeType || asset.mimeType,
    size: uploaded.size || asset.size,
  };
};

/**
 * Pick an image from photo library and upload it to the server
 * @param {Object} options ImagePicker options
 * @returns {Promise<Object|null>} Uploaded file metadata or null if cancelled
 */
export const pickAndUploadImage = async (options = {}) => {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Photo library permission is required to select images.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.8,
    ...options,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  const fileName = asset.fileName || `image_${Date.now()}.jpg`;
  const mimeType = asset.mimeType || 'image/jpeg';

  const uploaded = await uploadFileToServer({
    uri: asset.uri,
    name: fileName,
    mimeType: mimeType,
    size: asset.fileSize || 0,
  });

  return {
    ...uploaded,
    originalName: uploaded.originalName || fileName,
    mimeType: uploaded.mimeType || mimeType,
    size: uploaded.size || asset.fileSize || 0,
  };
};
