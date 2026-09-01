import mongoose from 'mongoose';
import College from '../models/College.js';

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

export async function getStates(_req, res) {
  try {
    const states = await College.distinct('state', { isActive: true });
    states.sort((a, b) => a.localeCompare(b));
    res.json({
      success: true,
      data: states,
      count: states.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch states',
      error: error.message,
    });
  }
}

export async function getColleges(req, res) {
  try {
    const {
      state,
      search,
      type,
      page = 1,
      limit = 20,
    } = req.query;

    const query = { isActive: true };

    if (state && typeof state === 'string' && state.trim()) {
      query.state = state.trim();
    }

    if (type && typeof type === 'string' && type.trim()) {
      query.type = type.trim();
    }

    if (search && typeof search === 'string' && search.trim()) {
      const trimmedSearch = search.trim();
      const safeSearch = escapeRegex(trimmedSearch);
      const searchRegex = new RegExp(safeSearch, 'i');

      query.$or = [
        { name: searchRegex },
        { shortName: searchRegex },
        { normalizedName: searchRegex },
        { city: searchRegex },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [colleges, total] = await Promise.all([
      College.find(query)
        .select('_id name shortName type state city district website')
        .sort({ state: 1, name: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      College.countDocuments(query),
    ]);

    const formattedData = colleges.map((c) => ({
      id: c._id,
      name: c.name,
      shortName: c.shortName,
      type: c.type,
      state: c.state,
      city: c.city,
      district: c.district,
      website: c.website,
    }));

    res.json({
      success: true,
      data: formattedData,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to search colleges',
      error: error.message,
    });
  }
}

export async function getCollegeById(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid college ID' });
    }

    const college = await College.findById(id).select('_id name shortName type state city district website').lean();
    if (!college) {
      return res.status(404).json({ success: false, message: 'College not found' });
    }

    res.json({
      success: true,
      data: {
        id: college._id,
        name: college.name,
        shortName: college.shortName,
        type: college.type,
        state: college.state,
        city: college.city,
        district: college.district,
        website: college.website,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch college details',
      error: error.message,
    });
  }
}
