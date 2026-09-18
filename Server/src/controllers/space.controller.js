import mongoose from 'mongoose';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import Space, {SPACE_DAYS} from '../models/space.model.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const localUploadsDir = path.resolve(__dirname, '../../uploads/spaces');
const tmpUploadsDir = path.join('/tmp', 'uploads', 'spaces');

let uploadsDir = localUploadsDir;
try {
  fs.mkdirSync(localUploadsDir, {recursive: true});
} catch {
  fs.mkdirSync(tmpUploadsDir, {recursive: true});
  uploadsDir = tmpUploadsDir;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname.replace(/\s+/g, '')}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  cb(null, allowed.test(file.mimetype));
};

export const uploadSpaceImage = multer({
  storage,
  fileFilter,
  limits: {fileSize: 5 * 1024 * 1024},
});

const ALLOWED_STATUS = new Set(['Available', 'Booked', 'Maintenance']);
const DAY_SET = new Set(SPACE_DAYS);

const escapeRegex = value =>
  String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeStatus = value => {
  const status = String(value || 'Available').trim();
  return ALLOWED_STATUS.has(status) ? status : 'Available';
};

const toMoney = value => Math.max(0, Number(value ?? 0) || 0);

/**
 * Normalize day from request / legacy docs.
 * Accepts: Weekday|Weekend|weekday|weekend
 * Legacy dual-price docs without `day` → null (caller expands).
 */
export const normalizeDay = value => {
  const raw = String(value ?? '').trim().toLowerCase();
  if (raw === 'weekday') return 'Weekday';
  if (raw === 'weekend') return 'Weekend';
  return null;
};

const nameDayClash = async (name, day, excludeId = null) => {
  const query = {
    name: new RegExp(`^${escapeRegex(name)}$`, 'i'),
    day,
  };
  if (excludeId) {
    query._id = {$ne: excludeId};
  }
  return Space.findOne(query).select('_id name day').lean();
};

/**
 * Legacy docs stored weekdayPrice + weekendPrice on one row.
 * Expand into one or two list rows without rewriting DB aggressively.
 */
const expandLegacySpace = doc => {
  const hasWeekdayField =
    doc.weekdayPrice !== undefined && doc.weekdayPrice !== null;
  const hasWeekendField =
    doc.weekendPrice !== undefined && doc.weekendPrice !== null;

  if (!hasWeekdayField && !hasWeekendField) {
    return [
      {
        ...doc,
        day: normalizeDay(doc.day) || 'Weekday',
        price: toMoney(doc.price),
      },
    ];
  }

  const rows = [];
  const weekday = toMoney(doc.weekdayPrice ?? doc.price);
  const weekend = toMoney(doc.weekendPrice ?? doc.price);

  rows.push({
    ...doc,
    day: 'Weekday',
    price: weekday,
    _legacyExpanded: true,
    _legacySourceId: String(doc._id),
  });

  // Only emit a weekend twin when weekend price was explicitly set
  // (including 0) on the dual-price document.
  if (hasWeekendField) {
    rows.push({
      ...doc,
      // Synthetic id so FE can distinguish rows; edit should create/migrate
      _id: `${doc._id}:Weekend`,
      day: 'Weekend',
      price: weekend,
      _legacyExpanded: true,
      _legacySourceId: String(doc._id),
      _legacyDay: 'Weekend',
    });
  }

  return rows;
};

const serializeSpace = doc => {
  const plain =
    typeof doc?.toObject === 'function' ? doc.toObject() : {...doc};
  const day = normalizeDay(plain.day);

  // New-model docs always have day
  if (day) {
    return {
      ...plain,
      day,
      price: toMoney(plain.price),
    };
  }

  // Legacy dual-price / missing day — expand for list consumers
  return expandLegacySpace(plain);
};

const buildSpacePayload = (body = {}, imageUrl, {partial = false} = {}) => {
  const name = String(body.name ?? '').trim();
  const payload = {};

  if (!partial || body.name !== undefined) payload.name = name;
  if (!partial || body.category !== undefined) {
    payload.category = String(body.category ?? 'Studio').trim() || 'Studio';
  }
  payload.itemType = 'space';

  if (!partial || body.day !== undefined) {
    const day = normalizeDay(body.day) || 'Weekday';
    if (!DAY_SET.has(day)) {
      return {name, payload, error: 'Day must be Weekday or Weekend.'};
    }
    payload.day = day;
  }

  if (!partial || body.price !== undefined) {
    // Prefer explicit price; fall back to legacy weekday/weekend fields if sent
    if (body.price !== undefined && body.price !== '') {
      payload.price = toMoney(body.price);
    } else if (body.weekdayPrice !== undefined && body.weekdayPrice !== '') {
      payload.price = toMoney(body.weekdayPrice);
      if (!payload.day) payload.day = 'Weekday';
    } else if (body.weekendPrice !== undefined && body.weekendPrice !== '') {
      payload.price = toMoney(body.weekendPrice);
      if (!payload.day) payload.day = 'Weekend';
    } else if (!partial) {
      payload.price = 0;
    }
  }

  if (!partial || body.capacity !== undefined) {
    payload.capacity = Math.max(1, Number(body.capacity ?? 1) || 1);
  }
  if (!partial || body.status !== undefined) {
    payload.status = normalizeStatus(body.status);
  }
  if (!partial || body.description !== undefined) {
    payload.description = String(body.description ?? '').trim();
  }

  if (imageUrl !== undefined) {
    payload.imageUrl = imageUrl;
  } else if (body.imageUrl !== undefined) {
    payload.imageUrl = body.imageUrl || null;
  }

  if (body.createdBy !== undefined) {
    payload.createdBy = body.createdBy;
  }

  return {name, payload};
};

const resolveImageUrl = async req => {
  if (!req.file?.path) return undefined;
  try {
    const uploadedUrl = await uploadOnCloudinary(req.file.path, {
      folder: 'woowoo/spaces',
    });
    return uploadedUrl || null;
  } catch (error) {
    console.error('space image upload error:', error);
    return null;
  }
};

export const createSpace = async (req, res) => {
  try {
    const imageUrl = await resolveImageUrl(req);
    const {name, payload, error} = buildSpacePayload(req.body, imageUrl);

    if (error) {
      return res.status(400).json({success: false, message: error});
    }
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Space name is required.',
      });
    }

    if (!payload.day) payload.day = 'Weekday';
    if (payload.price === undefined) payload.price = 0;

    const clash = await nameDayClash(name, payload.day);
    if (clash) {
      return res.status(409).json({
        success: false,
        message: `A space named "${name}" already exists for ${payload.day}.`,
      });
    }

    const staffFromReq = {
      m_staff_id: req.user?.userId ?? null,
      m_staff_name: req.user?.name ?? null,
      m_staff_email: req.user?.email ?? null,
    };

    // Strip legacy dual-price fields if somehow present
    delete payload.weekdayPrice;
    delete payload.weekendPrice;

    const space = await Space.create({
      ...payload,
      createdBy: payload.createdBy ?? staffFromReq,
    });

    return res.status(201).json({
      success: true,
      message: 'Space created successfully.',
      space: serializeSpace(space),
    });
  } catch (error) {
    console.error('createSpace error:', error);
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A space with this name and day already exists.',
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create space.',
    });
  }
};

export const getSpaces = async (req, res) => {
  try {
    const {search = '', category, status, day} = req.query;
    const query = {};

    if (category && String(category).trim() && String(category) !== 'All') {
      query.category = String(category).trim();
    }
    if (status && String(status).trim() && String(status) !== 'All') {
      query.status = normalizeStatus(status);
    }
    const dayFilter = normalizeDay(day);
    if (dayFilter) {
      query.day = dayFilter;
    }

    const s = String(search).trim();
    if (s) {
      query.$or = [
        {name: {$regex: s, $options: 'i'}},
        {category: {$regex: s, $options: 'i'}},
        {description: {$regex: s, $options: 'i'}},
      ];
    }

    const docs = await Space.find(query).sort({name: 1, day: 1, createdAt: -1});
    const spaces = docs.flatMap(doc => {
      const serialized = serializeSpace(doc);
      return Array.isArray(serialized) ? serialized : [serialized];
    });

    return res.status(200).json({
      success: true,
      message: 'Spaces fetched successfully.',
      spaces,
    });
  } catch (error) {
    console.error('getSpaces error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch spaces.',
    });
  }
};

export const getSpaceById = async (req, res) => {
  try {
    const {id} = req.params;

    // Legacy expanded weekend id: `<objectId>:Weekend`
    if (String(id).includes(':')) {
      const [sourceId, legacyDay] = String(id).split(':');
      if (!mongoose.Types.ObjectId.isValid(sourceId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid space id.',
        });
      }
      const source = await Space.findById(sourceId).lean();
      if (!source) {
        return res.status(404).json({
          success: false,
          message: 'Space not found.',
        });
      }
      const day = normalizeDay(legacyDay) || 'Weekend';
      const price =
        day === 'Weekend'
          ? toMoney(source.weekendPrice ?? source.price)
          : toMoney(source.weekdayPrice ?? source.price);
      return res.status(200).json({
        success: true,
        message: 'Space fetched successfully.',
        space: {
          ...source,
          _id: id,
          day,
          price,
          _legacyExpanded: true,
          _legacySourceId: sourceId,
        },
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid space id.',
      });
    }

    const space = await Space.findById(id);
    if (!space) {
      return res.status(404).json({
        success: false,
        message: 'Space not found.',
      });
    }

    const serialized = serializeSpace(space);
    return res.status(200).json({
      success: true,
      message: 'Space fetched successfully.',
      space: Array.isArray(serialized) ? serialized[0] : serialized,
    });
  } catch (error) {
    console.error('getSpaceById error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch space.',
    });
  }
};

export const updateSpace = async (req, res) => {
  try {
    let {id} = req.params;
    let legacySourceId = null;
    let legacyTargetDay = null;

    if (String(id).includes(':')) {
      const [sourceId, legacyDay] = String(id).split(':');
      legacySourceId = sourceId;
      legacyTargetDay = normalizeDay(legacyDay) || 'Weekend';
      id = sourceId;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid space id.',
      });
    }

    const existing = await Space.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Space not found.',
      });
    }

    const imageUrl = await resolveImageUrl(req);
    const {name, payload, error} = buildSpacePayload(req.body, imageUrl, {
      partial: true,
    });

    if (error) {
      return res.status(400).json({success: false, message: error});
    }
    if (req.body.name !== undefined && !name) {
      return res.status(400).json({
        success: false,
        message: 'Space name is required.',
      });
    }

    // Editing a legacy expanded "Weekend" twin → promote to real Weekend row
    if (legacySourceId && legacyTargetDay === 'Weekend') {
      const nextName = payload.name || existing.name;
      const nextDay = payload.day || 'Weekend';
      const nextPrice =
        payload.price !== undefined
          ? payload.price
          : toMoney(existing.weekendPrice ?? existing.price);

      const clash = await nameDayClash(nextName, nextDay, existing._id);
      // Allow if clash is the same legacy source being converted
      if (clash && String(clash._id) !== String(existing._id)) {
        // If weekend row already exists as its own doc, update that instead
        const weekendDoc = await Space.findOne({
          name: new RegExp(`^${escapeRegex(nextName)}$`, 'i'),
          day: 'Weekend',
        });
        if (weekendDoc) {
          Object.assign(weekendDoc, {
            ...payload,
            name: nextName,
            day: 'Weekend',
            price: nextPrice,
          });
          delete weekendDoc.weekdayPrice;
          delete weekendDoc.weekendPrice;
          await weekendDoc.save();
          return res.status(200).json({
            success: true,
            message: 'Space updated successfully.',
            space: serializeSpace(weekendDoc),
          });
        }
        return res.status(409).json({
          success: false,
          message: `A space named "${nextName}" already exists for ${nextDay}.`,
        });
      }

      // Convert legacy source: keep Weekday on original, create Weekend doc
      const existingDay = normalizeDay(existing.day);
      if (!existingDay) {
        existing.day = 'Weekday';
        existing.price = toMoney(existing.weekdayPrice ?? existing.price);
        existing.set('weekdayPrice', undefined);
        existing.set('weekendPrice', undefined);
        await existing.save();
      }

      const weekendPayload = {
        name: nextName,
        category: payload.category ?? existing.category,
        itemType: 'space',
        day: 'Weekend',
        price: nextPrice,
        capacity: payload.capacity ?? existing.capacity,
        status: payload.status ?? existing.status,
        description:
          payload.description !== undefined
            ? payload.description
            : existing.description,
        imageUrl:
          payload.imageUrl !== undefined
            ? payload.imageUrl
            : existing.imageUrl,
        createdBy: existing.createdBy,
      };

      try {
        const created = await Space.create(weekendPayload);
        return res.status(200).json({
          success: true,
          message: 'Space updated successfully.',
          space: serializeSpace(created),
        });
      } catch (createErr) {
        if (createErr?.code === 11000) {
          return res.status(409).json({
            success: false,
            message: `A space named "${nextName}" already exists for Weekend.`,
          });
        }
        throw createErr;
      }
    }

    const nextName = payload.name !== undefined ? payload.name : existing.name;
    const nextDay =
      payload.day !== undefined
        ? payload.day
        : normalizeDay(existing.day) || 'Weekday';

    const clash = await nameDayClash(nextName, nextDay, existing._id);
    if (clash) {
      return res.status(409).json({
        success: false,
        message: `A space named "${nextName}" already exists for ${nextDay}.`,
      });
    }

    // Migrating legacy dual-price doc into single-day model
    if (!normalizeDay(existing.day)) {
      payload.day = nextDay;
      if (payload.price === undefined) {
        payload.price =
          nextDay === 'Weekend'
            ? toMoney(existing.weekendPrice ?? existing.price)
            : toMoney(existing.weekdayPrice ?? existing.price);
      }
    }

    Object.assign(existing, payload);
    // Clear legacy fields so list no longer expands this doc
    existing.set('weekdayPrice', undefined);
    existing.set('weekendPrice', undefined);
    await existing.save();

    return res.status(200).json({
      success: true,
      message: 'Space updated successfully.',
      space: serializeSpace(existing),
    });
  } catch (error) {
    console.error('updateSpace error:', error);
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A space with this name and day already exists.',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Failed to update space.',
    });
  }
};

export const deleteSpace = async (req, res) => {
  try {
    let {id} = req.params;

    // Deleting synthetic Weekend expansion → create nothing; strip weekend from legacy
    if (String(id).includes(':')) {
      const [sourceId, legacyDay] = String(id).split(':');
      if (!mongoose.Types.ObjectId.isValid(sourceId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid space id.',
        });
      }
      const source = await Space.findById(sourceId);
      if (!source) {
        return res.status(404).json({
          success: false,
          message: 'Space not found.',
        });
      }
      if (normalizeDay(legacyDay) === 'Weekend') {
        source.set('weekendPrice', undefined);
        if (!normalizeDay(source.day)) {
          source.day = 'Weekday';
          source.price = toMoney(source.weekdayPrice ?? source.price);
          source.set('weekdayPrice', undefined);
        }
        await source.save();
        return res.status(200).json({
          success: true,
          message: 'Space deleted successfully.',
        });
      }
      id = sourceId;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid space id.',
      });
    }

    const space = await Space.findByIdAndDelete(id);
    if (!space) {
      return res.status(404).json({
        success: false,
        message: 'Space not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Space deleted successfully.',
    });
  } catch (error) {
    console.error('deleteSpace error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete space.',
    });
  }
};
