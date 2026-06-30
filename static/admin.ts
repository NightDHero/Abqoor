export {};

type ReadyOption = "A" | "B" | "C" | "D";
type ConflictStrategy = "skip" | "replace";

type StoredQuestion = {
    id: number;
    question_number: number;
    caption: string;
    topic: string;
    difficulty: string;
    correct_option: ReadyOption | "";
    is_ready: boolean;
    created_at: string;
    image_url: string;
    assignment_count: number;
};

type ArchiveQuestionsResult = {
    ok: boolean;
    archived_question_ids: number[];
    archived_question_numbers: number[];
    archived_count: number;
};

type RestoreQuestionsResult = {
    ok: boolean;
    restored_question_ids: number[];
    restored_question_numbers: number[];
    restored_count: number;
};

type PdfImportResult = {
    imported_count: number;
    ready_count: number;
    draft_question_numbers: number[];
    skipped_existing_question_numbers: number[];
    replaced_question_numbers: number[];
    failed_pages: number[];
    questions: StoredQuestion[];
};

type QuestionConflictDetail = {
    message: string;
    mode: "single" | "multiple";
    question_numbers: number[];
    clipboard_text: string;
    conflict_count: number;
    conflict_question?: StoredQuestion;
};

type UndoState = {
    questionIds: number[];
    questionNumbers: number[];
};

class ApiRequestError extends Error {
    status: number;
    detail: unknown;

    constructor(message: string, status: number, detail: unknown) {
        super(message);
        this.name = "ApiRequestError";
        this.status = status;
        this.detail = detail;
    }
}

const loginForm = document.querySelector<HTMLFormElement>("#login-form");
const publishForm = document.querySelector<HTMLFormElement>("#publish-form");
const authPanel = document.querySelector<HTMLElement>("#auth-panel");
const dashboard = document.querySelector<HTMLElement>("#dashboard");
const feedback = document.querySelector<HTMLElement>("#feedback");
const questionsList = document.querySelector<HTMLElement>("#questions-list");
const imageInput = document.querySelector<HTMLInputElement>("#image-input");
const imagePreview = document.querySelector<HTMLImageElement>("#image-preview");
const uploadPlaceholder = document.querySelector<HTMLElement>("#upload-placeholder");
const pasteImageButton = document.querySelector<HTMLButtonElement>("#paste-image-button");
const pdfInput = document.querySelector<HTMLInputElement>("#pdf-input");
const answerSheetInput = document.querySelector<HTMLInputElement>("#answer-sheet-input");
const pdfImportButton = document.querySelector<HTMLButtonElement>("#pdf-import-button");
const pdfFileName = document.querySelector<HTMLElement>("#pdf-file-name");
const answerSheetFileName = document.querySelector<HTMLElement>("#answer-sheet-file-name");
const pdfStartQuestionNumberInput = document.querySelector<HTMLInputElement>("#pdf-start-question-number");
const questionNumberInput = document.querySelector<HTMLInputElement>("#question-number");
const logoutButton = document.querySelector<HTMLButtonElement>("#logout-button");
const publishButton = document.querySelector<HTMLButtonElement>("#publish-button");
const deleteAllButton = document.querySelector<HTMLButtonElement>("#delete-all-button");
const undoDeleteButton = document.querySelector<HTMLButtonElement>("#undo-delete-button");
const pdfConflictModal = document.querySelector<HTMLElement>("#pdf-conflict-modal");
const pdfConflictMessage = document.querySelector<HTMLElement>("#pdf-conflict-message");
const pdfConflictSinglePreview = document.querySelector<HTMLElement>("#pdf-conflict-single-preview");
const pdfConflictImage = document.querySelector<HTMLImageElement>("#pdf-conflict-image");
const pdfConflictNumber = document.querySelector<HTMLElement>("#pdf-conflict-number");
const pdfConflictStatus = document.querySelector<HTMLElement>("#pdf-conflict-status");
const pdfConflictCreatedAt = document.querySelector<HTMLElement>("#pdf-conflict-created-at");
const pdfConflictClipboardWrapper = document.querySelector<HTMLElement>("#pdf-conflict-clipboard-wrapper");
const pdfConflictClipboardText = document.querySelector<HTMLTextAreaElement>("#pdf-conflict-clipboard-text");
const pdfConflictNote = document.querySelector<HTMLElement>("#pdf-conflict-note");
const pdfConflictSkipButton = document.querySelector<HTMLButtonElement>("#pdf-conflict-skip-button");
const pdfConflictReplaceButton = document.querySelector<HTMLButtonElement>("#pdf-conflict-replace-button");
const pdfConflictCancelButton = document.querySelector<HTMLButtonElement>("#pdf-conflict-cancel-button");

const STORAGE_KEY = "abqoor-admin-token";
const UNDO_STORAGE_KEY = "abqoor-admin-undo-state";
const OPTION_LABELS: Record<ReadyOption, string> = {
    A: "أ",
    B: "ب",
    C: "ج",
    D: "د",
};

let selectedImageFile: File | null = null;
let currentPreviewUrl: string | null = null;
let undoState: UndoState | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object";
}

function asNumberArray(value: unknown): number[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item) && item > 0);
}

function isStoredQuestion(value: unknown): value is StoredQuestion {
    if (!isRecord(value)) {
        return false;
    }

    return Number.isFinite(Number(value.id))
        && Number.isFinite(Number(value.question_number))
        && typeof value.image_url === "string"
        && typeof value.created_at === "string";
}

function isQuestionConflictDetail(value: unknown): value is QuestionConflictDetail {
    if (!isRecord(value)) {
        return false;
    }

    const mode = value.mode;
    return typeof value.message === "string"
        && (mode === "single" || mode === "multiple")
        && Array.isArray(value.question_numbers)
        && typeof value.clipboard_text === "string"
        && Number.isFinite(Number(value.conflict_count));
}

function getAdminToken(): string | null {
    return window.sessionStorage.getItem(STORAGE_KEY);
}

function setAdminToken(token: string): void {
    window.sessionStorage.setItem(STORAGE_KEY, token);
}

function clearAdminToken(): void {
    window.sessionStorage.removeItem(STORAGE_KEY);
}

function readUndoState(): UndoState | null {
    const rawValue = window.sessionStorage.getItem(UNDO_STORAGE_KEY);
    if (!rawValue) {
        return null;
    }

    try {
        const parsed = JSON.parse(rawValue) as unknown;
        if (!isRecord(parsed)) {
            return null;
        }

        const questionIds = asNumberArray(parsed.questionIds);
        const questionNumbers = asNumberArray(parsed.questionNumbers);
        if (!questionIds.length) {
            return null;
        }

        return {
            questionIds,
            questionNumbers,
        };
    } catch {
        return null;
    }
}

function setUndoState(state: UndoState | null): void {
    undoState = state;
    if (state && state.questionIds.length) {
        window.sessionStorage.setItem(UNDO_STORAGE_KEY, JSON.stringify(state));
    } else {
        window.sessionStorage.removeItem(UNDO_STORAGE_KEY);
    }
    updateUndoButtonVisibility();
}

function updateUndoButtonVisibility(): void {
    if (!undoDeleteButton) {
        return;
    }

    const hasUndoState = Boolean(undoState?.questionIds.length);
    undoDeleteButton.classList.toggle("hidden", !hasUndoState);
    undoDeleteButton.disabled = !hasUndoState;
}

function syncQuestionActions(hasQuestions: boolean): void {
    if (deleteAllButton) {
        deleteAllButton.disabled = !hasQuestions;
    }
    updateUndoButtonVisibility();
}

function setFeedback(message: string, tone: "success" | "error" | "neutral" = "neutral"): void {
    if (!feedback) {
        return;
    }

    feedback.textContent = message;
    feedback.classList.remove("success", "error");
    if (tone !== "neutral") {
        feedback.classList.add(tone);
    }
}

function clearPreviewUrl(): void {
    if (!currentPreviewUrl) {
        return;
    }

    URL.revokeObjectURL(currentPreviewUrl);
    currentPreviewUrl = null;
}

function setSelectedImage(file: File): void {
    selectedImageFile = file;
    clearPreviewUrl();

    if (!imagePreview || !uploadPlaceholder) {
        return;
    }

    currentPreviewUrl = URL.createObjectURL(file);
    imagePreview.src = currentPreviewUrl;
    imagePreview.classList.remove("hidden");
    uploadPlaceholder.classList.add("hidden");
}

function clearSelectedImage(): void {
    selectedImageFile = null;
    clearPreviewUrl();

    if (imagePreview) {
        imagePreview.classList.add("hidden");
        imagePreview.removeAttribute("src");
    }

    uploadPlaceholder?.classList.remove("hidden");
}

function updatePdfSelection(): void {
    if (!pdfFileName) {
        return;
    }

    const pdfFile = pdfInput?.files?.[0];
    pdfFileName.textContent = pdfFile ? `الملف المختار: ${pdfFile.name}` : "لم يتم اختيار ملف PDF بعد.";
}

function updateAnswerSheetSelection(): void {
    if (!answerSheetFileName) {
        return;
    }

    const answerSheetFile = answerSheetInput?.files?.[0];
    answerSheetFileName.textContent = answerSheetFile ? `ملف الإجابات المختار: ${answerSheetFile.name}` : "لم يتم اختيار ملف Excel بعد.";
}

function formatNumberPreview(values: number[], limit = 10): string {
    const preview = values.slice(0, limit).join("، ");
    if (values.length <= limit) {
        return preview;
    }

    return `${preview} ... (+${values.length - limit})`;
}

function extractClipboardImage(clipboardData: DataTransfer | null): File | null {
    if (!clipboardData) {
        return null;
    }

    for (const item of Array.from(clipboardData.items)) {
        if (item.kind !== "file") {
            continue;
        }

        const file = item.getAsFile();
        if (file && file.type.startsWith("image/")) {
            return file;
        }
    }

    return null;
}

async function pasteImageFromClipboard(): Promise<void> {
    const clipboard = navigator.clipboard as Clipboard & {
        read?: () => Promise<Array<{ types: string[]; getType(type: string): Promise<Blob> }>>;
    };

    if (!clipboard.read) {
        setFeedback("هذا المتصفح لا يسمح بقراءة الحافظة مباشرة. استخدم Ctrl+V بعد نسخ الصورة.", "error");
        return;
    }

    try {
        const items = await clipboard.read();

        for (const item of items) {
            const imageType = item.types.find((type) => type.startsWith("image/"));
            if (!imageType) {
                continue;
            }

            const blob = await item.getType(imageType);
            const extension = imageType.split("/")[1] || "png";
            const file = new File([blob], `clipboard-image.${extension}`, { type: imageType });
            setSelectedImage(file);
            setFeedback("تم لصق الصورة من الحافظة.", "success");
            return;
        }

        setFeedback("لا توجد صورة في الحافظة الآن.", "error");
    } catch {
        setFeedback("تعذر قراءة الحافظة. انسخ الصورة ثم استخدم Ctrl+V داخل الصفحة.", "error");
    }
}

function escapeHtml(value: string): string {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function getQuestionStatusLabel(question: StoredQuestion): string {
    if (!question.is_ready) {
        return "مسودة بدون إجابة";
    }

    return `الإجابة: ${OPTION_LABELS[question.correct_option as ReadyOption]}`;
}

async function copyTextToClipboard(text: string): Promise<boolean> {
    if (!navigator.clipboard?.writeText) {
        return false;
    }

    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}

async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const token = getAdminToken();
    const headers = new Headers(options.headers ?? {});

    if (token) {
        headers.set("X-Admin-Token", token);
    }

    const response = await fetch(url, {
        ...options,
        headers,
    });

    if (!response.ok) {
        let detailMessage = "Request failed.";
        let detailPayload: unknown = null;
        try {
            const payload = await response.json() as { detail?: unknown };
            detailPayload = payload.detail;
            if (typeof payload.detail === "string") {
                detailMessage = payload.detail;
            } else if (isRecord(payload.detail) && typeof payload.detail.message === "string") {
                detailMessage = payload.detail.message;
            }
        } catch {
            detailMessage = response.statusText || detailMessage;
        }

        throw new ApiRequestError(detailMessage, response.status, detailPayload);
    }

    return response;
}

function renderQuestions(questions: StoredQuestion[]): void {
    if (!questionsList) {
        return;
    }

    syncQuestionActions(questions.length > 0);

    if (!questions.length) {
        questionsList.innerHTML = "<p class=\"empty-state\">لا توجد أسئلة أو مسودات محفوظة بعد.</p>";
        return;
    }

    questionsList.innerHTML = questions.map((question) => {
        const createdAt = new Date(question.created_at).toLocaleString("ar-SA");
        const caption = question.caption.trim();
        const detailRows = [
            `<div class="detail-row"><span class="detail-label">رقم السؤال</span><span class="detail-value">${question.question_number}</span></div>`,
            caption
                ? `<div class="detail-row detail-row-stack"><span class="detail-label">الوصف</span><span class="detail-value">${escapeHtml(caption)}</span></div>`
                : "",
            `<div class="detail-row"><span class="detail-label">التاريخ</span><span class="detail-value">${createdAt}</span></div>`,
        ].filter(Boolean).join("");
        const statusBadge = question.is_ready
            ? `<span class="answer-badge">${getQuestionStatusLabel(question)}</span>`
            : `<span class="draft-badge">${getQuestionStatusLabel(question)}</span>`;
        const draftEditor = question.is_ready
            ? ""
            : `
                <div class="draft-editor">
                    <div class="draft-editor-header">
                        <strong>هذا السؤال غير جاهز بعد</strong>
                        <span class="field-hint">اختر الإجابة الصحيحة ليصبح السؤال صالحًا للتوزيع على الطلاب.</span>
                    </div>
                    <div class="draft-editor-actions">
                        <select class="draft-answer-select" data-question-id="${question.id}">
                            <option value="A">أ</option>
                            <option value="B">ب</option>
                            <option value="C">ج</option>
                            <option value="D">د</option>
                        </select>
                        <button class="primary-button compact-button" type="button" data-action="save-question-answer" data-question-id="${question.id}">
                            احفظ الإجابة
                        </button>
                    </div>
                </div>
            `;

        return `
            <article class="question-card">
                <img src="${question.image_url}" alt="السؤال ${question.question_number}">
                <div class="question-meta">
                    <div class="question-header-row">
                        <strong class="question-number">السؤال ${question.question_number}</strong>
                        <button class="ghost-button delete-button compact-button" type="button" data-action="delete-question" data-question-id="${question.id}">
                            حذف
                        </button>
                    </div>
                    <div class="meta-badges">
                        ${statusBadge}
                        <span class="status-badge">مضاف ${createdAt}</span>
                    </div>
                    ${draftEditor}
                    <details class="question-details">
                        <summary>تفاصيل إضافية</summary>
                        <div class="question-details-body">
                            ${detailRows}
                        </div>
                    </details>
                </div>
            </article>
        `;
    }).join("");
}

async function loadQuestions(): Promise<void> {
    const response = await apiFetch("/api/questions");
    const payload = await response.json() as { questions: StoredQuestion[] };
    renderQuestions(payload.questions);
}

function updateAuthUi(isAuthenticated: boolean): void {
    authPanel?.classList.toggle("hidden", isAuthenticated);
    dashboard?.classList.toggle("hidden", !isAuthenticated);
}

function resetComposer(): void {
    publishForm?.reset();
    clearSelectedImage();
    updatePdfSelection();
    updateAnswerSheetSelection();
}

function closePdfConflictModal(): void {
    pdfConflictModal?.classList.add("hidden");
}

async function openPdfConflictModal(detail: QuestionConflictDetail): Promise<void> {
    if (!pdfConflictModal || !pdfConflictMessage || !pdfConflictNote) {
        setFeedback(detail.message, "error");
        return;
    }

    pdfConflictMessage.textContent = detail.message;
    pdfConflictSinglePreview?.classList.add("hidden");
    pdfConflictClipboardWrapper?.classList.add("hidden");

    if (detail.mode === "single" && isStoredQuestion(detail.conflict_question)) {
        const conflictQuestion = detail.conflict_question;
        pdfConflictSinglePreview?.classList.remove("hidden");
        if (pdfConflictImage) {
            pdfConflictImage.src = conflictQuestion.image_url;
        }
        if (pdfConflictNumber) {
            pdfConflictNumber.textContent = `السؤال ${conflictQuestion.question_number}`;
        }
        if (pdfConflictStatus) {
            pdfConflictStatus.textContent = getQuestionStatusLabel(conflictQuestion);
        }
        if (pdfConflictCreatedAt) {
            pdfConflictCreatedAt.textContent = `مضاف ${new Date(conflictQuestion.created_at).toLocaleString("ar-SA")}`;
        }
        if (pdfConflictSkipButton) {
            pdfConflictSkipButton.textContent = "تخطَّ هذا السؤال";
        }
        if (pdfConflictReplaceButton) {
            pdfConflictReplaceButton.textContent = "استبدل السؤال الحالي";
        }
        pdfConflictNote.textContent = "يعرض لك النظام السؤال الحالي بهذا الرقم حتى تقرر التخطي أو الاستبدال.";
    } else {
        pdfConflictClipboardWrapper?.classList.remove("hidden");
        if (pdfConflictClipboardText) {
            pdfConflictClipboardText.value = detail.clipboard_text;
        }
        const copied = await copyTextToClipboard(detail.clipboard_text);
        if (pdfConflictSkipButton) {
            pdfConflictSkipButton.textContent = "تخطَّ المتعارضات";
        }
        if (pdfConflictReplaceButton) {
            pdfConflictReplaceButton.textContent = "استبدل المتعارضات";
        }
        pdfConflictNote.textContent = copied
            ? "تم نسخ أرقام الأسئلة المتعارضة إلى الحافظة. لن أعرضها واحدةً واحدةً."
            : "تعذر النسخ التلقائي للحافظة، لذلك وضعت الأرقام هنا لتنسخها يدويًا.";
    }

    pdfConflictModal.classList.remove("hidden");
}

function previewImage(): void {
    const file = imageInput?.files?.[0];
    if (!file) {
        clearSelectedImage();
        return;
    }

    setSelectedImage(file);
}

async function handleLogin(event: SubmitEvent): Promise<void> {
    event.preventDefault();

    if (!loginForm) {
        return;
    }

    const formData = new FormData(loginForm);
    const password = String(formData.get("password") ?? "").trim();
    if (!password) {
        setFeedback("أدخل كلمة مرور المشرف.", "error");
        return;
    }

    const response = await fetch("/api/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
    });

    if (!response.ok) {
        setFeedback("فشل تسجيل الدخول. تحقق من كلمة المرور.", "error");
        return;
    }

    setAdminToken(password);
    updateAuthUi(true);
    setFeedback("تم فتح اللوحة.", "success");
    await loadQuestions();
}

async function handlePublish(event: SubmitEvent): Promise<void> {
    event.preventDefault();

    if (!publishForm || !publishButton) {
        return;
    }

    const formData = new FormData(publishForm);
    const rawImage = formData.get("image");
    const image = rawImage instanceof File && rawImage.size > 0 ? rawImage : selectedImageFile;
    const questionNumber = String(formData.get("question_number") ?? "").trim();

    if (!questionNumber) {
        setFeedback("أدخل رقم السؤال قبل الحفظ.", "error");
        return;
    }
    if (!(image instanceof File) || image.size === 0) {
        setFeedback("اختر صورة قبل الحفظ.", "error");
        return;
    }

    formData.set("image", image, image.name);

    publishButton.disabled = true;
    publishButton.textContent = "جارٍ الحفظ...";

    try {
        await apiFetch("/api/questions", {
            method: "POST",
            body: formData,
        });

        resetComposer();
        setFeedback(`تم حفظ السؤال رقم ${questionNumber}.`, "success");
        await loadQuestions();
    } catch (error) {
        const message = error instanceof Error ? error.message : "فشل حفظ السؤال.";
        setFeedback(message, "error");
    } finally {
        publishButton.disabled = false;
        publishButton.textContent = "احفظ السؤال";
    }
}

function buildPdfImportFormData(conflictStrategy?: ConflictStrategy): FormData | null {
    const pdfFile = pdfInput?.files?.[0];
    const answerSheetFile = answerSheetInput?.files?.[0];
    const startQuestionNumber = String(pdfStartQuestionNumberInput?.value ?? "").trim();

    if (!(pdfFile instanceof File) || pdfFile.size === 0) {
        setFeedback("اختر ملف PDF قبل الاستيراد.", "error");
        return null;
    }
    if (!startQuestionNumber) {
        setFeedback("أدخل رقم أول سؤال في ملف PDF.", "error");
        return null;
    }

    const formData = new FormData();
    formData.set("pdf", pdfFile, pdfFile.name);
    formData.set("start_question_number", startQuestionNumber);
    if (answerSheetFile instanceof File && answerSheetFile.size > 0) {
        formData.set("answer_sheet", answerSheetFile, answerSheetFile.name);
    }
    if (conflictStrategy) {
        formData.set("conflict_strategy", conflictStrategy);
    }
    return formData;
}

async function handlePdfImport(conflictStrategy?: ConflictStrategy): Promise<void> {
    if (!pdfImportButton) {
        return;
    }

    const formData = buildPdfImportFormData(conflictStrategy);
    const hasAnswerSheet = answerSheetInput?.files?.[0] instanceof File && (answerSheetInput.files?.[0].size ?? 0) > 0;
    if (!formData) {
        return;
    }

    pdfImportButton.disabled = true;
    pdfImportButton.textContent = "جارٍ استيراد الصفحات...";

    try {
        const response = await apiFetch("/api/questions/import-pdf", {
            method: "POST",
            body: formData,
        });
        const payload = await response.json() as PdfImportResult;
        const failedPages = asNumberArray(payload.failed_pages);
        const draftQuestionNumbers = asNumberArray(payload.draft_question_numbers);
        const skippedExistingQuestionNumbers = asNumberArray(payload.skipped_existing_question_numbers);
        const replacedQuestionNumbers = asNumberArray(payload.replaced_question_numbers);
        const messageParts = [`تم استيراد ${payload.imported_count} صفحة.`];

        if (hasAnswerSheet) {
            messageParts.push(`تم ربط ${payload.ready_count} سؤالا بإجابات ملف Excel.`);
            if (draftQuestionNumbers.length) {
                messageParts.push(`الأسئلة التالية لم أجد لها إجابة فحُفظت كمسودات: ${formatNumberPreview(draftQuestionNumbers)}.`);
            } else if (payload.imported_count > 0) {
                messageParts.push("كل الصفحات المستوردة أصبحت جاهزة مباشرة.");
            }
        } else {
            messageParts.push("تم حفظ الصفحات المستوردة كصور أسئلة.");
        }
        if (skippedExistingQuestionNumbers.length) {
            messageParts.push(`تم تخطي الأرقام الموجودة مسبقًا: ${formatNumberPreview(skippedExistingQuestionNumbers)}.`);
        }
        if (replacedQuestionNumbers.length) {
            messageParts.push(`تم استبدال الأرقام الموجودة مسبقًا: ${formatNumberPreview(replacedQuestionNumbers)}.`);
        }
        if (failedPages.length) {
            messageParts.push(`تعذر تحويل الصفحات: ${formatNumberPreview(failedPages)}.`);
        }

        if (pdfInput) {
            pdfInput.value = "";
        }
        if (answerSheetInput) {
            answerSheetInput.value = "";
        }
        if (pdfStartQuestionNumberInput) {
            pdfStartQuestionNumberInput.value = "";
        }

        updatePdfSelection();
        updateAnswerSheetSelection();
        closePdfConflictModal();
        setFeedback(
            messageParts.join(" "),
            failedPages.length || draftQuestionNumbers.length || skippedExistingQuestionNumbers.length ? "neutral" : "success",
        );
        await loadQuestions();
    } catch (error) {
        if (error instanceof ApiRequestError && error.status === 409 && isQuestionConflictDetail(error.detail)) {
            await openPdfConflictModal(error.detail);
            return;
        }

        const message = error instanceof Error ? error.message : "فشل استيراد ملف PDF.";
        setFeedback(message, "error");
    } finally {
        pdfImportButton.disabled = false;
        pdfImportButton.textContent = "استورد صفحات PDF";
    }
}

async function handleSaveQuestionAnswer(questionId: number, button: HTMLButtonElement): Promise<void> {
    const card = button.closest<HTMLElement>(".question-card");
    const select = card?.querySelector<HTMLSelectElement>(`.draft-answer-select[data-question-id="${questionId}"]`);
    const correctOption = select?.value;

    if (!correctOption || !(correctOption in OPTION_LABELS)) {
        setFeedback("اختر الإجابة الصحيحة أولًا.", "error");
        return;
    }

    const originalText = button.textContent ?? "احفظ الإجابة";
    button.disabled = true;
    button.textContent = "جارٍ الحفظ...";

    try {
        await apiFetch(`/api/questions/${questionId}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ correct_option: correctOption }),
        });

        setFeedback("تم حفظ إجابة السؤال.", "success");
        await loadQuestions();
    } catch (error) {
        const message = error instanceof Error ? error.message : "فشل حفظ الإجابة.";
        setFeedback(message, "error");
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
}

function buildUndoStateFromArchive(payload: ArchiveQuestionsResult): UndoState | null {
    const questionIds = asNumberArray(payload.archived_question_ids);
    const questionNumbers = asNumberArray(payload.archived_question_numbers);
    if (!questionIds.length) {
        return null;
    }

    return {
        questionIds,
        questionNumbers,
    };
}

async function handleDeleteQuestion(questionId: number, button: HTMLButtonElement): Promise<void> {
    const confirmed = window.confirm("هل تريد حذف هذا السؤال من البنك؟ لن يدخل في التوزيع القادم على الطلاب.");
    if (!confirmed) {
        return;
    }

    const originalText = button.textContent ?? "حذف";
    button.disabled = true;
    button.textContent = "جارٍ الحذف...";

    try {
        const response = await apiFetch(`/api/questions/${questionId}`, {
            method: "DELETE",
        });
        const payload = await response.json() as ArchiveQuestionsResult;
        const nextUndoState = buildUndoStateFromArchive(payload);
        setUndoState(nextUndoState);

        const deletedNumber = nextUndoState?.questionNumbers[0] ?? questionId;
        setFeedback(`تم حذف السؤال رقم ${deletedNumber}. يمكنك التراجع الآن.`, "success");
        await loadQuestions();
    } catch (error) {
        const message = error instanceof Error ? error.message : "فشل حذف السؤال.";
        setFeedback(message, "error");
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
}

async function handleDeleteAllQuestions(): Promise<void> {
    const confirmed = window.confirm("هل تريد حذف جميع الأسئلة الحالية من البنك؟ يمكنك التراجع عن آخر عملية حذف فقط.");
    if (!confirmed || !deleteAllButton) {
        return;
    }

    deleteAllButton.disabled = true;
    const originalText = deleteAllButton.textContent ?? "حذف الكل";
    deleteAllButton.textContent = "جارٍ الحذف...";

    try {
        const response = await apiFetch("/api/questions", {
            method: "DELETE",
        });
        const payload = await response.json() as ArchiveQuestionsResult;
        const nextUndoState = buildUndoStateFromArchive(payload);
        setUndoState(nextUndoState);
        setFeedback(`تم حذف ${payload.archived_count} سؤالا. يمكنك التراجع الآن.`, "success");
        await loadQuestions();
    } catch (error) {
        const message = error instanceof Error ? error.message : "فشل حذف جميع الأسئلة.";
        setFeedback(message, "error");
    } finally {
        deleteAllButton.disabled = false;
        deleteAllButton.textContent = originalText;
    }
}

async function handleUndoDelete(): Promise<void> {
    if (!undoState?.questionIds.length || !undoDeleteButton) {
        return;
    }

    undoDeleteButton.disabled = true;
    const originalText = undoDeleteButton.textContent ?? "تراجع";
    undoDeleteButton.textContent = "جارٍ التراجع...";

    try {
        const response = await apiFetch("/api/questions/restore", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ question_ids: undoState.questionIds }),
        });
        const payload = await response.json() as RestoreQuestionsResult;
        setUndoState(null);
        setFeedback(`تمت إعادة ${payload.restored_count} سؤالا.`, "success");
        await loadQuestions();
    } catch (error) {
        const message = error instanceof Error ? error.message : "فشل التراجع عن الحذف.";
        setFeedback(message, "error");
    } finally {
        undoDeleteButton.disabled = false;
        undoDeleteButton.textContent = originalText;
    }
}

async function boot(): Promise<void> {
    undoState = readUndoState();
    updateUndoButtonVisibility();

    const token = getAdminToken();
    if (!token) {
        updateAuthUi(false);
        syncQuestionActions(false);
        return;
    }

    try {
        await loadQuestions();
        updateAuthUi(true);
        setFeedback("جاهز لإضافة سؤال جديد.");
    } catch {
        clearAdminToken();
        updateAuthUi(false);
    }
}

loginForm?.addEventListener("submit", (event) => {
    void handleLogin(event);
});

publishForm?.addEventListener("submit", (event) => {
    void handlePublish(event);
});

questionsList?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
        return;
    }

    const button = target.closest<HTMLButtonElement>("button[data-action]");
    if (!button) {
        return;
    }

    const questionId = Number(button.dataset.questionId);
    if (!Number.isFinite(questionId) || questionId <= 0) {
        return;
    }

    if (button.dataset.action === "delete-question") {
        void handleDeleteQuestion(questionId, button);
        return;
    }

    if (button.dataset.action === "save-question-answer") {
        void handleSaveQuestionAnswer(questionId, button);
    }
});

imageInput?.addEventListener("change", previewImage);
pdfInput?.addEventListener("change", updatePdfSelection);
answerSheetInput?.addEventListener("change", updateAnswerSheetSelection);

pasteImageButton?.addEventListener("click", () => {
    void pasteImageFromClipboard();
});

pdfImportButton?.addEventListener("click", () => {
    void handlePdfImport();
});

deleteAllButton?.addEventListener("click", () => {
    void handleDeleteAllQuestions();
});

undoDeleteButton?.addEventListener("click", () => {
    void handleUndoDelete();
});

pdfConflictSkipButton?.addEventListener("click", () => {
    closePdfConflictModal();
    void handlePdfImport("skip");
});

pdfConflictReplaceButton?.addEventListener("click", () => {
    closePdfConflictModal();
    void handlePdfImport("replace");
});

pdfConflictCancelButton?.addEventListener("click", () => {
    closePdfConflictModal();
});

document.addEventListener("paste", (event) => {
    const file = extractClipboardImage(event.clipboardData);
    if (!file) {
        return;
    }

    event.preventDefault();
    setSelectedImage(file);
    setFeedback("تم لصق الصورة من الحافظة.", "success");
});

logoutButton?.addEventListener("click", () => {
    clearAdminToken();
    closePdfConflictModal();
    updateAuthUi(false);
    resetComposer();
    setFeedback("تم تسجيل الخروج.");
});

void boot();