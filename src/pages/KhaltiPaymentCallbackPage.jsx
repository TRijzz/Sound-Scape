import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiService from '../services/api';
import { useMusic } from '../contexts/MusicContext';

export default function KhaltiPaymentCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { syncCurrentUser } = useMusic();
  const [phase, setPhase] = React.useState('verifying');
  const [message, setMessage] = React.useState('Confirming your Khalti payment...');

  React.useEffect(() => {
    let cancelled = false;

    const verifyPayment = async () => {
      const pidx = searchParams.get('pidx') || '';
      const status = searchParams.get('status') || '';

      if (!pidx) {
        if (!cancelled) {
          setPhase('error');
          setMessage('Missing Khalti payment reference.');
        }
        return;
      }

      if (status && status !== 'Completed' && status !== 'Pending' && status !== 'Initiated') {
        if (!cancelled) {
          setPhase('error');
          setMessage(`Payment ended with status: ${status}`);
        }
        return;
      }

      try {
        const callback = Object.fromEntries(searchParams.entries());
        const response = await apiService.verifyKhaltiPayment({ pidx, callback });
        await syncCurrentUser();

        if (cancelled) return;

        setPhase('success');
        setMessage(response?.message || 'Payment verified successfully.');

        window.setTimeout(() => {
          navigate(response?.redirect_to || '/library', { replace: true });
        }, 1800);
      } catch (error) {
        if (cancelled) return;
        setPhase('error');
        setMessage(error?.message || 'Failed to verify Khalti payment.');
      }
    };

    verifyPayment();

    return () => {
      cancelled = true;
    };
  }, [navigate, searchParams, syncCurrentUser]);

  const isSuccess = phase === 'success';
  const isError = phase === 'error';

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(61,180,255,0.14),_transparent_32%),linear-gradient(145deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-8 text-center shadow-[0_30px_80px_rgba(0,0,0,0.35)]"
        >
          <div className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border ${
            isSuccess ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : isError ? 'border-red-400/30 bg-red-400/10 text-red-300' : 'border-neon-blue/30 bg-neon-blue/10 text-neon-blue'
          }`}>
            {isSuccess ? 'OK' : isError ? '!' : '...'}
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-neon-blue/80">Khalti Payment</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">
            {isSuccess ? 'Payment complete' : isError ? 'Payment not completed' : 'Verifying payment'}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-gray-300">{message}</p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/store')}
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Back to store
            </button>
            <button
              type="button"
              onClick={() => navigate('/library')}
              className="rounded-2xl bg-neon-blue px-5 py-3 text-sm font-semibold text-dark-bg transition hover:bg-neon-blue/90"
            >
              Go to library
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
