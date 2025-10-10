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

        for (let index = 0; index < pages.length; index++) {
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
    if (!chatBox || !history || !form || !input) return;
    if (form.dataset.bound === 'true') return;
    form.dataset.bound = 'true';

    const scrollToBottom = () => {
        history.scrollTop = history.scrollHeight;
    };

    const appendMessage = (role, text) => {
        const message = document.createElement('div');
        message.className = `chat-message chat-message--${role}`;
        message.textContent = text;
        history.appendChild(message);
        scrollToBottom();
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

    let pendingResponse = null;

    const clearPending = () => {
        if (!pendingResponse) return;
        clearTimeout(pendingResponse.timer);
        pendingResponse.element?.remove();
        pendingResponse = null;
    };

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const value = input.value.trim();
        if (!value) return;

        appendMessage('user', value);
        input.value = '';
        input.focus();

        clearPending();
        const thinkingElement = showThinking();
        pendingResponse = {
            element: thinkingElement,
            timer: window.setTimeout(() => {
                thinkingElement.remove();
                appendMessage('bot', 'Cảm ơn bạn đã quan tâm. Mục này sẽ được phát triển trong tương lai');
                pendingResponse = null;
            }, 3000)
        };
    });
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
