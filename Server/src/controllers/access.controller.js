import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/auth.model.js';
import Role from '../models/role.model.js';
import Counter from '../models/counter.model.js';
import {
  PERMISSION_CATALOG,
  normalizePermissionList,
  isValidPermission,
} from '../constants/permissions.js';
import {resolveUserPermissions} from '../utils/rbac.utils.js';

const SALT_ROUNDS = 12;

const staffProjection =
  'm_staff_id fullName email phoneNumber role roleId createdAt updatedAt';

const isEmail = s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s).trim());

const normalizePhone = input => {
  const digits = String(input ?? '').replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return null;
};

const getNextStaffId = async () => {
  const counter = await Counter.findOneAndUpdate(
    {key: 'm_staff_id'},
    {$inc: {value: 1}},
    {new: true, upsert: true, setDefaultsOnInsert: true},
  );
  return `STF${String(counter.value).padStart(6, '0')}`;
};

/**
 * GET /access/permissions — catalog for Access UI.
 */
export const listPermissionCatalog = async (_req, res) => {
  return res.status(200).json({
    success: true,
    permissions: PERMISSION_CATALOG,
  });
};

/**
 * GET /access/roles
 */
export const listRoles = async (req, res) => {
  try {
    const roles = await Role.find({isActive: true})
      .sort({isSystem: -1, name: 1})
      .lean();

    const withCounts = roles.map(role => ({
      ...role,
      permissionCount: Array.isArray(role.permissions) ? role.permissions.length : 0,
    }));

    return res.status(200).json({success: true, roles: withCounts});
  } catch (error) {
    console.error('listRoles error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load roles.',
    });
  }
};

/**
 * GET /access/roles/:id
 */
export const getRoleById = async (req, res) => {
  try {
    const {id} = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({success: false, message: 'Invalid role id.'});
    }

    const role = await Role.findById(id).lean();
    if (!role || role.isActive === false) {
      return res.status(404).json({success: false, message: 'Role not found.'});
    }

    return res.status(200).json({success: true, role});
  } catch (error) {
    console.error('getRoleById error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load role.',
    });
  }
};

/**
 * PATCH /access/roles/:id
 * Body: { name?, description?, permissions? }
 * System roles: permissions/description editable; slug locked.
 */
export const updateRole = async (req, res) => {
  try {
    const {id} = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({success: false, message: 'Invalid role id.'});
    }

    const role = await Role.findById(id);
    if (!role || role.isActive === false) {
      return res.status(404).json({success: false, message: 'Role not found.'});
    }

    const {name, description, permissions} = req.body || {};

    if (typeof name === 'string' && name.trim()) {
      role.name = name.trim();
    }
    if (typeof description === 'string') {
      role.description = description.trim();
    }
    if (Array.isArray(permissions)) {
      role.permissions = normalizePermissionList(
        permissions.filter(p => isValidPermission(String(p || '').trim())),
      );
    }

    await role.save();

    return res.status(200).json({
      success: true,
      message: 'Role updated.',
      role: role.toObject(),
    });
  } catch (error) {
    console.error('updateRole error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update role.',
    });
  }
};

/**
 * GET /access/staff?search=
 */
export const listStaff = async (req, res) => {
  try {
    const search = String(req.query.search || '').trim();
    const filter = {};

    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        {fullName: rx},
        {email: rx},
        {phoneNumber: rx},
        {m_staff_id: rx},
      ];
    }

    const staff = await User.find(filter)
      .select(staffProjection)
      .populate('roleId', 'name slug permissions isSystem isActive')
      .sort({createdAt: -1})
      .lean();

    const rows = await Promise.all(
      staff.map(async user => {
        const permissions = await resolveUserPermissions(user);
        return {
          _id: user._id,
          m_staff_id: user.m_staff_id,
          fullName: user.fullName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          legacyRole: user.role,
          role: user.roleId
            ? {
                id: String(user.roleId._id),
                name: user.roleId.name,
                slug: user.roleId.slug,
                isSystem: user.roleId.isSystem,
                permissionCount: Array.isArray(user.roleId.permissions)
                  ? user.roleId.permissions.length
                  : 0,
              }
            : null,
          permissionCount: permissions.length,
          createdAt: user.createdAt,
        };
      }),
    );

    return res.status(200).json({success: true, staff: rows});
  } catch (error) {
    console.error('listStaff error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load staff.',
    });
  }
};

/**
 * PATCH /access/staff/:id/role
 * Body: { roleId: string | null }
 */
export const assignStaffRole = async (req, res) => {
  try {
    const {id} = req.params;
    const {roleId} = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({success: false, message: 'Invalid staff id.'});
    }

    const staff = await User.findById(id);
    if (!staff) {
      return res.status(404).json({success: false, message: 'Staff not found.'});
    }

    let nextRole = null;
    if (roleId === null || roleId === '' || roleId === undefined) {
      // Clearing role is allowed for manage users, but not for yourself
      if (String(req.user?.userId) === String(staff._id)) {
        return res.status(400).json({
          success: false,
          message: 'You cannot clear your own role (would lock you out).',
        });
      }
      staff.roleId = null;
    } else {
      if (!mongoose.Types.ObjectId.isValid(roleId)) {
        return res.status(400).json({success: false, message: 'Invalid role id.'});
      }
      nextRole = await Role.findOne({_id: roleId, isActive: true});
      if (!nextRole) {
        return res.status(404).json({success: false, message: 'Role not found.'});
      }

      // Prevent self lock-out: assigning yourself a role without access.manage
      if (String(req.user?.userId) === String(staff._id)) {
        const nextPerms = normalizePermissionList(nextRole.permissions || []);
        if (!nextPerms.includes('access.manage')) {
          return res.status(400).json({
            success: false,
            message:
              'You cannot assign yourself a role without access.manage (would lock you out of Access Control).',
          });
        }
      }

      staff.roleId = nextRole._id;
      // Keep legacy string roughly aligned for older UI bits
      if (nextRole.slug === 'super_admin' || nextRole.slug === 'admin') {
        staff.role = 'admin';
      } else {
        staff.role = 'user';
      }
    }

    staff.updatedAt = new Date();
    await staff.save();

    const populated = await User.findById(staff._id)
      .select(staffProjection)
      .populate('roleId', 'name slug permissions isSystem isActive')
      .lean();

    const permissions = await resolveUserPermissions(populated);

    return res.status(200).json({
      success: true,
      message: 'Role assigned.',
      staff: {
        _id: populated._id,
        m_staff_id: populated.m_staff_id,
        fullName: populated.fullName,
        email: populated.email,
        phoneNumber: populated.phoneNumber,
        legacyRole: populated.role,
        role: populated.roleId
          ? {
              id: String(populated.roleId._id),
              name: populated.roleId.name,
              slug: populated.roleId.slug,
              isSystem: populated.roleId.isSystem,
              permissionCount: Array.isArray(populated.roleId.permissions)
                ? populated.roleId.permissions.length
                : 0,
            }
          : null,
        permissionCount: permissions.length,
      },
    });
  } catch (error) {
    console.error('assignStaffRole error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to assign role.',
    });
  }
};

/**
 * POST /access/staff
 * Admin-provisioned account (replaces open public register).
 * Body: { fullName, email, phone, password, roleId? }
 */
export const createStaff = async (req, res) => {
  try {
    const {fullName, email, phone, password, roleId} = req.body || {};

    if (!fullName || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, phone, and password are required.',
      });
    }

    if (String(password).length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters.',
      });
    }

    const emailNorm = String(email).trim().toLowerCase();
    if (!isEmail(emailNorm)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email address.',
      });
    }

    const phoneNorm = normalizePhone(phone);
    if (!phoneNorm) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number. Use 10 digits.',
      });
    }

    const exists = await User.findOne({
      $or: [{email: emailNorm}, {phoneNumber: phoneNorm}],
    });
    if (exists) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email or phone already exists.',
      });
    }

    let roleDoc = null;
    if (roleId) {
      if (!mongoose.Types.ObjectId.isValid(roleId)) {
        return res.status(400).json({success: false, message: 'Invalid role id.'});
      }
      roleDoc = await Role.findOne({_id: roleId, isActive: true});
      if (!roleDoc) {
        return res.status(404).json({success: false, message: 'Role not found.'});
      }
    } else {
      roleDoc = await Role.findOne({slug: 'viewer', isActive: true});
    }

    const staffId = await getNextStaffId();
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const isAdminLike =
      roleDoc?.slug === 'super_admin' || roleDoc?.slug === 'admin';

    const created = await User.create({
      m_staff_id: staffId,
      fullName: String(fullName).trim(),
      email: emailNorm,
      phoneNumber: phoneNorm,
      passwordHash,
      role: isAdminLike ? 'admin' : 'user',
      roleId: roleDoc?._id || null,
    });

    const populated = await User.findById(created._id)
      .select(staffProjection)
      .populate('roleId', 'name slug permissions isSystem isActive')
      .lean();

    const permissions = await resolveUserPermissions(populated);

    return res.status(201).json({
      success: true,
      message: 'Staff account created.',
      staff: {
        _id: populated._id,
        m_staff_id: populated.m_staff_id,
        fullName: populated.fullName,
        email: populated.email,
        phoneNumber: populated.phoneNumber,
        legacyRole: populated.role,
        role: populated.roleId
          ? {
              id: String(populated.roleId._id),
              name: populated.roleId.name,
              slug: populated.roleId.slug,
              isSystem: populated.roleId.isSystem,
              permissionCount: Array.isArray(populated.roleId.permissions)
                ? populated.roleId.permissions.length
                : 0,
            }
          : null,
        permissionCount: permissions.length,
      },
    });
  } catch (error) {
    console.error('createStaff error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create staff account.',
    });
  }
};
