import bookingService from '../4-services/bookingService.js';

export class BookingController {
  async getAll(req, res, next) {
    try {
      const bookings = await bookingService.getAllBookings(req.user);
      res.json({
        success: true,
        data: bookings
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const booking = await bookingService.getBookingById(req.params.id, req.user);
      res.json({
        success: true,
        data: booking
      });
    } catch (error) {
      if (error.message === 'Booking not found') {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      if (error.message === 'Access denied') {
        return res.status(403).json({
          success: false,
          error: error.message
        });
      }
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const booking = await bookingService.createBooking(req.body, req.user);
      res.status(201).json({
        success: true,
        data: booking
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const booking = await bookingService.updateBooking(req.params.id, req.body, req.user);
      res.json({
        success: true,
        data: booking
      });
    } catch (error) {
      if (error.message === 'Booking not found') {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      if (error.message === 'Access denied') {
        return res.status(403).json({
          success: false,
          error: error.message
        });
      }
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await bookingService.deleteBooking(req.params.id, req.user);
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      if (error.message === 'Booking not found') {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      if (error.message === 'Access denied') {
        return res.status(403).json({
          success: false,
          error: error.message
        });
      }
      next(error);
    }
  }
}

export default new BookingController();
