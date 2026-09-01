import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { validatePdfFile } from '../services/documentService';
import client from '../api/client';

export const uploadFileToServer = async (file) => {
  if (!file || !file.uri) {
    throw new Error('Invalid file provided for upload.');
  }

  const formData = new FormData();

  const fileName = file.name || file.originalName || `file_${Date.now()}`;
  let mimeType = file.mimeType || file.type || 'application/octet-stream';

  if (fileName.toLowerCase().endsWith('.pdf') && mimeType === 'application/octet-stream') {
    mimeType = 'application/pdf';
  }

  const fileObj = {
    uri: file.uri,
    name: fileName,
    type: mimeType,
  };

  formData.append('file', fileObj);

  const response = await client.post('/upload', formData);
  return response.data?.data || response.data;
};

export const pickAndUploadDocument = async (options = {}) => {
  const result = await DocumentPicker.getDocumentAsync({
    type: options.type || ['application/pdf', '*/*'],
    copyToCacheDirectory: true,
    ...options,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  if (!asset.uri) {
    throw new Error('Could not access the selected document.');
  }

  const fileName = asset.name || 'document.pdf';
  let mimeType = asset.mimeType || 'application/pdf';

  if (options.isPdf || fileName.toLowerCase().endsWith('.pdf')) {
    const isPdfValid = await validatePdfFile(asset.uri);
    if (!isPdfValid && !fileName.toLowerCase().endsWith('.pdf')) {
      throw new Error('Selected file is not a valid PDF document.');
    }
    mimeType = 'application/pdf';
  }

  const uploaded = await uploadFileToServer({
    uri: asset.uri,
    name: fileName,
    mimeType: mimeType,
    size: asset.size || 0,
  });

  return {
    ...uploaded,
    originalName: uploaded.originalName || fileName,
    mimeType: uploaded.mimeType || mimeType,
    size: uploaded.size || asset.size || 0,
  };
};

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
