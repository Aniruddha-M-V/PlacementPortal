import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, GraduationCap, Lock, Mail, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required'),
});

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');

  const from = location.state?.from?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    setServerError('');
    const result = await login(data.email, data.password);
    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setServerError(result.message || 'Invalid credentials. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-[45%] bg-primary-600 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-primary-500 rounded-full -translate-y-1/3 translate-x-1/3 opacity-50" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary-700 rounded-full translate-y-1/3 -translate-x-1/3 opacity-50" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="p-2.5 bg-white/20 rounded-lg">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="text-white font-bold text-lg leading-tight">Placement Portal</div>
            <div className="text-primary-200 text-xs">Training & Placement Management</div>
          </div>
        </div>

        {/* Hero Text */}
        <div className="relative">
          <h1 className="text-4xl font-bold text-white leading-snug mb-4">
            Your complete<br />placement command<br />centre.
          </h1>
          <p className="text-primary-200 text-base leading-relaxed max-w-sm">
            Manage students, track attendance, run assessments, and identify placement-ready candidates — all from one dashboard.
          </p>
        </div>

        {/* Stats */}
        <div className="relative flex gap-8">
          {[
            { value: '360°', label: 'Student View' },
            { value: 'Live', label: 'Attendance' },
            { value: 'Auto', label: 'Eligibility' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-primary-200 text-xs mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="p-2 bg-primary-100 rounded-lg">
              <GraduationCap className="w-6 h-6 text-primary-600" />
            </div>
            <div className="font-bold text-lg text-text">Placement Portal</div>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-text">Welcome back</h2>
            <p className="text-text-secondary text-sm mt-1">Sign in to your account to continue</p>
          </div>

          {/* Server Error */}
          {serverError && (
            <div className="flex items-start gap-2.5 p-3.5 bg-danger-50 border border-danger-200 rounded-lg mb-6">
              <AlertCircle className="w-4 h-4 text-danger-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-danger-700">{serverError}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="form-label">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@college.edu"
                  className={`form-input pl-10 ${errors.email ? 'border-danger-400 focus:border-danger-400 focus:ring-danger-100' : ''}`}
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="form-error">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className={`form-input pl-10 pr-11 ${errors.password ? 'border-danger-400 focus:border-danger-400 focus:ring-danger-100' : ''}`}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-text-muted hover:text-text-secondary transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="form-error">{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-3 mt-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-xs text-text-muted text-center">
              Contact your administrator to reset your password or get access.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
