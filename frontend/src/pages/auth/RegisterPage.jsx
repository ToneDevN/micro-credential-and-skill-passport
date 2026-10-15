import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Card,
  Form,
  TextField,
  Input,
  InputGroup,
  Button,
  Alert,
  Meter,
  Tooltip
} from '@heroui/react';
import { useAuth } from '../../context/AuthContext';
import { toastSuccess, toastError } from '../../utils/toast.js';
import { handleApiError } from '../../utils/apiErrorToast.js';

const getPasswordStrength = (pwd) => {
  if (!pwd) return { score: 0, label: 'Empty', color: 'default' };
  let score = 0;
  if (pwd.length >= 6) score += 25;
  if (pwd.length >= 8) score += 25;
  if (/[0-9]/.test(pwd)) score += 25;
  if (/[^A-Za-z0-9]/.test(pwd) || /[A-Z]/.test(pwd)) score += 25;

  if (score <= 25) return { score, label: 'Weak', color: 'danger' };
  if (score <= 50) return { score, label: 'Fair', color: 'warning' };
  if (score <= 75) return { score, label: 'Good', color: 'primary' };
  return { score: 100, label: 'Strong', color: 'success' };
};

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [validated, setValidated] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const isEmailValid = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  const isPasswordValid = (val) => val.length >= 6;

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setValidated(true);

    if (!name || !isEmailValid(email) || !isPasswordValid(password) || !role) {
      return;
    }

    setLoading(true);
    try {
      const user = await register(name, email, password, role);
      toastSuccess('ลงทะเบียนสำเร็จ', `ยินดีต้อนรับสู่ระบบ ${user?.name || ''}`);
      if (user.role === 'instructor') {
        navigate('/instructor/courses');
      } else {
        navigate('/student/passport');
      }
    } catch (err) {
      if (err.response?.status === 400 || err.response?.status === 409) {
        const msg = err.response?.data?.message || 'This email address is already registered.';
        setError(msg);
        toastError('ลงทะเบียนไม่สำเร็จ', msg);
      } else {
        setError(err.response?.data?.message || 'Registration failed. Please try again.');
        handleApiError(err);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center p-4 sm:p-6 bg-slate-50">
      <Card className="w-full max-w-4xl shadow-xl border border-slate-200/80 bg-white rounded-3xl p-3 flex flex-col md:flex-row overflow-hidden">
        {/* LEFT PANEL (~45% width) - Desktop only branding panel */}
        <section className="hidden md:flex w-[45%] bg-[#0f172a] text-white rounded-2xl p-8 flex-col justify-between relative overflow-hidden shadow-inner">
          <div className="relative z-10 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">badge</span>
              </div>
              <span className="font-heading font-bold text-lg text-white">Skill Passport</span>
            </div>
            <h1 className="font-heading font-bold text-2xl leading-snug m-0 mt-2">
              Start Your Skill Journey
            </h1>
            <p className="text-sm text-slate-300 m-0">
              Join educators and learners building transparent, verifiable portfolios.
            </p>
          </div>

          {/* Center Illustration */}
          <div className="my-6 flex justify-center items-center">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCxkPLZFYijE-V_k-wVqKplw5ygi-qsLByN5UA8eFs8VdsADxmPSMHwC_h4alk_znH3dMaaVqv7iqh2s8PIttdAa1eZi_2xQ7U9k0NkYnCjl0AnKsEv0oKqD746jicL1NJSLXAT1tQ0pTecc59JnrvQJQaC7hqwZUbg77MRxAC8C9zVcnUJB9Wt01kNTg2EDDtLCIkO3oBZ-9p3Oc-LHa5XJb-ZMuRpcgFWCmydB0VM1s3nsumUiphQiUWTs4htWcUT7v2LAmUtx4W4"
              alt="Student with credentials"
              className="max-h-48 w-auto object-contain rounded-xl opacity-90"
            />
          </div>

          <div className="text-xs text-slate-400">
            Micro-Credential and Skill Passport Platform
          </div>
        </section>

        {/* RIGHT PANEL (~55% width) - Form Panel */}
        <section className="w-full md:w-[55%] p-6 sm:p-10 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto flex flex-col gap-5">
            {/* Mobile Header */}
            <div className="md:hidden flex items-center gap-2 pb-2">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">badge</span>
              </div>
              <span className="font-heading font-bold text-lg text-slate-900">Skill Passport</span>
            </div>

            {/* Heading & Subtitle */}
            <div>
              <h2 className="font-heading font-bold text-2xl text-slate-900 m-0">Create Account</h2>
              <p className="text-sm text-slate-500 m-0 mt-1">Register to start building your skill passport</p>
            </div>

            {/* Error Banner */}
            {error && (
              <Alert
                status="danger"
                className="text-xs"
              >
                {error}
              </Alert>
            )}

            {/* Registration Form with Form & TextField */}
            <Form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <TextField
                className="w-full"
                name="fullname"
                isRequired
                isInvalid={validated && !name}
              >
                <Input
                  className="w-full"
                  placeholder="Full name"
                  aria-label="Full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </TextField>

              <TextField
                className="w-full"
                name="email"
                type="email"
                isRequired
                isInvalid={validated && !isEmailValid(email)}
              >
                <Input
                  className="w-full"
                  placeholder="Email address (name@institution.edu)"
                  aria-label="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </TextField>

              <div className="space-y-1.5">
                <TextField
                  className="w-full"
                  name="password"
                  isRequired
                  isInvalid={validated && !isPasswordValid(password)}
                >
                  <InputGroup className="w-full">
                    <InputGroup.Input
                      className="w-full"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password (at least 6 characters)"
                      aria-label="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                      autoComplete="new-password"
                    />
                    <InputGroup.Suffix>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-slate-400 hover:text-slate-600 focus:outline-none pr-2"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </InputGroup.Suffix>
                  </InputGroup>
                </TextField>

                {/* Password strength Meter - shown only while focused */}
                {passwordFocused && (
                  <div className="pt-1 px-1">
                    <Meter
                      value={strength.score}
                      color={strength.color}
                      aria-label="Password strength"
                      className="w-full"
                    >
                      <Meter.Track className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <Meter.Fill className="rounded-full" />
                      </Meter.Track>
                    </Meter>
                    <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                      <span>Password strength</span>
                      <span className="font-medium text-slate-700">{strength.label}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Role Selection */}
              <div>
                <span className="text-xs font-semibold text-slate-700 block mb-1.5">I am a...</span>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setRole('student')}
                    className={`flex flex-col text-left p-3 rounded-xl border transition-all ${
                      role === 'student'
                        ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className={`text-sm font-bold ${role === 'student' ? 'text-indigo-600' : 'text-slate-900'}`}>
                      Student
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5">Learn & earn badges</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('instructor')}
                    className={`flex flex-col text-left p-3 rounded-xl border transition-all ${
                      role === 'instructor'
                        ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className={`text-sm font-bold ${role === 'instructor' ? 'text-indigo-600' : 'text-slate-900'}`}>
                      Instructor
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5">Teach & verify skills</span>
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                color="primary"
                size="lg"
                isLoading={loading}
                className="w-full font-semibold shadow-sm mt-1"
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </Button>
            </Form>

            {/* Switch Account Link */}
            <div className="text-center text-sm text-slate-600">
              Already have an account?{' '}
              <Link to="/login" className="text-indigo-600 font-semibold hover:underline">
                Sign In
              </Link>
            </div>

            {/* Security info behind small lock icon + Tooltip */}
            <div className="flex items-center justify-center pt-2">
              <Tooltip delay={0}>
                <Tooltip.Trigger
                  aria-label="Security information"
                  className="text-slate-400 hover:text-slate-600 inline-flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">lock</span>
                  <span className="text-xs">Security Protected</span>
                </Tooltip.Trigger>
                <Tooltip.Content className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-700 shadow-sm max-w-xs">
                  <p className="m-0">End-to-end cryptographic handshake and secure credential verification enabled.</p>
                </Tooltip.Content>
              </Tooltip>
            </div>
          </div>
        </section>
      </Card>
    </div>
  );
};

export default RegisterPage;
