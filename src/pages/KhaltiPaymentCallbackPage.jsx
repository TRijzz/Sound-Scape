import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiService from '../services/api';
import { useMusic } from '../contexts/MusicContext';

const VERIFY_TIMEOUT_MS = 12000;
const SLOW_VERIFY_MS = 4500;

const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

const timeoutAfter = (ms) => new Promise((_, reject) => {
  window.setTimeout(() => {
    const error = new Error('Payment verification is taking longer than expected. Please try again.');
    error.code = 'VERIFY_TIMEOUT';
    reject(error);
  }, ms);
});

function PaymentStatusMark({ phase }) {
  const isSuccess = phase === 'success';
  const isError = phase === 'error';

  if (isSuccess) {
    return (
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        className="relative mx-auto mb-7 flex h-24 w-24 items-center justify-center"
      >
        <motion.div
          initial={{ scale: 0.6, opacity: 0.8 }}
          animate={{ scale: 1.45, opacity: 0 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className="absolute inset-0 rounded-full bg-emerald-400/25"
        />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-emerald-300/40 bg-emerald-400/15 text-emerald-200 shadow-[0_0_45px_rgba(52,211,153,0.25)]">
          <motion.svg
            viewBox="0 0 52 52"
            className="h-12 w-12"
            initial="hidden"
            animate="visible"
          >
            <motion.path
              d="M15 27.5 23 35 38 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              variants={{
                hidden: { pathLength: 0, opacity: 0 },
                visible: { pathLength: 1, opacity: 1 },
              }}
              transition={{ duration: 0.45, ease: 'easeOut', delay: 0.1 }}
            />
          </motion.svg>
        </div>
      </motion.div>
    );
  }

  if (isError) {
    return (
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mx-auto mb-7 flex h-20 w-20 items-center justify-center rounded-full border border-red-300/35 bg-red-400/10 text-4xl font-semibold text-red-200"
      >
        !
      </motion.div>
    );
  }

  return (
    <div className="relative mx-auto mb-7 flex h-24 w-24 items-center justify-center">
      {[0, 1, 2].map((ring) => (
        <motion.div
          key={ring}
          className="absolute rounded-full border border-neon-blue/25"
          initial={{ width: 54, height: 54, opacity: 0.6 }}
          animate={{ width: 108, height: 108, opacity: 0 }}
          transition={{
            duration: 1.6,
            repeat: Infinity,
            delay: ring * 0.45,
            ease: 'easeOut',
          }}
        />
      ))}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
        className="absolute h-20 w-20 rounded-full border-2 border-neon-blue/15 border-t-neon-blue"
      />
      <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-neon-blue/30 bg-neon-blue/10 text-neon-blue">
        <span className="sr-only">Verifying</span>
        <motion.span
          animate={{ opacity: [0.35, 1, 0.35] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="text-xl font-bold"
        >
          ...
        </motion.span>
      </div>
    </div>
  );
}

export default function KhaltiPaymentCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { syncCurrentUser } = useMusic();
  const [phase, setPhase] = React.useState('verifying');
  const [message, setMessage] = React.useState('Confirming your Khalti payment...');
  const [redirectTo, setRedirectTo] = React.useState('/library');

  React.useEffect(() => {
    let cancelled = false;
    let redirectTimer = null;
    let slowTimer = null;

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
        slowTimer = window.setTimeout(() => {
          if (!cancelled) {
            setMessage('Khalti confirmed the return. Finishing the receipt check...');
          }
        }, SLOW_VERIFY_MS);

        const callback = Object.fromEntries(searchParams.entries());
        const [response] = await Promise.all([
          Promise.race([
            apiService.verifyKhaltiPayment({ pidx, callback }),
            timeoutAfter(VERIFY_TIMEOUT_MS),
          ]),
          sleep(850),
        ]);

        if (cancelled) return;
        if (slowTimer) {
          window.clearTimeout(slowTimer);
          slowTimer = null;
        }

        const nextRedirect = response?.redirect_to || '/library';
        setRedirectTo(nextRedirect);
        setPhase('success');
        setMessage('Payment verified. Your vinyl has been added to your library.');

        syncCurrentUser().catch((error) => {
          console.error('Failed to refresh user after Khalti payment:', error);
        });

        redirectTimer = window.setTimeout(() => {
          navigate(nextRedirect, { replace: true });
        }, 2600);
      } catch (error) {
        if (cancelled) return;
        if (slowTimer) {
          window.clearTimeout(slowTimer);
          slowTimer = null;
        }
        setPhase('error');
        setMessage(error?.message || 'Failed to verify Khalti payment. Please try again.');
      }
    };

    verifyPayment();

    return () => {
      cancelled = true;
      if (slowTimer) {
        window.clearTimeout(slowTimer);
      }
      if (redirectTimer) {
        window.clearTimeout(redirectTimer);
      }
    };
  }, [navigate, searchParams, syncCurrentUser]);

  const isSuccess = phase === 'success';
  const isError = phase === 'error';
  const title = isSuccess ? 'Payment complete' : isError ? 'Payment not completed' : 'Verifying payment';
  const eyebrow = isSuccess ? 'Receipt confirmed' : isError ? 'Action needed' : 'Khalti payment';

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(0,255,255,0.16),_transparent_34%),linear-gradient(145deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] p-8 text-center shadow-[0_30px_80px_rgba(0,0,0,0.35)]"
        >
          <PaymentStatusMark phase={phase} />

          <motion.p
            key={eyebrow}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-xs font-semibold uppercase tracking-[0.35em] ${
              isError ? 'text-red-200/80' : isSuccess ? 'text-emerald-200/90' : 'text-neon-blue/80'
            }`}
          >
            {eyebrow}
          </motion.p>
          <motion.h1
            key={title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 text-3xl font-semibold text-white md:text-4xl"
          >
            {title}
          </motion.h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-gray-300">{message}</p>

          {isSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-auto mt-7 max-w-md overflow-hidden rounded-2xl border border-emerald-300/15 bg-emerald-300/5 p-4"
            >
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-gray-300">Redirecting to library</span>
                <span className="font-semibold text-emerald-200">Unlocked</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 2.4, ease: 'easeInOut' }}
                  className="h-full rounded-full bg-emerald-300"
                />
              </div>
            </motion.div>
          )}

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
              onClick={() => navigate(redirectTo)}
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
