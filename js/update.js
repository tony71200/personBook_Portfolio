const scriptTag = document.currentScript || document.querySelector("script[data-json-url]");
const resolveUrl = (value, base) => {
    if (!value) return "";
    try {
        return new URL(value, base).href;
    } catch {
        return value;
    }
};

const pageUrl = window.location.href;
const scriptSrc = scriptTag?.src || "";
const declaredUrl = scriptTag?.getAttribute("data-json-url");
let DATA_URL = declaredUrl
    ? resolveUrl(declaredUrl, pageUrl)
    : scriptSrc
        ? resolveUrl("../../data.json", scriptSrc)
        : resolveUrl("./data.json", pageUrl);

const tempCache = new Map();
const ensureTemp = (selector) => {
    if (!tempCache.has(selector)) {
        const template = document.querySelector(selector);
        if (!template || !template.content || !template.content.firstElementChild) {
            tempCache.set(selector, null);
        } else {
            tempCache.set(selector, template.content.firstElementChild);
        }
    }
    return tempCache.get(selector);
};

const loadData = async () => {
    try {
        const payload = await fetchJson(DATA_URL);
        applyAll(payload);
        return;
    } catch (primaryError) {
        if (window.location.protocol === "file:" && document.body) {
            try {
                console.warn(`fetch(${DATA_URL}) failed under file://; attempting iframe fallback.`, primaryError);
                const payload = await loadJsonViaIframe(DATA_URL);
                applyAll(payload);
                return;
            } catch (fallbackError) {
                console.error("Iframe fallback for data.json failed", fallbackError);
            }
        }
        console.error("Unable to load site data", primaryError);
        if (window.location.protocol === "file:") {
            console.error("Tip: Browsers often block fetch() on file URLs. Please run a local HTTP server (e.g. `python -m http.server`) or host the site via HTTP/S.")
        }
    }
};

const loadJsonViaIframe = (url) => new Promise((resolve, reject) => {
    if (!document.body) {
        reject(new Error("Document body is not available for iframe fallback."));
        return;
    }
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.setAttribute("aria-hidden", "true");
    const cleanup = () => {
        if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
        }
    };
    iframe.addEventListener("load", () => {
        try {
            const doc = iframe.contentDocument || iframe.contentWindow?.document;
            if (!doc) throw new Error("Missing iframe document");
            const text = doc.body ? doc.body.textContent : "";
            if (!text) throw new Error("Empty response body");
            const parsed = JSON.parse(text)
            cleanup();
            resolve(parsed);
        } catch (err) {
            cleanup();
            reject(err);
        }
    });

    iframe.addEventListener("error", () => {
        cleanup()
        reject(new Error(`Failed to laod ${url} via iframe`));
    });
    iframe.src = url;
    document.body.appendChild(iframe);
});

const fetchJson = async (url) => {
    const response = await fetch(url, { cache: "no-cache" });
    if (!response.ok) {
        throw new Error("Document body is not available for iframe fallback.")
    }
    return response.json();
}

const getTempClone = (selector) => {
    const root = ensureTemp(selector);
    return root ? root.cloneNode(true) : null;
};

const clearChildren = (node) => {
    if (node) {
        node.innerHTML = "";
    }
};

const sourceString = (value, fallback = "") => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === "string") return value;
    return String(value);
};

const setText = (element, value) => {
    if (element && typeof value === "string") {
        element.textContent = value;
    }
};

const setHTML = (element, value) => {
    if (element && typeof value === "string") {
        element.innerHTML = value;
    }
};

const setHref = (element, value) => {
    if (element && typeof value === "string") {
        element.href = value;
    }
};

const createEl = (tag, className) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    return el;
};
const setAttr = (el, n, v) => { if (el && v != null) el.setAttribute(n, v); };


const applyMeta = (data) => {
    const metaTitle = sourceString(data?.meta?.title);
    const metaIcon = sourceString(data?.meta?.icon);
    if (metaTitle) {
        document.title = metaTitle;
        const titleEl = document.querySelector("[data-site-title]");
        setText(titleEl, metaTitle);
    }
    if (metaIcon) {
        const iconEl = document.querySelector("[data-meta-icon]");
        setHref(iconEl, metaIcon);
    }
};

const applyProfile = (data) => {
    const profile = data?.profile;
    if (!profile) return "";

    const avatarData = profile.avatar;
    if (avatarData) {
        const avatarEl = document.querySelector("[data-profile-avatar]");
        if (avatarEl) {
            const src = sourceString(avatarData.src);
            const alt = sourceString(avatarData.alt);
            if (src) avatarEl.setAttribute("src", src);
            if (alt) avatarEl.setAttribute("alt", alt);
        }
    }

    const nameEl = document.querySelector("[data-profile-name]");
    setText(nameEl, sourceString(profile.name));

    const jobEl = document.querySelector("[data-profile-titles]");
    if (jobEl) {
        clearChildren(jobEl);
        const titles = Array.isArray(profile.titles) ? profile.titles : [];
        titles.forEach(title => {
            const value = sourceString(title).trim();
            if (!value) return;
            const h3 = document.createElement("h3");
            h3.className = "title";
            h3.textContent = value;
            jobEl.appendChild(h3);
        })
    }
    const socialsEl = document.querySelector("[data-social-media]");
    if (socialsEl) {
        clearChildren(socialsEl);
        const socials = profile.socials && typeof profile.socials === "object" ? profile.socials : {};
        Object.entries(socials).forEach(([key, urlValue]) => {
            const url = sourceString(urlValue).trim();
            if (!key || !url) return;
            const a = document.createElement("a");
            a.setAttribute("href", url);
            a.insertAdjacentHTML("beforeend", `<i class="bx bxl-${key}"></i>`);
            socialsEl.appendChild(a);
        });
    }

    const aboutEl = document.querySelector("[data-about]");
    if (aboutEl) {
        clearChildren(aboutEl);
        const paragraphs = profile.paragraphs && typeof profile.paragraphs === "object" ? profile.paragraphs : {};
        Object.entries(paragraphs).forEach(([_, paragraph]) => {
            const about = sourceString(paragraph).trim();
            if (about) {
                const p = document.createElement("p");
                setHTML(p, about);
                aboutEl.appendChild(p);
            }
        });
    }
    const downloadCV = document.querySelector("[data-cv]");
    downloadCV.setAttribute("href", sourceString(profile?.cv?.resume));
};

// ====== Work Experience & Education ======
const applyWorkEducation = (data) => {
    const expWrap = document.querySelector("[data-experience]");
    const eduWrap = document.querySelector("[data-education]");
    if (expWrap) {
        expWrap.innerHTML = "";
        const exps = Array.isArray(data?.resume?.experiences) ? data.resume.experiences : [];
        exps.forEach(item => {
            const li = createEl("div", "workeduc-content");
            const year = createEl("span", "year");
            year.innerHTML = `<i class="bx bxs-calendar"></i>${sourceString(item.dates)}`;
            const h3 = createEl("h3"); h3.textContent = `${sourceString(item.role)} - ${sourceString(item.company)}`;
            const p = createEl("p"); setHTML(p, sourceString(item.summaryHtml));
            li.append(year, h3, p);
            expWrap.appendChild(li);
        });
    }
    if (eduWrap) {
        eduWrap.innerHTML = "";
        const edus = Array.isArray(data?.resume?.education) ? data.resume.education : [];
        edus.forEach(item => {
            const li = createEl("div", "workeduc-content");
            const year = createEl("span", "year");
            year.innerHTML = `<i class="bx bxs-calendar"></i>${sourceString(item.dates)}`;
            const h3 = createEl("h3"); h3.textContent = sourceString(item.school);
            const p = createEl("p"); setHTML(p, sourceString(item.summaryHtml));
            li.append(year, h3, p);
            eduWrap.appendChild(li);
        });
    }
};

// ====== Testimonials under Education ======
const applyEduTestimonials = (data) => {
    const wrapRoot = document.querySelector("[data-edu-testimonials]");
    const wrap = document.querySelector("[data-edu-testimonials] .testimonials-list");
    if (!wrapRoot || !wrap) return;
    wrap.innerHTML = "";
    const items = Array.isArray(data?.about?.testimonials) ? data.about.testimonials : [];
    items.forEach(t => {
        const li = createEl("li", "testimonial-card");
        const name = sourceString(t.name);
        const avatar = t?.avatar?.src;
        const quote = sourceString(t?.quoteHtml);
        li.innerHTML = `
          <div style="display:flex; gap:.75rem; align-items:flex-start">
            ${avatar ? `<img src="${avatar}" alt="${name}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;border:1px solid #eee">` : ""}
            <div>
              <div style="font-weight:700;margin-bottom:.1rem">${name}</div>
              <div class="testimonial-quote">${quote}</div>
            </div>
          </div>`;
        wrap.appendChild(li);
    });
};

// ====== Portfolio/Certificates: notify ready for modal triggers ======
const initPortfolioModalTriggers = () => {
    document.dispatchEvent(new Event("portfolio-ready"));
};

// ====== Contact section (About-like) ======
const applyContact = (data) => {
    const root = document.querySelector("[data-contact]");
    if (!root) return;
    const ul = root.querySelector(".contact-list");
    const mapBox = root.querySelector("[data-map]");
    if (ul) ul.innerHTML = "";

    const contacts = data?.profile?.contacts || {};
    const entries = Object.entries(contacts);
    entries.forEach(([key, obj]) => {
        const label = sourceString(obj.label || key);
        let value = "";
        if (obj.display) value = obj.display;
        else if (obj.href) value = obj.href.replace(/^mailto:|^tel:/, "");
        else if (obj.datetime) value = obj.display || obj.datetime;
        const li = document.createElement("li");
        li.innerHTML = `<span class="label">${label}</span><span class="value">${sourceString(value)}</span>`;
        ul?.appendChild(li);
    });

    const loc = data?.profile?.contacts?.location?.display;
    if (mapBox && loc) {
        const iframe = document.createElement("iframe");
        iframe.loading = "lazy";
        iframe.referrerPolicy = "no-referrer-when-downgrade";
        iframe.src = `https://www.google.com/maps?q=${encodeURIComponent(loc)}&output=embed`;
        mapBox.innerHTML = "";
        mapBox.appendChild(iframe);
    }
};

// ====== Thanks & Chatbot placeholders ======
const applyThanks = () => {
    const thanks = document.querySelector("[data-thanks]");
    // reserved for future effects
};
const applyChatbotPlaceholder = () => {
    const box = document.querySelector("[data-chatbot]");
    console.log("Chatbot", box);
    if (!box) return;
    if (!box.querySelector('.chatbot-placeholder')) {
        const d = document.createElement('div');
        d.className = 'chatbot-placeholder';
        d.textContent = '🤖 Ready for future chatbot integration';
        box.appendChild(d);
    }
};

const applyAll = (loadedData) => {
    console.log(loadedData);
    applyMeta(loadedData);
    applyProfile(loadedData);
	applyWorkEducation(loadedData);
    applyEduTestimonials(loadedData);
    applyContact(loadedData);
    applyThanks();
    applyChatbotPlaceholder();
    initPortfolioModalTriggers();
    document.dispatchEvent(new Event("site-data-updated"));
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadData, { once: true });
} else {
    loadData();
}