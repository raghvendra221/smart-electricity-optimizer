// pages/Login.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { loginUser } from '../services/api.js'; // ✅ FIXED
import { Input, Button } from '../components/ui/index.jsx';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPass] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  function validate() {
    const e = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Invalid email address';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Password must be 6+ characters';
    return e;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    setErrors({});
    setLoading(true);

    try {
      const res = await loginUser(email, password);

      // ✅ FIXED (use backend response)
      login(res.access, res.refresh, { email });

      addToast(`Welcome back!`, 'success');
      navigate('/dashboard');

    } catch (err) {
      addToast(err.message || 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-5">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent2)]
            flex items-center justify-center text-3xl mx-auto mb-3">
            ⚡
          </div>
          <h1 className="text-xl font-bold text-[var(--text)]">Smart Electricity</h1>
          <p className="font-mono text-[11px] text-[var(--text3)] mt-1">Usage Optimizer v2.0</p>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-7">
          <h2 className="text-base font-semibold text-[var(--text)] mb-5">
            Sign in to your account
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Email" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)} error={errors.email} />

            <Input label="Password" type="password" value={password}
              onChange={(e) => setPass(e.target.value)} error={errors.password} />

            <Button type="submit" loading={loading} disabled={loading}
              className="w-full justify-center py-3 mt-2">
              Sign In
            </Button>
          </form>

          <p className="text-center text-sm text-[var(--text3)] mt-5">
            Don't have an account?{' '}
            <Link to="/signup" className="text-[var(--accent)] hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}