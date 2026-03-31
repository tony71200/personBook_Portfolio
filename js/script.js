// =============================================
// CONFIGURATION - Dễ dàng điều chỉnh
// =============================================
const CONFIG = {
    ANIMATION_DURATION: 1000,        // Thời gian animation (ms)
    PAGE_TURN_DELAY: 200,            // Delay giữa các trang (ms)
    COVER_OPEN_DELAY: 2100,          // Delay mở bìa (ms)
    COVER_HIDE_DELAY: 2800,          // Delay ẩn bìa (ms)
    BASE_Z_INDEX: 10,                // Z-index cơ bản cho trang
    CONTACT_Z_INDEX: 50,             // Z-index khi click Contact Me
    COVER_Z_INDEX: 100               // Z-index của bìa
};

// =============================================
// STATE MANAGEMENT
// =============================================
class BookState {
    constructor() {
        this.isAnimating = false;
        this.timeouts = [];
    }

    setAnimating(value) {
        this.isAnimating = value;
        const book = document.querySelector('.book');
        if (!book) return;
        book.classList.toggle('book-loading', Boolean(value));
    }

    clearTimeouts() {
        this.timeouts.forEach(timeout => clearTimeout(timeout));
        this.timeouts = [];
        if (typeof pageManager !== 'undefined' && typeof pageManager.clearFaceTimers === 'function') {
            pageManager.clearFaceTimers();
        }
        if (typeof pageManager !== 'undefined' && typeof pageManager.clearMidTurnTimers === 'function') {
            pageManager.clearMidTurnTimers();
        }
    }

    addTimeout(timeout) {
        this.timeouts.push(timeout);
    }
}

const bookState = new BookState();

let galleryModal = null;

// =============================================
// PAGE MANAGEMENT
// =============================================
class PageManager {
    constructor() {
        this.pages = Array.from(document.querySelectorAll('.book-page.page-right'));
        this.totalPages = this.pages.length;
        this.faceTimers = new Map();
        this.midTurnTimers = new Map();
        this.syncAllFaces(true);
    }

    getPageIndex(page) {
        return this.pages.indexOf(page);
    }

    getAllPages() {
        return this.pages;
    }

    getPageById(id) {
        if (!id) return null;
        return this.pages.find(page => page.id === id) || document.getElementById(id);
    }

    getIndexOfPageContaining(selector) {
        if (!selector) return -1;
        return this.pages.findIndex(p => p.querySelector(selector));
    }

    countPagesUntil(selector) {
        const idx = this.getIndexOfPageContaining(selector);
        return idx; // -1 nếu không có, còn lại chính là số trang trước nó
    }

    getTotalPages() {
        return this.totalPages;
    }

    getRightStackZ(index) {
        return CONFIG.BASE_Z_INDEX + (this.totalPages - index);
    }

    getLeftStackZ(order) {
        return CONFIG.BASE_Z_INDEX + this.totalPages + order;
    }

    countTurnedPages() {
        return this.pages.reduce((count, page) => count + (this.isPageTurned(page) ? 1 : 0), 0);
    }

    setInitialStack() {
        this.pages.forEach((page, index) => {
            this.setZIndex(page, this.getRightStackZ(index));
        });
        this.syncAllFaces(true);
    }

    setZIndex(page, zIndex) {
        if (page) {
            page.style.zIndex = zIndex;
        }
    }

    turnPage(page) {
        if (!page) return;
        this.prepareFaceVisibility(page, true);
        page.classList.add('turn');
        this.scheduleFaceFinalization(page, true);
    }

    unturnPage(page) {
        if (!page) return;
        this.prepareFaceVisibility(page, false);
        page.classList.remove('turn');
        this.scheduleFaceFinalization(page, false);
    }

    isPageTurned(page) {
        return page ? page.classList.contains('turn') : false;
    }

    getPageFaces(page) {
        if (!page) {
            return { front: null, back: null };
        }
        return {
            front: page.querySelector('.page-front'),
            back: page.querySelector('.page-back')
        };
    }

    setFaceVisibility(face, visible) {
        if (!face) return;
        face.classList.toggle('page-face-hidden', !visible);
        if (visible) {
            face.removeAttribute('aria-hidden');
        } else {
            face.setAttribute('aria-hidden', 'true');
        }
    }

    prepareFaceVisibility(page, turningToLeft) {
        const { front, back } = this.getPageFaces(page);
        this.clearFaceTimer(page);
        this.clearMidTurnTimer(page);

        const faceCurrentlyVisible = turningToLeft ? front : back;
        const faceToReveal = turningToLeft ? back : front;

        this.setFaceVisibility(faceCurrentlyVisible, true);
        this.setFaceVisibility(faceToReveal, false);
        this.scheduleMidTurnVisibility(page, turningToLeft);
    }

    finalizeFaceVisibility(page, isTurned) {
        const { front, back } = this.getPageFaces(page);
        if (isTurned) {
            this.setFaceVisibility(front, false);
            this.setFaceVisibility(back, true);
        } else {
            this.setFaceVisibility(front, true);
            this.setFaceVisibility(back, false);
        }
    }

    scheduleFaceFinalization(page, isTurned) {
        this.clearFaceTimer(page);
        const timeout = setTimeout(() => {
            this.finalizeFaceVisibility(page, isTurned);
            this.faceTimers.delete(page);
        }, CONFIG.ANIMATION_DURATION);
        this.faceTimers.set(page, timeout);
        bookState.addTimeout(timeout);
    }

    scheduleMidTurnVisibility(page, turningToLeft) {
        const { front, back } = this.getPageFaces(page);
        const faceToReveal = turningToLeft ? back : front;
        const faceToHide = turningToLeft ? front : back;
        const halfDuration = CONFIG.ANIMATION_DURATION / 2;

        const revealTimeout = setTimeout(() => {
            this.setFaceVisibility(faceToReveal, true);
        }, Math.max(0, halfDuration - 40));

        const hideTimeout = setTimeout(() => {
            this.setFaceVisibility(faceToHide, false);
        }, halfDuration + 40);

        this.midTurnTimers.set(page, { revealTimeout, hideTimeout });
        bookState.addTimeout(revealTimeout);
        bookState.addTimeout(hideTimeout);
    }

    clearFaceTimer(page) {
        if (!page) return;
        const timeout = this.faceTimers.get(page);
        if (timeout) {
            clearTimeout(timeout);
            this.faceTimers.delete(page);
        }
    }

    clearMidTurnTimer(page) {
        if (!page) return;
        const timers = this.midTurnTimers.get(page);
        if (!timers) return;

        const { revealTimeout, hideTimeout } = timers;
        if (revealTimeout) clearTimeout(revealTimeout);
        if (hideTimeout) clearTimeout(hideTimeout);
        this.midTurnTimers.delete(page);
    }

    clearFaceTimers() {
        this.faceTimers.forEach(timeout => clearTimeout(timeout));
        this.faceTimers.clear();
    }

    clearMidTurnTimers() {
        this.midTurnTimers.forEach(({ revealTimeout, hideTimeout }) => {
            if (revealTimeout) clearTimeout(revealTimeout);
            if (hideTimeout) clearTimeout(hideTimeout);
        });
        this.midTurnTimers.clear();
    }

    syncPageFaces(page, immediate = false) {
        if (!page) return;
        this.clearFaceTimer(page);
        this.clearMidTurnTimer(page);
        if (immediate) {
            this.finalizeFaceVisibility(page, this.isPageTurned(page));
        } else {
            this.scheduleFaceFinalization(page, this.isPageTurned(page));
        }
    }

    syncAllFaces(immediate = false) {
        this.pages.forEach(page => this.syncPageFaces(page, immediate));
    }
}

const pageManager = new PageManager();

// =============================================
// ANIMATION HELPERS
// =============================================
class AnimationHelper {
    static async wait(ms) {
        return new Promise(resolve => {
            const timeout = setTimeout(resolve, ms);
            bookState.addTimeout(timeout);
        });
    }

    static setZIndexWithDelay(element, zIndex, delay) {
        const timeout = setTimeout(() => {
            pageManager.setZIndex(element, zIndex);
        }, delay);
        bookState.addTimeout(timeout);
    }
}

// =============================================
// BUTTON HANDLERS
// =============================================
class ButtonHandler {
    constructor() {
        this.pageTurnButtons = document.querySelectorAll('.nextprev-btn');
        this.contactMeBtn = document.querySelector('.btn.contact-me');
        this.backProfileBtn = document.querySelector('.back-profile');
        this.register();
    }

    register() {
        this.pageTurnButtons.forEach(btn => {
            btn.addEventListener('click', () => this.handlePageTurnClick(btn));
        });

        if (this.contactMeBtn) {
            this.contactMeBtn.addEventListener('click', (event) => {
                event.preventDefault();
                this.handleContactMeClick();
            });
        }

        if (this.backProfileBtn) {
            this.backProfileBtn.addEventListener('click', (event) => {
                event.preventDefault();
                this.handleBackProfileClick();
            });
        }
    }

    handlePageTurnClick(btn) {
        if (bookState.isAnimating) return;

        const pageId = btn.getAttribute('data-page');
        const pageTurn = pageManager.getPageById(pageId);
        if (!pageTurn) return;

        bookState.setAnimating(true);

        const pages = pageManager.getAllPages();
        const pageIndex = pages.indexOf(pageTurn);
        const turnedCount = pageManager.countTurnedPages();

        if (pageManager.isPageTurned(pageTurn)) {
            pageManager.unturnPage(pageTurn);
            AnimationHelper.setZIndexWithDelay(
                pageTurn,
                pageManager.getRightStackZ(pageIndex),
                CONFIG.ANIMATION_DURATION / 2
            );
        } else {
            const order = turnedCount + 1;
            pageManager.turnPage(pageTurn);
            AnimationHelper.setZIndexWithDelay(
                pageTurn,
                pageManager.getLeftStackZ(order),
                CONFIG.ANIMATION_DURATION / 2
            );
        }

        const timeout = setTimeout(() => {
            bookState.setAnimating(false);
        }, CONFIG.ANIMATION_DURATION);
        bookState.addTimeout(timeout);
    }

    async handleContactMeClick() {
        if (bookState.isAnimating) return;

        bookState.setAnimating(true);
        bookState.clearTimeouts();

        const pages = pageManager.getAllPages();

        // let len_id = pageManager.countPagesUntil(".contactbox");
        // console.log("Page name: ", len_id);

        for (let index = 0; index < pages.length - 1; index++) {
            await AnimationHelper.wait((index + 1) * CONFIG.PAGE_TURN_DELAY + 100);
            const page = pages[index];
            pageManager.turnPage(page);
            AnimationHelper.setZIndexWithDelay(
                page,
                CONFIG.CONTACT_Z_INDEX + index,
                CONFIG.ANIMATION_DURATION / 2
            );
        }

        await AnimationHelper.wait(CONFIG.ANIMATION_DURATION);
        bookState.setAnimating(false);
    }

    async handleBackProfileClick() {
        if (bookState.isAnimating) return;

        bookState.setAnimating(true);
        bookState.clearTimeouts();

        const reversedPages = [...pageManager.getAllPages()].reverse();

        for (let index = 0; index < reversedPages.length; index++) {
            await AnimationHelper.wait((index + 1) * CONFIG.PAGE_TURN_DELAY + 100);
            const page = reversedPages[index];
            pageManager.unturnPage(page);
            const originalIndex = pageManager.getPageIndex(page);
            AnimationHelper.setZIndexWithDelay(
                page,
                pageManager.getRightStackZ(originalIndex),
                CONFIG.ANIMATION_DURATION / 2
            );
        }

        await AnimationHelper.wait(CONFIG.ANIMATION_DURATION);
        bookState.setAnimating(false);
    }
}

// =============================================
// OPENING ANIMATION
// =============================================
class OpeningAnimation {
    constructor() {
        this.coverRight = document.querySelector('.cover.cover-right');
    }

    async start() {
        const pages = pageManager.getAllPages();
        if (!pages.length) return;

        bookState.setAnimating(true);
        bookState.clearTimeouts();

        // chuẩn hóa vị trí z-index và trạng thái ban đầu
        pageManager.setInitialStack();
        pages.forEach((page, index) => {
            pageManager.turnPage(page);
            pageManager.setZIndex(page, pageManager.getLeftStackZ(index + 1));
        });

        await AnimationHelper.wait(CONFIG.COVER_OPEN_DELAY);
        if (this.coverRight) {
            this.coverRight.classList.add('turn');
            this.coverRight.style.zIndex = CONFIG.COVER_Z_INDEX;
        }

        await AnimationHelper.wait(CONFIG.COVER_HIDE_DELAY - CONFIG.COVER_OPEN_DELAY);
        if (this.coverRight) {
            this.coverRight.style.zIndex = -1;
        }

        for (let index = pages.length - 1; index >= 0; index--) {
            await AnimationHelper.wait(CONFIG.PAGE_TURN_DELAY);
            const page = pages[index];
            pageManager.unturnPage(page);
            AnimationHelper.setZIndexWithDelay(
                page,
                pageManager.getRightStackZ(index),
                CONFIG.ANIMATION_DURATION / 2
            );
        }

        await AnimationHelper.wait(CONFIG.ANIMATION_DURATION);
        bookState.setAnimating(false);
    }
}

// =============================================
// PORTFOLIO & CERTIFICATE MODAL
// =============================================
class GalleryModal {
    constructor() {
        this.modal = document.querySelector('.portfolio-modal');
        if (!this.modal) return;

        this.closeBtn = this.modal.querySelector('.modal-close');
        this.titleEl = this.modal.querySelector('.modal-title');
        this.mainContainer = this.modal.querySelector('[data-modal-main]');
        this.thumbsContainer = this.modal.querySelector('[data-modal-thumbs]');
        this.metaRow = this.modal.querySelector('.modal-meta-line');
        this.metaLabelEl = this.modal.querySelector('.modal-meta-label');
        this.metaValueEl = this.modal.querySelector('.modal-meta-value');
        this.descEl = this.modal.querySelector('.modal-desc');
        this.activeTrigger = null;
        this.currentGallery = [];
        this.activeIndex = 0;
        this.boundHandleKeydown = this.handleKeydown.bind(this);

        this.registerBaseEvents();
    }

    registerBaseEvents() {
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.hide());
        }

        this.modal.addEventListener('click', (event) => {
            if (event.target === this.modal) {
                this.hide();
            }
        });
    }

    registerTriggers(selectors = []) {
        if (!this.modal) return;

        selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(element => {
                if (element.dataset.modalBound === 'true') return;
                if (!element.hasAttribute('tabindex')) {
                    element.setAttribute('tabindex', '0');
                }
                if (!element.hasAttribute('role')) {
                    element.setAttribute('role', 'button');
                }
                element.addEventListener('click', () => this.openFromElement(element));
                element.addEventListener('keydown', (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        this.openFromElement(element);
                    }
                });
                element.dataset.modalBound = 'true';
            });
        });
    }

    openFromElement(element) {
        if (!this.modal) return;

        this.activeTrigger = element;
        const dataset = element.dataset || {};

        const title = dataset.title || element.getAttribute('aria-label') || 'Preview';
        this.titleEl.textContent = title;

        const gallery = this.parseMediaDataset(dataset.media, element, title);
        this.renderGallery(gallery);

        const metaLabel = dataset.metaLabel || (dataset.tech ? 'Tech' : 'Details');
        const metaValue = dataset.meta || dataset.tech || '';
        if (metaValue) {
            this.metaLabelEl.textContent = metaLabel;
            this.metaValueEl.textContent = metaValue;
            this.metaRow.hidden = false;
        } else {
            this.metaRow.hidden = true;
        }

        const description = dataset.desc || '';
        if (description) {
            this.descEl.innerHTML = description;
            this.descEl.hidden = false;
        } else {
            this.descEl.innerHTML = '';
            this.descEl.hidden = true;
        }

        this.modal.hidden = false;
        this.modal.setAttribute('aria-hidden', 'false');
        requestAnimationFrame(() => {
            this.modal.classList.add('open');
        });

        document.body.classList.add('modal-open');
        document.addEventListener('keydown', this.boundHandleKeydown);
        this.closeBtn?.focus();
    }

    parseMediaDataset(mediaString = '[]', element, title) {
        let parsed = [];
        if (mediaString) {
            try {
                parsed = JSON.parse(mediaString);
            } catch (error) {
                console.warn('Unable to parse media dataset', error);
            }
        }
        if (!Array.isArray(parsed) || !parsed.length) {
            const fallbackSrc = element.querySelector('img')?.getAttribute('src');
            if (fallbackSrc) {
                parsed = [{ type: 'image', src: fallbackSrc, alt: title }];
            } else {
                parsed = [];
            }
        }
        return parsed;
    }

    renderGallery(gallery = []) {
        this.currentGallery = Array.isArray(gallery) ? gallery : [];
        this.activeIndex = 0;

        if (this.mainContainer) {
            this.mainContainer.innerHTML = '';
        }
        if (this.thumbsContainer) {
            this.thumbsContainer.innerHTML = '';
        }

        if (!this.currentGallery.length) {
            return;
        }

        this.setActiveMedia(0);
        if (this.thumbsContainer) {
            this.currentGallery.forEach((media, index) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'modal-thumb';
                button.setAttribute('aria-label', media.alt || `Media ${index + 1}`);
                if (index === this.activeIndex) {
                    button.classList.add('is-active');
                }
                const preview = this.createMediaElement(media, true);
                if (preview) {
                    button.appendChild(preview);
                }
                button.addEventListener('click', () => this.setActiveMedia(index));
                this.thumbsContainer.appendChild(button);
            });

            this.thumbsContainer.hidden = this.currentGallery.length <= 1;
        }
    }

    setActiveMedia(index) {
        if (!this.mainContainer || !this.currentGallery.length) return;
        const boundedIndex = Math.max(0, Math.min(index, this.currentGallery.length - 1));
        this.activeIndex = boundedIndex;
        this.mainContainer.innerHTML = '';
        const media = this.currentGallery[boundedIndex];
        const node = this.createMediaElement(media, false);
        if (node) {
            this.mainContainer.appendChild(node);
        }
        if (this.thumbsContainer) {
            Array.from(this.thumbsContainer.children).forEach((child, idx) => {
                child.classList.toggle('is-active', idx === boundedIndex);
            });
        }
    }

    createMediaElement(media, isThumb = false) {
        if (!media || !media.src) return null;
        if (media.type === 'video') {
            const video = document.createElement('video');
            video.src = media.src;
            video.controls = !isThumb;
            video.loop = !isThumb;
            video.muted = isThumb;
            video.playsInline = true;
            video.setAttribute('aria-label', media.alt || 'Video preview');
            if (isThumb) {
                video.removeAttribute('controls');
            }
            return video;
        }
        const img = document.createElement('img');
        img.src = media.src;
        img.alt = media.alt || 'Image preview';
        return img;
    }

    hide() {
        if (!this.modal || this.modal.hidden) return;

        this.modal.classList.remove('open');
        this.modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');
        document.removeEventListener('keydown', this.boundHandleKeydown);

        const finishClose = () => {
            this.modal.hidden = true;
            if (this.activeTrigger) {
                this.activeTrigger.focus();
                this.activeTrigger = null;
            }
        };

        const { transitionDuration, transitionDelay } = getComputedStyle(this.modal);
        const totalDuration = parseFloat(transitionDuration) + parseFloat(transitionDelay);
        if (totalDuration > 0) {
            this.modal.addEventListener('transitionend', finishClose, { once: true });
        } else {
            finishClose();
        }
    }

    handleKeydown(event) {
        if (event.key === 'Escape') {
            this.hide();
        }
    }
}

function setupChatbox() {
    const chatBox = document.querySelector('[data-chatbot]');
    const history = chatBox?.querySelector('[data-chat-history]');
    const form = chatBox?.querySelector('[data-chat-form]');
    const input = chatBox?.querySelector('[data-chat-input]');
    const quotaDisplay = chatBox?.querySelector('[data-chat-quota]');
    const statusDot = document.querySelector('[data-api-status-dot]');
    if (!chatBox || !history || !form || !input || !quotaDisplay || !statusDot) return;
    if (form.dataset.bound === 'true') return;
    form.dataset.bound = 'true';

    const QUOTA_KEY = 'gemini_quota';
    const SESSION_KEY = 'chat_session_history';
    const RPM_LIMIT = 15;
    const CHAT_PROXY_ENDPOINT = '/api/chat';
    const DATABASE_URL = './data/database.json';
    const SYSTEM_INSTRUCTION = `Bạn là Virtual Assistant cho portfolio ứng viên.

PERSONA:
- Luôn xưng là "Em" khi trả lời bằng tiếng Việt.
- Giọng điệu chuyên nghiệp, lịch sự, nhiệt tình.

KNOWLEDGE BOUNDARY:
- Chỉ dùng thông tin từ Context đã truy xuất.
- Nếu thiếu dữ liệu, trả lời: "Dạ, hiện tại em chưa có thông tin chi tiết về phần này trong hồ sơ. Anh/Chị có muốn biết thêm về các dự án Computer Vision của em không?"
- Không trả lời các chủ đề chính trị, tôn giáo hoặc kiến thức ngoài hồ sơ.`;
    const FALLBACK_MESSAGE = 'Dạ, hiện tại em chưa có thông tin chi tiết về phần này trong hồ sơ. Anh/Chị có muốn biết thêm về các dự án Computer Vision của em không?';

    let requestLogs = [];
    let knowledgeBase = [];
    let embeddingAvailable = true;
    let chatAvailable = true;

    const setApiStatus = (isOnline) => {
        statusDot.classList.toggle('api-status-dot--online', Boolean(isOnline));
        statusDot.classList.toggle('api-status-dot--offline', !isOnline);
        statusDot.setAttribute('title', isOnline ? 'API connected' : 'API disconnected');
    };

    const probeApiStatus = async () => {
        try {
            const response = await fetch(CHAT_PROXY_ENDPOINT, { method: 'OPTIONS' });
            const ok = response.status === 204 || response.status === 200;
            setApiStatus(ok);
            if (!ok) {
                embeddingAvailable = false;
                chatAvailable = false;
            }
        } catch {
            setApiStatus(false);
            embeddingAvailable = false;
            chatAvailable = false;
        }
    };

    const cosineSimilarity = (A = [], B = []) => {
        if (!Array.isArray(A) || !Array.isArray(B) || A.length === 0 || A.length !== B.length) return 0;
        const dot = A.reduce((sum, a, i) => sum + a * B[i], 0);
        const magA = Math.sqrt(A.reduce((sum, a) => sum + a * a, 0));
        const magB = Math.sqrt(B.reduce((sum, b) => sum + b * b, 0));
        if (!magA || !magB) return 0;
        return dot / (magA * magB);
    };

    const scrollToBottom = () => {
        history.scrollTop = history.scrollHeight;
    };

    const loadRequestLogs = () => {
        try {
            const parsed = JSON.parse(localStorage.getItem(QUOTA_KEY) || '[]');
            requestLogs = Array.isArray(parsed) ? parsed : [];
        } catch {
            requestLogs = [];
        }
    };

    const persistRequestLogs = () => {
        localStorage.setItem(QUOTA_KEY, JSON.stringify(requestLogs));
    };

    const updateQuotaDisplay = () => {
        const now = Date.now();
        requestLogs = requestLogs.filter(time => now - time < 60000);
        const remaining = Math.max(0, RPM_LIMIT - requestLogs.length);
        quotaDisplay.textContent = `Queries remaining: ${remaining}/${RPM_LIMIT} (RPM)`;
        persistRequestLogs();
        return remaining;
    };

    const consumeQuota = () => {
        requestLogs.push(Date.now());
        updateQuotaDisplay();
    };

    const checkQuota = () => updateQuotaDisplay() > 0;

    const appendMessage = (role, text, shouldPersist = true) => {
        const message = document.createElement('div');
        message.className = `chat-message chat-message--${role}`;
        message.textContent = text;
        history.appendChild(message);
        scrollToBottom();
        if (shouldPersist) {
            persistSession();
        }
        return message;
    };

    const showThinking = () => {
        const thinking = document.createElement('div');
        thinking.className = 'chat-thinking';
        for (let index = 0; index < 3; index++) {
            thinking.appendChild(document.createElement('span'));
        }
        history.appendChild(thinking);
        scrollToBottom();
        return thinking;
    };

    const typeText = (role, text) => new Promise((resolve) => {
        const message = document.createElement('div');
        message.className = `chat-message chat-message--${role}`;
        history.appendChild(message);
        const chars = Array.from(text || '');
        let idx = 0;
        const timer = window.setInterval(() => {
            idx += 1;
            message.textContent = chars.slice(0, idx).join('');
            scrollToBottom();
            if (idx >= chars.length) {
                clearInterval(timer);
                persistSession();
                resolve(message);
            }
        }, 10);
    });

    const persistSession = () => {
        const records = Array.from(history.querySelectorAll('.chat-message')).map((item) => ({
            role: item.classList.contains('chat-message--user') ? 'user' : 'bot',
            text: item.textContent || ''
        }));
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(records));
    };

    const restoreSession = () => {
        try {
            const records = JSON.parse(sessionStorage.getItem(SESSION_KEY) || '[]');
            if (Array.isArray(records) && records.length) {
                records.forEach((item) => appendMessage(item.role === 'user' ? 'user' : 'bot', item.text, false));
                return;
            }
        } catch {
            // ignore malformed session data
        }
        appendMessage('bot', 'Xin chào Anh/Chị, em có thể hỗ trợ giới thiệu nhanh về kỹ năng và dự án của em.', false);
        persistSession();
    };

    const loadDatabase = async () => {
        const isFileProtocol = window.location.protocol === 'file:';
        if (isFileProtocol && Array.isArray(window.__CHATBOT_DATABASE__)) {
            knowledgeBase = window.__CHATBOT_DATABASE__;
            console.info('Loaded chatbot database from inline fallback (file:// mode).');
            return;
        }

        try {
            const response = await fetch(DATABASE_URL, { cache: 'no-cache' });
            if (!response.ok) throw new Error(`Không tải được database: ${response.status}`);
            const payload = await response.json();
            knowledgeBase = Array.isArray(payload) ? payload : [];
        } catch (error) {
            console.error('Load database.json thất bại', error);
            if (isFileProtocol) {
                console.error('Tip: file:// chặn fetch JSON. Hãy mở qua HTTP hoặc nạp ./data/database.local.js trước js/script.js.');
            }
            knowledgeBase = [];
        }
    };

    const keywordSearch = (query, topK = 3) => {
        const terms = (query || '').toLowerCase().split(/\s+/).filter(Boolean);
        if (!terms.length) return [];

        return knowledgeBase
            .map(item => {
                const text = `${item.id} ${item.category} ${item.content}`.toLowerCase();
                const matches = terms.reduce((sum, term) => sum + (text.includes(term) ? 1 : 0), 0);
                const score = matches / terms.length;
                return { ...item, score };
            })
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
    };

    const getEmbedding = async (text) => {
        const response = await fetch(CHAT_PROXY_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'embed', text })
        });
        if (!response.ok) {
            if (response.status === 404 || response.status === 405 || response.status === 501) {
                embeddingAvailable = false;
                setApiStatus(false);
            }
            throw new Error(`Embedding API lỗi: ${response.status}`);
        }
        setApiStatus(true);
        const payload = await response.json();
        return Array.isArray(payload?.embedding) ? payload.embedding : [];
    };

    const semanticSearch = async (query, topK = 3) => {
        if (!knowledgeBase.length) return [];

        if (!embeddingAvailable) {
            return keywordSearch(query, topK);
        }

        try {
            const queryVector = await getEmbedding(query);
            if (!queryVector.length) return keywordSearch(query, topK);

            const vectorResults = knowledgeBase
                .filter(item => Array.isArray(item.vector) && item.vector.length === queryVector.length)
                .map(item => ({ ...item, score: cosineSimilarity(queryVector, item.vector) }))
                .sort((a, b) => b.score - a.score)
                .slice(0, topK)
                .filter(item => item.score > 0.3);

            return vectorResults.length ? vectorResults : keywordSearch(query, topK);
        } catch (error) {
            if (String(error?.message || '').includes('Embedding API lỗi')) {
                return keywordSearch(query, topK);
            }
            throw error;
        }
    };

    const askChatbot = async (question, contexts) => {
        if (!chatAvailable) {
            return contexts.length ? contexts[0].content : FALLBACK_MESSAGE;
        }

        const response = await fetch(CHAT_PROXY_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mode: 'chat',
                message: question,
                systemInstruction: SYSTEM_INSTRUCTION,
                context: contexts.map(item => `[${item.id}] ${item.content}`).join('\n')
            })
        });
        if (!response.ok) {
            if (response.status === 404 || response.status === 405 || response.status === 501) {
                chatAvailable = false;
                setApiStatus(false);
                return contexts.length ? contexts[0].content : FALLBACK_MESSAGE;
            }
            throw new Error(`Chat API lỗi: ${response.status}`);
        }
        setApiStatus(true);
        const payload = await response.json();
        return (payload?.text || '').trim();
    };

    let busy = false;
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const value = input.value.trim();
        if (!value || busy) return;

        if (!checkQuota()) {
            appendMessage('bot', 'Dạ, hiện em đã chạm giới hạn 15 request/phút. Anh/Chị chờ giúp em khoảng 1 phút nhé.');
            return;
        }

        busy = true;
        input.value = '';
        appendMessage('user', value);
        consumeQuota();

        const thinkingElement = showThinking();
        try {
            const contexts = await semanticSearch(value, 3);
            if (!contexts.length) {
                thinkingElement.remove();
                await typeText('bot', FALLBACK_MESSAGE);
            } else {
                const answer = await askChatbot(value, contexts);
                thinkingElement.remove();
                await typeText('bot', answer || FALLBACK_MESSAGE);
            }
        } catch (error) {
            if (!String(error?.message || '').includes('Embedding API lỗi: 405')) {
                console.error('Chatbot error', error);
            }
            thinkingElement.remove();
            await typeText('bot', 'Dạ, hiện tại hệ thống đang bận. Anh/Chị thử lại sau ít phút giúp em nhé.');
        } finally {
            busy = false;
            input.focus();
        }
    });

    loadRequestLogs();
    updateQuotaDisplay();
    restoreSession();
    loadDatabase();
    probeApiStatus();
}

// =============================================
// INITIALIZATION
// =============================================
function initializeBook() {
    pageManager.setInitialStack();
    new ButtonHandler();

    const openingAnimation = new OpeningAnimation();
    openingAnimation.start();

    galleryModal = new GalleryModal();
    const defaultGallerySelectors = ['.portfolio-item', '.certificate-item'];
    const registerGallerySelectors = (selectors = defaultGallerySelectors) => {
        if (!Array.isArray(selectors) || !selectors.length) {
            selectors = defaultGallerySelectors;
        }
        galleryModal?.registerTriggers(selectors);
    };
    registerGallerySelectors();
    document.addEventListener('portfolio-ready', (event) => {
        registerGallerySelectors(event?.detail?.selectors);
    });

    setupChatbox();

    const contactForm = document.querySelector('.contact-box form');
    if (contactForm) {
        contactForm.addEventListener('submit', (event) => {
            event.preventDefault();
            alert('Form submitted! (This is a demo)');
        });
    }

    document.querySelectorAll('a[href="#"]').forEach(link => {
        if (!link.classList.contains('contact-me') && !link.classList.contains('back-profile')) {
            link.addEventListener('click', (event) => {
                event.preventDefault();
            });
        }
    });
}

// =============================================
// START APPLICATION
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    initializeBook();
    console.info('📖 Portfolio Book Initialized');
});

window.addEventListener('beforeunload', () => {
    bookState.clearTimeouts();
});
