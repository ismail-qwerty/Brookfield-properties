import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { CurrencyDisplay, Skeleton, CARD, MUTED, HAIRLINE, statusStyle } from '../../components/ui';

export default function RedemptionHistory() {
  const [redemptions, setRedemptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRedemptions();
  }, []);

  const fetchRedemptions = async () => {
    try {
      const response = await api.user.getRedemptions();
      setRedemptions(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch redemption history:', error);
    } finally {
      setLoading(false);
    }
  };

  const totals = redemptions.reduce(
    (acc, r) => {
      const amt = Number(r.amount) || 0;
      if (r.status === 'Approved') acc.paid += amt;
      if (r.status === 'Pending') acc.pending += amt;
      return acc;
    },
    { paid: 0, pending: 0 }
  );

  const formatDate = (value) =>
    new Date(value).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div style={{ background: '#000' }} className="min-h-full text-white">
      <div className="wrap py-8 md:py-12 max-w-[760px] mx-auto">
        <div className="flex items-center gap-2.5 text-[12px] mb-6" style={{ color: MUTED }}>
          <Link to="/wallet" className="hover:text-white transition-colors">Wallet</Link>
          <span>/</span>
          <span className="text-white/75">Withdrawals</span>
        </div>

        <div className="flex items-end justify-between gap-4 mb-7">
          <div>
            <h1 className="text-[22px] md:text-[26px] font-semibold leading-tight mb-1">Withdrawals</h1>
            <p className="text-[13px]" style={{ color: MUTED }}>
              {loading ? 'Loading your requests' : `${redemptions.length} request${redemptions.length === 1 ? '' : 's'}`}
            </p>
          </div>
          <Link
            to="/redemption"
            className="h-10 px-5 rounded-full bg-white text-black text-[13px] font-semibold flex items-center hover:bg-white/90 transition-colors whitespace-nowrap"
          >
            Withdraw
          </Link>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-2 rounded-[20px] overflow-hidden mb-5" style={CARD}>
          <div className="px-5 py-4 sm:px-7 sm:py-5">
            <div className="text-[11px] uppercase tracking-[0.14em] text-white/45 mb-1.5">Paid out</div>
            <div className="text-[17px] sm:text-[19px] font-semibold tnum">
              {loading ? <Skeleton dark className="h-5 w-20" /> : <CurrencyDisplay amount={totals.paid} />}
            </div>
          </div>
          <div className="px-5 py-4 sm:px-7 sm:py-5" style={{ borderLeft: `1px solid ${HAIRLINE}` }}>
            <div className="text-[11px] uppercase tracking-[0.14em] text-white/45 mb-1.5">Pending</div>
            <div className="text-[17px] sm:text-[19px] font-semibold tnum">
              {loading ? <Skeleton dark className="h-5 w-20" /> : <CurrencyDisplay amount={totals.pending} />}
            </div>
          </div>
        </div>

        {/* List */}
        <div className="rounded-[20px] overflow-hidden" style={CARD}>
          {loading ? (
            <div role="status" aria-busy="true">
              <span className="sr-only">Loading withdrawals</span>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-4 px-5 sm:px-7 py-5"
                  style={i > 0 ? { borderTop: `1px solid ${HAIRLINE}` } : undefined}
                >
                  <div className="space-y-2">
                    <Skeleton dark className="h-5 w-24" />
                    <Skeleton dark className="h-3.5 w-40" />
                  </div>
                  <Skeleton dark className="h-6 w-20 rounded-full" />
                </div>
              ))}
            </div>
          ) : redemptions.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-[15px] mb-1">No withdrawals yet</p>
              <p className="text-[13px] mb-7" style={{ color: MUTED }}>
                Your withdrawal requests will appear here.
              </p>
              <Link
                to="/redemption"
                className="inline-flex h-11 px-7 rounded-full bg-white text-black text-[14px] font-semibold items-center hover:bg-white/90 transition-colors"
              >
                Withdraw Funds
              </Link>
            </div>
          ) : (
            redemptions.map((r, i) => (
              <div
                key={r.id}
                className="flex items-start justify-between gap-4 px-5 sm:px-7 py-5"
                style={i > 0 ? { borderTop: `1px solid ${HAIRLINE}` } : undefined}
              >
                <div className="min-w-0">
                  <div className="text-[17px] font-semibold tnum mb-1">
                    <CurrencyDisplay amount={r.amount} />
                  </div>
                  <div className="text-[12px] truncate" style={{ color: MUTED }}>
                    {formatDate(r.created_at)} &middot; {r.wallet_address || 'Payout details not recorded'}
                  </div>
                </div>
                <span
                  className={`flex-shrink-0 inline-block px-3 py-1 rounded-full text-[11px] font-semibold ${statusStyle(r.status)}`}
                >
                  {r.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
