import { AppError } from '../middleware/errorHandler.js';

export interface Notification {
  id?: string;
  userId: string;
  type: 'review_completed' | 'review_feedback' | 'system_update' | 'security_alert' | 'team_mention';
  title: string;
  message: string;
  metadata?: {
    pullRequestId?: string;
    repository?: string;
    reviewId?: string;
    feedbackId?: string;
    [key: string]: any;
  };
  priority: 'low' | 'medium' | 'high' | 'urgent';
  read: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  expiresAt?: Date;
}

export interface NotificationPreferences {
  userId: string;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  types: {
    review_completed: boolean;
    review_feedback: boolean;
    system_update: boolean;
    security_alert: boolean;
    team_mention: boolean;
  };
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  quietHours?: {
    enabled: boolean;
    startTime: string; // HH:MM format
    endTime: string; // HH:MM format
    timezone: string;
  };
}

export interface NotificationQuery {
  userId: string;
  type?: string;
  read?: boolean;
  priority?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

export class NotificationService {
  // TODO: Implement with actual database storage (Prisma) and notification providers
  private notifications: Notification[] = []; // Temporary in-memory storage
  private preferences: NotificationPreferences[] = []; // Temporary in-memory storage

  async createNotification(notification: Omit<Notification, 'id' | 'read' | 'createdAt' | 'updatedAt'>): Promise<Notification> {
    try {
      if (!notification.userId || !notification.type || !notification.title) {
        throw new AppError('Missing required notification fields', 400);
      }

      const newNotification: Notification = {
        ...notification,
        id: this.generateId(),
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // TODO: Replace with Prisma database insert
      this.notifications.push(newNotification);

      // TODO: Trigger actual notification delivery (email, push, etc.)
      await this.deliverNotification(newNotification);

      return newNotification;
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to create notification: ${error.message}`, 500);
    }
  }

  async getNotifications(query: NotificationQuery): Promise<Notification[]> {
    try {
      // TODO: Replace with Prisma database query
      let filteredNotifications = this.notifications.filter(n => n.userId === query.userId);

      if (query.type) {
        filteredNotifications = filteredNotifications.filter(n => n.type === query.type);
      }

      if (query.read !== undefined) {
        filteredNotifications = filteredNotifications.filter(n => n.read === query.read);
      }

      if (query.priority) {
        filteredNotifications = filteredNotifications.filter(n => n.priority === query.priority);
      }

      if (query.dateFrom) {
        filteredNotifications = filteredNotifications.filter(n => 
          n.createdAt && n.createdAt >= query.dateFrom!
        );
      }

      if (query.dateTo) {
        filteredNotifications = filteredNotifications.filter(n => 
          n.createdAt && n.createdAt <= query.dateTo!
        );
      }

      // Sort by creation date (newest first)
      filteredNotifications.sort((a, b) => 
        (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
      );

      // Apply pagination
      const offset = query.offset || 0;
      const limit = query.limit || 50;
      
      return filteredNotifications.slice(offset, offset + limit);
    } catch (error: any) {
      throw new AppError(`Failed to get notifications: ${error.message}`, 500);
    }
  }

  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      // TODO: Replace with Prisma database update
      const notification = this.notifications.find(n => n.id === notificationId && n.userId === userId);
      if (!notification) {
        return false;
      }

      notification.read = true;
      notification.updatedAt = new Date();
      return true;
    } catch (error: any) {
      throw new AppError(`Failed to mark notification as read: ${error.message}`, 500);
    }
  }

  async markAllAsRead(userId: string): Promise<number> {
    try {
      // TODO: Replace with Prisma database batch update
      const userNotifications = this.notifications.filter(n => n.userId === userId && !n.read);
      let count = 0;

      userNotifications.forEach(notification => {
        notification.read = true;
        notification.updatedAt = new Date();
        count++;
      });

      return count;
    } catch (error: any) {
      throw new AppError(`Failed to mark all notifications as read: ${error.message}`, 500);
    }
  }

  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    try {
      // TODO: Replace with Prisma database delete
      const index = this.notifications.findIndex(n => n.id === notificationId && n.userId === userId);
      if (index === -1) {
        return false;
      }

      this.notifications.splice(index, 1);
      return true;
    } catch (error: any) {
      throw new AppError(`Failed to delete notification: ${error.message}`, 500);
    }
  }

  async getPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      // TODO: Replace with Prisma database query
      const preferences = this.preferences.find(p => p.userId === userId);
      return preferences || null;
    } catch (error: any) {
      throw new AppError(`Failed to get notification preferences: ${error.message}`, 500);
    }
  }

  async updatePreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    try {
      // TODO: Replace with Prisma database upsert
      const existingIndex = this.preferences.findIndex(p => p.userId === userId);
      
      if (existingIndex >= 0) {
        this.preferences[existingIndex] = { ...this.preferences[existingIndex], ...preferences };
        return this.preferences[existingIndex];
      } else {
        const newPreferences: NotificationPreferences = {
          userId,
          emailEnabled: true,
          inAppEnabled: true,
          types: {
            review_completed: true,
            review_feedback: true,
            system_update: true,
            security_alert: true,
            team_mention: true,
          },
          frequency: 'immediate',
          ...preferences,
        };
        this.preferences.push(newPreferences);
        return newPreferences;
      }
    } catch (error: any) {
      throw new AppError(`Failed to update notification preferences: ${error.message}`, 500);
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    try {
      // TODO: Replace with Prisma database count query
      return this.notifications.filter(n => n.userId === userId && !n.read).length;
    } catch (error: any) {
      throw new AppError(`Failed to get unread count: ${error.message}`, 500);
    }
  }

  private async deliverNotification(notification: Notification): Promise<void> {
    try {
      // TODO: Implement actual notification delivery
      // This could include email, push notifications, webhooks, etc.
      
      const preferences = await this.getPreferences(notification.userId);
      
      if (!preferences) {
        // Use default preferences
        console.log(`Delivering notification ${notification.id} to user ${notification.userId} (default preferences)`);
        return;
      }

      // Check if user wants this type of notification
      if (!preferences.types[notification.type as keyof typeof preferences.types]) {
        console.log(`Skipping notification ${notification.id} - type disabled by user`);
        return;
      }

      // TODO: Implement email delivery
      if (preferences.emailEnabled) {
        await this.sendEmailNotification(notification);
      }

      // TODO: Implement push notification delivery
      if (preferences.inAppEnabled) {
        await this.sendPushNotification(notification);
      }

      console.log(`Notification ${notification.id} delivered to user ${notification.userId}`);
    } catch (error: any) {
      console.error(`Failed to deliver notification ${notification.id}:`, error);
      // Don't throw here - notification creation should succeed even if delivery fails
    }
  }

  private async sendEmailNotification(notification: Notification): Promise<void> {
    // TODO: Implement email sending (using services like SendGrid, SES, etc.)
    console.log(`Email notification sent: ${notification.title}`);
  }

  private async sendPushNotification(notification: Notification): Promise<void> {
    // TODO: Implement push notification (using services like FCM, APNS, etc.)
    console.log(`Push notification sent: ${notification.title}`);
  }

  private generateId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}