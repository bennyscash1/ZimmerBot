import bookingRepository from '../5-repositories/bookingRepository.js';
import unitRepository from '../5-repositories/unitRepository.js';
import googleCalendarService from './googleCalendarService.js';

export class BookingService {
  async getAllBookings(_user) {
    // DEV MODE: every user sees every booking.
    const bookings = await bookingRepository.findAll({});
    return bookings.map(b => b.toJSON());
  }

  async getBookingById(id, _user) {
    const booking = await bookingRepository.findById(id);
    if (!booking) {
      throw new Error('Booking not found');
    }
    // DEV MODE: no ownership check.
    return booking.toJSON();
  }

  async createBooking(bookingData, user) {
    const booking = await bookingRepository.create(bookingData);
    
    // Sync to Google Calendar if user has it connected
    if (user.googleCalendarLinked && booking.status !== 'cancelled') {
      try {
        const unit = await unitRepository.findById(booking.unitId);
        if (unit) {
          const eventId = await googleCalendarService.syncBookingToGoogleCalendar(booking, unit, user._id.toString());
          if (eventId) {
            // Update booking with event ID and sync status
            await bookingRepository.update(booking._id.toString(), {
              googleCalendarEventId: eventId,
              googleSynced: true
            });
            booking.googleCalendarEventId = eventId;
            booking.googleSynced = true;
          }
        }
      } catch (error) {
        console.error('❌ [BookingService] Google Calendar sync error (non-fatal):', error.message);
        // Continue even if calendar sync fails
      }
    }
    
    return booking.toJSON();
  }

  async updateBooking(id, bookingData, user) {
    const booking = await bookingRepository.findById(id);

    if (!booking) {
      throw new Error('Booking not found');
    }

    // DEV MODE: no ownership check.

    const updatedBooking = await bookingRepository.update(id, bookingData);
    
    // Sync to Google Calendar if user has it connected
    if (user.googleCalendarLinked) {
      try {
        const unit = await unitRepository.findById(updatedBooking.unitId);
        if (unit) {
          // If cancelled, delete event; otherwise update/create
          if (updatedBooking.status === 'cancelled' && booking.googleCalendarEventId) {
            await googleCalendarService.deleteCalendarEvent(booking.googleCalendarEventId, user._id.toString());
            await bookingRepository.update(id, {
              googleCalendarEventId: null,
              googleSynced: false
            });
          } else if (updatedBooking.status !== 'cancelled') {
            const eventId = await googleCalendarService.syncBookingToGoogleCalendar(updatedBooking, unit, user._id.toString());
            if (eventId) {
              await bookingRepository.update(id, {
                googleCalendarEventId: eventId,
                googleSynced: true
              });
              updatedBooking.googleCalendarEventId = eventId;
              updatedBooking.googleSynced = true;
            }
          }
        }
      } catch (error) {
        console.error('❌ [BookingService] Google Calendar sync error (non-fatal):', error.message);
        // Continue even if calendar sync fails
      }
    }
    
    return updatedBooking.toJSON();
  }

  async deleteBooking(id, user) {
    const booking = await bookingRepository.findById(id);

    if (!booking) {
      throw new Error('Booking not found');
    }

    // DEV MODE: no ownership check.

    // Delete from Google Calendar if exists
    if (user.googleCalendarLinked && booking.googleCalendarEventId) {
      try {
        await googleCalendarService.deleteCalendarEvent(booking.googleCalendarEventId, user._id.toString());
      } catch (error) {
        console.error('❌ [BookingService] Google Calendar delete error (non-fatal):', error.message);
        // Continue even if calendar delete fails
      }
    }

    await bookingRepository.delete(id);
    return { message: 'Booking deleted successfully' };
  }
}

export default new BookingService();
