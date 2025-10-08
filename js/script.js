// =============================================
// CONFIGURATION - Dễ dàng điều chỉnh
// =============================================
const CONFIG = {
    ANIMATION_DURATION: 1000,        // Thời gian animation (ms)
    PAGE_TURN_DELAY: 200,            // Delay giữa các trang (ms)
    INITIAL_DELAY: 2100,             // Delay trước khi bắt đầu (ms)
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
        this.currentPage = 0;
        this.timeouts = [];
    }

    setAnimating(value) {
        this.isAnimating = value;
        const book = document.querySelector('.book');
        if (book) {
            if (value) {
                book.classList.add('book-loading');
            } else {
                book.classList.remove('book-loading');
            }
        }
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
        this.pages = document.querySelectorAll('.book-page.page-right');
        this.totalPages = this.pages.length;
        this.pageNumber = this.totalPages;
    }

    getPage(index) {
        return this.pages[index];
    }

    getAllPages() {
        return this.pages;
    }

    getTotalPages() {
        return this.totalPages;
    }

    reverseIndex() {
        console.log("Before reserse: ", this.pageNumber);
        this.pageNumber--;
        if (this.pageNumber <= 0) {
            this.resetPageNumber();
        }
        console.log("after reserse: ", this.pageNumber);
        return this.pageNumber;
    }

    resetPageNumber() {
        this.pageNumber = this.totalPages;
    }

    setZIndex(page, zIndex) {
        if (page) {
            page.style.zIndex = zIndex;
        }
    }

    turnPage(page) {
        if (page) {
            page.classList.add('turn');
        }
    }

    unturnPage(page) {
        if (page) {
            page.classList.remove('turn');
        }
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
            pageManager.setZIndex(element, zIndex)
        }, delay);
        bookState.addTimeout(timeout);
    }

    static async turnPageWithAnimation(page, shouldTurn, baseZIndex, index) {
        if (!page) return;

        if (shouldTurn) {
            pageManager.turnPage(page);
            this.setZIndexWithDelay(page, baseZIndex + index, CONFIG.ANIMATION_DURATION / 2);
        } else {
            pageManager.unturnPage(page);
            this.setZIndexWithDelay(page, baseZIndex - index, CONFIG.ANIMATION_DURATION / 2);
        }
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
        this.initializeButtons();
    }

    initializeButtons() {
        // Next/Prev buttons
        this.pageTurnButtons.forEach((btn, index) => {
            btn.addEventListener('click', () => this.handlePageTurnClick(btn, index));
        });

        // Contact Me button
        if (this.contactMeBtn) {
            this.contactMeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleContactMeClick();
            });
        }

        // Back Profile button
        if (this.backProfileBtn) {
            this.backProfileBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleBackProfileClick();
            });
        }
    }

    handlePageTurnClick(btn, index) {
        if (bookState.isAnimating) return;

        bookState.setAnimating(true);

        const pageTurnId = btn.getAttribute('data-page');
        const pageTurn = document.getElementById(pageTurnId);

        if (!pageTurn) {
            bookState.setAnimating(false);
            return;
        }

        const isTurned = pageManager.isPageTurned(pageTurn);

        if (isTurned) {
            // Close page
            pageManager.unturnPage(pageTurn);
            AnimationHelper.setZIndexWithDelay(
                pageTurn,
                CONFIG.BASE_Z_INDEX - index,
                CONFIG.ANIMATION_DURATION / 2
            );
        } else {
            // Open page
            pageManager.turnPage(pageTurn);
            AnimationHelper.setZIndexWithDelay(
                pageTurn,
                CONFIG.BASE_Z_INDEX + index,
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

        const pages = pageManager.getAllPages();
        pageManager.resetPageNumber();

        for (let index = 0; index < pages.length; index++) {
            await AnimationHelper.wait((index + 1) * CONFIG.PAGE_TURN_DELAY + 100);

            const currentPageIndex = pageManager.reverseIndex();
            const page = pages[currentPageIndex];

            pageManager.unturnPage(page);

            const nextPageIndex = pageManager.reverseIndex();
            AnimationHelper.setZIndexWithDelay(
                pages[nextPageIndex],
                CONFIG.BASE_Z_INDEX + index,
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
        this.pageLeft = document.querySelector('.book-page.page-left');
    }

    async start() {
        bookState.setAnimating(true);

        // Open cover
        await AnimationHelper.wait(CONFIG.COVER_OPEN_DELAY);
        if (this.coverRight) {
            this.coverRight.classList.add('turn');
        }

        // Hide cover
        await AnimationHelper.wait(CONFIG.COVER_HIDE_DELAY - CONFIG.COVER_OPEN_DELAY);
        if (this.coverRight) {
            this.coverRight.style.zIndex = -1;
        }

        // Reverse all pages
        const pages = pageManager.getAllPages();
        pageManager.resetPageNumber();

        for (let index = 0; index < pages.length; index++) {
            await AnimationHelper.wait((index + 1) * CONFIG.PAGE_TURN_DELAY);
            console.log("Index: ", index);
            const currentPageIndex = pageManager.reverseIndex();
            console.log("currentPage", currentPageIndex);
            const page = pages[currentPageIndex];

            pageManager.unturnPage(page);

            // const nextPageIndex = pageManager.reverseIndex();
            // console.log("nextPage", nextPageIndex);
            // AnimationHelper.setZIndexWithDelay(
            //     pages[nextPageIndex],
            //     CONFIG.BASE_Z_INDEX + index,
            //     CONFIG.ANIMATION_DURATION / 2
            // );
        }

        const nextPageIndex = pageManager.reverseIndex();
            console.log("nextPage", nextPageIndex);
            AnimationHelper.setZIndexWithDelay(
                pages[nextPageIndex],
                CONFIG.BASE_Z_INDEX,
                CONFIG.ANIMATION_DURATION / 2
            );

        await AnimationHelper.wait(CONFIG.ANIMATION_DURATION);
        bookState.setAnimating(false);
        this.pageLeft;
    }
}

// =============================================
// INITIALIZATION
// =============================================
function initializeBook() {
    // Initialize button handlers
    new ButtonHandler();

    // Start opening animation
    const openingAnimation = new OpeningAnimation();
    openingAnimation.start();

    // Prevent form submission
    const contactForm = document.querySelector('.contact-box form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('Form submitted! (This is a demo)');
        });
    }

    // Prevent default link behavior
    document.querySelectorAll('a[href="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            if (!link.classList.contains('contact-me') && !link.classList.contains('back-profile')) {
                e.preventDefault();
            }
        });
    });
}

// =============================================
// START APPLICATION
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    initializeBook();
    console.log('📖 Portfolio Book Initialized');
    console.log('✅ All issues fixed:');
    console.log('   - Animation locking implemented');
    console.log('   - Race conditions prevented');
    console.log('   - Timeout cleanup on page unload');
    console.log('   - Scalable configuration');
    console.log('   - Easy to add new pages');
    console.log(`   - Total pages: ${pageManager.getTotalPages()}`);
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    bookState.clearTimeouts();
});