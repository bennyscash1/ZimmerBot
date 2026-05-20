import reviewRepository from '../5-repositories/reviewRepository.js';

// DEV MODE: all role/ownership filters removed.
export class ReviewService {
  async getAllReviews(_user) {
    const reviews = await reviewRepository.findAll({});
    return reviews.map(r => r.toJSON());
  }

  async getReviewById(id, _user) {
    const review = await reviewRepository.findById(id);
    if (!review) {
      throw new Error('Review not found');
    }
    return review.toJSON();
  }

  async createReview(reviewData, _user) {
    const review = await reviewRepository.create(reviewData);
    return review.toJSON();
  }

  async updateReview(id, reviewData, _user) {
    const review = await reviewRepository.findById(id);
    if (!review) {
      throw new Error('Review not found');
    }
    const updatedReview = await reviewRepository.update(id, reviewData);
    return updatedReview.toJSON();
  }

  async deleteReview(id, _user) {
    const review = await reviewRepository.findById(id);
    if (!review) {
      throw new Error('Review not found');
    }
    await reviewRepository.delete(id);
    return { message: 'Review deleted successfully' };
  }
}

export default new ReviewService();
