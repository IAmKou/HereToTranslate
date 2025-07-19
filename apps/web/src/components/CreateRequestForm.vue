<template>
  <div class="create-request-container">
    <div class="create-request-form">
      <form @submit.prevent="handleSubmit" class="form">
        <div class="form-section">
          <div class="section-header">
            <div class="section-icon">
              <svg
                fill="none"
                height="20"
                viewBox="0 0 24 24"
                width="20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M16 13H8"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                />
                <path
                  d="M16 17H8"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                />
                <path
                  d="M10 9H9H8"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                />
              </svg>
            </div>
            <h3>Request Information</h3>
            <p class="section-subtitle">
              Fill in the information below to create your translation request
            </p>
          </div>

          <div class="form-grid">
            <div class="form-group request-type-group">
              <label class="form-label">
                Request Type <span class="required-mark">*</span>
              </label>
              <div class="radio-group">
                <label
                  :class="{ active: requestType === 'public' }"
                  class="radio-option"
                >
                  <input
                    v-model="requestType"
                    class="radio-input"
                    type="radio"
                    value="public"
                  />
                  <div class="radio-custom">
                    <div class="radio-dot"></div>
                  </div>
                  <div class="radio-content">
                    <div class="radio-icon">🌍</div>
                    <div class="radio-text">
                      <div class="radio-title">Public Request</div>
                      <div class="radio-description">
                        Available to all translators in the community
                      </div>
                    </div>
                  </div>
                </label>
                <label
                  :class="{ active: requestType === 'private' }"
                  class="radio-option"
                >
                  <input
                    v-model="requestType"
                    class="radio-input"
                    type="radio"
                    value="private"
                  />
                  <div class="radio-custom">
                    <div class="radio-dot"></div>
                  </div>
                  <div class="radio-content">
                    <div class="radio-icon">🔒</div>
                    <div class="radio-text">
                      <div class="radio-title">Private Request</div>
                      <div class="radio-description">
                        Assigned to a specific translator
                      </div>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <!-- Assignee (for private requests) -->
            <div class="form-group" v-if="requestType === 'private'">
              <label for="assignee" class="form-label">
                Assignee <span class="required-mark">*</span>
              </label>
              <div class="input-wrapper">
                <input
                  id="assignee"
                  v-model="assigneeEmail"
                  type="email"
                  required
                  class="form-control"
                  :class="{ error: assigneeTouched && !!assigneeError }"
                  placeholder="Enter assignee email address"
                  @input="assigneeTouched = true"
                  @blur="assigneeTouched = true"
                />
                <div class="input-icon">
                  <svg
                    fill="none"
                    height="16"
                    viewBox="0 0 24 24"
                    width="16"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z"
                      stroke="currentColor"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                    <path
                      d="M12 14C8.13401 14 5 17.134 5 21H19C19 17.134 15.866 14 12 14Z"
                      stroke="currentColor"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                  </svg>
                </div>
              </div>
              <div class="input-info">
                <span
                  v-if="assigneeTouched && assigneeError"
                  class="error-message"
                >{{ assigneeError }}</span
                >
                <span v-else class="help-text"
                >Enter the email of the translator you want to assign</span
                >
              </div>
            </div>

            <!-- Title -->
            <div class="form-group full-width">
              <label for="title" class="form-label">
                Title <span class="required-mark">*</span>
              </label>
              <div class="input-wrapper">
                <input
                  id="title"
                  v-model="title"
                  type="text"
                  required
                  class="form-control"
                  :class="{ error: titleTouched && !!titleError }"
                  placeholder="Enter a descriptive request title"
                  maxlength="255"
                  @input="titleTouched = true"
                  @blur="titleTouched = true"
                />
                <div class="input-icon">
                  <svg
                    fill="none"
                    height="16"
                    viewBox="0 0 24 24"
                    width="16"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 2L2 7L12 12L22 7L12 2Z"
                      stroke="currentColor"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                    <path
                      d="M2 17L12 22L22 17"
                      stroke="currentColor"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                    <path
                      d="M2 12L12 17L22 12"
                      stroke="currentColor"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                  </svg>
                </div>
              </div>
              <div class="input-info">
                <span
                  :class="{ warning: title.length > 200 }"
                  class="char-count"
                >{{ title.length }}/255</span
                >
                <span v-if="titleTouched && titleError" class="error-message">{{
                    titleError
                  }}</span>
              </div>
            </div>

            <!-- Description -->
            <div class="form-group full-width">
              <label for="description" class="form-label">Description</label>
              <div class="textarea-wrapper">
                <textarea
                  id="description"
                  v-model="description"
                  class="form-control"
                  rows="4"
                  placeholder="Describe your request in detail (optional)"
                  maxlength="1000"
                  @input="descTouched = true"
                  @blur="descTouched = true"
                ></textarea>
                <div class="textarea-icon">
                  <svg
                    fill="none"
                    height="16"
                    viewBox="0 0 24 24"
                    width="16"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"
                      stroke="currentColor"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                    <path
                      d="M14 2V8H20"
                      stroke="currentColor"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                    <path
                      d="M16 13H8"
                      stroke="currentColor"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                    <path
                      d="M16 17H8"
                      stroke="currentColor"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                    <path
                      d="M10 9H9H8"
                      stroke="currentColor"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                  </svg>
                </div>
              </div>
              <div class="input-info">
                <span
                  :class="{ warning: description.length > 800 }"
                  class="char-count"
                >{{ description.length }}/1000</span
                >
                <span
                  v-if="descTouched && descriptionError"
                  class="error-message"
                >{{ descriptionError }}</span
                >
              </div>
            </div>

            <!-- Deal Amount -->
            <div class="form-group">
              <label for="dealAmount" class="form-label">
                Deal Amount <span class="required-mark">*</span>
              </label>
              <div class="input-wrapper">
                <input
                  id="dealAmount"
                  v-model.number="dealAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  class="form-control"
                  :class="{ error: amountTouched && !!dealAmountError }"
                  placeholder="0.00"
                  @input="amountTouched = true"
                  @blur="amountTouched = true"
                />
                <div class="input-icon">
                  <svg
                    fill="none"
                    height="16"
                    viewBox="0 0 24 24"
                    width="16"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 1V23"
                      stroke="currentColor"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                    <path
                      d="M17 5H9.5C7.01472 5 5 7.01472 5 9.5C5 11.9853 7.01472 14 9.5 14H14.5C16.9853 14 19 16.0147 19 18.5C19 20.9853 16.9853 23 14.5 23H7"
                      stroke="currentColor"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                  </svg>
                </div>
              </div>
              <div class="input-info">
                <span
                  v-if="amountTouched && dealAmountError"
                  class="error-message"
                >{{ dealAmountError }}</span
                >
                <span v-else class="help-text"
                >Set the budget for this translation request</span
                >
              </div>
            </div>

            <!-- Deadline -->
            <div class="form-group">
              <label for="deadline" class="form-label">
                Deadline <span class="required-mark">*</span>
              </label>
              <div class="input-wrapper">
                <input
                  id="deadline"
                  v-model="deadline"
                  type="date"
                  :min="minDateString"
                  required
                  class="form-control"
                  :class="{ error: deadlineTouched && !!deadlineError }"
                  @input="deadlineTouched = true"
                  @blur="deadlineTouched = true"
                />
                <div class="input-icon">
                  <svg
                    fill="none"
                    height="16"
                    viewBox="0 0 24 24"
                    width="16"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M8 7V3M16 7V3M3 11H21M5 19H19C20.1046 19 21 18.1046 21 17V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7V17C3 18.1046 3.89543 19 5 19Z"
                      stroke="currentColor"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                  </svg>
                </div>
              </div>
              <div class="input-info">
                <span
                  v-if="deadlineTouched && deadlineError"
                  class="error-message"
                >{{ deadlineError }}</span
                >
                <span v-else class="help-text"
                >Deadline must be at least 7 days from now</span
                >
              </div>
            </div>

            <!-- Category -->
            <div class="form-group">
              <label for="category" class="form-label">
                Category <span class="required-mark">*</span>
              </label>
              <div class="select-wrapper">
                <select
                  id="category"
                  v-model="categoryId"
                  class="form-control"
                  :class="{ error: categoryTouched && !!categoryError }"
                  required
                  @change="categoryTouched = true"
                  @blur="categoryTouched = true"
                >
                  <option value="">Choose a category</option>
                  <option
                    v-for="category in categories"
                    :key="category.id"
                    :value="category.id"
                  >
                    {{ category.name }}
                  </option>
                </select>
              </div>
              <div class="input-info">
                <span
                  v-if="categoryTouched && categoryError"
                  class="error-message"
                >{{ categoryError }}</span
                >
                <span v-else class="help-text"
                >Select the most appropriate category for your request</span
                >
              </div>
            </div>

            <!-- Tags -->
            <div class="form-group full-width">
              <label for="tags" class="form-label">Tags (Optional)</label>
              <Multiselect
                v-model="selectedTags"
                :options="allTags"
                :multiple="true"
                :close-on-select="false"
                :clear-on-select="false"
                :preserve-search="true"
                placeholder="Select tag..."
                :taggable="true"
                @tag="handleTagCreate"
                class="multiselect-custom"
                label="name"
                track-by="id"
              />
              <div class="input-info">
                <span v-if="tagError" class="error-message">{{
                    tagError
                  }}</span>
                <span v-else class="help-text"
                >Select one or many tags to help others find your
                  request</span
                >
              </div>
            </div>

            <!-- File Upload -->
            <div class="form-group full-width">
              <label for="files" class="form-label">Files <span class="required-mark">*</span></label>
              <div class="file-upload-container">
                <div
                  :class="{
                    'drag-over': isDragOver,
                    'has-files': uploadedFiles.length > 0,
                  }"
                  class="file-upload-area"
                  @click="triggerFileInput"
                  @drop="handleFileDrop"
                  @dragover.prevent="isDragOver = true"
                  @dragleave.prevent="isDragOver = false"
                >
                  <div class="file-upload-content">
                    <div class="file-upload-icon">
                      <svg
                        fill="none"
                        height="24"
                        viewBox="0 0 24 24"
                        width="24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15"
                          stroke="currentColor"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                        />
                        <path
                          d="M17 8L12 3L7 8"
                          stroke="currentColor"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                        />
                        <path
                          d="M12 3V15"
                          stroke="currentColor"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                        />
                      </svg>
                    </div>
                    <div class="file-upload-text">
                      <p class="upload-title">
                        Drop files here or click to browse
                      </p>
                      <p class="upload-subtitle">
                        Support: PDF, DOC, DOCX, TXT, RTF (Max 10MB each) -
                        Files will be uploaded with request
                      </p>
                    </div>
                  </div>
                  <input
                    ref="fileInput"
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.txt,.rtf"
                    @change="handleFileSelect"
                    class="file-input-hidden"
                  />
                </div>

                <!-- File List -->
                <div v-if="uploadedFiles.length > 0" class="file-list">
                  <div
                    v-for="(file, index) in uploadedFiles"
                    :key="index"
                    class="file-item"
                  >
                    <div class="file-info">
                      <div class="file-icon">
                        <svg
                          fill="none"
                          height="16"
                          viewBox="0 0 24 24"
                          width="16"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"
                            stroke="currentColor"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                          />
                          <path
                            d="M14 2V8H20"
                            stroke="currentColor"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                          />
                        </svg>
                      </div>
                      <div class="file-details">
                        <span class="file-name">{{ file.name }}</span>
                        <span class="file-size">{{
                            formatFileSize(file.size)
                          }}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      class="file-remove-btn"
                      @click="removeFile(index)"
                      title="Remove file"
                    >
                      <svg
                        fill="none"
                        height="14"
                        viewBox="0 0 24 24"
                        width="14"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M18 6L6 18"
                          stroke="currentColor"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                        />
                        <path
                          d="M6 6L18 18"
                          stroke="currentColor"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              <div class="input-info">
                <span v-if="fileError" class="error-message">{{
                    fileError
                  }}</span>
                <span v-else class="help-text">
                  Upload <b>at least one file</b> related to your translation request. Files will be uploaded with the request.
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="form-actions">
          <button
            type="submit"
            class="btn btn-primary"
            :disabled="loading || !isFormValid"
          >
            <span v-if="loading" class="loading-spinner"></span>
            <span v-else class="btn-icon">
              <svg
                fill="none"
                height="18"
                viewBox="0 0 24 24"
                width="18"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 5V19"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                />
                <path
                  d="M5 12H19"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                />
              </svg>
            </span>
            {{ loading ? 'Creating Request...' : 'Create Request' }}
          </button>
          <button
            class="btn btn-secondary"
            type="button"
            @click.prevent="onCancel"
          >
            <svg
              fill="none"
              height="18"
              viewBox="0 0 24 24"
              width="18"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M18 6L6 18"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
              />
              <path
                d="M6 6L18 18"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
              />
            </svg>
            Cancel
          </button>
        </div>
      </form>
      <Toast />
    </div>
  </div>
</template>

<script setup>
import { computed, defineEmits, onMounted, ref } from 'vue';
import axios from 'axios';
import { useToast } from 'primevue/usetoast';
import Multiselect from 'vue-multiselect';
import 'vue-multiselect/dist/vue-multiselect.min.css';

const emit = defineEmits(['success', 'cancel']);

const title = ref('');
const description = ref('');
const dealAmount = ref(null);
const deadline = ref('');
const categoryId = ref('');
const loading = ref(false);
const minDate = ref(new Date());
minDate.value.setDate(minDate.value.getDate() + 7);
const toast = useToast();

const categories = ref([]);

const titleTouched = ref(false);
const descTouched = ref(false);
const amountTouched = ref(false);
const deadlineTouched = ref(false);
const categoryTouched = ref(false);
const assigneeEmail = ref('');
const assigneeTouched = ref(false);

const requestType = ref('public');

const currentUserId = ref(null);

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const userEmail = ref('');

// Tags handling
const selectedTags = ref([]);
const tagInput = ref('');

const allTags = ref([]);
const tagError = ref('');

// File upload variables
const uploadedFiles = ref([]);
const fileInput = ref(null);
const isDragOver = ref(false);
const fileError = ref('');

const isDealAmountValid = computed(
  () => dealAmount.value !== null && dealAmount.value > 0
);

const minDateString = computed(() => {
  const d = minDate.value;
  return d.toISOString().split('T')[0];
});

const titleError = computed(() => {
  if (!titleTouched.value) return '';
  if (!title.value) return 'Title is required';
  if (title.value.length < 3) return 'Title must be at least 3 characters';
  if (title.value.length > 255) return 'Title is too long (max 255 characters)';
  return '';
});
const descriptionError = computed(() => {
  if (!descTouched.value) return '';
  if (description.value.length > 1000)
    return 'Description too long (max 1000 characters)';
  return '';
});
const dealAmountError = computed(() => {
  if (!amountTouched.value) return '';
  if (
    dealAmount.value === null ||
    dealAmount.value === '' ||
    isNaN(dealAmount.value)
  )
    return 'Deal amount is required';
  if (dealAmount.value <= 0) return 'Deal amount must be greater than 0';
  return '';
});
const deadlineError = computed(() => {
  if (!deadlineTouched.value) return '';
  if (!deadline.value) return 'Please select a deadline';
  const deadlineDate = new Date(deadline.value);
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  if (deadlineDate < sevenDaysFromNow)
    return 'Deadline must be at least 7 days from now';
  return '';
});
const categoryError = computed(() => {
  if (!categoryTouched.value) return '';
  if (!categoryId.value) return 'Please select a category';
  return '';
});
const assigneeError = computed(() => {
  if (requestType.value !== 'private') return '';
  if (!assigneeTouched.value) return '';
  if (!assigneeEmail.value) return 'Please enter assignee email';
  if (!emailRegex.test(assigneeEmail.value)) return 'Invalid email format';
  if (userEmail.value && assigneeEmail.value === userEmail.value)
    return 'You cannot assign the request to yourself';
  return '';
});

const isFormValid = computed(() => {
  if (requestType.value === 'private') {
    return (
      !titleError.value &&
      !descriptionError.value &&
      !dealAmountError.value &&
      !deadlineError.value &&
      !categoryError.value &&
      !assigneeError.value &&
      uploadedFiles.value.length > 0 // Bắt buộc phải có file
    );
  } else {
    return (
      !titleError.value &&
      !descriptionError.value &&
      !dealAmountError.value &&
      !deadlineError.value &&
      !categoryError.value &&
      uploadedFiles.value.length > 0 // Bắt buộc phải có file
    );
  }
});

onMounted(async () => {
  try {
    const categoriesRes = await axios.get('/api/categories/all');
    categories.value = categoriesRes.data;
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to fetch categories',
      life: 3000,
    });
  }

  try {
    const tagsRes = await axios.get('/api/project-tag/all');
    allTags.value = tagsRes.data;
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to fetch tags',
      life: 3000,
    });
  }

  const storedId = localStorage.getItem('userId');
  if (storedId) {
    currentUserId.value = storedId;
  }
  const storedEmail = localStorage.getItem('email');
  if (storedEmail) {
    userEmail.value = storedEmail;
  }
});

async function handleSubmit() {
  titleTouched.value = true;
  descTouched.value = true;
  amountTouched.value = true;
  deadlineTouched.value = true;
  assigneeTouched.value = true;
  categoryTouched.value = true;

  if (uploadedFiles.value.length === 0) {
    fileError.value = 'Please upload at least one file.';
    toast.add({
      severity: 'warn',
      summary: 'Warning',
      detail: 'Please upload at least one file.',
      life: 3000,
    });
    return;
  }

  if (!isFormValid.value) {
    toast.add({
      severity: 'warn',
      summary: 'Warning',
      detail: 'Please fix all validation errors',
      life: 3000,
    });
    return;
  }

  loading.value = true;

  try {
    const deadlineDate = new Date(deadline.value);
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    if (deadlineDate < sevenDaysFromNow) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Deadline must be at least 7 days from now',
        life: 3000,
      });
      loading.value = false;
      return;
    }

    let isPublic = false;
    let assigneeId = undefined;

    if (requestType.value === 'public') {
      isPublic = true;
    } else if (requestType.value === 'private') {
      isPublic = false;

      try {
        const response = await axios.get(
          `/api/requests/search?keyword=${encodeURIComponent(assigneeEmail.value)}`
        );
        const user = response.data.find((u) => u.email === assigneeEmail.value);

        if (user) {
          assigneeId = Number(user.id);
        } else {
          toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No user found with this email',
            life: 3000,
          });
          loading.value = false;
          return;
        }
      } catch (error) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No user found with this email',
          life: 3000,
        });
        loading.value = false;
        return;
      }
    }

    const requestData = {
      title: title.value,
      description: description.value,
      dealAmount: dealAmount.value,
      deadline: deadline.value,
      isPublic,
      categoryId: categoryId.value,
      tags: selectedTags.value.map((tag) => tag.name),
    };

    if (assigneeId !== undefined) {
      requestData.assigneeId = assigneeId;
    }

    const endpoint =
      requestType.value === 'private'
        ? '/api/requests/create/private'
        : '/api/requests/create';

    const formData = new FormData();
    formData.append('title', title.value);
    formData.append('description', description.value);
    formData.append('dealAmount', dealAmount.value.toString());
    formData.append('deadline', deadline.value);
    formData.append('isPublic', isPublic.toString());
    formData.append('categoryId', categoryId.value);

    selectedTags.value.forEach(tag => {
      formData.append('tags[]', tag.name);
    });

    if (assigneeId !== undefined) {
      formData.append('assigneeId', assigneeId.toString());
    }

    uploadedFiles.value.forEach(file => {
      formData.append('files', file);
    });

    const response = await axios.post(endpoint, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    if (requestType.value === 'private' && response.data?.approvalUrl) {
      window.location.href = response.data.approvalUrl;
      return;
    }

    console.log('Backend response:', response.data);

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Request created successfully!',
      life: 3000,
    });

    emit('success');
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: e.response?.data?.message || 'Failed to create request',
      life: 3000,
    });
  } finally {
    loading.value = false;
  }
}


function onCancel() {
  emit('cancel');
}

// Tag handling methods
function addTag() {
  const tag = tagInput.value.trim();
  if (tag && !selectedTags.value.includes(tag)) {
    selectedTags.value.push(tag);
    tagInput.value = '';
  }
}

function removeTag(index) {
  selectedTags.value.splice(index, 1);
}

function validateTags() {
  if (selectedTags.value.length > 10) {
    tagError.value = 'You can only select up to 10 tags';
    return false;
  }
  tagError.value = '';
  return true;
}

function handleTagCreate(newTagName) {
  // Nếu tag chưa tồn tại, thêm vào allTags và chọn luôn
  if (!allTags.value.some((tag) => tag.name === newTagName)) {
    const newTag = { id: `new-${Date.now()}`, name: newTagName };
    allTags.value.push(newTag);
    selectedTags.value.push(newTag);
  }
}

// File upload functions
function triggerFileInput() {
  fileInput.value.click();
}

function handleFileSelect(event) {
  const files = Array.from(event.target.files);
  addFiles(files);
  event.target.value = ''; // Reset input
}

function handleFileDrop(event) {
  event.preventDefault();
  isDragOver.value = false;
  const files = Array.from(event.dataTransfer.files);
  addFiles(files);
}

function addFiles(files) {
  fileError.value = '';

  for (const file of files) {
    // Validate file type
    const allowedTypes = ['.pdf', '.doc', '.docx', '.txt', '.rtf'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();

    if (!allowedTypes.includes(fileExtension)) {
      fileError.value = `File type ${fileExtension} is not supported. Please upload PDF, DOC, DOCX, TXT, or RTF files.`;
      continue;
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      fileError.value = `File ${file.name} is too large. Maximum size is 10MB.`;
      continue;
    }

    // Check if file already exists
    const existingFile = uploadedFiles.value.find((f) => f.name === file.name);
    if (existingFile) {
      fileError.value = `File ${file.name} is already uploaded.`;
      continue;
    }

    // Check total number of files (max 5 files)
    if (uploadedFiles.value.length >= 5) {
      fileError.value = 'Maximum 5 files allowed.';
      continue;
    }

    uploadedFiles.value.push(file);
  }
}

function removeFile(index) {
  uploadedFiles.value.splice(index, 1);
  fileError.value = '';
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
</script>

<style scoped>
.create-request-container {
  min-height: 100vh;
  padding: 0;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  background: transparent;
  width: 100%;
  margin-right: 0;
}

.create-request-form {
  width: 100%;
  max-width: 100%;
  background: transparent;
  border-radius: 0;
  box-shadow: none;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.form {
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  width: 100%;
  max-width: 100%;
  align-items: flex-start;
}

.form-section {
  background: white;
  border-radius: 0;
  padding: 0;
  box-shadow: none;
  border: none;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
}

.section-header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 2rem;
  padding: 0 48px;
  width: 100%;
}

.section-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.section-header h3 {
  margin: 0;
  color: #1e293b;
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.3;
}

.section-subtitle {
  color: #64748b;
  font-size: 1rem;
  margin: 0;
  line-height: 1.5;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  width: 100%;
  padding: 0 48px 48px 48px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 0;
  align-items: flex-start;
  width: 100%;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-group.request-type-group {
  grid-column: 1 / -1;
}

.form-label {
  color: #374151;
  font-weight: 600;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin: 0;
}

.required-mark {
  color: #ef4444;
  font-size: 1.2rem;
  line-height: 1;
  font-weight: bold;
}

.help-text {
  color: #6b7280;
  font-size: 0.875rem;
  margin-top: 0.5rem;
  font-style: normal;
  line-height: 1.4;
}

/* Radio Group Styles */
.radio-group {
  display: flex;
  gap: 1rem;
  width: 100%;
}

.radio-option {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px;
  border: 2px solid #e5e7eb;
  border-radius: 16px;
  background: #f9fafb;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.radio-option:hover {
  border-color: #667eea;
  background: #f8fafc;
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.1);
}

.radio-option.active {
  border-color: #667eea;
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.15);
}

.radio-option.active::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
}

.radio-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.radio-custom {
  width: 20px;
  height: 20px;
  border: 2px solid #d1d5db;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.radio-option.active .radio-custom {
  border-color: #667eea;
  background: #667eea;
}

.radio-dot {
  width: 8px;
  height: 8px;
  background: white;
  border-radius: 50%;
  transform: scale(0);
  transition: transform 0.3s ease;
}

.radio-option.active .radio-dot {
  transform: scale(1);
}

.radio-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.radio-icon {
  font-size: 1.5rem;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 12px;
  flex-shrink: 0;
}

.radio-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.radio-title {
  font-weight: 600;
  color: #1e293b;
  font-size: 1rem;
}

.radio-description {
  color: #64748b;
  font-size: 0.875rem;
  line-height: 1.4;
}

.input-wrapper,
.textarea-wrapper,
.select-wrapper {
  position: relative;
  max-width: 100%;
  width: 100%;
  margin: 0;
}

.form-control {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  padding: 1rem 1rem 1rem 3.5rem;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  font-size: 1rem;
  transition: all 0.3s ease;
  background-color: #f9fafb;
  color: #374151;
  font-weight: 500;
  margin: 0;
}

.form-control:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
  background-color: white;
  transform: translateY(-1px);
}

.form-control.error {
  border-color: #ef4444;
  background-color: #fef2f2;
}

.form-control.error:focus {
  border-color: #ef4444;
  box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.1);
}

.form-control:disabled {
  background-color: #f3f4f6;
  cursor: not-allowed;
  opacity: 0.7;
}

.form-control::placeholder {
  color: #9ca3af;
  font-weight: 400;
}

textarea.form-control {
  resize: vertical;
  min-height: 120px;
  padding-top: 1rem;
  padding-bottom: 1rem;
  max-width: 100%;
  margin: 0;
}

.input-icon,
.textarea-icon,
.select-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  transition: color 0.3s ease;
}

.textarea-icon {
  top: 1.5rem;
  transform: none;
}

.form-control:focus + .input-icon,
.form-control:focus + .textarea-icon {
  color: #667eea;
}

.form-control.error + .input-icon,
.form-control.error + .textarea-icon {
  color: #ef4444;
}

.select-icon {
  right: 1rem;
  left: auto;
  pointer-events: none;
}

.input-info {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-top: 0.5rem;
}

.char-count {
  color: #6b7280;
  font-size: 0.875rem;
  font-weight: 500;
}

.char-count.warning {
  color: #f59e0b;
}

.error-message {
  color: #ef4444;
  font-size: 0.875rem;
  font-weight: 500;
  flex: 1;
}

.form-actions {
  margin-top: 2rem;
  display: flex;
  gap: 1rem;
  padding: 0 48px 48px 48px;
  width: 100%;
}

.btn {
  flex: 1;
  padding: 1rem 2rem;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  letter-spacing: 0.5px;
  min-height: 48px;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.5);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(0);
}

.btn-secondary {
  background: #f8fafc;
  color: #64748b;
  border: 2px solid #e2e8f0;
}

.btn-secondary:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
  transform: translateY(-1px);
}

.btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  opacity: 0.7;
  transform: none;
  box-shadow: none;
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-spinner {
  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Responsive Design */
@media (max-width: 1200px) {
  .form-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .radio-group {
    flex-direction: column;
  }

  .section-header {
    padding: 0 32px;
  }

  .form-grid {
    padding: 0 32px 32px 32px;
  }

  .form-actions {
    padding: 0 32px 32px 32px;
  }
}

@media (max-width: 768px) {
  .section-header {
    padding: 0 24px;
  }

  .form-grid {
    padding: 0 24px 24px 24px;
    gap: 1rem;
  }

  .form-actions {
    padding: 0 24px 24px 24px;
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }

  .radio-option {
    padding: 16px;
  }

  .radio-content {
    gap: 8px;
  }

  .radio-icon {
    width: 32px;
    height: 32px;
    font-size: 1.25rem;
  }

  .section-header h3 {
    font-size: 1.25rem;
  }

  .section-subtitle {
    font-size: 0.875rem;
  }
}

/* Tags Input Styles */
.tags-input-wrapper {
  position: relative;
  max-width: 100%;
  width: 100%;
  margin: 0;
}

.tags-input-container {
  width: 100%;
  min-height: 48px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  background-color: #f9fafb;
  padding: 0.5rem;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
}

.tags-input-container:focus-within {
  border-color: #667eea;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
  background-color: white;
  transform: translateY(-1px);
}

.tags-display {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  flex: 1;
  min-height: 32px;
}

.tag-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
  transition: all 0.3s ease;
}

.tag-badge:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.tag-remove {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  transition: all 0.3s ease;
}

.tag-remove:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

.tag-remove:focus {
  outline: none;
  background: rgba(255, 255, 255, 0.3);
}

.tag-input {
  flex: 1;
  min-width: 120px;
  border: none;
  outline: none;
  background: transparent;
  font-size: 1rem;
  color: #374151;
  font-weight: 500;
  padding: 0.5rem;
}

.tag-input::placeholder {
  color: #9ca3af;
  font-weight: 400;
}

/* Responsive adjustments for tags */
@media (max-width: 768px) {
  .tags-display {
    gap: 0.25rem;
  }

  .tag-badge {
    font-size: 0.8rem;
    padding: 0.2rem 0.6rem;
  }

  .tag-input {
    min-width: 100px;
    font-size: 0.9rem;
  }
}

/* File Upload Styles */
.file-upload-container {
  width: 100%;
}

.file-upload-area {
  border: 2px dashed #d1d5db;
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #f9fafb;
  position: relative;
  overflow: hidden;
}

.file-upload-area:hover {
  border-color: #667eea;
  background: #f0f4ff;
  transform: translateY(-1px);
}

.file-upload-area.drag-over {
  border-color: #667eea;
  background: #e0e7ff;
  transform: scale(1.02);
}

.file-upload-area.has-files {
  border-color: #10b981;
  background: #f0fdf4;
}

.file-upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.file-upload-icon {
  color: #6b7280;
  transition: color 0.3s ease;
}

.file-upload-area:hover .file-upload-icon {
  color: #667eea;
}

.file-upload-area.drag-over .file-upload-icon {
  color: #667eea;
}

.file-upload-area.has-files .file-upload-icon {
  color: #10b981;
}

.file-upload-text {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.upload-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #374151;
  margin: 0;
}

.upload-subtitle {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
}

.file-input-hidden {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.file-list {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.file-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.file-item:hover {
  border-color: #667eea;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1);
}

.file-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.file-icon {
  color: #6b7280;
  flex-shrink: 0;
}

.file-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.file-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size {
  font-size: 0.75rem;
  color: #6b7280;
}

.file-remove-btn {
  background: none;
  border: none;
  color: #ef4444;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.file-remove-btn:hover {
  background: #fef2f2;
  color: #dc2626;
  transform: scale(1.1);
}

.file-remove-btn:focus {
  outline: none;
  background: #fef2f2;
  color: #dc2626;
}

/* Responsive adjustments for file upload */
@media (max-width: 768px) {
  .file-upload-area {
    padding: 1.5rem;
  }

  .upload-title {
    font-size: 1rem;
  }

  .upload-subtitle {
    font-size: 0.8rem;
  }

  .file-item {
    padding: 0.5rem 0.75rem;
  }

  .file-name {
    font-size: 0.8rem;
  }

  .file-size {
    font-size: 0.7rem;
  }
}
</style>
