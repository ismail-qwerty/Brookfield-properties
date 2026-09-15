import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import StarRating from '../../components/ui/StarRating';
import api from '../../utils/api';

const POSITIVE_REVIEWS = [
  "The architecture here is absolutely breathtaking, truly a masterpiece of modern design!",
  "Located in a prime area with excellent amenities and transportation links.",
  "Outstanding build quality and attention to detail throughout the property.",
  "Perfect investment opportunity with strong rental yield potential.",
  "Exceptional views and well-designed living spaces for modern lifestyles.",
];

const NEGATIVE_REVIEWS = [
  "Overpriced for the location; comparable properties nearby offer far better value.",
  "Noticeable signs of poor maintenance, with visible wear in several common areas.",
  "Limited access to public transport and very few amenities within walking distance.",
  "Rental yield projections look optimistic given the current local market.",
  "Dated interior finishes that will likely need costly renovation soon.",
];

const REVIEWS = [...POSITIVE_REVIEWS, ...NEGATIVE_REVIEWS];

export default function SubmitOrder() {
  const navigate = useNavigate();
  const location = useLocation();
  const [orderData, setOrderData] = useState(null);
  const [selectedReview, setSelectedReview] = useState('');
  // Cosmetic only: the score isn't sent with the order.
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (location.state?.orderData) {
      setOrderData(location.state.orderData);
      setSelectedReview(REVIEWS[0]);
    } else {
      navigate('/data-optimization');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      navigate('/data-optimization', {
        state: {
          success: true,
          message: `Order completed! You earned $${orderData.order.commission.toFixed(2)}`,
        },
      });
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to submit order';
      setError(errorMsg);
      setSubmitting(false);
    }
  };

  if (!orderData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b border-black"></div>
      </div>
    );
  }

  const property = orderData.order.property || {};
  const price = Number(property.price ?? orderData.order.property_value ?? 0);
  const commission = Number(orderData.order.commission || 0);
  const total = price + commission;

  return (
    <div className="bg-white">
      <div className="page-head">
        <div className="wrap">
          <div className="eyebrow-light mb-5">Analyst Review</div>
          <h1 className="display text-white">
            Order #{orderData.order.display_number ?? String(orderData.order.id).slice(0, 8).toUpperCase()}
          </h1>
        </div>
      </div>

      <div className="wrap-narrow section-tight">
        {/* Property */}
        <div
          className="flex flex-col sm:flex-row gap-6 mb-10 pb-10 border-b"
          style={{ borderColor: 'var(--rule)' }}
        >
          <img
            src={property.image_url || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800'}
            alt=""
            className="w-full sm:w-40 h-48 sm:h-40 object-cover flex-shrink-0"
          />
          <div className="min-w-0">
            <h2 className="font-serif text-[22px] leading-snug mb-3 break-words">
              {property.title || property.name || 'Property Listing'}
            </h2>
            <p className="text-[14px] leading-relaxed" style={{ color: 'var(--ink-45)' }}>
              Premium property located in a prime area with excellent amenities
              and modern facilities. This investment opportunity offers
              outstanding value with strong potential returns.
            </p>
          </div>
        </div>

        {/* Price / Profit / Total */}
        <div
          className="grid grid-cols-1 sm:grid-cols-3 border-t border-l mb-10"
          style={{ borderColor: 'var(--rule)' }}
        >
          {[
            { label: 'Price', value: price },
            { label: 'Profit', value: commission },
            { label: 'Total', value: total },
          ].map((item) => (
            <div
              key={item.label}
              className="border-r border-b p-5"
              style={{ borderColor: 'var(--rule)' }}
            >
              <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--ink-45)' }}>
                {item.label}
              </div>
              <div className="font-serif text-[22px] tnum">${item.value.toFixed(2)}</div>
            </div>
          ))}
        </div>

        {/* Score */}
        <div className="mb-10">
          <div className="label">Score</div>
          <div className="flex items-center gap-3">
            <StarRating rating={rating} onChange={setRating} size="lg" label="Score" />
            <span className="text-[13px] tnum" style={{ color: 'var(--ink-45)' }}>({rating.toFixed(1)})</span>
          </div>
        </div>

        {/* Review comment */}
        <div className="mb-10">
          <label className="label">Comment</label>
          <select
            value={selectedReview}
            onChange={(e) => setSelectedReview(e.target.value)}
            className="field"
          >
            <optgroup label="Positive">
              {POSITIVE_REVIEWS.map((review) => (
                <option key={review} value={review}>
                  {review}
                </option>
              ))}
            </optgroup>
            <optgroup label="Negative">
              {NEGATIVE_REVIEWS.map((review) => (
                <option key={review} value={review}>
                  {review}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="btn-solid w-full"
        >
          {submitting ? 'Submitting…' : 'Submit Order'}
        </button>

        {error && (
          <div className="mt-6 border-l-2 border-red-600 bg-red-50 px-4 py-3 text-red-800 text-[13px]">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
