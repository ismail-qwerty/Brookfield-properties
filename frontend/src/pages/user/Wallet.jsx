import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { CurrencyDisplay, LoadingSpinner } from '../../components/ui';

export default function Wallet() {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      const response = await api.user.getWallet();
      setWallet(response.data.data);
    } catch (error) {
      console.error('Failed to fetch wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="bg-white">
      <div className="page-head">
        <div className="wrap">
          <div className="eyebrow-light mb-5">Account</div>
          <h1 className="display text-white">My Wallet</h1>
        </div>
      </div>

      <div className="wrap section-tight">
        {/* Headline balance */}
        <div className="border-b pb-12 mb-12" style={{ borderColor: 'var(--rule)' }}>
          <div className="stat-label">Current Balance</div>
          <div className="font-serif text-[56px] md:text-[80px] leading-none tnum">
            <CurrencyDisplay amount={wallet?.balance || 0} />
          </div>
        </div>

        {/* Supporting metrics */}
        <div className="grid sm:grid-cols-3 gap-px mb-16" style={{ background: 'var(--rule)' }}>
          <div className="bg-white pr-8 py-2">
            <div className="stat-label">Total Recharged</div>
            <div className="stat-value">
              <CurrencyDisplay amount={wallet?.total_recharged || 0} />
            </div>
          </div>
          <div className="bg-white px-0 sm:pl-8 sm:pr-8 py-2">
            <div className="stat-label">Total Earned</div>
            <div className="stat-value">
              <CurrencyDisplay amount={wallet?.total_earned || 0} />
            </div>
          </div>
          <div className="bg-white sm:pl-8 py-2">
            <div className="stat-label">Total Withdrawn</div>
            <div className="stat-value">
              <CurrencyDisplay amount={wallet?.total_withdrawn || 0} />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="rule pt-10">
          <div className="eyebrow mb-6">Manage</div>
          <div className="flex flex-wrap gap-4">
            <button onClick={() => navigate('/recharge')} className="btn-solid">
              Add Funds
            </button>
            <button onClick={() => navigate('/redemption')} className="btn-outline">
              Request Withdrawal
            </button>
            <button onClick={() => navigate('/recharge-history')} className="btn-outline">
              Deposit History
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
