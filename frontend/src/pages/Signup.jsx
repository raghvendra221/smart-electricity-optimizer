// pages/Signup.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { registerUser } from '../services/api.js';
import { Input, Button } from '../components/ui/index.jsx';

export default function Signup() {
  const [form, setForm]       = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  function validate() {
    const e = {};
    if (!form.name.trim())  e.name = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email';
    if (!form.password)     e.password = 'Password is required';
    else if (form.password.length < 6) e.password = 'Password must be 6+ characters';
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match';
    return e;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setLoading(true);
    try {
      const { access, user } = await registerUser(form.name, form.email, form.password);
      login(access, user);
      addToast(`Account created! Welcome, ${user.name}!`, 'success');
      navigate('/dashboard');
    } catch (err) {
      addToast(err.message || 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent2)]
            flex items-center justify-center text-3xl mx-auto mb-3">⚡</div>
          <h1 className="text-xl font-bold text-[var(--text)]">Create Account</h1>
          <p className="font-mono text-[11px] text-[var(--text3)] mt-1">Start optimizing today</p>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-7">
          <h2 className="text-base font-semibold text-[var(--text)] mb-5">Your details</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Full Name" type="text" placeholder="Jane Doe"
              value={form.name} onChange={set('name')} error={errors.name} />
            <Input label="Email" type="email" placeholder="you@example.com"
              value={form.email} onChange={set('email')} error={errors.email} />
            <Input label="Password" type="password" placeholder="••••••••"
              value={form.password} onChange={set('password')} error={errors.password} />
            <Input label="Confirm Password" type="password" placeholder="••••••••"
              value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
            <Button type="submit" loading={loading} disabled={loading} className="w-full justify-center py-3 mt-2">
              Create Account
            </Button>
          </form>
          <p className="text-center text-sm text-[var(--text3)] mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-[var(--accent)] hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
