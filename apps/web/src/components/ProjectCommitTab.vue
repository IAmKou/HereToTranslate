<script setup lang="ts">
import { ref, defineProps, watch, onMounted, computed, defineEmits, nextTick } from 'vue';
import { useToast } from 'primevue/usetoast';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Dialog from 'primevue/dialog';
import axiosInstance from '../api';
import Calendar from 'primevue/calendar';

interface Commit {
  id: string;
  message: string;
  contentSnapshot: string;
  filePath: string;
  status: 'pending' | 'approved' | 'rejected';
  author: {
    id: string;
    username: string;
    fullName?: string;
  };
  createdAt: string;
  reviewedByUserId?: string;
  reviewMessage?: string;
}

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
  };
  author?: {
    login: string;
  };
}

interface Branch {
  id: string | number;
  name: string;
}

const props = defineProps<{
  projectId: string | number;
  branchId: string | number | null
}>();

const toast = useToast();

// State
const commits = ref<Commit[]>([]);
const githubCommits = ref<GitHubCommit[]>([]);
const loading = ref(false);
const error = ref('');

// Submit commit form
const showSubmitDialog = ref(false);
const submitForm = ref({
  filePath: '',
  content: '',
  message: ''
});
const submitting = ref(false);

// Review commit
const showReviewDialog = ref(false);
const selectedCommit = ref<Commit | null>(null);
const reviewForm = ref({
  approve: true,
  reviewMessage: ''
});
const reviewing = ref(false);

// View commit content
const showContentDialog = ref(false);
const selectedContent = ref<Commit | null>(null);

// Filter and search
const searchQuery = ref('');
const statusFilter = ref<'all' | 'pending' | 'approved' | 'rejected'>('all');

// Sort options
const sortBy = ref<'newest' | 'oldest' | 'user' | 'file'>('newest');
const githubSortBy = ref<'newest' | 'oldest' | 'user' | 'file'>('newest');
const showOnlyGithub = ref(false);
const githubStatusFilter = ref<'all' | 'pending' | 'approved' | 'rejected'>('all');

// Pagination
const currentPage = ref(1);
const pageSize = ref(20);
const pageSizeOptions = [10, 20, 50];
const totalCommits = ref(0);

// Computed
// User filter
const userFilter = ref('all');
const githubUserFilter = ref('all');

// Lấy danh sách user từ commit
const localUsers = computed(() => {
  const users = new Set<string>();
  commits.value.forEach((c: Commit) => {
    if (c.author?.username) users.add(c.author.username);
  });
  return Array.from(users);
});
const githubUsers = computed(() => {
  const users = new Set<string>();
  githubCommits.value.forEach((c: any) => {
    if (c.author?.login) users.add(c.author.login);
    else if (c.commit?.author?.name) users.add(c.commit.author.name);
  });
  return Array.from(users);
});

// Date filter
const fromDate = ref('');
const toDate = ref('');
const githubFromDate = ref('');
const githubToDate = ref('');

// Date range filter
const dateRange = ref<[Date | null, Date | null] | null>(null);
const githubDateRange = ref<[Date | null, Date | null] | null>(null);

// Date range picker popover logic
const showDatePopover = ref(false);
const showGithubDatePopover = ref(false);
function formatRangeLabel(range: [Date | null, Date | null] | null) {
  if (!range || !range[0] || !range[1]) return 'All time';
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  const from = range[0].toLocaleDateString('en-US', opts);
  const to = range[1].toLocaleDateString('en-US', opts);
  return `${from} - ${to}`;
}
function clearDateRange() {
  dateRange.value = null;
}
function clearGithubDateRange() {
  githubDateRange.value = null;
}

// Filter theo user và ngày
const filteredCommits = computed(() => {
  let filtered = commits.value.filter((commit: Commit) => commit.message.trim().toLowerCase() !== 'initial commit');
  if (userFilter.value !== 'all') {
    filtered = filtered.filter((commit: Commit) => commit.author?.username === userFilter.value);
  }
  if (dateRange.value && dateRange.value[0] && dateRange.value[1]) {
    const from = dateRange.value[0];
    const to = new Date(dateRange.value[1] as Date);
    to.setHours(23,59,59,999);
    filtered = filtered.filter((commit: Commit) => {
      const d = new Date(commit.createdAt);
      return d >= from && d <= to;
    });
  }
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter((commit: Commit) =>
      commit.message.toLowerCase().includes(query) ||
      commit.filePath.toLowerCase().includes(query) ||
      commit.author.username.toLowerCase().includes(query) ||
      (commit.author.fullName && commit.author.fullName.toLowerCase().includes(query))
    );
  }
  if (statusFilter.value !== 'all') {
    filtered = filtered.filter((commit: Commit) => commit.status === statusFilter.value);
  }
  return filtered;
});

const pendingCommits = computed(() =>
  filteredCommits.value.filter((commit: Commit) => commit.status === 'pending')
);

const approvedCommits = computed(() =>
  filteredCommits.value.filter((commit: Commit) => commit.status === 'approved')
);

const rejectedCommits = computed(() =>
  filteredCommits.value.filter((commit: Commit) => commit.status === 'rejected')
);

// Sort function
function sortCommits<T extends { createdAt?: string; commit?: { author: { date: string }; }; author?: any; filePath?: string; }>(arr: T[], sort: string): T[] {
  switch (sort) {
    case 'oldest':
      return [...arr].sort((a, b) => {
        const dateA = a.createdAt || a.commit?.author.date || '';
        const dateB = b.createdAt || b.commit?.author.date || '';
        return new Date(dateA).getTime() - new Date(dateB).getTime();
      });
    case 'user':
      return [...arr].sort((a, b) => {
        const userA = (a.author?.fullName || a.author?.username || a.author?.login || '').toLowerCase();
        const userB = (b.author?.fullName || b.author?.username || b.author?.login || '').toLowerCase();
        return userA.localeCompare(userB);
      });
    case 'file':
      return [...arr].sort((a, b) => {
        const fileA = (a.filePath || '').toLowerCase();
        const fileB = (b.filePath || '').toLowerCase();
        return fileA.localeCompare(fileB);
      });
    case 'newest':
    default:
      return [...arr].sort((a, b) => {
        const dateA = a.createdAt || a.commit?.author.date || '';
        const dateB = b.createdAt || b.commit?.author.date || '';
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
  }
}

// Sắp xếp và lọc local commits
const sortedFilteredCommits = computed(() => {
  let arr = filteredCommits.value;
  arr = sortCommits(arr, sortBy.value);
  return arr;
});
const pagedCommits = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return sortedFilteredCommits.value.slice(start, start + pageSize.value);
});

// Sắp xếp và lọc github commits
const filteredGithubCommits = computed(() => {
  let arr = githubCommits.value;
  if (githubUserFilter.value !== 'all') {
    arr = arr.filter((commit: any) => (commit.author?.login || commit.commit?.author?.name) === githubUserFilter.value);
  }
  if (githubDateRange.value && githubDateRange.value[0] && githubDateRange.value[1]) {
    const from = githubDateRange.value[0];
    const to = new Date(githubDateRange.value[1] as Date);
    to.setHours(23,59,59,999);
    arr = arr.filter((commit: any) => {
      const d = new Date(commit.commit?.author?.date || '');
      return d >= from && d <= to;
    });
  }
  if (githubStatusFilter.value !== 'all') {
    arr = arr.filter((commit: any) => commit.status === githubStatusFilter.value);
  }
  return arr;
});
const sortedGithubCommits = computed(() => {
  let arr = filteredGithubCommits.value;
  arr = sortCommits(arr, githubSortBy.value);
  return arr;
});
const pagedGithubCommits = computed(() => {
  const start = (githubCurrentPage.value - 1) * githubPageSize.value;
  return sortedGithubCommits.value.slice(start, start + githubPageSize.value);
});

watch([filteredCommits, pageSize], () => {
  totalCommits.value = filteredCommits.value.length;
  if ((currentPage.value - 1) * pageSize.value >= totalCommits.value) {
    currentPage.value = 1;
  }
});

// Pagination for GitHub Commits
const githubCurrentPage = ref(1);
const githubPageSize = ref(20);
const githubPageSizeOptions = [10, 20, 50];
const githubTotalCommits = computed(() => githubCommits.value.length);

watch([githubCommits, githubPageSize], () => {
  if ((githubCurrentPage.value - 1) * githubPageSize.value >= githubTotalCommits.value) {
    githubCurrentPage.value = 1;
  }
});

const branches = ref<Branch[]>([]);
const branchLoading = ref(false);
const emit = defineEmits(['update:branchId']);

const activeTab = ref<'local' | 'history'>('local');

// Methods
async function loadCommits() {
  if (!props.projectId || !props.branchId) return;

  loading.value = true;
  error.value = '';

  try {
    // Gọi API backend để lấy local commits thực tế
    const localRes = await axiosInstance.get(`/projects/${props.projectId}/${props.branchId}/local-commits`);
    commits.value = localRes.data || [];
    // Load GitHub commits
    const response = await axiosInstance.get(`/projects/${props.projectId}/${props.branchId}/listCommit`);
    githubCommits.value = response.data || [];
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Failed to load commits';
    githubCommits.value = [];
    commits.value = [];
  } finally {
    loading.value = false;
  }
}

async function submitCommit() {
  if (!props.projectId || !props.branchId) return;

  // Kiểm tra nội dung bản dịch
  try {
    const contentObj = JSON.parse(submitForm.value.content || '{}');
    if (!contentObj || Object.keys(contentObj).length === 0) {
      toast.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'No translations available to commit!',
        life: 3000,
      });
      return;
    }
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Invalid translation content!',
      life: 3000,
    });
    return;
  }

  // Kiểm tra nếu nội dung giống commit gần nhất (cùng filePath)
  const latestSameFileCommit = commits.value.find((c: Commit) => c.filePath === submitForm.value.filePath);
  if (latestSameFileCommit) {
    let latestContent = latestSameFileCommit.contentSnapshot;
    // So sánh JSON, bỏ qua thứ tự key
    try {
      const latestObj = JSON.parse(latestContent || '{}');
      const currentObj = JSON.parse(submitForm.value.content || '{}');
      if (JSON.stringify(latestObj) === JSON.stringify(currentObj)) {
        toast.add({
          severity: 'warn',
          summary: 'Warning',
          detail: 'No changes detected since the last commit for this file.',
          life: 3000,
        });
        return;
      }
    } catch (e) {/* Nếu lỗi parse thì bỏ qua kiểm tra này */}
  }

  submitting.value = true;

  try {
    await axiosInstance.post(`/projects/${props.projectId}/${props.branchId}/commit`, submitForm.value);

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Commit submitted successfully',
      life: 3000
    });

    showSubmitDialog.value = false;
    submitForm.value = { filePath: '', content: '', message: '' };
    await loadCommits();
  } catch (err: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.response?.data?.message || 'Failed to submit commit',
      life: 3000
    });
  } finally {
    submitting.value = false;
  }
}

function openReviewDialog(commit: Commit) {
  selectedCommit.value = commit;
  reviewForm.value = {
    approve: true,
    reviewMessage: ''
  };
  showReviewDialog.value = true;
}

function openContentDialog(commit: Commit) {
  selectedContent.value = commit;
  showContentDialog.value = true;
}

async function reviewCommit() {
  if (!selectedCommit.value || !props.projectId) return;

  reviewing.value = true;

  try {
    await axiosInstance.post(`/projects/${props.projectId}/${selectedCommit.value.id}/review`, reviewForm.value);

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: `Commit ${reviewForm.value.approve ? 'approved' : 'rejected'} successfully`,
      life: 3000
    });

    showReviewDialog.value = false;
    selectedCommit.value = null;
    await loadCommits();
  } catch (err: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.response?.data?.message || 'Failed to review commit',
      life: 3000
    });
  } finally {
    reviewing.value = false;
  }
}

function getStatusClass(status: string) {
  switch (status) {
    case 'approved': return 'status-approved';
    case 'rejected': return 'status-rejected';
    case 'pending': return 'status-pending';
    default: return 'status-pending';
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'approved': return 'pi pi-check-circle';
    case 'rejected': return 'pi pi-times-circle';
    case 'pending': return 'pi pi-clock';
    default: return 'pi pi-clock';
  }
}

function formatDate(dateString: string) {
  // Display in Vietnam timezone but in English
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh'
  });
}

// Thêm hàm autoFillTranslationContent vào phần <script setup>
async function autoFillTranslationContent() {
  if (!props.projectId || !props.branchId) return;
  try {
    const res = await axiosInstance.get('/translation/strings', {
      params: {
        projectId: props.projectId,
        branchId: props.branchId,
      },
    });
    // Gom các string theo filePath
    const byFile: Record<string, Record<string, string>> = {};
    (res.data || []).forEach((str: any) => {
      if (str.translatedText && str.translatedText.trim()) {
        const file = str.filePath || str.fileName || 'translations.json';
        if (!byFile[file]) byFile[file] = {};
        byFile[file][str.originalText] = str.translatedText;
      }
    });
    autoFillTranslations.value = byFile;
    autoFillFiles.value = Object.keys(byFile);
    if (autoFillFiles.value.length === 1) {
      autoFillSelectedFile.value = autoFillFiles.value[0];
      // So sánh với commit gần nhất cùng filePath
      const latestSameFileCommit = commits.value.find((c: any) => c.filePath === autoFillSelectedFile.value);
      const newContent = JSON.stringify(byFile[autoFillSelectedFile.value], null, 2);
      let isSame = false;
      if (latestSameFileCommit) {
        try {
          const latestObj = JSON.parse(latestSameFileCommit.contentSnapshot || '{}');
          const newObj = JSON.parse(newContent || '{}');
          isSame = JSON.stringify(latestObj) === JSON.stringify(newObj);
        } catch (e) {}
      }
      if (isSame) {
        toast.add({
          severity: 'warn',
          summary: 'Nothing changes',
          detail: 'No new translations to auto-fill!',
          life: 3000,
        });
        showAutoFillFileSelect.value = false;
        return;
      }
      submitForm.value.filePath = autoFillSelectedFile.value;
      submitForm.value.content = newContent;
      if (!submitForm.value.message) {
        submitForm.value.message = 'Update translations';
      }
      showAutoFillFileSelect.value = false;
    } else if (autoFillFiles.value.length > 1) {
      showAutoFillFileSelect.value = true;
      autoFillSelectedFile.value = autoFillFiles.value[0];
      // Không auto-fill luôn, chỉ khi user chọn file thì watcher phía trên sẽ kiểm tra và update form nếu có thay đổi
    } else {
      toast.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'No translations available to auto-fill!',
        life: 3000,
      });
      showAutoFillFileSelect.value = false;
    }
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to auto-fill translations',
      life: 3000,
    });
    showAutoFillFileSelect.value = false;
  }
}

async function loadBranches() {
  if (!props.projectId) return;
  branchLoading.value = true;
  try {
    const res = await axiosInstance.get(`/projects/${props.projectId}/branches`);
    branches.value = res.data || [];
    // Nếu chưa có branchId, tự động chọn branch đầu tiên
    if (!props.branchId && branches.value.length > 0) {
      emit('update:branchId', branches.value[0].id);
    }
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load branches',
      life: 3000,
    });
  } finally {
    branchLoading.value = false;
  }
}

// Watchers
watch(() => props.projectId, () => {
  if (props.projectId) {
    loadBranches();
  }
}, { immediate: true });

watch(() => props.branchId, () => {
  if (props.projectId && props.branchId) {
    loadCommits();
  }
});

onMounted(() => {
  if (props.projectId && props.branchId) {
    loadCommits();
  }
});

// Watch showOnlyGithub
watch(showOnlyGithub, (val: boolean) => {
  if (val) activeTab.value = 'github';
});

// Thêm state lưu danh sách filePath và filePath đang chọn khi auto-fill
const autoFillFiles = ref<string[]>([]);
const autoFillSelectedFile = ref('');
const autoFillTranslations = ref<Record<string, Record<string, string>>>({});
const showAutoFillFileSelect = ref(false);

// Thêm state cho fullscreen content
const showFullscreenContent = ref(false);
// Undo/Redo stacks cho fullscreen content
const contentHistory = ref<string[]>([]);
const redoStack = ref<string[]>([]);

// Watcher: Khi mở fullscreen, reset history
watch(showFullscreenContent, (val) => {
  if (val) {
    contentHistory.value = [];
    redoStack.value = [];
  }
});

// Watcher: Lưu history khi nội dung thay đổi trong fullscreen
let lastContent = '';
watch(
  () => showFullscreenContent.value ? submitForm.value.content : null,
  (newVal, oldVal) => {
    if (showFullscreenContent.value && oldVal !== null && newVal !== oldVal) {
      contentHistory.value.push(oldVal);
      redoStack.value = [];
    }
    lastContent = newVal || '';
  }
);

function handleUndo() {
  if (contentHistory.value.length > 0) {
    redoStack.value.push(submitForm.value.content);
    const prev = contentHistory.value.pop();
    if (prev !== undefined) submitForm.value.content = prev;
  }
}
function handleRedo() {
  if (redoStack.value.length > 0) {
    contentHistory.value.push(submitForm.value.content);
    const next = redoStack.value.pop();
    if (next !== undefined) submitForm.value.content = next;
  }
}

// Thêm state cho nút copy
const copySuccess = ref(false);

function handleCopyContent() {
  navigator.clipboard.writeText(submitForm.value.content).then(() => {
    copySuccess.value = true;
    setTimeout(() => copySuccess.value = false, 1200);
  });
}

// Watcher: Khi user chọn file khác trong dropdown, auto-fill lại content và filePath
watch(autoFillSelectedFile, (file: string) => {
  if (file && autoFillTranslations.value[file]) {
    // So sánh với commit gần nhất cùng filePath
    const latestSameFileCommit = commits.value.find((c: any) => c.filePath === file);
    const newContent = JSON.stringify(autoFillTranslations.value[file], null, 2);
    let isSame = false;
    if (latestSameFileCommit) {
      try {
        const latestObj = JSON.parse(latestSameFileCommit.contentSnapshot || '{}');
        const newObj = JSON.parse(newContent || '{}');
        isSame = JSON.stringify(latestObj) === JSON.stringify(newObj);
      } catch (e) {}
    }
    if (isSame) {
      toast.add({
        severity: 'warn',
        summary: 'Nothing changes',
        detail: 'No new translations to auto-fill!',
        life: 3000,
      });
      return;
    }
    submitForm.value.filePath = file;
    submitForm.value.content = newContent;
    if (!submitForm.value.message) {
      submitForm.value.message = 'Update translations';
    }
  }
});

// Thêm computed property cho preview content
const shortContentPreview = computed(() => {
  if (!submitForm.value.content) return '';
  const lines = submitForm.value.content.split('\n');
  if (lines.length <= 6) return submitForm.value.content;
  return lines.slice(0, 6).join('\n') + '\n...';
});
const isContentLong = computed(() => {
  if (!submitForm.value.content) return false;
  return submitForm.value.content.split('\n').length > 6;
});

// Thêm state cho nút xem full content trong modal commit content
const showFullCommitContent = ref(false);
const fullCommitContent = ref('');

function openFullCommitContent(content: string) {
  fullCommitContent.value = content;
  showFullCommitContent.value = true;
}

const shortCommitContentPreview = computed(() => {
  if (!selectedContent.value?.contentSnapshot) return '';
  const lines = selectedContent.value.contentSnapshot.split('\n');
  if (lines.length <= 12) return selectedContent.value.contentSnapshot;
  return lines.slice(0, 12).join('\n') + '\n...';
});
const isCommitContentLong = computed(() => {
  if (!selectedContent.value?.contentSnapshot) return false;
  return selectedContent.value.contentSnapshot.split('\n').length > 12;
});

// Thêm computed kiểm tra có phải commit mới nhất đã approve không
const isLatestForFile = computed(() => {
  if (!selectedCommit.value) return true;
  // Tìm commit approved mới nhất cùng filePath
  const latest = commits.value
    .filter((c: Commit) => c.filePath === selectedCommit.value.filePath && c.status === 'approved')
    .sort((a: Commit, b: Commit) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  // Nếu chưa có commit approved nào thì cho phép
  if (!latest) return true;
  // Nếu nội dung giống nhau thì KHÔNG cho approve (cảnh báo)
  try {
    const latestObj = JSON.parse(latest.contentSnapshot || '{}');
    const currentObj = JSON.parse(selectedCommit.value.contentSnapshot || '{}');
    if (JSON.stringify(latestObj) === JSON.stringify(currentObj)) return false;
  } catch (e) {}
  // Nếu khác nội dung thì cho approve
  return true;
});
</script>

<template>
  <div class="commits-tab-wrapper">
    <!-- Advanced filter bar -->
    <div style="display:flex;align-items:center;gap:2em;margin-bottom:1em;">
    </div>
    <!-- Tabs for Local/Commit History -->
    <div class="commit-tabs" style="display:flex;gap:1em;margin-bottom:1.5em;">
      <button :class="['tab-btn', {active: activeTab==='local'}]" @click="activeTab='local'" style="display:flex;align-items:center;gap:0.5em;">
        <span style="font-size:1.2em;">📄</span> Local Commits
      </button>
      <button :class="['tab-btn', {active: activeTab==='history'}]" @click="activeTab='history'" style="display:flex;align-items:center;gap:0.5em;">
        <span style="font-size:1.2em;">🕓</span> Commit History
      </button>
    </div>
    <!-- Branch select giữ nguyên -->
    <div class="branch-select" style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 1rem;">
      <label for="branch-select" style="font-weight: 600;">Branch:</label>
      <select
        id="branch-select"
        v-model="props.branchId"
        @change="(e: Event) => emit('update:branchId', (e.target as HTMLSelectElement).value)"
        :disabled="branchLoading"
        style="padding: 0.5rem 1rem; border-radius: 8px; border: 1px solid #d1d5db; min-width: 160px;"
      >
        <option v-for="branch in branches" :key="branch.id" :value="branch.id">
          {{ branch.name }}
        </option>
      </select>
    </div>
    <!-- Header with stats giữ nguyên -->
    <div class="commits-header">
      <div class="commits-title">
        <h2>Project Commits</h2>
        <p>Manage and review commits for this project</p>
      </div>
      <div class="commits-stats">
        <template v-if="activeTab==='local'">
          <div class="stat-item">
            <div class="stat-number">{{ pendingCommits.length }}</div>
            <div class="stat-label">Pending</div>
          </div>
        </template>
        <template v-else>
          <div class="stat-item">
            <div class="stat-number">{{ approvedCommits.length }}</div>
            <div class="stat-label">Approved</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">{{ rejectedCommits.length }}</div>
            <div class="stat-label">Rejected</div>
          </div>
        </template>
      </div>
    </div>
    <!-- Actions & Filters -->
    <div v-if="activeTab==='local' || activeTab==='history'">
      <div class="commits-actions">
        <div class="filter-group">
          <div class="search-container">
            <i class="pi pi-search search-icon"></i>
            <InputText
              v-model="searchQuery"
              placeholder="Search commits..."
              class="search-input"
            />
          </div>
          <select v-model="statusFilter" class="status-filter" v-if="activeTab==='history'">
            <option value="all">All Status</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <select v-model="userFilter" class="status-filter">
            <option value="all">All users</option>
            <option v-for="u in localUsers" :key="u" :value="u">{{ u }}</option>
          </select>
          <div class="custom-date-range">
            <button
              class="date-range-btn"
              :class="{ active: dateRange && dateRange[0] && dateRange[1] }"
              @click="showDatePopover = !showDatePopover"
              @blur="() => setTimeout(() => showDatePopover = false, 200)"
              type="button"
            >
              <i class="pi pi-calendar mr-1"></i>
              <span>{{ formatRangeLabel(dateRange) }}</span>
              <i v-if="dateRange && dateRange[0] && dateRange[1]" class="pi pi-times ml-2 clear-btn" @click.stop="clearDateRange"></i>
            </button>
            <div v-if="showDatePopover" class="date-range-popover">
              <Calendar v-model="dateRange" selectionMode="range" inline :showIcon="false" dateFormat="M dd, yy" />
              <button class="clear-date-btn" @click="clearDateRange" type="button">Clear</button>
            </div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:1em;">
          <label for="page-size-select" style="font-weight:600;">Commits/page:</label>
          <select id="page-size-select" v-model.number="pageSize" style="padding:0.3em 1em;border-radius:8px;">
            <option v-for="opt in pageSizeOptions" :key="opt" :value="opt">{{ opt }}</option>
          </select>
        </div>
        <Button
          v-if="activeTab==='local'"
          label="Submit Commit"
          icon="pi pi-plus"
          class="submit-btn"
          @click="() => { console.log('Clicked Submit Commit'); showSubmitDialog = true; console.log('showSubmitDialog:', showSubmitDialog); }"
        />
      </div>
      <!-- Loading/Error/Commits list giữ nguyên, chỉ thay pagedCommits thành sortedFilteredCommits -->
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading commits...</p>
      </div>
      <div v-else-if="error" class="error-state">
        <div class="error-icon">⚠️</div>
        <p>{{ error }}</p>
        <Button label="Retry" @click="loadCommits" />
      </div>
      <div v-else class="commits-content">
        <div v-if="pagedCommits.length > 0" class="commits-section">
          <h3>{{ activeTab==='local' ? 'Local Commits' : 'Commit History' }}</h3>
          <div class="commits-list">
            <div
              v-for="commit in (activeTab==='local' ? pendingCommits.slice((currentPage-1)*pageSize, currentPage*pageSize) : pagedCommits)"
              :key="commit.id"
              :class="['commit-card-upgrade', getStatusClass(commit.status)]"
            >
              <div class="commit-card-main">
                <!-- Left section -->
                <div class="commit-card-left">
                  <div class="commit-message">{{ commit.message }}</div>
                  <div class="commit-meta">
                    <span><i class="pi pi-user mr-1"></i> {{ commit.author.fullName || commit.author.username }}</span>
                    <span><i class="pi pi-calendar mr-1"></i> {{ formatDate(commit.createdAt) }}</span>
                    <span><i class="pi pi-file mr-1"></i> {{ commit.filePath }}</span>
                  </div>
                </div>
                <!-- Right actions -->
                <div class="commit-card-right">
                  <span :class="['status-badge-upgrade', getStatusClass(commit.status)]">
                    <i :class="getStatusIcon(commit.status) + ' mr-1'"></i> {{ commit.status.toUpperCase() }}
                  </span>
                  <div class="commit-actions-upgrade">
                    <button class="action-btn view" @click="openContentDialog(commit)">View</button>
                    <button v-if="commit.status === 'pending' && activeTab==='local'" class="action-btn review" @click="openReviewDialog(commit)">Review</button>
                  </div>
                </div>
              </div>
              <div v-if="commit.reviewMessage" class="commit-review">
                <strong>Review:</strong> {{ commit.reviewMessage }}
              </div>
            </div>
          </div>
          <!-- Pagination controls giữ nguyên -->
          <div class="pagination-controls" style="display:flex;gap:0.5em;align-items:center;justify-content:center;margin-top:1.5em;">
            <button :disabled="currentPage === 1" @click="currentPage--">« Prev</button>
            <span>Page {{ currentPage }} / {{ Math.max(1, Math.ceil((activeTab==='local' ? pendingCommits.length : totalCommits) / pageSize)) }}</span>
            <button :disabled="currentPage >= Math.ceil((activeTab==='local' ? pendingCommits.length : totalCommits) / pageSize)" @click="currentPage++">Next »</button>
          </div>
        </div>
      </div>
    </div>
    <!-- ... các dialog giữ nguyên ... -->
    <!-- Submit Commit Dialog -->
    <Dialog
      v-model:visible="showSubmitDialog"
      header="Submit New Commit"
      :style="{ width: '900px', maxWidth: '98vw' }"
      :modal="true"
      class="commit-dialog-upgrade"
    >
      <div class="submit-form commit-form-upgrade">
        <div class="form-group file-path-group">
          <label class="input-label"><span class="icon">📂</span> File Path</label>
          <template v-if="showAutoFillFileSelect && autoFillFiles.length > 1">
            <select v-model="autoFillSelectedFile" class="file-select-dropdown">
              <option v-for="f in autoFillFiles" :key="f" :value="f">{{ f }}</option>
            </select>
          </template>
          <template v-else>
            <InputText v-model="submitForm.filePath" readonly />
          </template>
        </div>
        <div class="form-group">
          <label class="input-label"><span class="icon">📝</span> Commit Message</label>
          <InputText v-model="submitForm.message" placeholder="Describe your changes..." />
        </div>
        <div class="form-group textarea-group content-area-group">
          <label class="input-label"><span class="icon">📄</span> Content</label>
          <div class="textarea-actions">
            <Button :icon="copySuccess ? 'pi pi-check' : 'pi pi-copy'" class="copy-btn" :class="{ 'copied': copySuccess }" @click="handleCopyContent" v-tooltip="copySuccess ? 'Copied!' : 'Copy All Content'" />
            <Button icon="pi pi-external-link" class="fullscreen-btn" @click="showFullscreenContent = true" v-tooltip="'Edit Fullscreen'" />
          </div>
          <pre class="content-textarea" style="min-height:120px;max-height:220px;overflow:auto;resize:vertical;white-space:pre-wrap;">{{ shortContentPreview }}</pre>
          <div v-if="isContentLong" class="content-long-hint">(If content is long, click <b>Fullscreen</b> to view all content)</div>
        </div>
      </div>
      <template #footer>
        <div class="commit-dialog-footer">
          <Button
            label="Cancel"
            icon="pi pi-times"
            class="gray-btn"
            @click="showSubmitDialog = false"
          />
          <Button
            label="Auto-fill Translations"
            icon="pi pi-download"
            class="auto-translation-btn secondary-btn"
            @click="autoFillTranslationContent"
          />
          <Button
            label="Submit"
            icon="pi pi-check"
            :loading="submitting"
            class="primary-btn"
            @click="submitCommit"
          />
        </div>
      </template>
    </Dialog>
    <!-- Review Commit Dialog -->
    <Dialog
      v-model:visible="showReviewDialog"
      header="Review Commit"
      :style="{ width: '600px', maxWidth: '98vw', borderRadius: '16px', padding: '0 0 1.5em 0' }"
      :modal="true"
      class="review-commit-dialog-upgrade"
    >
      <div v-if="selectedCommit" class="review-form" style="padding: 1.2em 0.5em 0.5em 0.5em;">
        <div class="commit-preview" style="margin-bottom:1.2em;">
          <h4 style="margin-bottom:0.7em;">Commit Details</h4>
          <div class="preview-item"><strong>Message:</strong> {{ selectedCommit.message }}</div>
          <div class="preview-item"><strong>File:</strong> {{ selectedCommit.filePath }}</div>
          <div class="preview-item"><strong>Author:</strong> {{ selectedCommit.author.fullName || selectedCommit.author.username }}</div>
        </div>
        <div v-if="!isLatestForFile" class="review-warning-box">
          <i class="pi pi-exclamation-triangle warning-icon"></i>
          <span class="warning-text">A newer commit for this file has already been approved.<br>Approving this commit is not allowed to prevent rollback.</span>
        </div>
        <div class="form-group" style="margin-top:1.2em;">
          <label>Review Decision</label>
          <div class="radio-group">
            <label>
              <input type="radio" v-model="reviewForm.approve" :value="true" :disabled="!isLatestForFile" />
              Approve
            </label>
            <label>
              <input type="radio" v-model="reviewForm.approve" :value="false" />
              Reject
            </label>
          </div>
        </div>
        <div class="form-group">
          <label>Review Message (Optional)</label>
          <Textarea
            v-model="reviewForm.reviewMessage"
            placeholder="Add a review comment..."
            rows="4"
            autoResize
          />
        </div>
      </div>
      <template #footer>
        <Button
          label="Cancel"
          icon="pi pi-times"
          class="p-button-text"
          @click="showReviewDialog = false"
        />
        <Button
          label="Confirm"
          icon="pi pi-check"
          :loading="reviewing"
          @click="reviewCommit"
          :disabled="reviewForm.approve && !isLatestForFile"
          v-tooltip="reviewForm.approve && !isLatestForFile ? 'Cannot approve because a newer commit has already been approved.' : ''"
          class="primary-btn"
        />
      </template>
    </Dialog>
    <!-- View Content Dialog -->
    <Dialog
      v-model:visible="showContentDialog"
      header="Commit Content"
      :style="{ width: '700px', maxWidth: '98vw', borderRadius: '18px', boxShadow: '0 8px 32px rgba(30,41,59,0.16)' }"
      :modal="true"
      class="commit-content-dialog-upgrade"
    >
      <div v-if="selectedContent" class="commit-content-modal-body">
        <div class="commit-content-info-grid">
          <div class="info-row"><span class="info-icon">📝</span><span class="info-label">Message:</span><span class="info-value">{{ selectedContent.message }}</span></div>
          <div class="info-row"><span class="info-icon">📄</span><span class="info-label">File:</span><span class="info-value">{{ selectedContent.filePath }}</span></div>
          <div class="info-row"><span class="info-icon">👤</span><span class="info-label">Author:</span><span class="info-value">{{ selectedContent.author.fullName || selectedContent.author.username }}</span></div>
          <div class="info-row"><span class="info-icon">📅</span><span class="info-label">Date:</span><span class="info-value">{{ formatDate(selectedContent.createdAt) }}</span></div>
        </div>
        <div class="commit-content-file-title">File Content</div>
        <div class="commit-content-file-area">
          <pre class="commit-content-file-code">{{ shortCommitContentPreview }}</pre>
          <div v-if="isCommitContentLong" class="view-full-content-btn-row">
            <Button label="View Full Content" icon="pi pi-external-link" class="view-full-content-btn" @click="openFullCommitContent(selectedContent.contentSnapshot)" />
          </div>
        </div>
      </div>
      <template #footer>
        
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.commits-tab-wrapper {
  padding: 2rem 0;
}

.commits-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%);
  border-radius: 16px;
  border: 1px solid #e0e7ff;
}

.commits-title h2 {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
}

.commits-title p {
  margin: 0;
  color: #64748b;
  font-size: 0.95rem;
}

.commits-stats {
  display: flex;
  gap: 2rem;
}

.stat-item {
  text-align: center;
}

.stat-number {
  font-size: 2rem;
  font-weight: 800;
  color: #3b82f6;
  line-height: 1;
}

.stat-label {
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 600;
  margin-top: 0.25rem;
}

.commits-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  gap: 1rem;
}

.search-filter {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex: 1;
}

.search-container {
  position: relative;
  flex: 1;
  max-width: 300px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  font-size: 14px;
}

.search-input {
  width: 100%;
  padding: 0.5rem 1rem 0.5rem 2.5rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
}

.status-filter {
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  background: white;
  min-width: 120px;
}

.submit-btn {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border: none;
  color: white;
  padding: 0.5rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.2s;
}

.submit-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.loading-state,
.error-state,
.empty-state {
  text-align: center;
  padding: 3rem 1rem;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-radius: 50%;
  border-top-color: #3b82f6;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.commits-section {
  margin-bottom: 2rem;
}

.commits-section h3 {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
}

.commits-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.commit-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.commit-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.commit-card.status-pending {
  border-left: 4px solid #f59e0b;
}

.commit-card.status-approved {
  border-left: 4px solid #10b981;
}

.commit-card.status-rejected {
  border-left: 4px solid #ef4444;
}

.commit-card.github-commit {
  border-left: 4px solid #6366f1;
}

.commit-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.commit-info {
  flex: 1;
}

.commit-message {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 0.5rem;
  line-height: 1.4;
}

.commit-meta {
  display: flex;
  gap: 1.5rem;
  font-size: 0.875rem;
  color: #64748b;
  flex-wrap: wrap;
}

.commit-author,
.commit-date,
.commit-file,
.commit-sha {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.commit-status {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
}

.commit-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.view-btn {
  background: #6b7280;
  color: white;
  border: none;
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  transition: all 0.2s;
}

.view-btn:hover {
  background: #4b5563;
  transform: translateY(-1px);
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.status-pending {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.status-approved {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.status-rejected {
  background: #fee2e2;
  color: #991b1b;
}

.status-badge.status-synced {
  background: #dbeafe;
  color: #1e40af;
}

.review-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  transition: all 0.2s;
}

.review-btn:hover {
  background: #2563eb;
  transform: translateY(-1px);
}

.commit-review {
  margin-top: 1rem;
  padding: 0.75rem;
  background: #f8fafc;
  border-radius: 8px;
  border-left: 3px solid #3b82f6;
  font-size: 0.875rem;
  color: #374151;
}

.submit-form,
.review-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
}

.radio-group {
  display: flex;
  gap: 1rem;
}

.radio-group label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.commit-preview {
  background: #f8fafc;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.commit-preview h4 {
  margin: 0 0 0.75rem 0;
  color: #1e293b;
  font-size: 1rem;
}

.preview-item {
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.preview-item strong {
  color: #374151;
}

.content-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.content-info {
  background: #f8fafc;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.info-item {
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.info-item:last-child {
  margin-bottom: 0;
}

.content-preview {
  background: #1e293b;
  border-radius: 8px;
  padding: 1rem;
  overflow: hidden;
}

.content-preview h4 {
  color: #e2e8f0;
  margin: 0 0 1rem 0;
  font-size: 1rem;
}

.content-code {
  background: #0f172a;
  color: #e2e8f0;
  padding: 1rem;
  border-radius: 6px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
}

.pagination-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 1.5em;
  gap: 0.5em;
}

.pagination-controls button {
  padding: 0.3em 1em;
  border-radius: 8px;
  background-color: #3b82f6;
  color: white;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s;
}

.pagination-controls button:hover:not(:disabled) {
  background-color: #2563eb;
}

.pagination-controls button:disabled {
  background-color: #d1d5db;
  color: #6b7280;
  cursor: not-allowed;
}

.tab-btn {
  background: #f1f5f9;
  color: #6366f1;
  border: none;
  border-radius: 10px 10px 0 0;
  font-weight: 600;
  font-size: 1.1em;
  padding: 0.7em 2em;
  cursor: pointer;
  transition: background 0.18s, color 0.18s;
}
.tab-btn.active {
  background: linear-gradient(90deg, #6366f1 0%, #7c3aed 100%);
  color: #fff;
}
.commit-card.local-commit {
  border-left: 4px solid #3b82f6;
}
.commit-card.github-commit {
  border-left: 4px solid #8b5cf6;
}

.commit-card-upgrade {
  border-left: 4px solid #10b981;
  background: #fff;
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  margin-bottom: 1.2rem;
  box-shadow: 0 1px 3px rgba(16, 185, 129, 0.08);
  transition: box-shadow 0.18s;
}
.commit-card-upgrade.status-pending {
  border-left-color: #f59e0b;
}
.commit-card-upgrade.status-approved {
  border-left-color: #10b981;
}
.commit-card-upgrade.status-rejected {
  border-left-color: #ef4444;
}
.commit-card-upgrade.github-commit {
  border-left-color: #8b5cf6;
}
.commit-card-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1.5rem;
}
.commit-card-left {
  flex: 1;
}
.commit-message {
  font-size: 1.05rem;
  font-weight: 600;
  color: #1e293b;
}
.commit-meta {
  margin-top: 0.5rem;
  display: flex;
  flex-wrap: wrap;
  gap: 1.2rem;
  font-size: 0.93rem;
  color: #64748b;
}
.commit-card-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
}
.status-badge-upgrade {
  font-size: 0.8rem;
  padding: 0.2em 0.9em;
  border-radius: 999px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.3em;
  background: #d1fae5;
  color: #047857;
}
.status-badge-upgrade.status-pending {
  background: #fef3c7;
  color: #92400e;
}
.status-badge-upgrade.status-approved {
  background: #d1fae5;
  color: #047857;
}
.status-badge-upgrade.status-rejected {
  background: #fee2e2;
  color: #991b1b;
}
.status-badge-upgrade.status-synced {
  background: #ede9fe;
  color: #7c3aed;
}
.commit-actions-upgrade {
  display: flex;
  gap: 0.5em;
  margin-top: 0.3em;
}
.action-btn {
  background: none;
  border: none;
  color: #2563eb;
  font-weight: 600;
  font-size: 0.95em;
  cursor: pointer;
  padding: 0.2em 0.7em;
  border-radius: 6px;
  transition: background 0.15s, color 0.15s;
}
.action-btn.view:hover {
  background: #e0e7ff;
  color: #1e40af;
}
.action-btn.review {
  color: #10b981;
}
.action-btn.review:hover {
  background: #d1fae5;
  color: #047857;
}
.action-btn.revert:hover {
  background: #fee2e2;
  color: #991b1b;
}

.custom-date-range {
  min-width: 180px;
  position: relative;
  display: flex;
  align-items: center;
}
.date-range-btn {
  display: flex;
  align-items: center;
  gap: 0.5em;
  border-radius: 8px;
  border: 1.5px solid #d1d5db;
  background: #fff;
  color: #334155;
  font-size: 1em;
  padding: 0.45em 1.2em 0.45em 1em;
  cursor: pointer;
  transition: border 0.18s, box-shadow 0.18s, background 0.18s;
  box-shadow: none;
  min-width: 140px;
  font-weight: 500;
  position: relative;
}
.date-range-btn.active {
  border: 1.5px solid #6366f1;
  background: #eef2ff;
  color: #3730a3;
}
.date-range-btn:hover {
  border: 1.5px solid #6366f1;
  background: #f5f3ff;
}
.date-range-btn .pi-calendar {
  color: #6366f1;
  font-size: 1.1em;
}
.date-range-btn .clear-btn {
  color: #ef4444;
  font-size: 1.1em;
  margin-left: 0.5em;
  cursor: pointer;
  transition: color 0.15s;
}
.date-range-btn .clear-btn:hover {
  color: #b91c1c;
}
.date-range-popover {
  position: absolute;
  top: 110%;
  left: 0;
  z-index: 100;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(30,41,59,0.12);
  border: 1.5px solid #d1d5db;
  padding: 0.5em 0.5em 0.7em 0.5em;
  min-width: 320px;
  margin-top: 0.2em;
}
.date-range-popover .p-calendar {
  width: 100%;
}
.date-range-popover .p-calendar .p-inputtext {
  display: none;
}
.date-range-popover .p-calendar .p-datepicker {
  border: none;
  box-shadow: none;
  background: transparent;
}
.date-range-popover .p-calendar .p-datepicker-calendar td {
  border-radius: 8px;
  transition: background 0.15s, color 0.15s;
}
.date-range-popover .p-calendar .p-datepicker-calendar td.p-highlight {
  background: #6366f1 !important;
  color: #fff !important;
}
.date-range-popover .p-calendar .p-datepicker-calendar td.p-range {
  background: #e0e7ff !important;
  color: #6366f1 !important;
}
.date-range-popover .p-calendar .p-datepicker-calendar td.p-today {
  border: 1.5px solid #6366f1 !important;
}
.date-range-popover .p-calendar .p-datepicker-header {
  background: #f1f5f9;
  border-radius: 12px 12px 0 0;
  color: #6366f1;
  font-weight: 600;
}
.p-calendar {
  width: 100%;
}
.p-calendar .p-inputtext {
  border-radius: 8px;
  font-size: 1em;
  background: #fff;
  color: #334155;
}
.p-calendar .p-inputtext:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 2px #6366f133;
}
.p-calendar .p-datepicker {
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(30,41,59,0.12);
  border: 1.5px solid #d1d5db;
  background: #fff;
}
.p-calendar .p-datepicker-calendar td {
  border-radius: 8px;
  transition: background 0.15s, color 0.15s;
}
.p-calendar .p-datepicker-calendar td.p-highlight {
  background: #6366f1 !important;
  color: #fff !important;
}
.p-calendar .p-datepicker-calendar td.p-range {
  background: #e0e7ff !important;
  color: #6366f1 !important;
}
.p-calendar .p-datepicker-calendar td.p-today {
  border: 1.5px solid #6366f1 !important;
}
.p-calendar .p-datepicker-header {
  background: #f1f5f9;
  border-radius: 12px 12px 0 0;
  color: #6366f1;
  font-weight: 600;
}
.p-calendar .p-datepicker-calendar .p-datepicker-calendar-container {
  background: #fff;
}
.p-calendar .p-datepicker-calendar .p-datepicker-calendar-container .p-datepicker-calendar-table {
  width: 100%;
}
.p-calendar .p-datepicker-calendar .p-datepicker-calendar-container .p-datepicker-calendar-table .p-datepicker-calendar-day {
  border-radius: 8px;
}
.p-calendar .p-datepicker-calendar .p-datepicker-calendar-container .p-datepicker-calendar-table .p-datepicker-calendar-day.p-highlight {
  background: #6366f1 !important;
  color: #fff !important;
}
.p-calendar .p-datepicker-calendar .p-datepicker-calendar-container .p-datepicker-calendar-table .p-datepicker-calendar-day.p-range {
  background: #e0e7ff !important;
  color: #6366f1 !important;
}
.p-calendar .p-datepicker-calendar .p-datepicker-calendar-container .p-datepicker-calendar-table .p-datepicker-calendar-day.p-today {
  border: 1.5px solid #6366f1 !important;
}
.p-calendar .p-datepicker-calendar .p-datepicker-calendar-container .p-datepicker-calendar-table .p-datepicker-calendar-day.p-disabled {
  color: #cbd5e1 !important;
}
.p-calendar .p-datepicker-calendar .p-datepicker-calendar-container .p-datepicker-calendar-table .p-datepicker-calendar-day.p-disabled.p-highlight {
  background: #e0e7ff !important;
  color: #cbd5e1 !important;
}
.p-calendar .p-datepicker-calendar .p-datepicker-calendar-container .p-datepicker-calendar-table .p-datepicker-calendar-day.p-disabled.p-range {
  background: #f1f5f9 !important;
  color: #cbd5e1 !important;
}
.p-calendar .p-datepicker-calendar .p-datepicker-calendar-container .p-datepicker-calendar-table .p-datepicker-calendar-day.p-disabled.p-today {
  border: 1.5px solid #cbd5e1 !important;
}
.p-calendar .p-datepicker-calendar .p-datepicker-calendar-container .p-datepicker-calendar-table .p-datepicker-calendar-day.p-disabled.p-highlight.p-range {
  background: #f1f5f9 !important;
  color: #cbd5e1 !important;
}
.p-calendar .p-datepicker-calendar .p-datepicker-calendar-container .p-datepicker-calendar-table .p-datepicker-calendar-day.p-disabled.p-highlight.p-today {
  border: 1.5px solid #cbd5e1 !important;
}
.p-calendar .p-datepicker-calendar .p-datepicker-calendar-container .p-datepicker-calendar-table .p-datepicker-calendar-day.p-disabled.p-range.p-today {
  border: 1.5px solid #cbd5e1 !important;
}
.p-calendar .p-datepicker-calendar .p-datepicker-calendar-container .p-datepicker-calendar-table .p-datepicker-calendar-day.p-disabled.p-highlight.p-range.p-today {
  border: 1.5px solid #cbd5e1 !important;
}

.clear-date-btn {
  margin-top: 0.7em;
  background: #f1f5f9;
  color: #ef4444;
  border: none;
  border-radius: 8px;
  padding: 0.4em 1.2em;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.clear-date-btn:hover {
  background: #fee2e2;
  color: #b91c1c;
}

.filter-group {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex: 1;
}

.commit-form-upgrade .input-label {
  font-size: 0.97em;
  color: #64748b;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.4em;
  margin-bottom: 0.2em;
}
.commit-form-upgrade .icon {
  font-size: 1.1em;
}
.textarea-group {
  position: relative;
}
.textarea-actions {
  position: absolute;
  top: 0.2em;
  right: 0.2em;
  display: flex;
  gap: 0.3em;
  z-index: 2;
}
.copy-btn, .fullscreen-btn {
  background: #f3f4f6;
  color: #6366f1;
  border: none;
  border-radius: 6px;
  padding: 0.2em 0.5em;
  font-size: 1em;
  transition: background 0.15s, color 0.15s;
}
.copy-btn:hover, .fullscreen-btn:hover {
  background: #ede9fe;
  color: #4f46e5;
}
.primary-btn {
  background: #2563eb !important;
  color: #fff !important;
  border: none;
  font-weight: 700;
  border-radius: 8px;
  padding: 0.5em 1.5em;
  margin-left: 0.5em;
}
.gray-btn {
  background: #f3f4f6 !important;
  color: #6b7280 !important;
  border: none;
  font-weight: 600;
  border-radius: 8px;
  padding: 0.5em 1.5em;
}
.secondary-btn {
  background: #a78bfa !important;
  color: #fff !important;
  border: none;
  font-weight: 600;
  border-radius: 8px;
  padding: 0.5em 1.5em;
  margin-bottom: 0.5em;
}
.file-path-group {
  margin-bottom: 1.2em;
}
.file-select-wrapper {
  margin-top: 0.3em;
}
.file-select-label {
  font-size: 0.92em;
  color: #a1a1aa;
  margin-bottom: 0.1em;
  display: block;
  font-weight: 500;
}
.file-select-dropdown {
  width: 100%;
  padding: 0.5em 1em;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  font-size: 1em;
  margin-top: 0.1em;
}
.content-area-group .content-textarea {
  background: #f3f4f6;
  border-radius: 10px;
  border: 1.5px solid #e5e7eb;
  padding: 1em;
  font-size: 1em;
  transition: border 0.15s;
}
.content-area-group .content-textarea:focus {
  border: 1.5px solid #6366f1;
  background: #f1f5f9;
}
@media (max-width: 600px) {
  .commit-form-upgrade, .form-group, .form-actions { flex-direction: column; }
  .form-group, .form-actions { width: 100%; }
  .commit-form-upgrade { padding: 0.5em; }
  .form-group input, .form-group textarea, .form-actions button { width: 100%; }
  .textarea-actions { right: 0.5em; }
}

@media (max-width: 768px) {
  .commits-header {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }

  .commits-stats {
    gap: 1rem;
  }

  .commits-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .search-filter {
    flex-direction: column;
  }

  .search-container {
    max-width: none;
  }

  .commit-header {
    flex-direction: column;
    align-items: stretch;
  }

  .commit-status {
    align-items: stretch;
  }

  .commit-meta {
    flex-direction: column;
    gap: 0.5rem;
  }
}
.copy-btn {
  transition: background 0.18s, color 0.18s, transform 0.18s, box-shadow 0.18s;
}
.copy-btn.copied {
  background: #4ade80 !important; /* xanh lá nhạt */
  color: #fff !important;
  transform: scale(1.15);
  box-shadow: 0 2px 8px #4ade8033;
}
.commit-dialog-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 1em;
  margin-top: 0.5em;
  background: none;
  border: none;
  padding: 0 1.5em 1em 1.5em;
}
.commit-dialog-footer .gray-btn {
  order: 1;
}
.commit-dialog-footer .secondary-btn {
  order: 2;
}
.commit-dialog-footer .primary-btn {
  order: 3;
}
@media (max-width: 600px) {
  .commit-dialog-footer {
    flex-direction: column;
    gap: 0.5em;
    width: 100%;
  }
}
.fullscreen-title {
  font-size: 1.6em;
  font-weight: 700;
  text-align: center;
  margin-bottom: 0.7em;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5em;
}
.fullscreen-title .icon {
  font-size: 1.2em;
}
.fullscreen-toolbar {
  display: flex;
  gap: 1em;
  justify-content: center;
  margin-bottom: 0.7em;
  background: #f3f4f6;
  border-radius: 10px;
  padding: 0.5em 1em;
}
.fullscreen-textarea {
  width: 100%;
  border-radius: 14px;
  background: #f9f9f9;
  padding: 1em;
  font-size: 0.95em;
  border: 1.5px solid #e5e7eb;
  margin-bottom: 1em;
  resize: both;
  min-height: 400px;
  min-width: 300px;
  box-sizing: border-box;
}
.close-btn {
  background: #f3f4f6 !important;
  color: #ef4444 !important;
  border-radius: 8px;
  font-weight: 600;
  float: right;
  margin-top: 0.5em;
}
.save-btn {
  background: #2563eb !important;
  color: #fff !important;
  border-radius: 8px;
  font-weight: 600;
}
.undo-btn, .redo-btn {
  background: #f3f4f6 !important;
  color: #64748b !important;
  border-radius: 8px;
  font-weight: 600;
}
@media (max-width: 700px) {
  .fullscreen-title { font-size: 1.2em; }
  .fullscreen-toolbar { flex-direction: column; gap: 0.5em; }
  .fullscreen-textarea { min-width: 0; }
}
.content-scrollable {
  max-height: 60vh;
  overflow-y: auto;
  overflow-x: hidden;
  white-space: pre-wrap;
  word-break: break-word;
}
/* --- Modal Submit New Commit UI Upgrade --- */
.commit-dialog-upgrade {
  border-radius: 18px !important;
  box-shadow: 0 8px 32px rgba(30,41,59,0.16) !important;
  background: #f8fafc !important;
  border: 1.5px solid #e0e7ff !important;
  padding: 2.8em 1.5em 1.2em 1.5em !important;
}
.submit-form.commit-form-upgrade {
  gap: 1.5em;
  padding: 0.2em 0.2em 0.5em 0.2em;
}
.commit-form-upgrade .form-group {
  background: #f3f4f6;
  border-radius: 12px;
  padding: 0.3em 0.5em;
  margin-bottom: 0;
  box-shadow: 0 2px 8px #e0e7ff33;
}
.commit-form-upgrade .input-label {
  color: #64748b;
  font-weight: 700;
  font-size: 1.01em;
  margin-bottom: 0.3em;
  display: flex;
  align-items: center;
  gap: 0.4em;
}
.commit-form-upgrade .icon {
  font-size: 1.1em;
  color: #6366f1;
}
.content-area-group .content-textarea {
  background: #f8fafc;
  border-radius: 10px;
  border: 1.5px solid #e0e7ff;
  padding: 1em;
  font-size: 1em;
  font-family: 'Fira Mono', 'Menlo', 'Consolas', monospace;
  color: #334155;
  margin-bottom: 0.3em;
  transition: border 0.15s;
}
.content-area-group .content-textarea:focus {
  border: 1.5px solid #6366f1;
  background: #eef2ff;
}
.commit-dialog-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 1em;
  margin-top: 0.5em;
  background: none;
  border: none;
}
.commit-dialog-footer .gray-btn {
  background: #f3f4f6 !important;
  color: #6b7280 !important;
  border: none;
  font-weight: 600;
  border-radius: 8px;
  padding: 0.5em 1.5em;
  transition: background 0.18s, color 0.18s;
}
.commit-dialog-footer .gray-btn:hover {
  background: #e5e7eb !important;
  color: #334155 !important;
}
.commit-dialog-footer .secondary-btn {
  background: linear-gradient(90deg, #a78bfa 0%, #6366f1 100%) !important;
  color: #fff !important;
  border: none;
  font-weight: 600;
  border-radius: 8px;
  padding: 0.5em 1.5em;
  margin-bottom: 0.5em;
  transition: background 0.18s, color 0.18s;
}
.commit-dialog-footer .secondary-btn:hover {
  background: #7c3aed !important;
  color: #fff !important;
}
.commit-dialog-footer .primary-btn {
  background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%) !important;
  color: #fff !important;
  border: none;
  font-weight: 700;
  border-radius: 8px;
  padding: 0.5em 1.5em;
  margin-left: 0.5em;
  transition: background 0.18s, color 0.18s;
}
.commit-dialog-footer .primary-btn:hover {
  background: #1d4ed8 !important;
  color: #fff !important;
}
@media (max-width: 600px) {
  .commit-dialog-upgrade { padding: 0.5em !important; }
  .submit-form.commit-form-upgrade { padding: 0.1em; }
  .commit-form-upgrade .form-group { padding: 0.7em 0.5em; }
  .commit-dialog-footer { flex-direction: column; gap: 0.5em; width: 100%; }
}
/* --- Input Field UI Upgrade --- */
.commit-form-upgrade input[type="text"],
.commit-form-upgrade input[type="search"],
.commit-form-upgrade input[type="email"],
.commit-form-upgrade input[type="password"],
.commit-form-upgrade .p-inputtext,
.commit-form-upgrade select,
.commit-form-upgrade .file-select-dropdown {
  border-radius: 10px;
  border: 1.5px solid #e0e7ff;
  background: #f8fafc;
  padding: 0.7em 1em;
  font-size: 1em;
  color: #334155;
  transition: border 0.18s, box-shadow 0.18s;
  outline: none;
  box-shadow: none;
  margin-bottom: 0.1em;
}
.commit-form-upgrade input[type="text"]:focus,
.commit-form-upgrade input[type="search"]:focus,
.commit-form-upgrade input[type="email"]:focus,
.commit-form-upgrade input[type="password"]:focus,
.commit-form-upgrade .p-inputtext:focus,
.commit-form-upgrade select:focus,
.commit-form-upgrade .file-select-dropdown:focus {
  border: 1.5px solid #6366f1;
  background: #eef2ff;
  box-shadow: 0 0 0 2px #6366f133;
}
.commit-form-upgrade label.input-label {
  color: #64748b;
  font-weight: 600;
  font-size: 1em;
  margin-bottom: 0.3em;
  display: block;
}
.commit-form-upgrade select,
.commit-form-upgrade .file-select-dropdown {
  appearance: none;
  -webkit-appearance: none;
  background-image: url('data:image/svg+xml;utf8,<svg fill="%236366f1" height="20" viewBox="0 0 20 20" width="20" xmlns="http://www.w3.org/2000/svg"><path d="M7.293 7.293a1 1 0 011.414 0L10 8.586l1.293-1.293a1 1 0 111.414 1.414l-2 2a1 1 0 01-1.414 0l-2-2a1 1 0 010-1.414z"/></svg>');
  background-repeat: no-repeat;
  background-position: right 0.8em center;
  background-size: 2em;
}
.commit-form-upgrade .file-select-dropdown {
  min-width: 160px;
}
.commit-form-upgrade input:disabled,
.commit-form-upgrade select:disabled,
.commit-form-upgrade .file-select-dropdown:disabled {
  background: #f1f5f9;
  color: #a1a1aa;
  border-color: #e5e7eb;
  cursor: not-allowed;
}
@media (max-width: 600px) {
  .commit-form-upgrade input,
  .commit-form-upgrade select,
  .commit-form-upgrade .file-select-dropdown {
    font-size: 0.98em;
    padding: 0.6em 0.7em;
  }
}

.commit-dialog-upgrade .p-dialog-title {
  width: 100%;
  text-align: center !important;
  padding-left: 1.5em !important;
  padding-right: 1.5em !important;
  margin: 0 auto;
  display: block;
}

/* Nổi bật dòng thông báo content dài */
.content-area-group .content-long-hint {
  color: #6366f1;
  font-weight: 600;
  font-size: 0.97em;
  margin-top: 0.2em;
}

.commit-form-upgrade .content-area-group {
  padding-left: 1em;
  padding-right: 1em;
}

.content-area-group .content-textarea {
  padding-left: 1.2em !important;
  padding-right: 1.2em !important;
}

pre.content-textarea {
  padding-left: 1.2em !important;
  padding-right: 1.2em !important;
  box-sizing: border-box !important;
}

.commit-dialog-upgrade .p-dialog-header {
  justify-content: center !important;
  text-align: center !important;
  padding-left: 1.5em !important;
  padding-right: 1.5em !important;
}

.commit-content-dialog-upgrade .p-dialog-header {
  justify-content: center !important;
  text-align: center !important;
  padding-left: 1.5em !important;
  padding-right: 1.5em !important;
}
.commit-content-modal-body {
  padding: 1.5em 1.5em 0.5em 1.5em;
  background: #f8fafc;
  border-radius: 16px;
}
.commit-content-info-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.5em;
  margin-bottom: 1.2em;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 1px 4px #e0e7ff33;
  padding: 1em 1.2em 0.5em 1.2em;
}
.info-row {
  display: flex;
  align-items: center;
  gap: 0.5em;
  border-bottom: 1px solid #e5e7eb;
  padding: 0.4em 0;
  font-size: 1.01em;
}
.info-row:last-child {
  border-bottom: none;
}
.info-icon {
  font-size: 1.1em;
  color: #6366f1;
}
.info-label {
  font-weight: 700;
  color: #374151;
  min-width: 80px;
}
.info-value {
  color: #1e293b;
  font-weight: 400;
  flex: 1;
  word-break: break-word;
}
.commit-content-file-title {
  font-size: 1.08em;
  font-weight: 700;
  color: #2563eb;
  margin: 1.2em 0 0.5em 0;
  letter-spacing: 0.01em;
}
.commit-content-file-area {
  background: #f3f4f6;
  border-radius: 10px;
  padding: 1.2em 1.2em 1em 1.2em;
  margin-bottom: 0.5em;
  max-height: 340px;
  overflow: auto;
  box-shadow: 0 1px 4px #e0e7ff33;
}
.commit-content-file-code {
  font-family: 'Fira Mono', 'Menlo', 'Consolas', monospace;
  font-size: 0.98em;
  color: #334155;
  background: none;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}
.commit-content-dialog-upgrade .close-btn {
  background: #f3f4f6 !important;
  color: #ef4444 !important;
  border-radius: 8px;
  font-weight: 600;
  float: right;
  margin-top: 0.5em;
  min-width: 110px;
}
@media (max-width: 700px) {
  .commit-content-modal-body { padding: 0.5em; }
  .commit-content-info-grid { padding: 0.5em; }
  .commit-content-file-area { padding: 0.5em; }
}

.view-full-content-btn-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.5em;
}
.view-full-content-btn {
  background: #6366f1 !important;
  color: #fff !important;
  border-radius: 8px;
  font-weight: 600;
  min-width: 160px;
}
.fullscreen-title {
  font-size: 1.3em;
  font-weight: 700;
  text-align: center;
  margin-bottom: 0.7em;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5em;
}
.fullscreen-title .icon {
  font-size: 1.2em;
}
.fullscreen-textarea {
  width: 100%;
  border-radius: 14px;
  background: #f9f9f9;
  padding: 1em;
  font-size: 0.95em;
  border: 1.5px solid #e5e7eb;
  margin-bottom: 1em;
  resize: both;
  min-height: 400px;
  min-width: 300px;
  box-sizing: border-box;
  font-family: 'Fira Mono', 'Menlo', 'Consolas', monospace;
  color: #334155;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-x: auto;
}
@media (max-width: 700px) {
  .fullscreen-title { font-size: 1.1em; }
  .fullscreen-textarea { min-width: 0; }
}

.review-commit-dialog-upgrade .review-warning-box {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fef3c7;
  color: #b45309;
  border: 1.5px solid #fde68a;
  border-radius: 10px;
  padding: 1em 1.2em;
  margin-bottom: 1em;
  font-weight: 600;
  font-size: 1.05em;
  text-align: center;
  gap: 0.7em;
}
.review-commit-dialog-upgrade .warning-icon {
  font-size: 1.7em;
  color: #f59e0b;
}
.review-commit-dialog-upgrade .warning-text {
  flex: 1;
  color: #b45309;
  font-size: 1.05em;
  line-height: 1.5;
}
</style>
