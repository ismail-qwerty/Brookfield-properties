import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import StarRating from '../../components/ui/StarRating';
import api from '../../utils/api';

export default function SubmitOrder() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [orderData, setOrderData] = useState(null);
  const [selectedReview, setSelectedReview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Sample reviews
  const reviews = [
    "The architecture here is absolutely breathtaking, truly a masterpiece of modern design!",
    "Located in a prime area with excellent amenities and transportation links.",
    "Outstanding build quality and attention to detail throughout the property.",
    "Perfect investment opportunity with strong rental yield potential.",
    "Exceptional views and well-designed living spaces for modern lifestyles."
  ];

  useEffect(() => {
    // Get order data from navigation state
    if (location.state?.orderData) {
      console.log('Order Data Received:', location.state.orderData);
      console.log('Property Title:', location.state.orderData?.order?.property?.title);
      console.log('Property Name:', location.state.orderData?.order?.property?.name);
      setOrderData(location.state.orderData);
      setSelectedReview(reviews[0]); // Default to first review
    } else {
      // If no order data, redirect back
      navigate('/data-optimization');
    }
  }, [location, navigate]);

  const handleSubmit = async () => {
    if (!selectedReview) {
      alert('Please select a review comment');
      return;
    }

    if (!orderData?.order?.id) {
      setError('Invalid order data');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await api.user.submitOrder(orderData.order.id, { review: selectedReview });

      // Navigate back to data optimization page
      navigate('/data-optimization', {
        state: {
          success: true,
          message: `Order completed! You earned $${orderData.order.commission.toFixed(2)}`
        }
      });
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to submit order';
      setError(errorMsg);
      setSubmitting(false);
    }
  };

  if (!orderData) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-8">
          {/* Top Section - Image and Description */}
          <div className="flex gap-6 mb-8">
            {/* Small Property Image */}
            <div className="flex-shrink-0">
              <img
                src={orderData.order.property.image_url || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800'}
                alt={orderData.order.property.title}
                className="w-48 h-48 rounded-xl shadow-md object-cover"
              />
            </div>

            {/* Property Description */}
            <div className="flex-grow">
              {/* Order Number Badge */}
              <div className="mb-3">
                <span className="inline-block bg-blue-100 text-blue-600 px-4 py-2 rounded-lg font-semibold text-lg">
                  Order #{orderData.order.display_number || orderData.order.id.toString().slice(0, 8).toUpperCase()}
                </span>
              </div>

              {/* Property Title */}
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                {orderData.order.property.title || orderData.order.property.name || 'Property Listing'}
              </h1>

              {/* Property Description Text */}
              <p className="text-gray-600 text-sm leading-relaxed">
                Premium property located in a prime area with excellent amenities and modern facilities.
                This investment opportunity offers outstanding value with strong potential returns.
              </p>
            </div>
          </div>

          {/* Property Details */}
          <div className="flex flex-col">
              {/* Property Title - Hidden since it's shown above */}
              {/* <h1 className="text-3xl font-bold text-gray-900 mb-6">
                {orderData.order.property.title}
              </h1> */}

              {/* Price, Profit, Total Grid */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <i className="fa fa-dollar text-black text-xl"></i>
                    <span className="text-gray-600 text-sm">Price</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    ${orderData.order.property.price.toFixed(2)}
                  </div>
                </div>

                <div className="bg-gray-100 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <i className="fa fa-coins text-black text-xl"></i>
                    <span className="text-gray-600 text-sm">Profit</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    ${orderData.order.commission.toFixed(2)}
                  </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <i className="fa fa-calculator text-blue-600 text-xl"></i>
                    <span className="text-gray-600 text-sm">Total</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    ${(orderData.order.property.price + orderData.order.commission).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Star Rating */}
              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-3">Score:</label>
                <div className="flex items-center gap-2">
                  <StarRating rating={5} size="large" />
                  <span className="text-gray-600 text-sm ml-2">(5.0)</span>
                </div>
              </div>

              {/* Comment Review */}
              <div className="mb-6 flex-grow">
                <label className="block text-gray-700 font-semibold mb-3">Comment Good Review</label>
                <select
                  value={selectedReview}
                  onChange={(e) => setSelectedReview(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
                >
                  {reviews.map((review, index) => (
                    <option key={index} value={review}>
                      {review.substring(0, 60)}...
                    </option>
                  ))}
                </select>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-lg shadow-lg text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <i className="fa fa-spinner fa-spin"></i>
                    Submitting...
                  </span>
                ) : (
                  'Submit Order'
                )}
              </button>

              {/* Error Message */}
              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                  <i className="fa fa-exclamation-circle mr-2"></i>
                  {error}
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
