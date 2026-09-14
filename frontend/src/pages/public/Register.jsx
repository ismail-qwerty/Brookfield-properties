import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { LoadingSpinner, BrandLogo } from '../../components/ui';

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
    wallet_password: '',
    reference_code: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState({ checking: false, available: null });
  const usernameCheckTimer = useRef(null);

  const checkUsername = async (username) => {
    setUsernameStatus({ checking: true, available: null });
    try {
      const { data } = await api.auth.checkUsername(username);
      setUsernameStatus({ checking: false, available: data.data.available });
    } catch {
      setUsernameStatus({ checking: false, available: null });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');

    if (name === 'username') {
      setUsernameStatus({ checking: false, available: null });
      clearTimeout(usernameCheckTimer.current);
      const trimmed = value.trim();
      if (trimmed.length >= 3) {
        usernameCheckTimer.current = setTimeout(() => checkUsername(trimmed), 400);
      }
    }
  };

  const validateForm = () => {
    if (usernameStatus.available === false) {
      setError('That username is already taken. Please choose another.');
      return false;
    }
    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (formData.wallet_password.length < 6) {
      setError('Withdrawal password must be at least 6 characters');
      return false;
    }
    if (!formData.reference_code) {
      setError('Reference code is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      const registrationData = {
        username: formData.username,
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        confirm_password: formData.confirm_password,
        wallet_password: formData.wallet_password,
        reference_code: formData.reference_code,
      };

      await api.auth.register(registrationData);
      
      setSuccess(true);
      setTimeout(() => {
        navigate('/user-login');
      }, 2000);
    } catch (err) {
      console.error('Registration error:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Registration failed. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[minmax(0,420px)_1fr]">
      {/* Brand panel */}
      <div className="relative hidden lg:block overflow-hidden bg-black">
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover opacity-50"
        >
          <source src="/bg.mp4" type="video/mp4" />
        </video>

        <div className="relative z-10 h-full flex flex-col justify-between p-12">
          <Link to="/" className="inline-flex">
            <BrandLogo textClassName="text-[16px]" />
          </Link>

          <div>
            <h2 className="font-serif text-white text-[34px] leading-[1.15] mb-5">
              Open your account.
            </h2>
            <p className="text-white/70 text-[15px] leading-relaxed">
              A single place to manage your portfolio, track activity, and move
              funds with confidence.
            </p>
          </div>

          <p className="text-white/40 text-[12px]">
            &copy; {new Date().getFullYear()} Blackstone
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center px-6 py-16 md:px-16">
        <div className="w-full max-w-[620px]">
          <Link to="/" className="lg:hidden inline-flex mb-12">
            <BrandLogo dark textClassName="text-[16px]" />
          </Link>

          <div className="mb-12">
            <div className="eyebrow mb-4">Registration</div>
            <h1 className="font-serif text-[38px] leading-tight mb-3">Create your account</h1>
            <p className="text-[15px]" style={{ color: 'var(--ink-45)' }}>
              All fields marked with an asterisk are required.
            </p>
          </div>

          {error && (
            <div className="mb-8 border-l-2 border-red-600 bg-red-50 px-4 py-3 text-red-800 text-[14px]">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-8 border-l-2 border-black bg-gray-100 px-4 py-3 text-black text-[14px]">
              Registration successful. Redirecting to sign in…
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="label">
                  Username *
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Choose a username"
                  required
                  disabled={loading}
                />
                {usernameStatus.checking && (
                  <p className="text-[12px] mt-2" style={{ color: 'var(--ink-45)' }}>
                    Checking availability…
                  </p>
                )}
                {!usernameStatus.checking && usernameStatus.available === true && (
                  <p className="text-[12px] mt-2 text-green-700">
                    Username is available.
                  </p>
                )}
                {!usernameStatus.checking && usernameStatus.available === false && (
                  <p className="text-[12px] mt-2 text-red-600">
                    Username is already taken.
                  </p>
                )}
              </div>
              <div>
                <label className="label">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Your full name"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="label">
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="your@email.com"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className="label">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="+1234567890"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="label">
                  Password *
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Min 6 characters"
                  required
                  minLength={6}
                  disabled={loading}
                />
              </div>
              <div>
                <label className="label">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  name="confirm_password"
                  value={formData.confirm_password}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Confirm password"
                  required
                  minLength={6}
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="label">
                Withdrawal Password *
              </label>
              <input
                type="password"
                name="wallet_password"
                value={formData.wallet_password}
                onChange={handleChange}
                className="input-field"
                placeholder="Secure password for withdrawals"
                required
                minLength={6}
                disabled={loading}
              />
              <p className="text-[12px] mt-2" style={{ color: 'var(--ink-45)' }}>
                Required to authorise withdrawal requests.
              </p>
            </div>

            <div>
              <label className="label">
                Reference Code *
              </label>
              <input
                type="text"
                name="reference_code"
                value={formData.reference_code}
                onChange={handleChange}
                className="input-field"
                placeholder="Enter invitation code"
                required
                disabled={loading}
              />
              <p className="text-[12px] mt-2" style={{ color: 'var(--ink-45)' }}>
                Enter the code you were invited with.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || success}
                className="btn-solid w-full"
              >
                {loading ? <LoadingSpinner size="sm" color="white" /> : 'Create Account'}
              </button>
            </div>
          </form>

          <div className="rule mt-12 pt-8">
            <p className="text-[14px]" style={{ color: 'var(--ink-45)' }}>
              Already have an account?{' '}
              <Link to="/user-login" className="link-quiet" style={{ color: 'var(--ink)' }}>
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
