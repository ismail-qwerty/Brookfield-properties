import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner, BrandLogo } from '../../components/ui';

export default function Login() {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(formData.username, formData.password);
      // Login successful - redirect happens in AuthContext
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Login failed. Please check your credentials.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Editorial panel — carries the brand while the form stays uncluttered */}
      <div className="relative hidden lg:block overflow-hidden bg-black">
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover opacity-55"
        >
          <source src="/bg.mp4" type="video/mp4" />
        </video>

        <div className="relative z-10 h-full flex flex-col justify-between p-14">
          <Link to="/" className="inline-flex">
            <BrandLogo textClassName="text-[16px]" />
          </Link>

          <div className="max-w-md">
            <h2 className="font-serif text-white text-[44px] leading-[1.05] mb-6">
              Built on discipline and long-term thinking.
            </h2>
            <p className="lede-light">
              Managing real estate portfolios with transparency, rigour and a
              focus on durable returns.
            </p>
          </div>

          <p className="text-white/40 text-[12px]">
            &copy; {new Date().getFullYear()} Blackstone
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center px-6 py-16 md:px-16">
        <div className="w-full max-w-[420px]">
          <Link to="/" className="lg:hidden inline-flex mb-14">
            <BrandLogo dark textClassName="text-[16px]" />
          </Link>

          <div className="mb-12">
            <div className="eyebrow mb-4">Client Access</div>
            <h1 className="font-serif text-[38px] leading-tight mb-3">Welcome back</h1>
            <p className="text-[15px]" style={{ color: 'var(--ink-45)' }}>
              Sign in to manage your portfolio.
            </p>
          </div>

          {error && (
            <div className="mb-8 border-l-2 border-red-600 bg-red-50 px-4 py-3 text-red-800 text-[14px]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <label className="label">Gmail or Username</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="field"
                placeholder="you@gmail.com"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="label">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="field"
                placeholder="Enter your password"
                required
                disabled={loading}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className="w-4 h-4 accent-black border-gray-400"
                  disabled={loading}
                />
                <span className="ml-3 text-[13px]" style={{ color: 'var(--ink-70)' }}>
                  Remember me
                </span>
              </label>
              <Link to="#" className="link-quiet text-[13px]">
                Forgot password?
              </Link>
            </div>

            <button type="submit" disabled={loading} className="btn-solid w-full">
              {loading ? <LoadingSpinner size="sm" color="white" /> : 'Sign In'}
            </button>
          </form>

          <div className="rule mt-12 pt-8">
            <p className="text-[14px]" style={{ color: 'var(--ink-45)' }}>
              Don&apos;t have an account?{' '}
              <Link to="/user-register" className="link-quiet" style={{ color: 'var(--ink)' }}>
                Register
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
