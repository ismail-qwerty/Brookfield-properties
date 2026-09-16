import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { CurrencyDisplay, Skeleton, CARD, MUTED, HAIRLINE, statusStyle } from '../../components/ui';

export default function RechargeHistory() {
  const [recharges, setRecharges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecharges();
  }, []);

  const fetchRecharges = async () => {
    try {
      const response = await api.user.getRecharges();
      setRecharges(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch recharge history:', error);
    } finally {
      setLoading(false);
    }
  };

  const totals = recharges.reduce(
    (acc, r) => {
      const amt = Number(r.amount) || 0;
      if (r.status === 'Pending') acc.pending += amt;
      else acc.credited += amt;
      return acc;
    },
    { credited: 0, pending: 0 }
  );

  const formatDate = (value) =>
    new Date(value).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div style={{ background: '#000' }} className="min-h-full text-white">
      <div className="wrap py-8 md:py-12 max-w-[760px] mx-auto">
        <div className="flex items-center gap-2.5 text-[12px] mb-6" style={{ color: MUTED }}>
          <Link to="/wallet" className="hover:text-white transition-colors">Wallet</Link>
          <span>/</span>
          <span className="text-white/75">Deposits</span>
        </div>

        <div className="flex items-end justify-between gap-4 mb-7">
          <div>
            <h1 className="text-[22px] md:text-[26px] font-semibold leading-tight mb-1">Deposits</h1>
            <p className="text-[13px]" style={{ color: MUTED }}>
              {loading ? 'Loading your deposits' : `${recharges.length} deposit${recharges.length === 1 ? '' : 's'}`}
            </p>
          </div>
          <Link
            to="/recharge"
            className="h-10 px-5 rounded-full bg-white text-black text-[13px] font-semibold flex items-center hover:bg-white/90 transition-colors whitespace-nowrap"
          >
            Add Funds
          </Link>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-2 rounded-[20px] overflow-hidden mb-5" style={CARD}>
          <div className="px-5 py-4 sm:px-7 sm:py-5">
            <div className="text-[11px] uppercase tracking-[0.14em] text-white/45 mb-1.5">Credited</div>
            <div className="text-[17px] sm:text-[19px] font-semibold tnum">
              {loading ? <Skeleton dark className="h-5 w-20" /> : <CurrencyDisplay amount={totals.credited} />}
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
              <span className="sr-only">Loading deposits</span>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-4 px-5 sm:px-7 py-5"
                  style={i > 0 ? { borderTop: `1px solid ${HAIRLINE}` } : undefined}
                >
                  <div className="space-y-2">
                    <Skeleton dark className="h-5 w-24" />
                    <Skeleton dark className="h-3.5 w-32" />
                  </div>
                  <Skeleton dark className="h-6 w-20 rounded-full" />
                </div>
              ))}
            </div>
          ) : recharges.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-[15px] mb-1">No deposits yet</p>
              <p className="text-[13px] mb-7" style={{ color: MUTED }}>
                Your deposit requests will appear here.
              </p>
              <Link
                to="/recharge"
                className="inline-flex h-11 px-7 rounded-full bg-white text-black text-[14px] font-semibold items-center hover:bg-white/90 transition-colors"
              >
                Add Funds
              </Link>
            </div>
          ) : (
            recharges.map((r, i) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-4 px-5 sm:px-7 py-5"
                style={i > 0 ? { borderTop: `1px solid ${HAIRLINE}` } : undefined}
              >
                <div className="min-w-0">
                  <div className="text-[17px] font-semibold tnum mb-1">
                    <CurrencyDisplay amount={r.amount} />
                  </div>
                  <div className="text-[12px]" style={{ color: MUTED }}>
                    {formatDate(r.created_at)}
                  </div>
                </div>
                {r.status && (
                  <span
                    className={`flex-shrink-0 inline-block px-3 py-1 rounded-full text-[11px] font-semibold ${statusStyle(r.status)}`}
                  >
                    {r.status}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
