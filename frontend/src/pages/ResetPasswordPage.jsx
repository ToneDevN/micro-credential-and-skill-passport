import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardContent,
  Form,
  TextField,
  Input,
  InputGroup,
  Button,
  Alert,
  Spinner,
  Meter,
  Tooltip
} from '@heroui/react';
import { validateResetToken, resetPassword } from '../services/authService';

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

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const strength = getPasswordStrength(password);

  // Validate token on mount
  useEffect(() => {
    let isMounted = true;

    const checkToken = async () => {
      if (!token) {
        if (isMounted) {
          setTokenValid(false);
          setValidating(false);
        }
        return;
      }

      try {
        const res = await validateResetToken(token);
        if (isMounted) {
          setTokenValid(!!res.valid);
        }
      } catch (err) {
        if (isMounted) {
          setTokenValid(false);
        }
      } finally {
        if (isMounted) {
          setValidating(false);
        }
      }
    };

    checkToken();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError('กรุณากรอกรหัสผ่านใหม่');
      return;
    }

    if (password.length < 8) {
      setError('รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร');
      return;
    }

    if (password !== confirmPassword) {
      setError('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(token, password, confirmPassword);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login?reset=success');
      }, 2000);
    } catch (err) {
      console.error('[ResetPassword] error:', err);
      const msg = err.response?.data?.message || 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center p-4 sm:p-6 bg-slate-50">
      <Card className="w-full max-w-md p-6 sm:p-8 shadow-xl border border-slate-200/80 bg-white rounded-3xl">
        {/* State 1: Checking Token */}
        {validating && (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
            <Spinner size="lg" color="primary" />
            <p className="text-sm text-slate-500 font-medium">Verifying reset token...</p>
          </div>
        )}

        {/* State 2: Invalid or Expired Token */}
        {!validating && !tokenValid && (
          <div className="flex flex-col items-center text-center gap-4 py-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mb-1">
              <span className="material-symbols-outlined text-2xl">link_off</span>
            </div>
            <h2 className="font-heading font-bold text-xl sm:text-2xl text-slate-900 m-0">Link Expired or Invalid</h2>
            <p className="text-xs sm:text-sm text-slate-500 m-0">
              This password reset link is invalid or has already expired. Please request a new one.
            </p>
            <div className="w-full flex flex-col gap-2.5 mt-2">
              <Button
                color="primary"
                className="w-full font-semibold"
                onPress={() => navigate('/forgot-password')}
              >
                Request New Reset Link
              </Button>
              <Link to="/login" className="text-xs text-slate-500 hover:text-slate-700 hover:underline py-1">
                Back to Sign In
              </Link>
            </div>
          </div>
        )}

        {/* State 3: Token is Valid — Show Form */}
        {!validating && tokenValid && (
          <>
            <CardHeader className="flex flex-col items-center text-center p-0 pb-6 gap-2">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-1">
                <span className="material-symbols-outlined text-2xl">key</span>
              </div>
              <h1 className="font-heading font-bold text-2xl text-slate-900 m-0">Reset Password</h1>
              <p className="text-xs sm:text-sm text-slate-500 m-0 max-w-xs">
                Enter your new password below (at least 8 characters).
              </p>
            </CardHeader>

            <CardContent className="p-0 flex flex-col gap-4">
              {error && (
                <Alert status="danger" className="text-xs">
                  {error}
                </Alert>
              )}

              {success ? (
                <div className="flex flex-col items-center text-center gap-4 py-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-1">
                    <span className="material-symbols-outlined text-2xl">check_circle</span>
                  </div>
                  <h3 className="font-heading font-bold text-xl text-slate-900 m-0">Password Reset Complete!</h3>
                  <p className="text-xs sm:text-sm text-slate-500 m-0">
                    Your password has been updated. Redirecting to sign in...
                  </p>
                  <Button
                    color="primary"
                    className="w-full font-semibold mt-2"
                    onPress={() => navigate('/login?reset=success')}
                  >
                    Sign In Now
                  </Button>
                </div>
              ) : (
                <Form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="space-y-1.5">
                    <TextField
                      className="w-full"
                      name="new-password"
                      isRequired
                      isInvalid={!!error}
                    >
                      <InputGroup className="w-full">
                        <InputGroup.Input
                          className="w-full"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="New password (min 8 characters)"
                          aria-label="New password"
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            if (error) setError('');
                          }}
                          onFocus={() => setPasswordFocused(true)}
                          onBlur={() => setPasswordFocused(false)}
                          disabled={submitting}
                          autoFocus
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

                  <TextField
                    className="w-full"
                    name="confirm-password"
                    isRequired
                    isInvalid={!!error}
                  >
                    <InputGroup className="w-full">
                      <InputGroup.Input
                        className="w-full"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Re-enter new password"
                        aria-label="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (error) setError('');
                        }}
                        disabled={submitting}
                        autoComplete="new-password"
                      />
                      <InputGroup.Suffix>
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="text-slate-400 hover:text-slate-600 focus:outline-none pr-2"
                          aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {showConfirmPassword ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </InputGroup.Suffix>
                    </InputGroup>
                  </TextField>

                  <Button
                    type="submit"
                    color="primary"
                    size="lg"
                    isLoading={submitting}
                    className="w-full font-semibold shadow-sm mt-1"
                  >
                    {submitting ? 'Updating password...' : 'Reset Password'}
                  </Button>

                  <div className="text-center pt-1">
                    <Link to="/login" className="text-xs text-indigo-600 font-medium hover:underline inline-flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                      <span>Back to Sign In</span>
                    </Link>
                  </div>
                </Form>
              )}

              {/* Security Tooltip */}
              <div className="flex items-center justify-center pt-3 border-t border-slate-100">
                <Tooltip delay={0}>
                  <Tooltip.Trigger
                    aria-label="Security information"
                    className="text-slate-400 hover:text-slate-600 inline-flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span className="material-symbols-outlined text-[15px]">lock</span>
                    <span className="text-xs">End-to-End Encryption</span>
                  </Tooltip.Trigger>
                  <Tooltip.Content className="rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-700 shadow-sm max-w-xs">
                    <p className="m-0">Passwords are salted and securely hashed using bcrypt on the server.</p>
                  </Tooltip.Content>
                </Tooltip>
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
};

export default ResetPasswordPage;
