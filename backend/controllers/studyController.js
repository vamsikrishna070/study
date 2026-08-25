import Exam from "../models/Exam.js";
import ImportantPoint from "../models/ImportantPoint.js";
import Note from "../models/Note.js";
import Notification from "../models/Notification.js";
import Recording from "../models/Recording.js";
import Resource from "../models/Resource.js";
import StudySession from "../models/StudySession.js";
import Subject from "../models/Subject.js";
import Task from "../models/Task.js";
import Topic from "../models/Topic.js";
import Unit from "../models/Unit.js";

const dayStart = (value = new Date()) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};
const id = (doc) => doc?._id?.toString?.() || doc?.id;
const subjectName = (subject, customSubject) => {
  if (customSubject && typeof customSubject === "string" && customSubject.trim()) {
    return customSubject.trim();
  }
  return typeof subject === "object"
    ? subject?.name || "Unassigned"
    : subject || "Unassigned";
};

const populateItems = (Model, filter) =>
  Model.find(filter).populate("subject", "name code color").sort({ createdAt: -1 });

const serialize = (doc) => {
  if (!doc) return doc;
  const value = doc.toObject ? doc.toObject() : doc;
  const subjId =
    value.subject?._id?.toString?.() ||
    (value.subject && typeof value.subject === "string" && value.subject.length === 24
      ? value.subject
      : null) ||
    value.subjectId ||
    null;

  let attachments = value.attachments || [];
  if (attachments.length === 0 && (value.fileData?.url || value.url)) {
    attachments = [{
      _id: value.fileData?.publicId || value._id || 'legacy_1',
      id: value.fileData?.publicId || value._id || 'legacy_1',
      publicId: value.fileData?.publicId || '',
      name: value.fileData?.originalName || value.title || 'Attachment',
      originalName: value.fileData?.originalName || value.title || 'Attachment',
      url: value.fileData?.url || value.url,
      mimeType: value.fileData?.mimeType || 'application/pdf',
      type: value.resourceType || 'file',
      size: value.fileData?.size || 0,
      createdAt: value.createdAt || new Date(),
    }];
  } else if (attachments.length > 0) {
    attachments = attachments.map((att, idx) => ({
      ...att,
      id: att._id?.toString?.() || att.id || att.publicId || `att_${idx}`,
      name: att.name || att.originalName || 'Attachment',
    }));
  }

  const taskStatus = value.status === 'in-progress' ? 'in_progress' : (value.status || 'pending');

  return {
    ...value,
    id: id(doc),
    _id: id(doc),
    attachments,
    subjectId: subjId,
    subject: subjectName(value.subject, value.customSubject),
    customSubject: value.customSubject || "",
    status: taskStatus,
    addedAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
};
const owned = (Model, user, itemId) => Model.findOne({ _id: itemId, user });
const required = (body, fields) =>
  fields.every((field) => body[field] !== undefined && body[field] !== "");

export async function getSubjects(req, res) {
  const items = await Subject.find({ user: req.user._id }).sort({
    createdAt: -1,
  });
  res.json({ success: true, data: items.map(serialize) });
}
export async function getSubject(req, res) {
  const item = await owned(Subject, req.user._id, req.params.id);
  if (!item) return res.status(404).json({ success: false, message: "Subject not found" });
  res.json({ success: true, data: serialize(item) });
}
export async function createSubject(req, res) {
  if (!required(req.body, ["name", "code", "credits"]))
    return res
      .status(400)
      .json({
        success: false,
        message: "Name, code, and credits are required",
      });
  const item = await Subject.create({ ...req.body, user: req.user._id });
  res.status(201).json({ success: true, data: serialize(item) });
}
export async function updateSubject(req, res) {
  const item = await owned(Subject, req.user._id, req.params.id);
  if (!item)
    return res
      .status(404)
      .json({ success: false, message: "Subject not found" });

  const clearingSyllabus = req.body.syllabusFile === null || (req.body.syllabusFile && req.body.syllabusFile.url === '');

  Object.assign(item, req.body);
  await item.save();

  if (clearingSyllabus) {
    await Topic.deleteMany({ subject: item._id });
    await Unit.deleteMany({ subject: item._id });
  }

  res.json({ success: true, data: serialize(item) });
}
export async function deleteSubject(req, res) {
  const item = await owned(Subject, req.user._id, req.params.id);
  if (!item)
    return res
      .status(404)
      .json({ success: false, message: "Subject not found" });
  await item.deleteOne();
  res.status(204).end();
}

export async function getUnits(req, res) {
  const filter = { user: req.user._id };
  if (req.query.subjectId) filter.subject = req.query.subjectId;
  const items = await Unit.find(filter).populate("subject", "name code color").sort({ order: 1, createdAt: 1 });
  res.json({ success: true, data: items.map(serialize) });
}
export async function createUnit(req, res) {
  if (!required(req.body, ["title", "subjectId"]))
    return res
      .status(400)
      .json({ success: false, message: "Title and subject are required" });
  const item = await Unit.create({
    ...req.body,
    subject: req.body.subjectId,
    user: req.user._id,
  });
  await item.populate("subject", "name");
  res.status(201).json({ success: true, data: serialize(item) });
}
export async function updateUnit(req, res) {
  const item = await owned(Unit, req.user._id, req.params.id);
  if (!item)
    return res.status(404).json({ success: false, message: "Unit not found" });
  Object.assign(item, req.body);
  if (req.body.subjectId) item.subject = req.body.subjectId;
  await item.save();
  await item.populate("subject", "name");
  res.json({ success: true, data: serialize(item) });
}
export async function deleteUnit(req, res) {
  const item = await owned(Unit, req.user._id, req.params.id);
  if (!item)
    return res.status(404).json({ success: false, message: "Unit not found" });
  await item.deleteOne();
  res.status(204).end();
}

export async function getTopics(req, res) {
  const filter = { user: req.user._id };
  if (req.query.subjectId) filter.subject = req.query.subjectId;
  if (req.query.unitId) filter.unit = req.query.unitId;
  const items = await Topic.find(filter).populate("subject", "name code color").sort({ createdAt: 1 });
  res.json({ success: true, data: items.map(serialize) });
}
export async function createTopic(req, res) {
  if (!required(req.body, ["title", "subjectId"]))
    return res
      .status(400)
      .json({ success: false, message: "Title and subject are required" });
  const item = await Topic.create({
    ...req.body,
    subject: req.body.subjectId,
    user: req.user._id,
  });
  await item.populate("subject", "name");
  res.status(201).json({ success: true, data: serialize(item) });
}
export async function updateTopic(req, res) {
  const item = await owned(Topic, req.user._id, req.params.id);
  if (!item)
    return res.status(404).json({ success: false, message: "Topic not found" });
  Object.assign(item, req.body);
  if (req.body.subjectId) item.subject = req.body.subjectId;
  await item.save();
  await item.populate("subject", "name");
  res.json({ success: true, data: serialize(item) });
}
export async function deleteTopic(req, res) {
  const item = await owned(Topic, req.user._id, req.params.id);
  if (!item)
    return res.status(404).json({ success: false, message: "Topic not found" });
  await item.deleteOne();
  res.status(204).end();
}

export async function getNotes(req, res) {
  const filter = { user: req.user._id };
  if (req.query.subjectId) filter.subject = req.query.subjectId;
  let query = Note.find(filter)
    .populate("subject", "name")
    .sort({ updatedAt: -1 });
  if (req.query.search)
    query = query.find({ $text: { $search: req.query.search } });
  const items = await query;
  const search = String(req.query.search || "").toLowerCase();
  const data = items
    .map(serialize)
    .filter(
      (item) =>
        !search ||
        `${item.title} ${item.content} ${item.subject} ${item.customSubject || ""} ${item.topic} ${(item.tags || []).join(" ")}`
          .toLowerCase()
          .includes(search),
    );
  res.json({ success: true, data });
}
export async function createNote(req, res) {
  const { title, subjectId, customSubject } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({
      success: false,
      message: "Title is required",
    });
  }

  const cleanCustomSubject = typeof customSubject === "string" ? customSubject.trim() : "";
  const hasSubjectId =
    subjectId &&
    subjectId !== "other" &&
    subjectId !== "Other" &&
    subjectId !== "";

  if (!hasSubjectId && !cleanCustomSubject) {
    return res.status(400).json({
      success: false,
      message: "Title and subject are required",
    });
  }

  let subject = null;
  if (hasSubjectId) {
    subject = await owned(Subject, req.user._id, subjectId);
    if (!subject) {
      return res.status(404).json({ success: false, message: "Subject not found" });
    }
  }

  const item = await Note.create({
    ...req.body,
    subject: subject ? subject._id : null,
    customSubject: cleanCustomSubject,
    user: req.user._id,
  });

  if (subject) {
    await item.populate("subject", "name");
  }

  res.status(201).json({ success: true, data: serialize(item) });
}
export async function updateNote(req, res) {
  const item = await owned(Note, req.user._id, req.params.id);
  if (!item) {
    return res.status(404).json({ success: false, message: "Note not found" });
  }

  const { subjectId, customSubject } = req.body;
  const hasSubjectId =
    subjectId &&
    subjectId !== "other" &&
    subjectId !== "Other" &&
    subjectId !== "";
  const cleanCustomSubject =
    typeof customSubject === "string"
      ? customSubject.trim()
      : customSubject !== undefined
      ? ""
      : item.customSubject;

  if (subjectId !== undefined || customSubject !== undefined) {
    if (!hasSubjectId && !cleanCustomSubject) {
      return res.status(400).json({
        success: false,
        message: "Title and subject are required",
      });
    }
  }

  if (hasSubjectId) {
    const subject = await owned(Subject, req.user._id, subjectId);
    if (!subject) {
      return res.status(404).json({ success: false, message: "Subject not found" });
    }
    item.subject = subject._id;
    item.customSubject = "";
  } else if (cleanCustomSubject) {
    item.subject = null;
    item.customSubject = cleanCustomSubject;
  }

  Object.assign(item, {
    ...req.body,
    subject: item.subject,
    customSubject: item.customSubject,
  });
  await item.save();
  if (item.subject) {
    await item.populate("subject", "name");
  }
  res.json({ success: true, data: serialize(item) });
}
export async function deleteNote(req, res) {
  const item = await owned(Note, req.user._id, req.params.id);
  if (!item)
    return res.status(404).json({ success: false, message: "Note not found" });
  await item.deleteOne();
  res.status(204).end();
}

export async function getTasks(req, res) {
  const items = await populateItems(Task, { user: req.user._id });
  res.json({ success: true, data: items.map(serialize) });
}
export async function createTask(req, res) {
  if (!required(req.body, ["title", "dueDate", "subjectId"]))
    return res
      .status(400)
      .json({
        success: false,
        message: "Title, due date, and subject are required",
      });

  let scheduledStartAt = req.body.scheduledStartAt ? new Date(req.body.scheduledStartAt) : null;
  if (!scheduledStartAt && req.body.dueDate && req.body.dueTime) {
    try {
      const [hours, minutes] = req.body.dueTime.split(':').map(Number);
      const d = new Date(req.body.dueDate);
      if (!isNaN(hours) && !isNaN(minutes) && !isNaN(d.getTime())) {
        d.setHours(hours, minutes, 0, 0);
        scheduledStartAt = d;
      }
    } catch (_) {}
  }

  const initialStatus = req.body.status === 'in-progress' ? 'in_progress' : (req.body.status || 'pending');

  const item = await Task.create({
    ...req.body,
    status: initialStatus,
    scheduledStartAt,
    subject: req.body.subjectId,
    user: req.user._id,
  });
  await item.populate("subject", "name");
  res.status(201).json({ success: true, data: serialize(item) });
}

export async function updateTask(req, res) {
  const item = await owned(Task, req.user._id, req.params.id);
  if (!item)
    return res.status(404).json({ success: false, message: "Task not found" });

  const prevStatus = item.status === 'in-progress' ? 'in_progress' : (item.status || 'pending');
  Object.assign(item, req.body);

  if (req.body.status) {
    const targetStatus = req.body.status === 'in-progress' ? 'in_progress' : req.body.status;
    item.status = targetStatus;

    if (targetStatus === 'in_progress' && prevStatus !== 'in_progress') {
      const now = new Date();
      if (!item.startedAt) item.startedAt = now;
      item.lastStartedAt = now;
    } else if (targetStatus === 'paused' && prevStatus === 'in_progress') {
      const now = new Date();
      item.stoppedAt = now;
    } else if (targetStatus === 'completed') {
      const now = new Date();
      item.completedAt = now;
    } else if (targetStatus === 'pending') {
      item.completedAt = null;
    }
  }

  if (req.body.subjectId) item.subject = req.body.subjectId;

  if (!item.scheduledStartAt && item.dueDate && item.dueTime) {
    try {
      const [hours, minutes] = item.dueTime.split(':').map(Number);
      const d = new Date(item.dueDate);
      if (!isNaN(hours) && !isNaN(minutes) && !isNaN(d.getTime())) {
        d.setHours(hours, minutes, 0, 0);
        item.scheduledStartAt = d;
      }
    } catch (_) {}
  }

  await item.save();
  await item.populate("subject", "name");
  res.json({ success: true, data: serialize(item) });
}
export async function deleteTask(req, res) {
  const item = await owned(Task, req.user._id, req.params.id);
  if (!item)
    return res.status(404).json({ success: false, message: "Task not found" });
  await item.deleteOne();
  res.status(204).end();
}

export async function getExams(req, res) {
  const items = await populateItems(Exam, { user: req.user._id });
  const today = dayStart();
  res.json({
    success: true,
    data: items.map((item) => ({
      ...serialize(item),
      date: item.date,
      daysLeft: Math.ceil((new Date(item.date) - today) / 86400000),
      progress: item.subject?.progress || 0,
    })),
  });
}
export async function createExam(req, res) {
  if (!required(req.body, ["name", "date", "subjectId"]))
    return res
      .status(400)
      .json({
        success: false,
        message: "Name, date, and subject are required",
      });
  const item = await Exam.create({
    ...req.body,
    subject: req.body.subjectId,
    user: req.user._id,
  });
  await item.populate("subject", "name progress");
  res.status(201).json({ success: true, data: serialize(item) });
}
export async function updateExam(req, res) {
  const item = await owned(Exam, req.user._id, req.params.id);
  if (!item)
    return res.status(404).json({ success: false, message: "Exam not found" });
  Object.assign(item, req.body);
  if (req.body.subjectId) item.subject = req.body.subjectId;
  await item.save();
  await item.populate("subject", "name progress");
  res.json({ success: true, data: serialize(item) });
}
export async function deleteExam(req, res) {
  const item = await owned(Exam, req.user._id, req.params.id);
  if (!item)
    return res.status(404).json({ success: false, message: "Exam not found" });
  await item.deleteOne();
  res.status(204).end();
}

export async function getResources(req, res) {
  const filter = { user: req.user._id };
  if (req.query.subjectId) filter.subject = req.query.subjectId;
  const items = await populateItems(Resource, filter);
  res.json({ success: true, data: items.map(serialize) });
}
export async function createResource(req, res) {
  if (!req.body.title)
    return res
      .status(400)
      .json({ success: false, message: "Title is required" });

  // Normalize attachments — handle JSON string from multipart/form-data
  if (req.body.attachments && typeof req.body.attachments === 'string') {
    try { req.body.attachments = JSON.parse(req.body.attachments); } catch { req.body.attachments = []; }
  }
  if (req.body.attachments && !Array.isArray(req.body.attachments)) {
    req.body.attachments = [];
  }

  const item = await Resource.create({
    ...req.body,
    subject: req.body.subjectId || null,
    user: req.user._id,
  });
  await item.populate("subject", "name");
  res.status(201).json({ success: true, data: serialize(item) });
}
export async function updateResource(req, res) {
  const item = await owned(Resource, req.user._id, req.params.id);
  if (!item)
    return res
      .status(404)
      .json({ success: false, message: "Resource not found" });

  // Normalize attachments — handle JSON string from multipart/form-data
  if (req.body.attachments && typeof req.body.attachments === 'string') {
    try { req.body.attachments = JSON.parse(req.body.attachments); } catch { req.body.attachments = []; }
  }
  if (req.body.attachments && !Array.isArray(req.body.attachments)) {
    req.body.attachments = [];
  }

  Object.assign(item, req.body);
  if (req.body.subjectId) item.subject = req.body.subjectId;
  await item.save();
  await item.populate("subject", "name");
  res.json({ success: true, data: serialize(item) });
}
export async function deleteResource(req, res) {
  const item = await owned(Resource, req.user._id, req.params.id);
  if (!item)
    return res
      .status(404)
      .json({ success: false, message: "Resource not found" });
  await item.deleteOne();
  res.status(204).end();
}

export async function getDashboard(req, res) {
  const [user, subjects, exams, tasks, notes, resources, sessions] =
    await Promise.all([
      req.user.constructor.findById(req.user._id),
      Subject.find({ user: req.user._id }).sort({ createdAt: -1 }),
      Exam.find({ user: req.user._id })
        .populate("subject", "name progress")
        .sort({ date: 1 }),
      Task.find({ user: req.user._id })
        .populate("subject", "name")
        .sort({ dueDate: 1 }),
      Note.find({ user: req.user._id })
        .populate("subject", "name")
        .sort({ updatedAt: -1 })
        .limit(5),
      Resource.find({ user: req.user._id })
        .populate("subject", "name")
        .sort({ createdAt: -1 })
        .limit(5),
      StudySession.find({
        user: req.user._id,
        startedAt: { $gte: dayStart(new Date(Date.now() - 7 * 86400000)) },
      }),
    ]);
  const allTopics = await Topic.find({ user: req.user._id });
  const subjectsWithProgress = subjects.map((sub) => {
    const subTopics = allTopics.filter(
      (t) => String(t.subject) === String(sub._id),
    );
    const completed = subTopics.filter((t) => t.status === "completed").length;
    const progress =
      subTopics.length > 0
        ? Math.round((completed / subTopics.length) * 100)
        : 0;
    return { ...sub.toObject(), progress };
  });

  const overallProgress = subjectsWithProgress.length
    ? Math.round(
        subjectsWithProgress.reduce((sum, item) => sum + item.progress, 0) /
          subjectsWithProgress.length,
      )
    : 0;
  const today = dayStart();
  const dayName = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(
    today,
  );

  // Calculate real streak
  const allSessions = await StudySession.find({ user: req.user._id }).sort({
    startedAt: -1,
  });
  let streak = 0;
  let current = today;
  for (const session of allSessions) {
    const sDate = dayStart(session.startedAt);
    if (sDate.getTime() === current.getTime()) {
      // counted
    } else if (sDate.getTime() === current.getTime() - 86400000) {
      streak++;
      current = sDate;
    } else if (sDate.getTime() < current.getTime() - 86400000) {
      break; // Gap found
    }
  }
  if (
    allSessions.some((s) => dayStart(s.startedAt).getTime() === today.getTime())
  )
    streak = Math.max(1, streak + 1);

  res.json({
    success: true,
    data: {
      user: {
        name: user.name,
        initials: user.name
          .split(" ")
          .map((part) => part[0])
          .join("")
          .slice(0, 2),
        university: user.university,
        degree: user.degree,
        branch: user.branch,
        profileImageUrl: user.profileImageUrl || "",
        profileImagePublicId: user.profileImagePublicId || "",
      },
      semester: user.semester,
      stats: {
        totalSubjects: subjects.length,
        totalCredits: subjects.reduce((sum, item) => sum + item.credits, 0),
        overallProgress,
        studyHours:
          Math.round(
            (sessions.reduce((sum, item) => sum + item.durationMinutes, 0) /
              60) *
              10,
          ) / 10,
        streak,
      },
      subjects: subjectsWithProgress.map(serialize),
      upcomingExams: exams
        .filter((item) => new Date(item.date) >= today)
        .map((item) => ({
          ...serialize(item),
          daysLeft: Math.ceil((new Date(item.date) - today) / 86400000),
          progress: item.subject?.progress || 0,
        })),
      todayTasks: tasks
        .filter((item) => dayStart(item.dueDate).getTime() === today.getTime())
        .map(serialize),
      recentActivity: [
        ...notes.map((item) => ({
          id: id(item),
          type: "note",
          title: "Note created",
          detail: item.title,
          time: item.updatedAt,
        })),
        ...resources.map((item) => ({
          id: id(item),
          type: "resource",
          title: "Resource saved",
          detail: item.title,
          time: item.createdAt,
        })),
      ].slice(0, 5),
      dayName,
    },
  });
}

export async function getProgress(req, res) {
  const [subjects, sessions, topics] = await Promise.all([
    Subject.find({ user: req.user._id }),
    StudySession.find({ user: req.user._id })
      .sort({ startedAt: -1 })
      .limit(100),
    Topic.find({ user: req.user._id }),
  ]);
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weeklyHours = labels.map((label, index) => ({
    label,
    value:
      Math.round(
        (sessions
          .filter(
            (session) =>
              new Date(session.startedAt).getDay() === (index + 1) % 7,
          )
          .reduce((sum, session) => sum + session.durationMinutes, 0) /
          60) *
          10,
      ) / 10,
  }));

  const completedTopics = subjects.map((subject) => {
    const subjectTopics = topics.filter(
      (t) => t.subject?.toString() === subject._id.toString(),
    );
    return {
      subject: subject.name,
      completed: subjectTopics.filter((t) => t.completed).length,
      total: subjectTopics.length,
    };
  });

  res.json({
    success: true,
    data: {
      overall: subjects.length
        ? Math.round(
            subjects.reduce((sum, item) => sum + item.progress, 0) /
              subjects.length,
          )
        : 0,
      weeklyHours,
      subjectProgress: subjects.map((item) => ({
        subject: item.code,
        progress: item.progress,
      })),
      weeklyActivity: weeklyHours.map((item, index) => ({
        label: `W${index + 1}`,
        value: Math.round(item.value * 10) / 10,
      })),
      completedTopics,
    },
  });
}

export async function getImportantPoints(req, res) {
  const filter = { user: req.user._id };
  if (req.query.subjectId) filter.subject = req.query.subjectId;
  const items = await populateItems(ImportantPoint, filter);
  res.json({ success: true, data: items.map(serialize) });
}
export async function createImportantPoint(req, res) {
  if (!required(req.body, ["title", "content", "subjectId"]))
    return res
      .status(400)
      .json({
        success: false,
        message: "Title, content and subject are required",
      });
  const item = await ImportantPoint.create({
    ...req.body,
    subject: req.body.subjectId,
    user: req.user._id,
  });
  await item.populate("subject", "name");
  res.status(201).json({ success: true, data: serialize(item) });
}
export async function updateImportantPoint(req, res) {
  const item = await owned(ImportantPoint, req.user._id, req.params.id);
  if (!item)
    return res
      .status(404)
      .json({ success: false, message: "Important Point not found" });
  Object.assign(item, req.body);
  if (req.body.subjectId) item.subject = req.body.subjectId;
  await item.save();
  await item.populate("subject", "name");
  res.json({ success: true, data: serialize(item) });
}
export async function deleteImportantPoint(req, res) {
  const item = await owned(ImportantPoint, req.user._id, req.params.id);
  if (!item)
    return res
      .status(404)
      .json({ success: false, message: "Important Point not found" });
  await item.deleteOne();
  res.status(204).end();
}

export async function getRecordings(req, res) {
  const items = await populateItems(Recording, { user: req.user._id });
  res.json({ success: true, data: items.map(serialize) });
}
export async function createRecording(req, res) {
  if (!required(req.body, ["title"]))
    return res
      .status(400)
      .json({ success: false, message: "Title is required" });
  const item = await Recording.create({
    ...req.body,
    subject: req.body.subjectId || null,
    user: req.user._id,
  });
  await item.populate("subject", "name");
  res.status(201).json({ success: true, data: serialize(item) });
}
export async function updateRecording(req, res) {
  const item = await owned(Recording, req.user._id, req.params.id);
  if (!item)
    return res
      .status(404)
      .json({ success: false, message: "Recording not found" });
  Object.assign(item, req.body);
  if (req.body.subjectId) item.subject = req.body.subjectId;
  await item.save();
  await item.populate("subject", "name");
  res.json({ success: true, data: serialize(item) });
}
export async function deleteRecording(req, res) {
  const item = await owned(Recording, req.user._id, req.params.id);
  if (!item)
    return res
      .status(404)
      .json({ success: false, message: "Recording not found" });
  await item.deleteOne();
  res.status(204).end();
}

export async function getStudySessions(req, res) {
  const filter = { user: req.user._id };
  if (req.query.subjectId) filter.subject = req.query.subjectId;
  if (req.query.sessionType) filter.sessionType = req.query.sessionType;

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    StudySession.find(filter)
      .populate("subject", "name code color")
      .populate("task", "title")
      .populate("exam", "name")
      .sort({ startedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    StudySession.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: items.map(serialize),
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    },
  });
}

export async function createStudySession(req, res) {
  const {
    subjectId,
    subjectName: customSubjectName,
    topic,
    taskId,
    examId,
    sessionType = 'timer',
    status = 'completed',
    startedAt = new Date(),
    endedAt,
    pausedAt,
    totalPausedMs = 0,
    durationMinutes,
    productivity,
    goal,
    notes,
  } = req.body;

  let computedDuration = Number(durationMinutes) || 0;
  if (!computedDuration && startedAt && endedAt) {
    const elapsedMs = new Date(endedAt) - new Date(startedAt) - (Number(totalPausedMs) || 0);
    computedDuration = Math.max(1, Math.round(elapsedMs / 60000));
  }

  let finalSubjectName = customSubjectName || '';
  if (subjectId && !finalSubjectName) {
    const sub = await Subject.findOne({ _id: subjectId, user: req.user._id });
    if (sub) finalSubjectName = sub.name;
  }

  const item = await StudySession.create({
    user: req.user._id,
    subject: subjectId || null,
    subjectName: finalSubjectName,
    topic: (topic || '').trim(),
    task: taskId || null,
    exam: examId || null,
    sessionType,
    status,
    startedAt: new Date(startedAt),
    endedAt: endedAt ? new Date(endedAt) : (status === 'completed' ? new Date() : null),
    pausedAt: pausedAt ? new Date(pausedAt) : null,
    totalPausedMs: Number(totalPausedMs) || 0,
    durationMinutes: computedDuration,
    productivity: productivity || null,
    goal: (goal || '').trim(),
    notes: (notes || '').trim(),
  });

  await item.populate([
    { path: 'subject', select: 'name code color' },
    { path: 'task', select: 'title' },
    { path: 'exam', select: 'name' },
  ]);

  res.status(201).json({ success: true, data: serialize(item) });
}

export async function updateStudySession(req, res) {
  const item = await owned(StudySession, req.user._id, req.params.id);
  if (!item) {
    return res.status(404).json({ success: false, message: 'Study Session not found' });
  }

  const {
    status,
    endedAt,
    pausedAt,
    totalPausedMs,
    durationMinutes,
    productivity,
    notes,
    goal,
    topic,
  } = req.body;

  if (status !== undefined) item.status = status;
  if (endedAt !== undefined) item.endedAt = endedAt ? new Date(endedAt) : null;
  if (pausedAt !== undefined) item.pausedAt = pausedAt ? new Date(pausedAt) : null;
  if (totalPausedMs !== undefined) item.totalPausedMs = Number(totalPausedMs) || 0;
  if (productivity !== undefined) item.productivity = productivity;
  if (notes !== undefined) item.notes = notes.trim();
  if (goal !== undefined) item.goal = goal.trim();
  if (topic !== undefined) item.topic = topic.trim();

  if (durationMinutes !== undefined) {
    item.durationMinutes = Number(durationMinutes) || 0;
  } else if (item.status === 'completed' && item.startedAt && item.endedAt) {
    const elapsedMs = new Date(item.endedAt) - new Date(item.startedAt) - (item.totalPausedMs || 0);
    item.durationMinutes = Math.max(1, Math.round(elapsedMs / 60000));
  }

  await item.save();
  await item.populate([
    { path: 'subject', select: 'name code color' },
    { path: 'task', select: 'title' },
    { path: 'exam', select: 'name' },
  ]);

  res.json({ success: true, data: serialize(item) });
}

export async function deleteStudySession(req, res) {
  const item = await owned(StudySession, req.user._id, req.params.id);
  if (!item)
    return res
      .status(404)
      .json({ success: false, message: "Study Session not found" });
  await item.deleteOne();
  res.status(204).end();
}

function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return '0m';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
}

export async function getStudyStats(req, res) {
  const userId = req.user._id;
  const now = new Date();
  const today = dayStart(now);
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - 6);
  const startOfMonth = new Date(today);
  startOfMonth.setDate(today.getDate() - 29);

  const allSessions = await StudySession.find({
    user: userId,
    status: { $ne: 'cancelled' },
  })
    .populate('subject', 'name code color')
    .sort({ startedAt: -1 })
    .lean();

  let todayMinutes = 0;
  let todayCount = 0;
  let weekMinutes = 0;
  let weekCount = 0;
  let monthMinutes = 0;
  let monthCount = 0;
  let totalMinutes = 0;

  const subjectMap = {};
  const dailyBreakdownMap = {};

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const dayLabel = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(d);
    dailyBreakdownMap[key] = { date: key, day: dayLabel, minutes: 0, hours: 0 };
  }

  allSessions.forEach((s) => {
    const dur = s.durationMinutes || 0;
    const sDate = s.startedAt ? new Date(s.startedAt) : new Date();
    const sDayStart = dayStart(sDate);
    const dateKey = sDate.toISOString().split('T')[0];

    totalMinutes += dur;

    if (sDayStart.getTime() === today.getTime()) {
      todayMinutes += dur;
      todayCount += 1;
    }

    if (sDayStart >= startOfWeek) {
      weekMinutes += dur;
      weekCount += 1;
    }

    if (sDayStart >= startOfMonth) {
      monthMinutes += dur;
      monthCount += 1;
    }

    if (dailyBreakdownMap[dateKey]) {
      dailyBreakdownMap[dateKey].minutes += dur;
      dailyBreakdownMap[dateKey].hours = Math.round((dailyBreakdownMap[dateKey].minutes / 60) * 10) / 10;
    }

    const subName = s.subject?.name || s.subjectName || 'General Study';
    const subColor = s.subject?.color || '#3b82f6';
    if (!subjectMap[subName]) {
      subjectMap[subName] = { name: subName, color: subColor, minutes: 0, sessions: 0 };
    }
    subjectMap[subName].minutes += dur;
    subjectMap[subName].sessions += 1;
  });

  let streak = 0;
  let checkDate = today;
  const distinctDays = [...new Set(allSessions.map(s => dayStart(s.startedAt).getTime()))].sort((a, b) => b - a);

  if (distinctDays.includes(today.getTime())) {
    streak = 1;
    checkDate = new Date(today.getTime() - 86400000);
    while (distinctDays.includes(checkDate.getTime())) {
      streak += 1;
      checkDate = new Date(checkDate.getTime() - 86400000);
    }
  } else if (distinctDays.includes(today.getTime() - 86400000)) {
    streak = 1;
    checkDate = new Date(today.getTime() - 2 * 86400000);
    while (distinctDays.includes(checkDate.getTime())) {
      streak += 1;
      checkDate = new Date(checkDate.getTime() - 86400000);
    }
  }

  const subjectDistribution = Object.values(subjectMap)
    .map((sub) => ({
      ...sub,
      hours: Math.round((sub.minutes / 60) * 10) / 10,
      percentage: totalMinutes > 0 ? Math.round((sub.minutes / totalMinutes) * 100) : 0,
    }))
    .sort((a, b) => b.minutes - a.minutes);

  const topSubject = subjectDistribution[0] || null;
  const avgSessionDuration = allSessions.length > 0 ? Math.round(totalMinutes / allSessions.length) : 0;

  res.json({
    success: true,
    data: {
      today: {
        minutes: todayMinutes,
        hours: Math.round((todayMinutes / 60) * 10) / 10,
        formatted: formatDuration(todayMinutes),
        sessionsCount: todayCount,
      },
      thisWeek: {
        minutes: weekMinutes,
        hours: Math.round((weekMinutes / 60) * 10) / 10,
        formatted: formatDuration(weekMinutes),
        sessionsCount: weekCount,
      },
      thisMonth: {
        minutes: monthMinutes,
        hours: Math.round((monthMinutes / 60) * 10) / 10,
        formatted: formatDuration(monthMinutes),
        sessionsCount: monthCount,
      },
      total: {
        minutes: totalMinutes,
        hours: Math.round((totalMinutes / 60) * 10) / 10,
        formatted: formatDuration(totalMinutes),
        sessionsCount: allSessions.length,
      },
      streak,
      averageDurationMinutes: avgSessionDuration,
      averageDurationFormatted: formatDuration(avgSessionDuration),
      topSubject,
      subjectDistribution,
      weeklyChart: Object.values(dailyBreakdownMap),
      recentSessions: allSessions.slice(0, 5).map(serialize),
    },
  });
}

export async function getNotifications(req, res) {
  const items = await Notification.find({ user: req.user._id }).sort({
    createdAt: -1,
  });
  res.json({ success: true, data: items.map(serialize) });
}
export async function readNotification(req, res) {
  const item = await owned(Notification, req.user._id, req.params.id);
  if (!item)
    return res
      .status(404)
      .json({ success: false, message: "Notification not found" });
  item.readAt = new Date();
  await item.save();
  res.json({ success: true, data: serialize(item) });
}
export async function readAllNotifications(req, res) {
  await Notification.updateMany(
    { user: req.user._id, readAt: null },
    { readAt: new Date() },
  );
  res.json({ success: true, data: null });
}
export async function deleteNotification(req, res) {
  const item = await owned(Notification, req.user._id, req.params.id);
  if (!item)
    return res
      .status(404)
      .json({ success: false, message: "Notification not found" });
  await item.deleteOne();
  res.status(204).end();
}

export async function searchGlobal(req, res) {
  const query = String(req.query.q || "").toLowerCase();
  if (!query) return res.json({ success: true, data: [] });
  const userId = req.user._id;

  const [subjects, topics, notes, tasks, exams, resources, recordings, points] =
    await Promise.all([
      Subject.find({ user: userId }),
      Topic.find({ user: userId }).populate("subject", "name"),
      Note.find({ user: userId }).populate("subject", "name"),
      Task.find({ user: userId }).populate("subject", "name"),
      Exam.find({ user: userId }).populate("subject", "name"),
      Resource.find({ user: userId }).populate("subject", "name"),
      Recording.find({ user: userId }).populate("subject", "name"),
      ImportantPoint.find({ user: userId }).populate("subject", "name"),
    ]);

  const results = [];
  const match = (text) => (text || "").toLowerCase().includes(query);

  subjects
    .filter((s) => match(s.name) || match(s.code))
    .forEach((s) =>
      results.push({
        type: "subject",
        id: s._id,
        title: s.name,
        detail: s.code,
        route: "/subjects",
      }),
    );
  topics
    .filter((t) => match(t.title) || match(t.description))
    .forEach((t) =>
      results.push({
        type: "topic",
        id: t._id,
        title: t.title,
        detail: t.subject?.name,
        route: "/subjects",
      }),
    );
  notes
    .filter((n) => match(n.title) || match(n.content))
    .forEach((n) =>
      results.push({
        type: "note",
        id: n._id,
        title: n.title,
        detail: n.subject?.name,
        route: "/notes",
      }),
    );
  tasks
    .filter((t) => match(t.title) || match(t.description))
    .forEach((t) =>
      results.push({
        type: "task",
        id: t._id,
        title: t.title,
        detail: t.subject?.name,
        route: "/tasks",
      }),
    );
  exams
    .filter((e) => match(e.name))
    .forEach((e) =>
      results.push({
        type: "exam",
        id: e._id,
        title: e.name,
        detail: e.subject?.name,
        route: "/exams",
      }),
    );
  resources
    .filter((r) => match(r.title) || match(r.description))
    .forEach((r) =>
      results.push({
        type: "resource",
        id: r._id,
        title: r.title,
        detail: r.subject?.name,
        route: "/resources",
      }),
    );
  recordings
    .filter((r) => match(r.title))
    .forEach((r) =>
      results.push({
        type: "recording",
        id: r._id,
        title: r.title,
        detail: r.subject?.name,
        route: "/recordings",
      }),
    );
  points
    .filter((p) => match(p.title) || match(p.content))
    .forEach((p) =>
      results.push({
        type: "important-point",
        id: p._id,
        title: p.title,
        detail: p.subject?.name,
        route: "/important-points",
      }),
    );

  res.json({ success: true, data: results.slice(0, 50) });
}
