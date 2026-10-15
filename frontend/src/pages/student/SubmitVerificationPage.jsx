import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Spinner,
  Card,
  CardContent,
  Input,
  TextArea,
  Button,
  Chip,
  Alert,
  Tooltip,
  DisclosureGroup,
  Disclosure
} from '@heroui/react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import GithubRepoPickerModal from '../../components/GithubRepoPickerModal';
import { toastSuccess, toastWarning, toastError } from '../../utils/toast.js';
import { handleApiError } from '../../utils/apiErrorToast.js';

const SubmitVerificationPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCourseId = searchParams.get('courseId') || '';
  const initialSkillId = searchParams.get('skillId') || '';

  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(initialCourseId);
  const [skills, setSkills] = useState([]);
  const [selectedCourseSkillId, setSelectedCourseSkillId] = useState(initialSkillId);
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [isRepoPickerOpen, setIsRepoPickerOpen] = useState(false);
  const [selectedRepoName, setSelectedRepoName] = useState('');

  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Fetch all courses
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoadingCourses(true);
        const res = await api.get('/courses');
        const courseList = res.data.courses || [];
        setCourses(courseList);

        if (courseList.length > 0 && !initialCourseId) {
          setSelectedCourseId(courseList[0]._id);
        }
      } catch (err) {
        console.error('Failed to load courses', err);
        setError('Failed to load courses. Please refresh or try again.');
      } finally {
        setLoadingCourses(false);
      }
    };

    fetchCourses();
  }, [initialCourseId]);

  // Fetch skills when selected course changes
  useEffect(() => {
    if (!selectedCourseId) {
      setSkills([]);
      setSelectedCourseSkillId('');
      return;
    }

    const fetchSkills = async () => {
      try {
        setLoadingSkills(true);
        setError(null);
        const res = await api.get(`/courses/${selectedCourseId}/public-skills`);
        const skillList = res.data.skills || [];
        setSkills(skillList);

        if (skillList.length > 0) {
          const matched = skillList.find(
            (s) => (s.courseSkillId || s._id) === initialSkillId || s._id === initialSkillId
          );
          setSelectedCourseSkillId(matched ? (matched.courseSkillId || matched._id) : (skillList[0].courseSkillId || skillList[0]._id));
        } else {
          setSelectedCourseSkillId('');
        }
      } catch (err) {
        console.error('Failed to load course skills', err);
        setError('Failed to load skills for this course.');
      } finally {
        setLoadingSkills(false);
      }
    };

    fetchSkills();
  }, [selectedCourseId, initialSkillId]);

  // Find currently selected course & skill objects for preview
  const currentCourse = courses.find((c) => c._id === selectedCourseId);
  const currentSkill = skills.find(
    (s) => (s.courseSkillId || s._id) === selectedCourseSkillId
  );

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!selectedCourseId) {
      setError('Please select a course');
      toastWarning('ข้อมูลไม่ครบถ้วน', 'กรุณาเลือกหลักสูตรที่ต้องการส่งตรวจ');
      return;
    }
    if (!selectedCourseSkillId) {
      setError('Please select a skill');
      toastWarning('ข้อมูลไม่ครบถ้วน', 'กรุณาเลือกทักษะที่ต้องการส่งตรวจ');
      return;
    }
    if (!evidenceUrl.trim()) {
      setError('Please enter a valid evidence URL');
      toastWarning('ข้อมูลไม่ครบถ้วน', 'กรุณาระบุ Evidence URL หรือเลือกจาก GitHub');
      return;
    }

    try {
      new URL(evidenceUrl.trim());
    } catch {
      setError('Evidence URL must be a valid http or https web address.');
      toastWarning('URL ไม่ถูกต้อง', 'กรุณากรอกลิงก์เว็บไซต์ที่ขึ้นต้นด้วย http:// หรือ https://');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/verification-requests', {
        courseId: selectedCourseId,
        skillId: selectedCourseSkillId,
        evidenceUrl: evidenceUrl.trim(),
        notes: notes.trim(),
      });

      if (res.status === 200 || res.status === 201) {
        const skillName = currentSkill ? currentSkill.name : 'ทักษะ';
        toastSuccess(
          'ส่งคำขอสำเร็จ!',
          `ส่งคำขอตรวจสอบทักษะ "${skillName}" เรียบร้อยแล้ว กำลังรออาจารย์ผู้สอนพิจารณา`
        );

        setSuccessMsg(
          res.data?.message || 'Verification request submitted successfully! Redirecting...'
        );

        setTimeout(() => {
          navigate('/student/my-requests');
        }, 1500);
      }
    } catch (err) {
      console.error('Failed to submit verification request', err);
      const status = err.response?.status;
      const msg = err.response?.data?.message;

      if (status === 409) {
        setError(msg || 'A pending or approved request already exists for this skill.');
        toastWarning('ส่งคำขอซ้ำ', msg || 'คุณได้ส่งคำขอสำหรับทักษะนี้ไปแล้ว หรือได้รับการอนุมัติแล้ว');
      } else if (status === 403) {
        setError('You are not authorized to submit verification for this course.');
        toastError('ไม่มีสิทธิ์เข้าถึง', 'คุณยังไม่ได้ลงทะเบียนในหลักสูตรนี้ หรือไม่มีสิทธิ์ส่งคำขอ');
      } else {
        const errorMsg =
          msg ||
          'Failed to submit verification request. Please check that you are enrolled in this course.';
        setError(errorMsg);
        handleApiError(err);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = () => {
    localStorage.setItem(
      'verification_draft',
      JSON.stringify({
        courseId: selectedCourseId,
        skillId: selectedCourseSkillId,
        evidenceUrl,
        notes,
      })
    );
    toastSuccess('บันทึกร่างสำเร็จ', 'ข้อมูลคำขอถูกบันทึกไว้ในเครื่องของคุณเรียบร้อยแล้ว');
  };

  return (
    <div className="min-h-[calc(100vh-120px)] bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <Link to="/student/my-requests" className="hover:text-indigo-600 transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">assignment</span>
            <span>My Requests</span>
          </Link>
          <span className="text-slate-400">&gt;</span>
          <span className="text-slate-800 font-semibold">Submit New Request</span>
        </nav>

        {/* Page Header */}
        <header>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-slate-900 m-0">
            Submit Verification Request
          </h1>
          <p className="text-sm text-slate-500 m-0 mt-1">
            Provide evidence link to verify your skill competency with institutional assessors
          </p>
        </header>

        {/* Form Card */}
        <Card className="bg-white border border-slate-200/80 rounded-3xl shadow-sm p-6 sm:p-8">
          <CardContent className="p-0 flex flex-col gap-5">
            {error && <Alert status="danger" className="text-xs">{error}</Alert>}
            {successMsg && <Alert status="success" className="text-xs">{successMsg}</Alert>}

            <form onSubmit={handleSubmit} id="verification-form" className="flex flex-col gap-5">
              {/* Field 1 — Course */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700" htmlFor="course-select">
                  Course
                </label>
                <div className="relative">
                  <select
                    id="course-select"
                    name="course"
                    className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 appearance-none outline-none transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
                    value={selectedCourseId}
                    disabled={loadingCourses || submitting}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                  >
                    {loadingCourses ? (
                      <option value="">Loading courses...</option>
                    ) : courses.length === 0 ? (
                      <option value="">No courses available</option>
                    ) : (
                      courses.map((course) => (
                        <option key={course._id} value={course._id}>
                          {course.name}
                        </option>
                      ))
                    )}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <span className="material-symbols-outlined text-[20px]">unfold_more</span>
                  </div>
                </div>
              </div>

              {/* Field 2 — Skill */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700" htmlFor="skill-select">
                  Skill
                </label>
                <div className="relative">
                  <select
                    id="skill-select"
                    name="skill"
                    className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 appearance-none outline-none transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
                    value={selectedCourseSkillId}
                    disabled={loadingSkills || submitting || skills.length === 0}
                    onChange={(e) => setSelectedCourseSkillId(e.target.value)}
                  >
                    {loadingSkills ? (
                      <option value="">Loading skills...</option>
                    ) : skills.length === 0 ? (
                      <option value="">No skills linked to this course</option>
                    ) : (
                      skills.map((skill) => (
                        <option
                          key={skill.courseSkillId || skill._id}
                          value={skill.courseSkillId || skill._id}
                        >
                          {skill.name} {skill.description ? `— ${skill.description}` : ''}
                        </option>
                      ))
                    )}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <span className="material-symbols-outlined text-[20px]">unfold_more</span>
                  </div>
                </div>

                {/* Rubric criteria list wrapped in a closed-by-default DisclosureGroup per TON-212 */}
                {currentSkill?.criteria && (
                  <div className="mt-2">
                    <DisclosureGroup defaultExpandedKeys={[]}>
                      <Disclosure id="rubric">
                        <Disclosure.Trigger className="text-xs text-indigo-600 font-medium hover:underline inline-flex items-center gap-1 cursor-pointer">
                          <span>View rubric criteria ▾</span>
                        </Disclosure.Trigger>
                        <Disclosure.Content className="pt-2">
                          <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl text-xs text-slate-600 leading-relaxed">
                            <strong className="text-slate-800 block mb-1">Assessment Rubric:</strong>
                            {currentSkill.criteria}
                          </div>
                        </Disclosure.Content>
                      </Disclosure>
                    </DisclosureGroup>
                  </div>
                )}
              </div>

              {/* Field 3 — Evidence URL */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center mb-0.5">
                  <label className="text-xs font-semibold text-slate-700 m-0" htmlFor="evidence-url">
                    Evidence URL
                  </label>
                  {user?.github_connected_status === 'connected' ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="text-xs h-7 px-2.5 font-medium"
                      onPress={() => setIsRepoPickerOpen(true)}
                      isDisabled={submitting}
                      startContent={
                        <svg height="14" width="14" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                        </svg>
                      }
                    >
                      Select from GitHub
                    </Button>
                  ) : (
                    <Link
                      to="/settings"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline"
                    >
                      <span>Connect GitHub first</span>
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </Link>
                  )}
                </div>

                {selectedRepoName && (
                  <div className="flex items-center gap-2 mb-1">
                    <Chip
                      size="sm"
                      color="success"
                      variant="flat"
                      className="text-xs"
                      startContent={<span className="material-symbols-outlined text-[14px] mr-0.5">check_circle</span>}
                    >
                      {selectedRepoName}
                    </Chip>
                    <button
                      type="button"
                      className="text-slate-400 hover:text-slate-600 text-xs hover:underline"
                      onClick={() => {
                        setSelectedRepoName('');
                        setEvidenceUrl('');
                      }}
                    >
                      Enter URL manually
                    </button>
                  </div>
                )}

                <Input
                  id="evidence-url"
                  name="evidence_url"
                  type="url"
                  placeholder="https://github.com/username/repository"
                  value={evidenceUrl}
                  disabled={submitting}
                  onChange={(e) => {
                    setEvidenceUrl(e.target.value);
                    if (selectedRepoName) setSelectedRepoName('');
                  }}
                  isRequired
                  startContent={<span className="material-symbols-outlined text-slate-400 text-[18px] ml-1">link</span>}
                />
              </div>

              {/* Description TextArea: short one-line placeholder, no character counter per TON-212 */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700" htmlFor="evidence-notes">
                  Additional Notes (Optional)
                </label>
                <TextArea
                  id="evidence-notes"
                  name="evidence_notes"
                  rows={2}
                  placeholder="Brief notes or context for the assessor..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs"
                />
              </div>

              {/* Action Buttons: Single primary Submit Button + Icon-only Save Draft Button with Tooltip per TON-212 */}
              <div className="flex items-center gap-2 pt-2">
                <Button
                  type="submit"
                  color="primary"
                  size="lg"
                  isLoading={submitting}
                  isDisabled={submitting || !selectedCourseSkillId || !evidenceUrl.trim()}
                  className="flex-1 font-semibold shadow-sm"
                  endContent={!submitting && <span className="material-symbols-outlined text-[18px]">arrow_forward</span>}
                >
                  {submitting ? 'Submitting for Review...' : 'Submit for Review'}
                </Button>

                <Tooltip delay={0}>
                  <Tooltip.Trigger
                    aria-label="Save as draft"
                    className="p-3 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
                    onClick={handleSaveDraft}
                  >
                    <span className="material-symbols-outlined text-[20px] block">save</span>
                  </Tooltip.Trigger>
                  <Tooltip.Content className="rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-700 shadow-sm">
                    <p className="m-0">Save as draft</p>
                  </Tooltip.Content>
                </Tooltip>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Bottom Link */}
        <div className="text-center">
          <Link
            to="/student/my-requests"
            className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:underline text-xs"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Back to My Requests</span>
          </Link>
        </div>

        {/* GitHub Repository Picker Modal */}
        <GithubRepoPickerModal
          isOpen={isRepoPickerOpen}
          onClose={() => setIsRepoPickerOpen(false)}
          onSelect={(repo) => {
            setEvidenceUrl(repo.html_url);
            setSelectedRepoName(repo.name);
            setIsRepoPickerOpen(false);
          }}
        />
      </div>
    </div>
  );
};

export default SubmitVerificationPage;
