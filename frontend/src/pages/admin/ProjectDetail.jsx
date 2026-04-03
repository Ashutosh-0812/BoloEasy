import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import Modal from "../../components/ui/Modal";
import DataTable from "datatables.net-dt";
import "datatables.net-dt/css/dataTables.dataTables.css";
import {
  getProjectById,
  createTask,
  updateTask,
  deleteTask,
  getTaskById,
  getTaskSubmissions,
  streamSubmissionAudio,
  deleteSubmission,
  uploadTasksExcel,
  addAdminCommentToFlag,
} from "../../api/admin.api";
import { Plus, Trash2, Pencil, ChevronLeft, Mic2, FileAudio, FileText, User2, CalendarClock, Upload, MessageSquare } from "lucide-react";
import { PageSpinner, Spinner } from "../../components/ui/Spinner";
import toast from "react-hot-toast";

const TASK_TYPES = ["NE Read", "NE Variance", "NE Sentence"];
const EMPTY_TASK = { type: TASK_TYPES[0], text: "", prompt: "", assignedTo: "" };
const ADMIN_PROJECT_VIEWS = {
  TASKS: "tasks",
  SUBMISSIONS: "submissions",
  FLAGS: "flags",
};

const LIST_PAGE_SIZE = 10;

const paginateRows = (rows, page, pageSize = LIST_PAGE_SIZE) => {
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  return {
    rows: rows.slice(startIndex, startIndex + pageSize),
    currentPage,
    totalPages,
  };
};

function PaginationControls({ currentPage, totalPages, onPrev, onNext, className = "" }) {
  return (
    <div className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 justify-between px-4 py-3 border-t border-[#d2dad0] ${className}`}>
      <span className="text-xs text-black/60">
        Page {currentPage} of {totalPages}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={currentPage <= 1}
          className="px-3 py-1.5 rounded border border-[#c3cdc0] text-xs font-semibold text-black/70 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={currentPage >= totalPages}
          className="px-3 py-1.5 rounded border border-[#c3cdc0] text-xs font-semibold text-black/70 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white"
        >
          Next
        </button>
      </div>
    </div>
  );
}

const formatDateTime = (value) => {
  if (!value) return "Not available";
  return new Date(value).toLocaleString();
};

const formatFileSize = (bytes) => {
  if (!bytes) return "0 KB";
  return `${(bytes / 1024).toFixed(1)} KB`;
};

export default function ProjectDetail() {
  const { id } = useParams();
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 640);
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState(ADMIN_PROJECT_VIEWS.TASKS);
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_TASK);
  const [saving, setSaving] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [submissionsByTaskId, setSubmissionsByTaskId] = useState({});
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [taskSubmissions, setTaskSubmissions] = useState([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState("");
  const [submissionLoading, setSubmissionLoading] = useState(false);
  const [submissionAudioUrl, setSubmissionAudioUrl] = useState(null);
  const [adminComment, setAdminComment] = useState("");
  const [adminCommentSaving, setAdminCommentSaving] = useState(false);
  const [shouldFocusComment, setShouldFocusComment] = useState(false);
  const [isEditingComment, setIsEditingComment] = useState(false);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [submissionSearch, setSubmissionSearch] = useState("");
  const [submissionPage, setSubmissionPage] = useState(1);
  const [flagPage, setFlagPage] = useState(1);
  const excelInputRef = useRef(null);
  const desktopTableRef = useRef(null);
  const dataTableInstanceRef = useRef(null);
  const commentFieldRef = useRef(null);

  const fetchProject = () => {
    Promise.all([getProjectById(id)])
      .then(([pr]) => {
        setProject(pr.data.data);
        setTasks(pr.data.data.tasks || []);
      })
      .catch(() => toast.error("Failed to load project"))
      .finally(() => setLoading(false));
  };
  useEffect(() => { fetchProject(); }, [id]);

  useEffect(() => () => {
    if (submissionAudioUrl) {
      URL.revokeObjectURL(submissionAudioUrl);
    }
  }, [submissionAudioUrl]);

  useEffect(() => {
    if (modal === "submission" && shouldFocusComment && commentFieldRef.current) {
      commentFieldRef.current.focus();
      setShouldFocusComment(false);
    }
  }, [modal, shouldFocusComment]);

  useEffect(() => {
    if (activeView === ADMIN_PROJECT_VIEWS.TASKS) {
      setSubmissionsLoading(false);
      return;
    }

    if (!tasks.length) {
      setSubmissionsByTaskId({});
      setSubmissionsLoading(false);
      return;
    }

    let ignore = false;
    setSubmissionsLoading(true);

    const loadTaskSubmissions = async () => {
      try {
        const entries = await Promise.all(
          tasks.map(async (task) => {
            try {
              const res = await getTaskSubmissions(task._id);
              return [task._id, res.data.data || []];
            } catch {
              return [task._id, []];
            }
          })
        );

        if (ignore) return;

        const nextSubmissions = {};
        entries.forEach(([taskId, submissions]) => {
          nextSubmissions[taskId] = submissions;
        });
        setSubmissionsByTaskId(nextSubmissions);
      } finally {
        if (!ignore) {
          setSubmissionsLoading(false);
        }
      }
    };

    loadTaskSubmissions();

    return () => {
      ignore = true;
    };
  }, [tasks, activeView]);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 640);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (activeView === ADMIN_PROJECT_VIEWS.TASKS && submissionSearch) {
      setSubmissionSearch("");
    }
  }, [activeView, submissionSearch]);

  useEffect(() => {
    const tableElement = desktopTableRef.current;
    if (!isDesktop) {
      if (dataTableInstanceRef.current) {
        dataTableInstanceRef.current.destroy();
        dataTableInstanceRef.current = null;
      }
      return undefined;
    }

    if (activeView !== ADMIN_PROJECT_VIEWS.TASKS) {
      if (dataTableInstanceRef.current) {
        dataTableInstanceRef.current.destroy();
        dataTableInstanceRef.current = null;
      }
      return undefined;
    }

    if (loading || !tableElement) return undefined;

    if (!tasks.length) {
      if (dataTableInstanceRef.current) {
        dataTableInstanceRef.current.destroy();
        dataTableInstanceRef.current = null;
      }
      return undefined;
    }

    if (dataTableInstanceRef.current) {
      dataTableInstanceRef.current.destroy();
      dataTableInstanceRef.current = null;
    }

    dataTableInstanceRef.current = new DataTable(tableElement, {
      pageLength: 10,
      lengthMenu: [10, 25, 50, 100],
      order: [[0, "asc"]],
      autoWidth: false,
      responsive: false,
      language: {
        search: "Search:",
        lengthMenu: "_MENU_ entries per page",
        paginate: {
          previous: "Prev",
          next: "Next",
        },
        emptyTable: "No tasks available",
      },
      columnDefs: [
        { targets: -1, orderable: false, searchable: false },
      ],
      dom: '<"dt-toolbar"lf>rt<"dt-footer"ip>',
    });

    return () => {
      if (dataTableInstanceRef.current) {
        dataTableInstanceRef.current.destroy();
        dataTableInstanceRef.current = null;
      }
    };
  }, [
    isDesktop,
    loading,
    tasks,
    activeView,
  ]);

  const openCreate = () => { setForm(EMPTY_TASK); setEditing(null); setModal("form"); };
  const openEdit = (t) => {
    setForm({ type: t.type, text: t.text, prompt: t.prompt, assignedTo: t.assignedTo?._id || "" });
    setEditing(t); setModal("form");
  };

  const closeSubmissionModal = () => {
    setModal(null);
    setSelectedTask(null);
    setTaskSubmissions([]);
    setSelectedSubmissionId("");
    setAdminComment("");
    setAdminCommentSaving(false);
    setShouldFocusComment(false);
    setIsEditingComment(false);
    if (submissionAudioUrl) {
      URL.revokeObjectURL(submissionAudioUrl);
      setSubmissionAudioUrl(null);
    }
  };

  const openSubmission = async (taskId, { preferredSubmissionId, focusComment = false } = {}) => {
    setModal("submission");
    setSubmissionLoading(true);
    setSelectedTask(null);
    setTaskSubmissions([]);
    setSelectedSubmissionId("");
    setAdminComment("");
    setIsEditingComment(false);
    setShouldFocusComment(Boolean(focusComment));

    if (submissionAudioUrl) {
      URL.revokeObjectURL(submissionAudioUrl);
      setSubmissionAudioUrl(null);
    }

    try {
      const [taskResponse, submissionsResponse] = await Promise.all([
        getTaskById(taskId),
        getTaskSubmissions(taskId),
      ]);
      const taskData = taskResponse.data.data;
      const submissions = submissionsResponse.data.data || [];
      setSelectedTask(taskData);
      setTaskSubmissions(submissions);

      if (submissions.length) {
        const selectedById = preferredSubmissionId
          ? submissions.find((submission) => submission._id === preferredSubmissionId)
          : null;
        const firstAudioSubmission = submissions.find((submission) => submission.audio?.publicId || submission.audio?.url);
        const initialSubmission = selectedById || firstAudioSubmission || submissions[0];

        setSelectedSubmissionId(initialSubmission._id);
        const initialComment = initialSubmission.reportedIssue?.adminComment || "";
        setAdminComment(initialComment);
        setIsEditingComment(!initialComment);
        if (initialSubmission.audio?.publicId || initialSubmission.audio?.url) {
          const audioResponse = await streamSubmissionAudio(initialSubmission._id);
          const audioBlobUrl = URL.createObjectURL(audioResponse.data);
          setSubmissionAudioUrl(audioBlobUrl);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load task submission");
      closeSubmissionModal();
    } finally {
      setSubmissionLoading(false);
    }
  };

  const selectedSubmission = taskSubmissions.find((s) => s._id === selectedSubmissionId) || null;
  const allSubmissionRows = useMemo(() => {
    const rows = [];
    tasks.forEach((task) => {
      const entries = submissionsByTaskId[task._id] || [];
      entries.forEach((submission) => {
        rows.push({ task, submission });
      });
    });
    return rows;
  }, [tasks, submissionsByTaskId]);

  const submissionRows = useMemo(
    () => allSubmissionRows.filter(({ submission }) => submission.audio?.url || submission.audio?.publicId),
    [allSubmissionRows]
  );

  const flaggedRows = useMemo(
    () => allSubmissionRows.filter(({ submission }) => submission.reportedIssue?.flagged),
    [allSubmissionRows]
  );

  const searchQuery = submissionSearch.trim().toLowerCase();

  const filteredSubmissionRows = useMemo(() => {
    if (!searchQuery) return submissionRows;
    return submissionRows.filter(({ task, submission }) => {
      const values = [
        task.taskId,
        task.type,
        submission.userId?.name,
        submission.userId?.email,
        submission.status,
      ];
      return values.some((value) => value?.toLowerCase().includes(searchQuery));
    });
  }, [submissionRows, searchQuery]);

  const filteredFlaggedRows = useMemo(() => {
    if (!searchQuery) return flaggedRows;
    return flaggedRows.filter(({ task, submission }) => {
      const values = [
        task.taskId,
        task.type,
        submission.userId?.name,
        submission.userId?.email,
        submission.reportedIssue?.note,
        submission.reportedIssue?.adminComment,
      ];
      return values.some((value) => value?.toLowerCase().includes(searchQuery));
    });
  }, [flaggedRows, searchQuery]);

  const submissionPagination = useMemo(
    () => paginateRows(filteredSubmissionRows, submissionPage),
    [filteredSubmissionRows, submissionPage]
  );
  const flagPagination = useMemo(
    () => paginateRows(filteredFlaggedRows, flagPage),
    [filteredFlaggedRows, flagPage]
  );

  const {
    rows: paginatedSubmissionRows,
    currentPage: currentSubmissionPage,
    totalPages: totalSubmissionPages,
  } = submissionPagination;
  const {
    rows: paginatedFlaggedRows,
    currentPage: currentFlagPage,
    totalPages: totalFlagPages,
  } = flagPagination;

  useEffect(() => {
    if (activeView === ADMIN_PROJECT_VIEWS.SUBMISSIONS) {
      setSubmissionPage(1);
    } else if (activeView === ADMIN_PROJECT_VIEWS.FLAGS) {
      setFlagPage(1);
    }
  }, [searchQuery, activeView]);

  const displayedTasks = useMemo(() => tasks, [tasks]);

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      // Clean up form data - remove empty assignedTo
      const cleanForm = { ...form };
      if (!cleanForm.assignedTo || cleanForm.assignedTo === "") {
        delete cleanForm.assignedTo;
      }

      if (editing) { await updateTask(editing._id, cleanForm); toast.success("Task updated!"); }
      else { await createTask(id, cleanForm); toast.success("Task created!"); }
      setModal(null); fetchProject();
    } catch (err) {
      const errs = err.response?.data?.errors;
      if (errs) errs.forEach((e) => toast.error(e.message));
      else toast.error(err.response?.data?.message || "Failed");
    } finally { setSaving(false); }
  };

  const handleDelete = async (tid) => {
    if (!confirm("Delete this task?")) return;
    try { await deleteTask(tid); toast.success("Task deleted"); fetchProject(); }
    catch { toast.error("Delete failed"); }
  };

  const handleDeleteSubmission = async (taskId, submission) => {
    if (!submission?._id) return;
    if (!confirm("Delete this submission?")) return;

    try {
      await deleteSubmission(submission._id);

      setSubmissionsByTaskId((prev) => {
        const next = { ...prev };
        next[taskId] = (next[taskId] || []).filter((item) => item._id !== submission._id);
        return next;
      });

      setTaskSubmissions((prev) => prev.filter((item) => item._id !== submission._id));

      if (selectedSubmissionId === submission._id) {
        closeSubmissionModal();
      }

      toast.success("Submission deleted");
    } catch {
      toast.error("Delete failed");
    }
  };

  const handleAdminCommentSubmit = async () => {
    if (!selectedSubmission?._id) {
      toast.error("Select a submission to comment on.");
      return;
    }

    if (!selectedSubmission.reportedIssue?.flagged) {
      toast.error("Only flagged submissions can have admin comments.");
      return;
    }

    const trimmedComment = adminComment.trim();
    if (!trimmedComment) {
      toast.error("Please enter a comment before saving.");
      return;
    }

    setAdminCommentSaving(true);
    try {
      await addAdminCommentToFlag(selectedSubmission._id, { adminComment: trimmedComment });
      toast.success("Admin comment added!");
      setAdminComment(trimmedComment);
      setIsEditingComment(false);

      setTaskSubmissions((prev) =>
        prev.map((submission) =>
          submission._id === selectedSubmission._id
            ? {
                ...submission,
                reportedIssue: {
                  ...(submission.reportedIssue || {}),
                  adminComment: trimmedComment,
                },
              }
            : submission
        )
      );

      if (selectedTask?._id) {
        setSubmissionsByTaskId((prev) => {
          const taskEntries = prev[selectedTask._id] || [];
          const nextTaskEntries = taskEntries.map((submission) =>
            submission._id === selectedSubmission._id
              ? {
                  ...submission,
                  reportedIssue: {
                    ...(submission.reportedIssue || {}),
                    adminComment: trimmedComment,
                  },
                }
              : submission
          );
          return { ...prev, [selectedTask._id]: nextTaskEntries };
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add comment");
    } finally {
      setAdminCommentSaving(false);
    }
  };

  const handleExcelSelection = async (event) => {
    const selectedFile = event.target.files?.[0];
    event.target.value = "";
    if (!selectedFile) return;

    setBulkUploading(true);
    try {
      const response = await uploadTasksExcel(id, selectedFile);
      const result = response.data?.data;
      const message = response.data?.message || "Tasks imported.";
      toast.success(message);

      if (result?.errors?.length) {
        const previewErrors = result.errors.slice(0, 5)
          .map((item) => `Row ${item.row}: ${item.message}`)
          .join("\n");
        toast.error(`Some rows were skipped:\n${previewErrors}`);
      }

      fetchProject();
    } catch (err) {
      const errs = err.response?.data?.errors;
      if (errs?.length) {
        errs.forEach((e) => toast.error(e.message));
      } else {
        toast.error(err.response?.data?.message || "Excel upload failed");
      }
    } finally {
      setBulkUploading(false);
    }
  };

  const handleViewChange = (nextView) => {
    if (dataTableInstanceRef.current) {
      dataTableInstanceRef.current.destroy();
      dataTableInstanceRef.current = null;
    }
    setActiveView(nextView);
    if (nextView === ADMIN_PROJECT_VIEWS.SUBMISSIONS) {
      setSubmissionPage(1);
    } else if (nextView === ADMIN_PROJECT_VIEWS.FLAGS) {
      setFlagPage(1);
    }
  };

  return (
    <AdminLayout>
      <Link to="/admin/projects" className="flex items-center gap-1.5 text-sm text-black/70 hover:text-black mb-6 transition">
        <ChevronLeft size={16} /> Back to Projects
      </Link>

      {loading ? <PageSpinner /> : (
        <>
          <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-primary-900 mb-1">{project?.name}</h1>
              <p className="text-primary-500 text-sm">{project?.description || "No description"}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end w-full md:w-auto">
              <div className="inline-flex rounded-lg border border-[#c3cdc0] bg-white p-1 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleViewChange(ADMIN_PROJECT_VIEWS.TASKS)}
                  className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-semibold rounded-md border border-transparent transition ${
                    activeView === ADMIN_PROJECT_VIEWS.TASKS
                      ? "bg-[#dbe7d8] text-black border-[#b9c8b3]"
                      : "bg-transparent text-black hover:bg-[#eef4ec]"
                  }`}
                >
                  Tasks
                </button>
                <button
                  type="button"
                  onClick={() => handleViewChange(ADMIN_PROJECT_VIEWS.SUBMISSIONS)}
                  className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-semibold rounded-md border border-transparent transition ${
                    activeView === ADMIN_PROJECT_VIEWS.SUBMISSIONS
                      ? "bg-[#dbe7d8] text-black border-[#b9c8b3]"
                      : "bg-transparent text-black hover:bg-[#eef4ec]"
                  }`}
                >
                  Submissions
                </button>
                <button
                  type="button"
                  onClick={() => handleViewChange(ADMIN_PROJECT_VIEWS.FLAGS)}
                  className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-semibold rounded-md border border-transparent transition ${
                    activeView === ADMIN_PROJECT_VIEWS.FLAGS
                      ? "bg-[#dbe7d8] text-black border-[#b9c8b3]"
                      : "bg-transparent text-black hover:bg-[#eef4ec]"
                  }`}
                >
                  Flags
                </button>
              </div>

              <input
                ref={excelInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleExcelSelection}
              />
              <button
                onClick={() => excelInputRef.current?.click()}
                className="btn-secondary flex items-center justify-center gap-2 w-full sm:w-auto"
                disabled={bulkUploading}
                title="Upload Excel with Task Name, Text, language columns (English/Telugu/Hindi...), prompt optional"
              >
                <Upload size={16} /> {bulkUploading ? "Uploading..." : "Upload Excel"}
              </button>
              <button onClick={openCreate} className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto">
                <Plus size={16} /> Add Task
              </button>
            </div>
          </div>

          {activeView !== ADMIN_PROJECT_VIEWS.TASKS && (
            <div className="mb-3 flex justify-end">
              <input
                type="text"
                value={submissionSearch}
                onChange={(e) => setSubmissionSearch(e.target.value)}
                placeholder={activeView === ADMIN_PROJECT_VIEWS.SUBMISSIONS ? "Search submissions…" : "Search flagged submissions…"}
                className="input w-full sm:w-64"
              />
            </div>
          )}

          <div className="admin-datatable card p-0 overflow-hidden border border-[#c3cdc0] shadow-sm">
            <div className="sm:hidden divide-y divide-[#d2dad0]">
              {activeView === ADMIN_PROJECT_VIEWS.TASKS ? (
                <>
                  {displayedTasks.map((t) => (
                    <div key={t._id} className="p-4 space-y-2 hover:bg-primary-50/70 transition">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs text-primary-700 bg-primary-100 px-2 py-0.5 rounded truncate">{t.taskId}</span>
                        <button
                          type="button"
                          onClick={() => openSubmission(t._id)}
                          className="text-[11px] text-primary-800 hover:text-primary-900"
                        >
                          Details
                        </button>
                      </div>
                      <p className="text-xs text-black/80 bg-white border border-[#d1d9ce] px-2 py-0.5 rounded w-fit">{t.type}</p>
                      <p className="text-xs text-black/80 line-clamp-2">{t.text}</p>
                      <p className="text-xs text-black/65 truncate">{t.prompt}</p>
                      <div className="flex justify-end gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEdit(t)}
                          className="px-2 py-1.5 rounded bg-[#dbe7d8] text-black hover:bg-[#c7d7c4] transition text-[11px] font-semibold inline-flex items-center gap-1"
                        >
                          <Pencil size={13} /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(t._id)}
                          className="px-2 py-1.5 rounded hover:bg-red-100 text-black/70 hover:text-red-700 transition text-[11px] font-semibold inline-flex items-center gap-1"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                  {!displayedTasks.length && (
                    <div className="px-4 py-12 text-center text-black/60">
                      <Mic2 size={32} className="mx-auto mb-2 opacity-30" />
                      No tasks yet. Add your first task.
                    </div>
                  )}
                </>
              ) : activeView === ADMIN_PROJECT_VIEWS.SUBMISSIONS ? (
                <>
                  {submissionsLoading && !submissionRows.length ? (
                    <div className="px-4 py-12 text-center text-black/60 space-y-3">
                      <Spinner />
                      <p className="text-sm">Loading submissions…</p>
                    </div>
                  ) : filteredSubmissionRows.length ? (
                    paginatedSubmissionRows.map(({ task: rowTask, submission }) => (
                      <div key={submission._id} className="p-4 space-y-2 hover:bg-primary-50/70 transition">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs text-primary-700 bg-primary-100 px-2 py-0.5 rounded truncate">{rowTask.taskId}</span>
                        </div>
                        <p className="text-xs text-black/80 bg-white border border-[#d1d9ce] px-2 py-0.5 rounded w-fit">{rowTask.type}</p>
                        <div>
                          <p className="text-sm text-black/80">{submission.userId?.name || "Unknown user"}</p>
                          <p className="text-[11px] text-black/60">{submission.userId?.email || "no-email"}</p>
                        </div>
                        <div className="text-xs text-black/70 font-semibold">Status: {submission.status || "pending"}</div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openSubmission(rowTask._id, { preferredSubmissionId: submission._id })}
                            className="text-[11px] font-semibold text-primary-800 hover:text-primary-900"
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSubmission(rowTask._id, submission)}
                            className="px-2 py-1 rounded border border-transparent hover:bg-red-100 text-black/70 hover:text-red-700 transition text-[11px] font-semibold inline-flex items-center gap-1 "
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-12 text-center text-black/60">
                      <Mic2 size={32} className="mx-auto mb-2 opacity-30" />
                      {searchQuery ? "No submissions match your search." : "No submissions recorded yet."}
                    </div>
                  )}
                  {filteredSubmissionRows.length > 0 && totalSubmissionPages > 1 && (
                    <PaginationControls
                      currentPage={currentSubmissionPage}
                      totalPages={totalSubmissionPages}
                      onPrev={() => setSubmissionPage((prev) => Math.max(1, prev - 1))}
                      onNext={() => setSubmissionPage((prev) => Math.min(totalSubmissionPages, prev + 1))}
                      className="bg-white"
                    />
                  )}
                </>
              ) : (
                <>
                  {submissionsLoading && !flaggedRows.length ? (
                    <div className="px-4 py-12 text-center text-black/60 space-y-3">
                      <Spinner />
                      <p className="text-sm">Loading flagged submissions…</p>
                    </div>
                  ) : filteredFlaggedRows.length ? (
                    paginatedFlaggedRows.map(({ task: rowTask, submission }) => (
                      <div key={submission._id} className="p-4 space-y-2 hover:bg-primary-50/70 transition">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs text-primary-700 bg-primary-100 px-2 py-0.5 rounded truncate">{rowTask.taskId}</span>
                          <span className="text-[11px] text-[#8d3d2e] bg-[#fce9e3] px-2 py-0.5 rounded-full">Flagged</span>
                        </div>
                        <div>
                          <p className="text-sm text-black/80">{submission.userId?.name || "Unknown user"}</p>
                          <p className="text-[11px] text-black/60">{submission.userId?.email || "no-email"}</p>
                        </div>
                        <div className="rounded-lg border border-[#e5ccc3] bg-[#f8efec] px-3 py-2">
                          <p className="text-[11px] text-[#8d3d2e] font-semibold">User Flag Details</p>
                          <p className="text-xs text-black/80 whitespace-pre-wrap break-all">
                            {submission.reportedIssue?.note || "No comment provided"}
                          </p>
                        </div>
                        <div className="rounded-lg border border-[#dcd5c9] bg-white px-3 py-2">
                          <p className="text-[11px] font-semibold text-black/70">Admin Comment</p>
                          <p className="text-xs text-black/80 whitespace-pre-wrap break-all">
                            {submission.reportedIssue?.adminComment || "No admin comment yet."}
                          </p>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openSubmission(rowTask._id, { preferredSubmissionId: submission._id })}
                            className="text-[11px] font-semibold text-primary-800 hover:text-primary-900"
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            onClick={() => openSubmission(rowTask._id, { preferredSubmissionId: submission._id, focusComment: true })}
                            className="text-[11px] font-semibold text-[#8d3d2e] hover:text-[#62291f]"
                          >
                            Comment
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-12 text-center text-black/60">
                      <Mic2 size={32} className="mx-auto mb-2 opacity-30" />
                      {searchQuery ? "No flagged submissions match your search." : "No flagged submissions yet."}
                    </div>
                  )}
                  {filteredFlaggedRows.length > 0 && totalFlagPages > 1 && (
                    <PaginationControls
                      currentPage={currentFlagPage}
                      totalPages={totalFlagPages}
                      onPrev={() => setFlagPage((prev) => Math.max(1, prev - 1))}
                      onNext={() => setFlagPage((prev) => Math.min(totalFlagPages, prev + 1))}
                      className="bg-white"
                    />
                  )}
                </>
              )}
            </div>

            <div className="hidden sm:block">
              {activeView === ADMIN_PROJECT_VIEWS.TASKS ? (
                <table ref={desktopTableRef} className="w-full text-sm table-fixed display">
                  <thead>
                    <tr className="border-b border-[#d2dad0] bg-primary-50/70">
                      <th className="text-left px-2 py-3 text-xs font-semibold text-black/60 uppercase tracking-wide w-[12%]">Task ID</th>
                      <th className="text-left px-2 py-3 text-xs font-semibold text-black/60 uppercase tracking-wide w-[15%]">Type</th>
                      <th className="text-left px-2 py-3 text-xs font-semibold text-black/60 uppercase tracking-wide w-[25%]">Text</th>
                      <th className="text-left px-2 py-3 text-xs font-semibold text-black/60 uppercase tracking-wide w-[20%]">Prompt</th>
                      <th className="text-left px-2 py-3 text-xs font-semibold text-black/60 uppercase tracking-wide w-[10%]">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedTasks.map((t) => (
                      <tr key={t._id} className="border-b border-[#d8e0d5] hover:bg-primary-50/60 transition">
                        <td className="px-2 py-3.5 w-[12%]">
                          <span className="font-mono text-xs text-primary-700 bg-primary-100 px-1.5 py-0.5 rounded block truncate">{t.taskId}</span>
                        </td>
                        <td className="px-2 py-3.5 w-[15%]">
                          <span className="text-xs text-black/80 bg-white border border-[#d1d9ce] px-1.5 py-0.5 rounded block truncate">{t.type}</span>
                        </td>
                        <td className="px-2 py-3.5 w-[25%]">
                          <div className="text-black/80 text-xs truncate" title={t.text}>{t.text}</div>
                        </td>
                        <td className="px-2 py-3.5 w-[20%]">
                          <div className="text-black/65 text-xs truncate" title={t.prompt}>{t.prompt}</div>
                        </td>
                        <td className="px-2 py-3.5 w-[10%]">
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openEdit(t)}
                              className="px-2 py-1 rounded bg-[#dbe7d8] text-black hover:bg-[#c7d7c4] transition text-[11px] font-semibold inline-flex items-center gap-1"
                              title="Edit task"
                            >
                              <Pencil size={12} /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(t._id)}
                              className="px-2 py-1 rounded border border-transparent hover:bg-red-100 text-black/70 hover:text-red-700 transition text-[11px] font-semibold inline-flex items-center gap-1"
                              title="Delete task"
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!displayedTasks.length && (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-black/60">
                          <Mic2 size={32} className="mx-auto mb-2 opacity-30" />
                          No tasks yet. Add your first task.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : activeView === ADMIN_PROJECT_VIEWS.SUBMISSIONS ? (
                <>
                <table className="w-full text-sm table-fixed">
                  <thead>
                    <tr className="border-b border-[#d2dad0] bg-primary-50/70">
                      <th className="text-left px-2 py-3 text-xs font-semibold text-black/60 uppercase tracking-wide w-[12%]">Task ID</th>
                      <th className="text-left px-2 py-3 text-xs font-semibold text-black/60 uppercase tracking-wide w-[15%]">Type</th>
                      <th className="text-left px-2 py-3 text-xs font-semibold text-black/60 uppercase tracking-wide w-[25%]">User</th>
                      <th className="text-left px-2 py-3 text-xs font-semibold text-black/60 uppercase tracking-wide w-[20%]">Status</th>
                      <th className="text-left px-2 py-3 text-xs font-semibold text-black/60 uppercase tracking-wide w-[12%]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissionsLoading && !submissionRows.length ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-black/60">
                          <Spinner />
                          <p className="mt-2 text-sm">Loading submissions…</p>
                        </td>
                      </tr>
                    ) : filteredSubmissionRows.length ? (
                      paginatedSubmissionRows.map(({ task: rowTask, submission }) => (
                        <tr
                          key={submission._id}
                          className="border-b border-[#d8e0d5] hover:bg-primary-50/60 transition cursor-pointer"
                          onClick={() => openSubmission(rowTask._id, { preferredSubmissionId: submission._id })}
                        >
                          <td className="px-2 py-3.5 w-[12%]">
                            <span className="font-mono text-xs text-primary-700 bg-primary-100 px-1.5 py-0.5 rounded block truncate">{rowTask.taskId}</span>
                          </td>
                          <td className="px-2 py-3.5 w-[15%]">
                            <span className="text-xs text-black/80 bg-white border border-[#d1d9ce] px-1.5 py-0.5 rounded block truncate">{rowTask.type}</span>
                          </td>
                          <td className="px-2 py-3.5 w-[25%]">
                            <div className="text-black/80 text-xs" title={submission.userId?.email}>
                              {submission.userId?.name || "Unknown user"}
                            </div>
                            <div className="text-black/55 text-[11px] truncate">{submission.userId?.email || "no-email"}</div>
                          </td>
                          <td className="px-2 py-3.5 w-[20%]">
                            <div className="text-black/80 text-xs capitalize">{submission.status || "pending"}</div>
                          </td>
                          <td className="px-2 py-3.5 w-[12%]">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openSubmission(rowTask._id, { preferredSubmissionId: submission._id });
                                }}
                                className="text-[11px] font-semibold text-primary-800 hover:text-primary-900"
                                title="View submission details"
                              >
                                Details
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSubmission(rowTask._id, submission);
                                }}
                                className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold text-[#8d3d2e] hover:bg-red-100 hover:text-[#62291f] transition"
                              >
                                <Trash2 size={13} /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-black/60">
                          <Mic2 size={32} className="mx-auto mb-2 opacity-30" />
                          {searchQuery ? "No submissions match your search." : "No submissions recorded yet."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {filteredSubmissionRows.length > 0 && totalSubmissionPages > 1 && (
                  <PaginationControls
                    currentPage={currentSubmissionPage}
                    totalPages={totalSubmissionPages}
                    onPrev={() => setSubmissionPage((prev) => Math.max(1, prev - 1))}
                    onNext={() => setSubmissionPage((prev) => Math.min(totalSubmissionPages, prev + 1))}
                    className="bg-[#f6f9f3]"
                  />
                )}
                </>
              ) : (
                <>
                <table className="w-full text-sm table-fixed">
                  <thead>
                    <tr className="border-b border-[#d2dad0] bg-primary-50/70">
                      <th className="text-left px-2 py-3 text-xs font-semibold text-black/60 uppercase tracking-wide w-[12%]">Task ID</th>
                      <th className="text-left px-2 py-3 text-xs font-semibold text-black/60 uppercase tracking-wide w-[20%]">User</th>
                      <th className="text-left px-2 py-3 text-xs font-semibold text-black/60 uppercase tracking-wide w-[26%]">Flag Note</th>
                      <th className="text-left px-2 py-3 text-xs font-semibold text-black/60 uppercase tracking-wide w-[22%]">Admin Comment</th>
                      <th className="text-left px-2 py-3 text-xs font-semibold text-black/60 uppercase tracking-wide w-[12%]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissionsLoading && !flaggedRows.length ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-black/60">
                          <Spinner />
                          <p className="mt-2 text-sm">Loading flagged submissions…</p>
                        </td>
                      </tr>
                    ) : filteredFlaggedRows.length ? (
                      paginatedFlaggedRows.map(({ task: rowTask, submission }) => (
                        <tr
                          key={submission._id}
                          className="border-b border-[#d8e0d5] hover:bg-primary-50/60 transition cursor-pointer"
                          onClick={() => openSubmission(rowTask._id, { preferredSubmissionId: submission._id })}
                          title="Review flagged submission"
                        >
                          <td className="px-2 py-3.5 w-[12%]">
                            <span className="font-mono text-xs text-primary-700 bg-primary-100 px-1.5 py-0.5 rounded block truncate">{rowTask.taskId}</span>
                          </td>
                          <td className="px-2 py-3.5 w-[20%]">
                            <div className="text-black/80 text-xs" title={submission.userId?.email}>
                              {submission.userId?.name || "Unknown user"}
                            </div>
                            <div className="text-black/55 text-[11px] truncate">{submission.userId?.email || "no-email"}</div>
                          </td>
                          <td className="px-2 py-3.5 w-[26%]">
                            <p className="text-black/80 text-xs whitespace-pre-wrap break-all" title={submission.reportedIssue?.note || "No comment"}>
                              {submission.reportedIssue?.note || "No comment provided"}
                            </p>
                          </td>
                          <td className="px-2 py-3.5 w-[22%]">
                            <p className="text-black/80 text-xs whitespace-pre-wrap break-all" title={submission.reportedIssue?.adminComment || "No admin comment"}>
                              {submission.reportedIssue?.adminComment || "No admin comment yet."}
                            </p>
                          </td>
                          <td className="px-2 py-3.5 w-[12%]">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openSubmission(rowTask._id, { preferredSubmissionId: submission._id });
                                }}
                                className="text-[11px] font-semibold text-primary-800 hover:text-primary-900"
                              >
                                Details
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openSubmission(rowTask._id, { preferredSubmissionId: submission._id, focusComment: true });
                                }}
                                className="text-[11px] font-semibold text-[#8d3d2e] hover:text-[#62291f]"
                              >
                                Comment
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-black/60">
                          <Mic2 size={32} className="mx-auto mb-2 opacity-30" />
                          {searchQuery ? "No flagged submissions match your search." : "No flagged submissions yet."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {filteredFlaggedRows.length > 0 && totalFlagPages > 1 && (
                  <PaginationControls
                    currentPage={currentFlagPage}
                    totalPages={totalFlagPages}
                    onPrev={() => setFlagPage((prev) => Math.max(1, prev - 1))}
                    onNext={() => setFlagPage((prev) => Math.min(totalFlagPages, prev + 1))}
                    className="bg-[#f6f9f3]"
                  />
                )}
                </>
              )}
            </div>
          </div>
        </>
      )}

      {modal === "form" && (
        <Modal title={editing ? "Edit Task" : "Create Task"} onClose={() => setModal(null)} size="lg">
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="label">Type *</label>
              <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="input">
                {TASK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Text * <span className="normal-case text-slate-500">(what the user reads)</span></label>
              <textarea value={form.text} onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
                className="input resize-none" rows={4} placeholder="Enter the text to be read…" required />
            </div>
            <div>
              <label className="label">Prompt * <span className="normal-case text-slate-500">(instruction for user)</span></label>
              <input value={form.prompt} onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))}
                className="input" placeholder="e.g. Read the sentence below clearly" required />
            </div>
           {/* <div>
              <label className="label">Assign To <span className="normal-case text-slate-500">(optional)</span></label>
              <select value={form.assignedTo} onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))} className="input">
                <option value="">— Unassigned —</option>
                {users.map((u) => <option key={u._id} value={u._id}>{u.name} ({u.email})</option>)}
              </select>
            </div>*/}
            <div className="flex gap-3 justify-end pt-2">
              <button type="submit" disabled={saving} className="btn-secondary">
                {saving ? "Saving…" : editing ? "Update Task" : "Create Task"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal === "submission" && (
        <Modal title={selectedTask?.taskId ? `Task Submission · ${selectedTask.taskId}` : "Task Submission"} onClose={closeSubmissionModal} size="xl">
          {submissionLoading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner size="lg" />
            </div>
          ) : selectedTask ? (
            <div className="max-h-[75vh] overflow-y-auto overflow-x-hidden scrollbar-hidden space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-[#c7d1c3] bg-[#eef2ec] p-4">
                  <p className="label mb-3">Project Details</p>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-black/55 text-xs uppercase tracking-wide">Project Name</p>
                      <p className="text-black mt-1">{project?.name || "Not available"}</p>
                    </div>
                    <div>
                      <p className="text-black/55 text-xs uppercase tracking-wide">Description</p>
                      <p className="text-black/80 mt-1 whitespace-pre-wrap">{project?.description || "No description"}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#c7d1c3] bg-[#eef2ec] p-4">
                  <p className="label mb-3">Task Details</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-black/55 text-xs uppercase tracking-wide">Task ID</p>
                      <p className="text-black mt-1 font-mono">{selectedTask.taskId}</p>
                    </div>
                    <div>
                      <p className="text-black/55 text-xs uppercase tracking-wide">Type</p>
                      <p className="text-black/80 mt-1">{selectedTask.type}</p>
                    </div>
                 
                  </div>
                </div>
              </div>


              {selectedSubmission?.reportedIssue?.flagged && (
                <div className="rounded-2xl border border-[#d3b9b1] bg-[#f8efec] p-4">
                  <p className="label mb-2 text-[#8d3d2e]">User's Flag Reason</p>
                  <p className="text-sm text-black/80 whitespace-pre-wrap break-all">
                    {selectedSubmission.reportedIssue?.note || "No reason provided."}
                  </p>
                  <p className="text-xs text-black/55 mt-2">
                    Reported at {formatDateTime(selectedSubmission.reportedIssue?.reportedAt)}
                  </p>

                  <div className="border-t border-[#e5ccc3] pt-4 mt-4">
                    <p className="label mb-2 text-[#8d3d2e] flex items-center gap-2">
                      <MessageSquare size={16} /> Admin Comment
                    </p>
                    {selectedSubmission.reportedIssue?.adminComment && !isEditingComment ? (
                      <div className="space-y-3">
                        <div className="p-3 bg-white rounded border border-[#e5ccc3]">
                          <p className="text-sm text-black/80 whitespace-pre-wrap break-all">
                            {selectedSubmission.reportedIssue.adminComment}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingComment(true);
                            setShouldFocusComment(true);
                          }}
                          className="btn-secondary w-full sm:w-auto"
                        >
                          Edit Comment
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <textarea
                          ref={commentFieldRef}
                          value={adminComment}
                          onChange={(e) => setAdminComment(e.target.value)}
                          className="input resize-none"
                          rows={3}
                          placeholder="Add your comment about this flag..."
                        />
                        <div className="flex flex-col sm:flex-row gap-2">
                          {selectedSubmission.reportedIssue?.adminComment && (
                            <button
                              type="button"
                              onClick={() => {
                                setAdminComment(selectedSubmission.reportedIssue?.adminComment || "");
                                setIsEditingComment(false);
                              }}
                              className="btn-secondary w-full sm:w-auto"
                              disabled={adminCommentSaving}
                            >
                              Cancel
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={handleAdminCommentSubmit}
                            disabled={adminCommentSaving || !adminComment.trim()}
                            className="btn-primary w-full sm:w-auto"
                          >
                            {adminCommentSaving ? "Saving..." : selectedSubmission.reportedIssue?.adminComment ? "Update Comment" : "Add Comment"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-[#c7d1c3] bg-[#eef2ec] p-4">
                  <div className="flex items-center gap-2 mb-3 text-black/80">
                    <FileText size={16} className="text-primary-400" />
                    <p className="label m-0">Prompt</p>
                  </div>
                  <p className="text-black/80 whitespace-pre-wrap break-all text-sm leading-relaxed">{selectedTask.prompt || "No prompt provided."}</p>
                </div>

                <div className="rounded-2xl border border-[#c7d1c3] bg-[#e6eee2] p-4 min-w-0">
                  <div className="flex items-center gap-2 mb-3 text-black/80">
                    <FileText size={16} className="text-primary-400" />
                    <p className="label m-0">Text To Read</p>
                  </div>
                  <p className="text-black whitespace-pre-wrap break-all text-sm leading-relaxed">{selectedTask.text || "No text provided."}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="rounded-2xl border border-[#c7d1c3] bg-[#eef2ec] p-4">
                  <div className="flex items-center gap-2 mb-3 text-black/80">
                    <FileAudio size={16} className="text-emerald-400" />
                    <p className="label m-0">Audio Submission</p>
                  </div>

                  {submissionAudioUrl ? (
                    <div className="space-y-4">
                      <audio controls src={submissionAudioUrl} className="w-full" />
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-black/55 text-xs uppercase tracking-wide">Uploaded At</p>
                          <p className="text-black/80 mt-1">{formatDateTime(selectedSubmission?.audio?.uploadedAt)}</p>
                        </div>
                        <div>
                          <p className="text-black/55 text-xs uppercase tracking-wide">File Size</p>
                          <p className="text-black/80 mt-1">{formatFileSize(selectedSubmission?.audio?.fileSizeBytes)}</p>
                        </div>
                        <div>
                          <p className="text-black/55 text-xs uppercase tracking-wide">Format</p>
                          <p className="text-black/80 mt-1">{selectedSubmission?.audio?.contentType || "audio/wav"}</p>
                        </div>
                        <div>
                          <p className="text-black/55 text-xs uppercase tracking-wide">Audio Spec</p>
                          <p className="text-black/80 mt-1">
                            {selectedSubmission?.audio?.sampleRate || 16000} Hz · {selectedSubmission?.audio?.bitDepth || 16}-bit · {selectedSubmission?.audio?.channels || 1} ch
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-[#c5cec1] bg-white px-4 py-8 text-center">
                      <Mic2 size={24} className="mx-auto mb-2 text-black/55" />
                      <p className="text-black/60 text-sm">No audio submission available for this selection yet.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-[#c7d1c3] bg-[#eef2ec] p-4">
                  <div className="flex items-center gap-2 text-black/80 mb-2">
                    <User2 size={15} className="text-sky-400" />
                    <p className="label m-0">Submission User</p>
                  </div>
                  <p className="text-black text-sm">{selectedSubmission?.userId?.name || "No submission selected"}</p>
                  <p className="text-black/55 text-xs mt-1">{selectedSubmission?.userId?.email || "No user email available"}</p>
                </div>

                <div className="rounded-2xl border border-[#c7d1c3] bg-[#eef2ec] p-4">
                  <div className="flex items-center gap-2 text-black/80 mb-2">
                    <CalendarClock size={15} className="text-primary-400" />
                    <p className="label m-0">Created</p>
                  </div>
                  <p className="text-black text-sm">{formatDateTime(selectedTask.createdAt)}</p>
                </div>

                <div className="rounded-2xl border border-[#c7d1c3] bg-[#eef2ec] p-4">
                  <div className="flex items-center gap-2 text-black/80 mb-2">
                    <CalendarClock size={15} className="text-emerald-400" />
                    <p className="label m-0">Last Updated</p>
                  </div>
                  <p className="text-black text-sm">{formatDateTime(selectedTask.updatedAt)}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-black/55 text-sm">Task submission details are not available.</div>
          )}
        </Modal>
      )}
    </AdminLayout>
  );
}
