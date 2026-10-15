import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import { toastSuccess } from '../../utils/toast.js';
import { handleApiError } from '../../utils/apiErrorToast.js';

const CourseManagementPage = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Create / Edit Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', status: 'active' });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Delete AlertDialog State
  const [deletingCourse, setDeletingCourse] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/courses/my');
      setCourses(res.data.courses || []);
    } catch (err) {
      console.error('Failed to load instructor courses', err);
      setError('Failed to load courses. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const handleOpenCreate = () => {
    setEditingCourse(null);
    setFormData({ name: '', description: '', status: 'active' });
    setFormErrors({});
    setShowModal(true);
  };

  const handleOpenEdit = (course) => {
    setEditingCourse(course);
    setFormData({
      name: course.name,
      description: course.description || '',
      status: course.status || 'active',
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCourse(null);
    setFormErrors({});
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.name.trim()) {
      errs.name = 'Course name is required.';
    } else if (formData.name.trim().length < 2) {
      errs.name = 'Course name must be at least 2 characters.';
    }

    if (!formData.description.trim()) {
      errs.description = 'Course description is required.';
    } else if (formData.description.trim().length < 10) {
      errs.description = 'Course description must be at least 10 characters.';
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmitCourse = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      if (editingCourse) {
        await api.put(`/courses/${editingCourse._id}`, {
          name: formData.name.trim(),
          description: formData.description.trim(),
        });
        toastSuccess('Course Updated', `Updated course "${formData.name}".`);
        setSuccessMessage(`Updated course "${formData.name}".`);
      } else {
        await api.post('/courses', {
          name: formData.name.trim(),
          description: formData.description.trim(),
        });
        toastSuccess('Course Created', `Created course "${formData.name}".`);
        setSuccessMessage(`Created course "${formData.name}".`);
      }
      handleCloseModal();
      await fetchCourses();
    } catch (err) {
      console.error('Course submit failed', err);
      const msg = err.response?.data?.message || 'Operation failed. Please try again.';
      setFormErrors((prev) => ({ ...prev, api: msg }));
      handleApiError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingCourse) return;

    try {
      setDeleteLoading(true);
      setDeleteError(null);
      const courseName = deletingCourse.name;
      await api.delete(`/courses/${deletingCourse._id}`);

      toastSuccess('Course Deleted', `Deleted course "${courseName}".`);
      setSuccessMessage(`Deleted course "${courseName}".`);
      setDeletingCourse(null);
      await fetchCourses();
    } catch (err) {
      console.error('Delete course failed', err);
      const msg = err.response?.data?.message || 'Failed to delete course. Please try again.';
      setDeleteError(msg);
      handleApiError(err);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-120px)] bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        {/* Page Header (No KPI metric cards per TON-215) */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading font-bold text-2xl sm:text-3xl text-slate-900 m-0">Course Management</h1>
            <p className="text-sm text-slate-500 m-0 mt-0.5">Manage your curriculums and student learning tracks</p>
          </div>
          <Button
            color="primary"
            className="font-medium shadow-sm self-start sm:self-auto"
            onPress={handleOpenCreate}
            id="openCreateCourseBtn"
            startContent={<span className="material-symbols-outlined text-[18px]">add</span>}
          >
            Create Course
          </Button>
        </header>

        {/* Feedback Messages */}
        {error && <Alert status="danger">{error}</Alert>}
        {successMessage && <Alert status="success">{successMessage}</Alert>}

        {/* Content Table Area */}
        {loading ? (
          <div className="text-center py-16 flex flex-col items-center justify-center gap-3">
            <Spinner size="lg" color="primary" />
            <p className="text-slate-500 text-sm m-0">Loading your courses...</p>
          </div>
        ) : courses.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center shadow-sm max-w-md mx-auto flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-1">
              <span className="material-symbols-outlined text-3xl">school</span>
            </div>
            <h3 className="font-heading font-bold text-lg text-slate-900 m-0">No courses created yet</h3>
            <p className="text-xs text-slate-500 m-0 leading-relaxed max-w-xs">
              Get started by creating your first course and defining micro-skills for verification.
            </p>
            <Button
              color="primary"
              onPress={handleOpenCreate}
              className="mt-2 font-medium"
            >
              Create Course
            </Button>
          </div>
        ) : (
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <Table>
              <Table.ScrollContainer>
                <Table.Content aria-label="Course Management Table" className="min-w-[700px]">
                  <Table.Header>
                    <Table.Column isRowHeader className="py-3 px-4 font-semibold text-xs text-slate-700">Course Name</Table.Column>
                    <Table.Column className="py-3 px-4 font-semibold text-xs text-slate-700">Skills</Table.Column>
                    <Table.Column className="py-3 px-4 font-semibold text-xs text-slate-700">Status</Table.Column>
                    <Table.Column className="py-3 px-4 font-semibold text-xs text-slate-700">Created</Table.Column>
                    <Table.Column className="py-3 px-4 font-semibold text-xs text-slate-700 text-right">Actions</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {courses.map((course) => {
                      const isDraft = course.status === 'draft';

                      return (
                        <Table.Row key={course._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                          <Table.Cell className="py-3.5 px-4">
                            <div className="font-semibold text-sm text-slate-900">{course.name}</div>
                            <div className="text-xs text-slate-400 mt-0.5 max-w-md truncate">
                              {course.description || 'No description provided'}
                            </div>
                          </Table.Cell>

                          <Table.Cell className="py-3.5 px-4 text-xs text-slate-600 font-medium">
                            <Link
                              to={`/instructor/courses/${course._id}/skills`}
                              className="text-indigo-600 hover:underline font-semibold"
                            >
                              {course.skillCount || 0} skills
                            </Link>
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

                          <Table.Cell className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                            {formatDate(course.createdAt || course.created_at)}
                          </Table.Cell>

                          {/* Row actions: single overflow (⋯) icon button opening a Dropdown menu */}
                          <Table.Cell className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                className="text-xs h-7 px-2.5 font-medium hidden sm:inline-flex"
                                onPress={() => navigate(`/instructor/courses/${course._id}/skills`)}
                              >
                                Skills
                              </Button>

                              <Dropdown>
                                <Dropdown.Trigger>
                                  <Button
                                    isIconOnly
                                    size="sm"
                                    variant="secondary"
                                    aria-label="Course actions"
                                    className="text-slate-500 hover:text-slate-800"
                                  >
                                    <span className="material-symbols-outlined text-[18px]">more_horiz</span>
                                  </Button>
                                </Dropdown.Trigger>
                                <Dropdown.Popover className="rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                                  <Dropdown.Menu
                                    onAction={(key) => {
                                      if (key === 'edit') handleOpenEdit(course);
                                      if (key === 'delete') setDeletingCourse(course);
                                    }}
                                  >
                                    <Dropdown.Item id="edit" className="px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer">
                                      <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[16px]">edit</span>
                                        <span>Edit Course</span>
                                      </div>
                                    </Dropdown.Item>
                                    <Dropdown.Item id="delete" className="px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer">
                                      <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[16px]">delete</span>
                                        <span>Delete Course</span>
                                      </div>
                                    </Dropdown.Item>
                                  </Dropdown.Menu>
                                </Dropdown.Popover>
                              </Dropdown>
                            </div>
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

        {/* CREATE / EDIT MODAL */}
        <Modal isOpen={showModal} onOpenChange={(open) => !open && handleCloseModal()}>
          <Modal.Backdrop>
            <Modal.Container>
              <Modal.Dialog className="sm:max-w-lg">
                <Modal.CloseTrigger />
                <Modal.Header>
                  <Modal.Heading className="text-base font-bold text-slate-900 m-0">
                    {editingCourse ? 'Edit Course' : 'Create New Course'}
                  </Modal.Heading>
                </Modal.Header>
                <Modal.Body className="p-4 sm:p-5 flex flex-col gap-3">
                  {formErrors.api && <Alert status="danger" className="text-xs">{formErrors.api}</Alert>}

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-700" htmlFor="course-name">
                      Course Name
                    </label>
                    <Input
                      id="course-name"
                      type="text"
                      placeholder="e.g. Advanced Web Development"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      disabled={submitting}
                      className="w-full text-xs"
                      autoFocus
                    />
                    {formErrors.name && (
                      <span className="text-xs text-rose-600">{formErrors.name}</span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-700" htmlFor="course-desc">
                      Description
                    </label>
                    <TextArea
                      id="course-desc"
                      rows={3}
                      placeholder="Describe the course outcomes and topics covered..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      disabled={submitting}
                      className="w-full text-xs"
                    />
                    {formErrors.description && (
                      <span className="text-xs text-rose-600">{formErrors.description}</span>
                    )}
                  </div>
                </Modal.Body>
                <Modal.Footer className="flex justify-end gap-2 p-3 border-t border-slate-100">
                  <Button size="sm" variant="secondary" onPress={handleCloseModal} isDisabled={submitting}>
                    Cancel
                  </Button>
                  <Button size="sm" color="primary" isLoading={submitting} onPress={handleSubmitCourse}>
                    {editingCourse ? 'Save Changes' : 'Create Course'}
                  </Button>
                </Modal.Footer>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>

        {/* DELETE CONFIRMATION ALERT DIALOG per TON-215 */}
        <AlertDialog isOpen={!!deletingCourse} onOpenChange={(open) => !open && setDeletingCourse(null)}>
          <AlertDialog.Backdrop>
            <AlertDialog.Container>
              <AlertDialog.Dialog className="sm:max-w-md">
                <AlertDialog.CloseTrigger />
                <AlertDialog.Header>
                  <AlertDialog.Heading className="text-base font-bold text-slate-900 m-0">
                    Delete Course?
                  </AlertDialog.Heading>
                </AlertDialog.Header>
                <AlertDialog.Body className="p-4 flex flex-col gap-2 text-xs text-slate-600 leading-relaxed">
                  {deleteError && <Alert status="danger" className="text-xs">{deleteError}</Alert>}
                  <p className="m-0">
                    Are you sure you want to delete <strong>{deletingCourse?.name}</strong>?
                    All associated micro-skills and verification links will also be removed.
                  </p>
                </AlertDialog.Body>
                <AlertDialog.Footer className="flex justify-end gap-2 p-3 border-t border-slate-100">
                  <Button size="sm" variant="secondary" onPress={() => setDeletingCourse(null)} isDisabled={deleteLoading}>
                    Cancel
                  </Button>
                  <Button size="sm" color="danger" isLoading={deleteLoading} onPress={handleConfirmDelete}>
                    Yes, Delete Course
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

export default CourseManagementPage;
