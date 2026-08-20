import client from './client';

export const extractSyllabus = async (subjectId, fileUri, fileType, fileName) => {
  // 1. Upload the file to the general /upload endpoint
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

  // 2. Patch the subject with the new syllabusFile
  await client.patch(`/subjects/${subjectId}`, {
    syllabusFile: {
      url: fileData.url,
      publicId: fileData.publicId,
      originalName: fileData.originalName,
      mimeType: fileData.mimeType,
      size: fileData.size,
    }
  });

  // 3. Call the extract endpoint (backend will use the saved URL)
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
