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
    }

    addTimeout(timeout) {
        this.timeouts.push(timeout);
    }
}

const bookState = new BookState();

// =============================================
// PAGE MANAGEMENT
// =============================================
class PageManager {
    constructor() {
        this.pages = Array.from(document.querySelectorAll('.book-page.page-right'));
        this.totalPages = this.pages.length;
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
    }

    setZIndex(page, zIndex) {
        if (page) {
            page.style.zIndex = zIndex;
        }
    }

    turnPage(page) {
        page?.classList.add('turn');
    }

    unturnPage(page) {
        page?.classList.remove('turn');
    }

    isPageTurned(page) {
        return page ? page.classList.contains('turn') : false;
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
        pages.forEach(page => pageManager.turnPage(page));

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
        this.imageEl = this.modal.querySelector('.modal-image');
        this.metaRow = this.modal.querySelector('.modal-meta-line');
        this.metaLabelEl = this.modal.querySelector('.modal-meta-label');
        this.metaValueEl = this.modal.querySelector('.modal-meta-value');
        this.descEl = this.modal.querySelector('.modal-desc');
        this.liveBtn = this.modal.querySelector('.modal-live');
        this.codeBtn = this.modal.querySelector('.modal-code');
        this.actions = this.modal.querySelector('.modal-actions');
        this.activeTrigger = null;
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
            });
        });
    }

    openFromElement(element) {
        if (!this.modal) return;

        this.activeTrigger = element;
        const dataset = element.dataset || {};

        const title = dataset.title || element.getAttribute('aria-label') || 'Preview';
        this.titleEl.textContent = title;

        const imageSrc = dataset.img || element.querySelector('img')?.getAttribute('src');
        if (imageSrc) {
            this.imageEl.src = imageSrc;
            this.imageEl.alt = title;
            this.imageEl.hidden = false;
        } else {
            this.imageEl.hidden = true;
        }

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
            this.descEl.textContent = description;
            this.descEl.hidden = false;
        } else {
            this.descEl.textContent = '';
            this.descEl.hidden = true;
        }

        this.setupLink(this.liveBtn, dataset.live, dataset.liveLabel || 'Live Preview');
        this.setupLink(this.codeBtn, dataset.code, dataset.codeLabel || 'Source Code');

        const hasLinks = [this.liveBtn, this.codeBtn].some(btn => btn && !btn.hasAttribute('hidden'));
        this.actions.hidden = !hasLinks;

        this.modal.hidden = false;
        this.modal.setAttribute('aria-hidden', 'false');
        requestAnimationFrame(() => {
            this.modal.classList.add('open');
        });

        document.body.classList.add('modal-open');
        document.addEventListener('keydown', this.boundHandleKeydown);
        this.closeBtn?.focus();
    }

    setupLink(link, href, label) {
        if (!link) return;
        const value = typeof href === 'string' ? href.trim() : '';
        const isValid = value && value !== '#';
        if (isValid) {
            link.href = value;
            link.textContent = label;
            link.removeAttribute('hidden');
        } else {
            link.setAttribute('hidden', '');
        }
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

// =============================================
// INITIALIZATION
// =============================================
function initializeBook() {
    pageManager.setInitialStack();
    new ButtonHandler();

    const openingAnimation = new OpeningAnimation();
    openingAnimation.start();

    const galleryModal = new GalleryModal();
    galleryModal.registerTriggers(['.portfolio-item', '.certificate-item']);

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
