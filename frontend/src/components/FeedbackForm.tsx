import { useState } from 'react';
import { Star, ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';
import type { Feedback } from '../types';
import { apiClient } from '../utils/api';

interface FeedbackFormProps {
  pullRequestId: string;
  repository: string;
  userId: string;
  onSubmit?: (feedback: Feedback) => void;
  onCancel?: () => void;
}

export const FeedbackForm = ({ 
  pullRequestId, 
  repository, 
  userId, 
  onSubmit, 
  onCancel 
}: FeedbackFormProps) => {
  const [rating, setRating] = useState(0);
  const [helpful, setHelpful] = useState<boolean | null>(null);
  const [comment, setComment] = useState('');
  const [reviewAccuracy, setReviewAccuracy] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStarClick = (star: number) => {
    setRating(star);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0 || helpful === null) {
      return; // Basic validation
    }

    setIsSubmitting(true);
    
    try {
      const feedbackData: Feedback = {
        pullRequestId,
        repository,
        userId,
        rating,
        helpful,
        comment: comment.trim() || undefined,
        reviewAccuracy,
        tags: [], // Could be enhanced to extract tags from comment
      };

      const response = await apiClient.post<Feedback>('/feedback', feedbackData);
      
      if (response.success && response.data) {
        onSubmit?.(response.data);
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      // Handle error (could show a toast or error message)
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border rounded-lg p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Rate this AI Review</h3>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Star Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Overall Rating
          </label>
          <div className="flex space-x-1" role="radiogroup" aria-label="Star rating">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => handleStarClick(star)}
                className={`p-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  star <= rating ? 'text-yellow-400' : 'text-gray-300'
                }`}
                aria-label={`${star} star${star > 1 ? 's' : ''}`}
                role="radio"
                aria-checked={star === rating}
              >
                <Star className="h-6 w-6 fill-current" />
              </button>
            ))}
          </div>
        </div>

        {/* Helpful Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Was this review helpful?
          </label>
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => setHelpful(true)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md border transition-colors ${
                helpful === true 
                  ? 'bg-green-50 border-green-200 text-green-700' 
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
              aria-pressed={helpful === true}
            >
              <ThumbsUp className="h-4 w-4" />
              <span>Yes</span>
            </button>
            <button
              type="button"
              onClick={() => setHelpful(false)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md border transition-colors ${
                helpful === false 
                  ? 'bg-red-50 border-red-200 text-red-700' 
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
              aria-pressed={helpful === false}
            >
              <ThumbsDown className="h-4 w-4" />
              <span>No</span>
            </button>
          </div>
        </div>

        {/* Review Accuracy */}
        <div>
          <label htmlFor="accuracy" className="block text-sm font-medium text-gray-700 mb-2">
            Review Accuracy: {reviewAccuracy}/10
          </label>
          <input
            id="accuracy"
            type="range"
            min="1"
            max="10"
            value={reviewAccuracy}
            onChange={(e) => setReviewAccuracy(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            aria-describedby="accuracy-description"
          />
          <p id="accuracy-description" className="text-xs text-gray-500 mt-1">
            How accurate was the AI's assessment?
          </p>
        </div>

        {/* Comment */}
        <div>
          <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
            Additional Comments (Optional)
          </label>
          <div className="relative">
            <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your thoughts about this review..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              maxLength={500}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {comment.length}/500 characters
          </p>
        </div>

        {/* Submit Buttons */}
        <div className="flex space-x-3 pt-4">
          <button
            type="submit"
            disabled={rating === 0 || helpful === null || isSubmitting}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};