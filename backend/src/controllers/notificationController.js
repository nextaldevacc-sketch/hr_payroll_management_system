import notificationService from '../services/notificationService.js';

export async function getMyNotifications(req, res, next) {
  try {
    const unreadOnly = req.query.unread === 'true';
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
    const result = await notificationService.getNotifications(req.companyId, req.user.id, {
      unreadOnly,
      limit,
    });
    res.json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
}

export async function markNotificationRead(req, res, next) {
  try {
    const { id } = req.params;
    const updated = await notificationService.markAsRead(req.companyId, req.user.id, id);
    res.json({ status: 'success', data: updated });
  } catch (err) {
    next(err);
  }
}

export async function markAllNotificationsRead(req, res, next) {
  try {
    await notificationService.markAllAsRead(req.companyId, req.user.id);
    res.json({ status: 'success', message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
}

export default {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};

