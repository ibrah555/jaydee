import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';

const pinPads = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

export default function Login() {
  const [pin, setPin] = useState('');
  const { signIn } = useAuthStore();
  const navigate = useNavigate();

  const handlePin = (digit: string) => {
    if (pin.length >= 6) return;
    setPin((current) => current + digit);
  };

  const handleDelete = () => setPin((current) => current.slice(0, -1));

  const handleSubmit = () => {
    if (pin.length < 4) return;
    signIn(pin);
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-b from-secondary via-white to-primary">
      <div className="w-full max-w-sm rounded-3xl bg-white/95 p-6 shadow-xl ring-1 ring-black/5 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-semibold text-accent">JayDee POS</h1>
          <p className="mt-2 text-sm text-slate-500">Enter your 4-6 digit PIN or use biometrics.</p>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-6">
          {pinPads.map((digit) => (
            <button
              key={digit}
              type="button"
              className="h-14 rounded-2xl bg-slate-100 text-xl font-semibold text-slate-900 shadow-sm transition hover:bg-slate-200"
              onClick={() => handlePin(digit)}
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            className="h-14 rounded-2xl bg-slate-100 text-lg text-slate-700 shadow-sm transition hover:bg-slate-200"
            onClick={handleDelete}
          >
            Delete
          </button>
        </div>
        <div className="mb-4">
          <div className="h-14 rounded-2xl border border-slate-200 bg-slate-50 px-4 flex items-center justify-center text-2xl tracking-[0.35em]">
            {Array.from({ length: pin.length }).map((_, index) => (
              <span key={index} className="w-4 h-4 rounded-full bg-accent mx-1" />
            ))}
          </div>
        </div>
        <button
          type="button"
          className="w-full rounded-2xl bg-accent px-4 py-3 text-white text-lg font-semibold shadow-lg transition hover:bg-purple-900 disabled:opacity-50"
          onClick={handleSubmit}
          disabled={pin.length < 4}
        >
          Unlock
        </button>
      </div>
    </div>
  );
}
