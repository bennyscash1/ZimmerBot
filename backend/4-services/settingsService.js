import unitRepository from '../5-repositories/unitRepository.js';
import bookingRepository from '../5-repositories/bookingRepository.js';
import userRepository from '../5-repositories/userRepository.js';
import accountRepository from '../5-repositories/accountRepository.js';
import { google } from 'googleapis';

export class SettingsService {
  // Get statistics (units count, bookings count)
  async getStatistics(_user) {
    // DEV MODE: every user sees global stats.
    const unitsCount = await unitRepository.findAll().then(units => units.length);
    const bookingsCount = await bookingRepository.findAll().then(bookings => bookings.length);
    return {
      units: unitsCount,
      bookings: bookingsCount
    };
  }

  // Get Google Calendar OAuth URL
  async getGoogleCalendarAuthUrl(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5173/auth/google/callback'
    );

    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // Force consent screen to get refresh token
      state: userId.toString() // Pass user ID in state
    });

    return authUrl;
  }

  // Connect Google Calendar - Exchange authorization code for tokens
  async connectGoogleCalendarWithCode(userId, code) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5173/auth/google/callback'
    );

    try {
      // Exchange code for tokens
      const { tokens } = await oauth2Client.getToken(code);
      
      // Store tokens in user
      const updatedUser = await userRepository.update(userId, {
        googleCalendarLinked: true,
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token,
        googleCalendarId: 'primary' // Default to primary calendar
      });

      return updatedUser.toJSON();
    } catch (error) {
      console.error('❌ [SettingsService] Error exchanging code for tokens:', error);
      throw new Error('Failed to connect Google Calendar: ' + (error.message || 'Unknown error'));
    }
  }

  // Connect Google Calendar (legacy - for simple connection without OAuth)
  async connectGoogleCalendar(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Return auth URL instead of just setting flag
    const authUrl = await this.getGoogleCalendarAuthUrl(userId);
    return { authUrl, needsOAuth: true };
  }

  // Update WhatsApp config (stored in Account)
  async updateWhatsAppConfig(accountId, config) {
    const account = await accountRepository.findById(accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    const updatedAccount = await accountRepository.update(accountId, {
      whatsapp_number: config.phoneNumberId,
      whatsapp_access_token: config.accessToken,
      whatsapp_verify_token: config.verifyToken
    });

    return updatedAccount.toJSON();
  }

  // Get WhatsApp config
  async getWhatsAppConfig(accountId) {
    const account = await accountRepository.findById(accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    return {
      phoneNumberId: account.whatsapp_number || '',
      accessToken: account.whatsapp_access_token || '',
      verifyToken: account.whatsapp_verify_token || ''
    };
  }

  // Reset data (Admin only)
  async resetData() {
    await bookingRepository.findAll().then(bookings => {
      return Promise.all(bookings.map(b => bookingRepository.delete(b._id)));
    });

    await unitRepository.findAll().then(units => {
      return Promise.all(units.map(u => unitRepository.delete(u._id)));
    });

    return { message: 'Data reset successfully' };
  }
}

export default new SettingsService();
