import Announcement from '../models/announcement.model.js';
import Customer from '../models/customer.model.js';
import { enqueueAnnouncementRecipient } from '../queue/announcement.queue.js';
import { resolveAnnouncementHeaderMedia } from '../modules/customer/services/whatsapp.service.js';

export const createAnnouncement = async (req, res) => {
  try {
    const {
      templateName,
      audienceType = 'All',
      selectedCustomerIds = [],
      whatsappTemplateName,
      languageCode = 'en',
      templateParams = [],
      headerImageLink = '',
    } = req.body || {};

    if (!templateName?.trim() || !whatsappTemplateName?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'templateName and whatsappTemplateName are required',
      });
    }

    const metaTemplate = whatsappTemplateName.trim();
    const lang = String(languageCode || 'en').trim() || 'en';

    // Resolve IMAGE header once for the whole batch (link or uploaded media id).
    // newcafe and other IMAGE-header templates fail with #132012 without this.
    let headerMedia;
    try {
      headerMedia = await resolveAnnouncementHeaderMedia({
        headerImageLink,
        templateName: metaTemplate,
      });
    } catch (mediaErr) {
      return res.status(400).json({
        success: false,
        message: mediaErr?.message || 'Failed to resolve announcement header image',
      });
    }

    const normalizedAudience =
      String(audienceType).toLowerCase() === 'selected' ? 'selected' : 'all';

    let customers = [];
    if (normalizedAudience === 'selected') {
      customers = await Customer.find({
        _id: { $in: selectedCustomerIds },
        isDeleted: { $ne: true },
      })
        .select('_id name mobile whatsappNumber')
        .lean();
    } else {
      customers = await Customer.find({ isDeleted: { $ne: true } })
        .select('_id name mobile whatsappNumber')
        .lean();
    }

    const recipients = customers
      .map((c) => ({
        customerId: String(c._id),
        name: c.name,
        phone: String(c.whatsappNumber || c.mobile || '').trim(),
      }))
      .filter((r) => r.phone);

    if (!recipients.length) {
      return res.status(400).json({
        success: false,
        message: 'No customers with phone number  found!',
      });
    }

    const announcement = await Announcement.create({
      templateName: templateName.trim(),
      audienceType: normalizedAudience,
      selectedCustomerIds:
        normalizedAudience === 'selected' ? selectedCustomerIds : [],
      whatsappMetaTemplateName: metaTemplate,
      languageCode: lang,
      templateParams,
      headerImageLink: headerMedia.headerImageLink || '',
      headerImageId: headerMedia.headerImageId || '',
      status: 'sending',
      totalRecipients: recipients.length,
      sentCount: 0,
      failedCount: 0,
      createdBNy: {
        m_staff_id: req.user?.userId ?? null,
        m_staff_name: req.user?.name ?? null,
        m_staff_email: req.user?.email ?? null,
      },
    });

    // Enqueue 1 job per recipient (Redis only — worker sends WhatsApp)
    await Promise.all(
      recipients.map((r) =>
        enqueueAnnouncementRecipient({
          announcementId: String(announcement._id),
          customerId: r.customerId,
          phone: r.phone,
          customerName: r.name,
          whatsappTemplateName: announcement.whatsappMetaTemplateName,
          languageCode: announcement.languageCode,
          templateParams: announcement.templateParams,
          headerImageLink: announcement.headerImageLink,
          headerImageId: announcement.headerImageId,
        }),
      ),
    );
    // 4) Return immediately — worker does the slow Meta calls
    return res.status(201).json({
      success: true,
      message: `Queued ${recipients.length} WhatsApp messages`,
      announcement,
    });
  } catch (error) {
    console.error('createAnnouncement error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create announcement',
    });
  }
};

export const listAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return res.status(200).json({ success: true, announcements });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to list announcements',
    });
  }
};
