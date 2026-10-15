import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  Card,
  Form,
  TextField,
  Input,
  InputGroup,
  Button,
  Alert,
  Tooltip
} from '@heroui/react';
import { useAuth } from '../../context/AuthContext';
import { toastSuccess, toastError } from '../../utils/toast.js';
import { handleApiError } from '../../utils/apiErrorToast.js';

const LoginPage = () => {
  const [searchParams] = useSearchParams();
  const resetSuccess = searchParams.get('reset') === 'success';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validated, setValidated] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setValidated(true);
      return;
    }

    setLoading(true);
    try {
      const user = await login(email, password);
      toastSuccess('เข้าสู่ระบบสำเร็จ', `ยินดีต้อนรับกลับมา ${user?.name || ''}`);
      if (user.role === 'instructor') {
        navigate('/instructor/courses');
      } else {
        navigate('/student/passport');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Invalid email or password');
        toastError('เข้าสู่ระบบไม่สำเร็จ', 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      } else if (!err.response) {
        setError('ไม่สามารถเชื่อมต่อ server ได้');
        toastError('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อ server ได้');
      } else {
        setError(err.response?.data?.message || 'Login failed. Please try again.');
        handleApiError(err);
      }
    } finally {
      setLoading(false);
    }
  };

  const fillQuickAccount = (quickEmail, quickPassword) => {
    setEmail(quickEmail);
    setPassword(quickPassword);
    setError('');
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
              Earn and Showcase Your Skills
            </h1>
            <p className="text-sm text-slate-300 m-0">
              Submit evidence, get certified by instructors, and build your verifiable credential passport.
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
              <h2 className="font-heading font-bold text-2xl text-slate-900 m-0">Welcome Back</h2>
              <p className="text-sm text-slate-500 m-0 mt-1">Please sign in to your account</p>
            </div>

            {/* Reset Password Success Banner */}
            {resetSuccess && (
              <Alert
                status="success"
                className="text-xs"
              >
                เปลี่ยนรหัสผ่านสำเร็จแล้ว กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่
              </Alert>
            )}

            {/* Error Banner */}
            {error && (
              <Alert
                status="danger"
                className="text-xs"
              >
                {error}
              </Alert>
            )}

            {/* Authentication Form with Form and TextField (no visible labels, aria-label only) */}
            <Form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <TextField
                className="w-full"
                name="email"
                type="email"
                isRequired
                isInvalid={validated && !email}
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

              <TextField
                className="w-full"
                name="password"
                isRequired
                isInvalid={validated && !password}
              >
                <InputGroup className="w-full">
                  <InputGroup.Input
                    className="w-full"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    aria-label="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
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

              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-xs text-indigo-600 hover:underline font-medium">
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                color="primary"
                size="lg"
                isLoading={loading}
                className="w-full font-semibold shadow-sm"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </Form>

            {/* Quick Demo Login */}
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
              <span className="text-xs font-semibold text-slate-500 block mb-2">Quick Demo Login</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1 text-xs"
                  onPress={() => fillQuickAccount('instructor@test.com', 'password123')}
                >
                  Instructor
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1 text-xs"
                  onPress={() => fillQuickAccount('student1@test.com', 'password123')}
                >
                  Student
                </Button>
              </div>
            </div>

            {/* Switch Account Link */}
            <div className="text-center text-sm text-slate-600">
              Don&apos;t have an account?{' '}
              <Link to="/register" className="text-indigo-600 font-semibold hover:underline">
                Register
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

export default LoginPage;
