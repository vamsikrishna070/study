import client from './client';

export const extractSyllabus = async (subjectId, fileUri, fileType, fileName) => {
  // If a local file URI is provided (file:// or content://), upload and patch first
  if (fileUri && (fileUri.startsWith('file://') || fileUri.startsWith('content://'))) {
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      type: fileType || 'application/pdf',
      name: fileName || 'syllabus.pdf',
    });

    const uploadResponse = await client.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const fileData = uploadResponse.data.data;

    await client.patch(`/subjects/${subjectId}`, {
      syllabusFile: {
        url: fileData.url,
        publicId: fileData.publicId,
        originalName: fileData.originalName,
        mimeType: fileData.mimeType,
        size: fileData.size,
      }
    });
  }

  // Call the extract endpoint (backend reads the subject's saved syllabusFile from database)
  const extractResponse = await client.post(`/subjects/${subjectId}/syllabus/extract`);
  return extractResponse.data;
};

export const confirmSyllabus = async (subjectId, units) => {
  const response = await client.post(`/subjects/${subjectId}/syllabus/confirm`, { units });
  return response.data;
};

export const updateTopicCompletion = async (topicId, completed) => {
  const response = await client.patch(`/topics/${topicId}`, { completed });
  return response.data;
};

export const getUnits = async (subjectId) => {
  const response = await client.get(`/units?subjectId=${subjectId}`);
  return response.data;
};

export const getTopics = async (subjectId) => {
  const response = await client.get(`/topics?subjectId=${subjectId}`);
  return response.data;
};
