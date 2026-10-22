import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Spinner,
  Table,
  Button,
  Chip,
  Alert,
  Modal,
  AlertDialog,
  Dropdown,
  Input,
  TextArea
} from '@heroui/react';
import api from '../../services/api';
import { toastSuccess, toastWarning } from '../../utils/toast.js';
import { handleApiError } from '../../utils/apiErrorToast.js';

const SkillManagementPage = () => {
  const { courseId } = useParams();

  const [course, setCourse] = useState(null);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Add / Edit Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingSkill, setEditingSkill] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    criteria: '',
    status: 'active',
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Delete AlertDialog State
  const [deletingSkill, setDeletingSkill] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCourseSkills = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/courses/${courseId}/skills`);
      setCourse(res.data.course || null);
      setSkills(res.data.skills || []);
    } catch (err) {
      console.error('Failed to load course skills:', err);
      if (err.response?.status === 403) {
        setError('You are not authorized to manage skills for this course.');
      } else if (err.response?.status === 404) {
        setError('Course not found.');
      } else {
        setError('Failed to load course skills. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchCourseSkills();
  }, [fetchCourseSkills]);

  const handleOpenCreate = () => {
    setEditingSkill(null);
    setFormData({ name: '', description: '', criteria: '', status: 'active', is_open_for_verification: false });
    setFormErrors({});
    setShowModal(true);
  };

  const handleOpenEdit = (skill) => {
    const rawSkill = skill.skill_id || skill;
    setEditingSkill(skill);
    setFormData({
      name: rawSkill.name || skill.name || '',
      description: rawSkill.description || skill.description || '',
      criteria: rawSkill.criteria || skill.criteria || '',
      status: rawSkill.status || skill.status || 'active',
      is_open_for_verification: Boolean(rawSkill.is_open_for_verification ?? skill.is_open_for_verification ?? false),
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleToggleVerification = async (skill, shouldOpen) => {
    const rawSkill = skill.skill_id || skill;
    const skillId = rawSkill._id || skill._id;
    try {
      const endpoint = shouldOpen ? `/skills/${skillId}/open` : `/skills/${skillId}/close`;
      await api.patch(endpoint);
      toastSuccess(
        shouldOpen ? 'เปิดรับคำขอตรวจสอบ' : 'ปิดรับคำขอตรวจสอบ',
        `ทักษะ "${rawSkill.name || skill.name}" ${shouldOpen ? 'เปิดรับ' : 'ปิดรับ'}คำขอเรียบร้อยแล้ว`
      );
      await fetchCourseSkills();
    } catch (err) {
      handleApiError(err);
    }
  };

  const handleCloseModal = () => {
    if (!submitting) {
      setShowModal(false);
      setEditingSkill(null);
      setFormErrors({});
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = 'Skill name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Skill name must be at least 2 characters';
    }

    if (!formData.description || !formData.description.trim()) {
      errors.description = 'Description is required';
    } else if (formData.description.trim().length < 10) {
      errors.description = 'Description must be at least 10 characters';
    }

    if (!formData.criteria || !formData.criteria.trim()) {
      errors.criteria = 'Certification criteria is required';
    } else if (formData.criteria.trim().length < 10) {
      errors.criteria = 'Certification criteria must be at least 10 characters';
    }

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      const firstError = Object.values(errors)[0];
      toastWarning('ข้อมูลไม่ครบถ้วน', firstError);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (submitting) return;
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      if (editingSkill) {
        const skillId =
          editingSkill._id ||
          (editingSkill.skill_id ? editingSkill.skill_id._id : null);
        await api.put(`/courses/${courseId}/skills/${skillId}`, {
          name: formData.name.trim(),
          description: formData.description.trim(),
          criteria: formData.criteria.trim(),
          is_open_for_verification: formData.is_open_for_verification,
        });
        toastSuccess('Skill Updated', `Updated skill "${formData.name}".`);
        setSuccessMessage(`Updated skill "${formData.name}".`);
      } else {
        await api.post(`/courses/${courseId}/skills`, {
          name: formData.name.trim(),
          description: formData.description.trim(),
          criteria: formData.criteria.trim(),
          is_open_for_verification: formData.is_open_for_verification,
        });
        toastSuccess('Skill Created', `Added skill "${formData.name}".`);
        setSuccessMessage(`Added skill "${formData.name}".`);
      }
      handleCloseModal();
      await fetchCourseSkills();
    } catch (err) {
      console.error('Skill submit failed:', err);
      const msg = err.response?.data?.message || 'Failed to save skill.';
      setFormErrors((prev) => ({ ...prev, api: msg }));
      handleApiError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingSkill) return;

    try {
      setDeleting(true);
      setDeleteError(null);
      const skillId =
        deletingSkill._id ||
        (deletingSkill.skill_id ? deletingSkill.skill_id._id : null);
      const skillName =
        deletingSkill.name ||
        (deletingSkill.skill_id ? deletingSkill.skill_id.name : 'Skill');

      await api.delete(`/courses/${courseId}/skills/${skillId}`);
      toastSuccess('Skill Deleted', `Deleted skill "${skillName}".`);
      setSuccessMessage(`Deleted skill "${skillName}".`);
      setDeletingSkill(null);
      await fetchCourseSkills();
    } catch (err) {
      console.error('Skill delete failed:', err);
      let msg = err.response?.data?.message || 'Failed to delete skill.';
      if (msg === 'Cannot delete skill with approved badges') {
        msg = 'ไม่สามารถลบทักษะนี้ได้ เนื่องจากมีนักศึกษาได้รับอนุมัติ Badge ของทักษะนี้แล้ว';
      } else if (
        msg === 'Cannot delete skill with pending verification requests' ||
        msg.includes('pending')
      ) {
        msg = 'ไม่สามารถลบทักษะนี้ได้ เนื่องจากยังมีคำขอตรวจสอบทักษะที่อยู่ระหว่างดำเนินการ (Pending) กรุณาตรวจสอบคำขอให้เสร็จสิ้นก่อน';
      }
      setDeleteError(msg);
      handleApiError(err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-120px)] bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        {/* Breadcrumb */}
        <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <Link to="/instructor/courses" className="hover:text-indigo-600 transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Courses</span>
          </Link>
          <span className="text-slate-400">/</span>
          <span className="text-slate-700 font-semibold truncate max-w-xs">{course?.name || 'Course'}</span>
          <span className="text-slate-400">/</span>
          <span className="text-slate-900 font-bold">Skills</span>
        </nav>

        {/* Page Header (No KPI metric cards per TON-215) */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading font-bold text-2xl sm:text-3xl text-slate-900 m-0">
              {course ? `${course.name} — Skills` : 'Micro-Skill Management'}
            </h1>
            <p className="text-sm text-slate-500 m-0 mt-0.5">
              Define verifiable micro-skills, rubrics, and criteria for this course
            </p>
          </div>
          <Button
            color="primary"
            className="font-medium shadow-sm self-start sm:self-auto"
            onPress={handleOpenCreate}
            startContent={<span className="material-symbols-outlined text-[18px]">add</span>}
          >
            Add Skill
          </Button>
        </header>

        {/* Feedback Messages */}
        {error && <Alert status="danger">{error}</Alert>}
        {successMessage && <Alert status="success">{successMessage}</Alert>}

        {/* Content Table Area */}
        {loading ? (
          <div className="text-center py-16 flex flex-col items-center justify-center gap-3">
            <Spinner size="lg" color="primary" />
            <p className="text-slate-500 text-sm m-0">Loading course skills...</p>
          </div>
        ) : skills.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center shadow-sm max-w-md mx-auto flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-1">
              <span className="material-symbols-outlined text-3xl">psychology</span>
            </div>
            <h3 className="font-heading font-bold text-lg text-slate-900 m-0">No micro-skills defined yet</h3>
            <p className="text-xs text-slate-500 m-0 leading-relaxed max-w-xs">
              Add your first micro-skill with clear verification criteria for students to complete.
            </p>
            <Button
              color="primary"
              onPress={handleOpenCreate}
              className="mt-2 font-medium"
            >
              Add Skill
            </Button>
          </div>
        ) : (
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <Table>
              <Table.ScrollContainer>
                <Table.Content aria-label="Micro-Skills Table" className="min-w-[700px]">
                  <Table.Header>
                    <Table.Column isRowHeader className="py-3 px-4 font-semibold text-xs text-slate-700">Skill Name</Table.Column>
                    <Table.Column className="py-3 px-4 font-semibold text-xs text-slate-700">Criteria / Rubric</Table.Column>
                    <Table.Column className="py-3 px-4 font-semibold text-xs text-slate-700">Status</Table.Column>
                    <Table.Column className="py-3 px-4 font-semibold text-xs text-slate-700">Verification</Table.Column>
                    <Table.Column className="py-3 px-4 font-semibold text-xs text-slate-700 text-right">Actions</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {skills.map((skill) => {
                      const rawSkill = skill.skill_id || skill;
                      const sName = rawSkill.name || skill.name || 'Untitled Skill';
                      const sDesc = rawSkill.description || skill.description || '';
                      const sCriteria = rawSkill.criteria || skill.criteria || 'Standard evaluation';
                      const isDraft = (rawSkill.status || skill.status) === 'draft';
                      const isOpenForVerification = Boolean(rawSkill.is_open_for_verification ?? skill.is_open_for_verification);

                      return (
                        <Table.Row key={skill._id || rawSkill._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                          <Table.Cell className="py-3.5 px-4">
                            <div className="font-semibold text-sm text-slate-900">{sName}</div>
                            {sDesc && (
                              <div className="text-xs text-slate-400 mt-0.5 max-w-md truncate">
                                {sDesc}
                              </div>
                            )}
                          </Table.Cell>

                          <Table.Cell className="py-3.5 px-4 text-xs text-slate-600 max-w-xs truncate">
                            {sCriteria}
                          </Table.Cell>

                          {/* Status: Chip only for exception state ("Draft") — Active/Published renders plain text */}
                          <Table.Cell className="py-3.5 px-4 text-xs">
                            {isDraft ? (
                              <Chip size="sm" color="warning" variant="flat" className="text-xs">
                                Draft
                              </Chip>
                            ) : (
                              <span className="text-slate-600 font-medium">Active</span>
                            )}
                          </Table.Cell>

                          {/* Verification Open/Close (TON-224) */}
                          <Table.Cell className="py-3.5 px-4 text-xs">
                            <Button
                              size="sm"
                              variant="flat"
                              color={isOpenForVerification ? 'success' : 'default'}
                              className="text-xs h-7 font-medium"
                              onPress={() =>
                                handleToggleVerification(
                                  skill,
                                  !isOpenForVerification
                                )
                              }
                              startContent={
                                <span className="material-symbols-outlined text-[14px]">
                                  {isOpenForVerification ? 'lock_open' : 'lock'}
                                </span>
                              }
                            >
                              {isOpenForVerification ? 'Open' : 'Closed'}
                            </Button>
                          </Table.Cell>

                          {/* Row actions: single overflow (⋯) icon button opening a Dropdown menu */}
                          <Table.Cell className="py-3.5 px-4 text-right">
                            <Dropdown>
                              <Dropdown.Trigger>
                                <Button
                                  isIconOnly
                                  size="sm"
                                  variant="secondary"
                                  aria-label="Skill actions"
                                  className="text-slate-500 hover:text-slate-800"
                                >
                                  <span className="material-symbols-outlined text-[18px]">more_horiz</span>
                                </Button>
                              </Dropdown.Trigger>
                              <Dropdown.Popover className="rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                                <Dropdown.Menu
                                  onAction={(key) => {
                                    if (key === 'edit') handleOpenEdit(skill);
                                    if (key === 'delete') setDeletingSkill(skill);
                                    if (key === 'toggle-verify') {
                                      handleToggleVerification(
                                        skill,
                                        !isOpenForVerification
                                      );
                                    }
                                  }}
                                >
                                  <Dropdown.Item id="toggle-verify" className="px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer">
                                    <div className="flex items-center gap-2">
                                      <span className="material-symbols-outlined text-[16px]">
                                        {isOpenForVerification ? 'lock' : 'lock_open'}
                                      </span>
                                      <span>
                                        {isOpenForVerification ? 'Close Verification' : 'Open Verification'}
                                      </span>
                                    </div>
                                  </Dropdown.Item>
                                  <Dropdown.Item id="edit" className="px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer">
                                    <div className="flex items-center gap-2">
                                      <span className="material-symbols-outlined text-[16px]">edit</span>
                                      <span>Edit Skill</span>
                                    </div>
                                  </Dropdown.Item>
                                  <Dropdown.Item id="delete" className="px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer">
                                    <div className="flex items-center gap-2">
                                      <span className="material-symbols-outlined text-[16px]">delete</span>
                                      <span>Delete Skill</span>
                                    </div>
                                  </Dropdown.Item>
                                </Dropdown.Menu>
                              </Dropdown.Popover>
                            </Dropdown>
                          </Table.Cell>
                        </Table.Row>
                      );
                    })}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          </div>
        )}

        {/* ADD / EDIT MODAL */}
        <Modal isOpen={showModal} onOpenChange={(open) => !open && handleCloseModal()}>
          <Modal.Backdrop>
            <Modal.Container>
              <Modal.Dialog className="sm:max-w-lg">
                <Modal.CloseTrigger />
                <form onSubmit={handleSubmit}>
                  <Modal.Header>
                    <Modal.Heading className="text-base font-bold text-slate-900 m-0">
                      {editingSkill ? 'Edit Micro-Skill' : 'Add New Micro-Skill'}
                    </Modal.Heading>
                  </Modal.Header>
                  <Modal.Body className="p-4 sm:p-5 flex flex-col gap-3">
                    {formErrors.api && <Alert status="danger" className="text-xs">{formErrors.api}</Alert>}

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-700" htmlFor="skill-name">
                        Skill Name
                      </label>
                      <Input
                        id="skill-name"
                        type="text"
                        placeholder="e.g. Asynchronous JavaScript & Promises"
                        value={formData.name}
                        onChange={(e) => {
                          setFormData({ ...formData, name: e.target.value });
                          if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: null }));
                        }}
                        disabled={submitting}
                        className="w-full text-xs"
                        autoFocus
                      />
                      {formErrors.name && (
                        <span className="text-xs text-rose-600">{formErrors.name}</span>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-700" htmlFor="skill-desc">
                        Description
                      </label>
                      <TextArea
                        id="skill-desc"
                        rows={2}
                        placeholder="Brief summary of this competency..."
                        value={formData.description}
                        onChange={(e) => {
                          setFormData({ ...formData, description: e.target.value });
                          if (formErrors.description) setFormErrors((prev) => ({ ...prev, description: null }));
                        }}
                        disabled={submitting}
                        className="w-full text-xs"
                      />
                      {formErrors.description && (
                        <span className="text-xs text-rose-600">{formErrors.description}</span>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-700" htmlFor="skill-criteria">
                        Certification Criteria
                      </label>
                      <TextArea
                        id="skill-criteria"
                        rows={3}
                        placeholder="What evidence is required for approval? (e.g. GitHub repository with unit tests passed)"
                        value={formData.criteria}
                        onChange={(e) => {
                          setFormData({ ...formData, criteria: e.target.value });
                          if (formErrors.criteria) setFormErrors((prev) => ({ ...prev, criteria: null }));
                        }}
                        disabled={submitting}
                        className="w-full text-xs"
                      />
                      {formErrors.criteria && (
                        <span className="text-xs text-rose-600">{formErrors.criteria}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="skill-open-verification"
                        checked={Boolean(formData.is_open_for_verification)}
                        onChange={(e) =>
                          setFormData({ ...formData, is_open_for_verification: e.target.checked })
                        }
                        className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                        disabled={submitting}
                      />
                      <label
                        htmlFor="skill-open-verification"
                        className="text-xs font-semibold text-slate-700 cursor-pointer"
                      >
                        Open for Verification (Allow student submissions)
                      </label>
                    </div>
                  </Modal.Body>
                  <Modal.Footer className="flex justify-end gap-2 p-3 border-t border-slate-100">
                    <Button size="sm" variant="secondary" onPress={handleCloseModal} isDisabled={submitting}>
                      Cancel
                    </Button>
                    <Button size="sm" color="primary" type="submit" isLoading={submitting} onPress={handleSubmit}>
                      {editingSkill ? 'Save Changes' : 'Add Skill'}
                    </Button>
                  </Modal.Footer>
                </form>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>

        {/* DELETE CONFIRMATION ALERT DIALOG per TON-215 */}
        <AlertDialog isOpen={!!deletingSkill} onOpenChange={(open) => !open && setDeletingSkill(null)}>
          <AlertDialog.Backdrop>
            <AlertDialog.Container>
              <AlertDialog.Dialog className="sm:max-w-md">
                <AlertDialog.CloseTrigger />
                <AlertDialog.Header>
                  <AlertDialog.Heading className="text-base font-bold text-slate-900 m-0">
                    Delete Micro-Skill?
                  </AlertDialog.Heading>
                </AlertDialog.Header>
                <AlertDialog.Body className="p-4 flex flex-col gap-2 text-xs text-slate-600 leading-relaxed">
                  {deleteError && <Alert status="danger" className="text-xs">{deleteError}</Alert>}
                  <p className="m-0">
                    Are you sure you want to delete this micro-skill from the curriculum?
                  </p>
                </AlertDialog.Body>
                <AlertDialog.Footer className="flex justify-end gap-2 p-3 border-t border-slate-100">
                  <Button size="sm" variant="secondary" onPress={() => setDeletingSkill(null)} isDisabled={deleting}>
                    Cancel
                  </Button>
                  <Button size="sm" color="danger" isLoading={deleting} onPress={handleConfirmDelete}>
                    Yes, Delete Skill
                  </Button>
                </AlertDialog.Footer>
              </AlertDialog.Dialog>
            </AlertDialog.Container>
          </AlertDialog.Backdrop>
        </AlertDialog>
      </div>
    </div>
  );
};

export default SkillManagementPage;
