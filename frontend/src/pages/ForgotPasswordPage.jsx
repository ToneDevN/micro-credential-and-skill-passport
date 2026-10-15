import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardContent,
  Form,
  TextField,
  Input,
  Button,
  Alert,
  Tooltip
} from '@heroui/react';
import { forgotPassword } from '../services/authService';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('กรุณากรอกอีเมลของคุณ');
      return;
    }

    setSubmitting(true);
    try {
      const res = await forgotPassword(email.trim().toLowerCase());
      setSubmitted(true);
      setMessage(res.message || 'ส่งลิงก์ reset รหัสผ่านไปที่ email ของคุณแล้ว');
    } catch (err) {
      console.error('[ForgotPassword] error:', err);
      setError(
        err.response?.data?.message || 'เกิดข้อผิดพลาดในการส่งคำขอ กรุณาลองใหม่อีกครั้ง'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center p-4 sm:p-6 bg-slate-50">
      <Card className="w-full max-w-md p-6 sm:p-8 shadow-xl border border-slate-200/80 bg-white rounded-3xl">
        <CardHeader className="flex flex-col items-center text-center p-0 pb-6 gap-2">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-1">
            <span className="material-symbols-outlined text-2xl">lock_reset</span>
          </div>
          <h1 className="font-heading font-bold text-2xl text-slate-900 m-0">Forgot Password</h1>
          <p className="text-xs sm:text-sm text-slate-500 m-0 max-w-xs">
            Enter your email and we&apos;ll send you instructions to reset your password.
          </p>
        </CardHeader>

        <CardContent className="p-0 flex flex-col gap-4">
          {error && (
            <Alert status="danger" className="text-xs">
              {error}
            </Alert>
          )}

          {submitted ? (
            <div className="flex flex-col items-center text-center gap-4 py-2">
              <Alert
                status="success"
                className="text-xs"
              >
                {message}. กรุณาตรวจสอบกล่องจดหมายของคุณ
              </Alert>
              <Button
                variant="secondary"
                className="w-full font-semibold"
                onPress={() => navigate('/login')}
              >
                Back to Sign In
              </Button>
            </div>
          ) : (
            <Form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <TextField
                className="w-full"
                name="email"
                type="email"
                isRequired
                isInvalid={!!error}
              >
                <Input
                  className="w-full"
                  placeholder="Registered email address"
                  aria-label="Registered email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </TextField>

              <Button
                type="submit"
                color="primary"
                size="lg"
                isLoading={submitting}
                className="w-full font-semibold shadow-sm mt-1"
              >
                {submitting ? 'Sending Request...' : 'Send Reset Link'}
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
                <span className="text-xs">Encrypted Reset Flow</span>
              </Tooltip.Trigger>
              <Tooltip.Content className="rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-700 shadow-sm max-w-xs">
                <p className="m-0">Password reset tokens are cryptographically hashed and time-limited.</p>
              </Tooltip.Content>
            </Tooltip>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPasswordPage;
