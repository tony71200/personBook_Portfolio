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

const getInlinePortfolioData = () => {
    const inlinePayload = window.__PORTFOLIO_DATA__;
    return inlinePayload && typeof inlinePayload === "object" ? inlinePayload : null;
};

const loadData = async () => {
    const isFileProtocol = window.location.protocol === "file:";
    if (isFileProtocol) {
        const inlinePayload = getInlinePortfolioData();
        if (inlinePayload) {
            applyAll(inlinePayload);
            console.info("Loaded portfolio data from inline fallback (file:// mode).");
            return;
        }
    }

    try {
        const payload = await fetchJson(DATA_URL);
        applyAll(payload);
        return;
    } catch (primaryError) {
        console.error("Unable to load site data", primaryError);
        if (isFileProtocol) {
            console.error('Tip: Browsers block fetch() for file://. Use a local HTTP server (e.g. `python -m http.server`) or load `js/data.local.js` before `js/update.js`.');
        }
    }
};

const fetchJson = async (url) => {
    const response = await fetch(url, { cache: "no-cache" });
    if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`)
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

const escapeHtml = (value) => {
    const str = sourceString(value, "");
    return str.replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[char] || char));
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

const applyServices = (data) => {
    const container = document.querySelector("[data-services]");
    if (!container) return;
    clearChildren(container);
    const services = Array.isArray(data?.about?.services) ? [...data.about.services] : [];
    services.sort((a, b) => (a.index || 0) - (b.index || 0));

    services.forEach(service => {
        const card = createEl("article", "service-card");
        card.setAttribute("tabindex", "0");
        card.setAttribute("role", "group");
        const icon_title = createEl("div", "icon_title")

        const iconWrap = createEl("div", "service-icon");
        const iconData = service.icon || {};
        if (iconData.src) {
            const img = createEl("img");
            setAttr(img, "src", sourceString(iconData.src));
            setAttr(img, "alt", sourceString(iconData.alt || service.title || "Service icon"));
            iconWrap.appendChild(img);
        } else if (iconData.class) {
            const i = createEl("i");
            i.className = iconData.class.includes("bx") ? iconData.class : `bx ${iconData.class}`;
            iconWrap.appendChild(i);
        }

        const titleEl = createEl("h3", "service-title");
        setText(titleEl, sourceString(service.title));

        const descEl = createEl("p", "service-desc");
        setHTML(descEl, sourceString(service.descriptionHtml));
        icon_title.append(iconWrap, titleEl)
        card.append(icon_title, descEl);
        container.appendChild(card);
    });
};

const applySkills = (data) => {
    const container = document.querySelector("[data-skills]");
    if (!container) return;
    clearChildren(container);
    const groups = Array.isArray(data?.skills) ? [...data.skills] : [];
    groups.sort((a, b) => (a.index || 0) - (b.index || 0));

    const createSkillIcon = (iconData, label) => {
        if (!iconData) return null;
        if (iconData.type === "class" && iconData.value) {
            const i = createEl("i");
            const value = sourceString(iconData.value).trim();
            const classes = value.split(/\s+/);
            if (!classes.includes("bx")) classes.unshift("bx");
            i.className = classes.join(" ");
            i.setAttribute("aria-hidden", "true");
            return i;
        }
        if (iconData.type === "img" && iconData.src) {
            const img = createEl("img");
            setAttr(img, "src", sourceString(iconData.src));
            setAttr(img, "alt", sourceString(iconData.alt || `${label} icon`));
            return img;
        }
        return null;
    };

    groups.forEach(group => {
        const groupEl = createEl("section", "skill-group");
        const titleEl = createEl("h3", "skill-group-title");
        setText(titleEl, sourceString(group.category));
        groupEl.appendChild(titleEl);

        const itemsWrap = createEl("div", "skill-items");
        const items = Array.isArray(group.items) ? group.items : [];
        items.forEach(item => {
            const itemEl = createEl("div", "skill-item");
            const iconEl = createSkillIcon(item.icon, item.label);
            if (iconEl) itemEl.appendChild(iconEl);
            const labelEl = createEl("span");
            setText(labelEl, sourceString(item.label));
            itemEl.appendChild(labelEl);
            itemsWrap.appendChild(itemEl);
        });

        groupEl.appendChild(itemsWrap);
        container.appendChild(groupEl);
    });
};

const buildMediaGallery = (item) => {
    const gallery = [];
    const pushMedia = (media) => {
        if (!media) return;
        const src = sourceString(media.src).trim();
        if (!src) return;
        const type = media.type === "video" ? "video" : "image";
        gallery.push({
            type,
            src,
            alt: sourceString(media.alt || item?.title || `${type} preview`)
        });
    };

    if (item?.thumbnail) {
        pushMedia({ ...item.thumbnail, type: "image" });
    }
    if (Array.isArray(item?.media)) {
        item.media.forEach(pushMedia);
    }
    return gallery;
};

const applyPortfolio = (data) => {
    const grid = document.querySelector("[data-portfolio-grid]");
    if (!grid) return;
    clearChildren(grid);
    const projects = Array.isArray(data?.portfolio?.projects) ? [...data.portfolio.projects] : [];
    projects.sort((a, b) => (a.index || 0) - (b.index || 0));

    projects.forEach(project => {
        const item = createEl("div", "portfolio-item");
        item.setAttribute("tabindex", "0");
        item.setAttribute("role", "button");

        const thumb = createEl("img");
        const thumbSrc = sourceString(project?.thumbnail?.src);
        setAttr(thumb, "src", thumbSrc || "./assets/images/placeholders/no-image-3x4.svg");
        setAttr(thumb, "alt", sourceString(project?.thumbnail?.alt || project.title || "Project preview"));

        const caption = createEl("div", "caption");
        caption.textContent = sourceString(project.title);

        const category = sourceString(project.category);
        if (category) {
            const sub = createEl("span", "caption-sub");
            setText(sub, category);
            caption.appendChild(sub);
        }

        const gallery = buildMediaGallery(project);
        if (gallery.length) {
            item.dataset.media = JSON.stringify(gallery);
        }

        const baseDesc = sourceString(project.descriptionHtml);
        let descHtml = baseDesc;
        if (project.techStack) {
            descHtml += `<p><strong>Tech stack:</strong> ${escapeHtml(project.techStack)}</p>`;
        }
        if (project.link) {
            const safeLink = sourceString(project.link).trim();
            if (safeLink) {
                descHtml += `<p><a href="${safeLink}" target="_blank" rel="noreferrer" style="color: var(--highlight_color);">View project</a></p>`;
            }
        }

        item.dataset.title = sourceString(project.title);
        item.dataset.metaLabel = "Category";
        item.dataset.meta = category;
        item.dataset.desc = descHtml;

        item.append(thumb, caption);
        grid.appendChild(item);
    });
};

const applyCertificates = (data) => {
    const grid = document.querySelector("[data-certificate-grid]");
    if (!grid) return;
    clearChildren(grid);
    const forms = Array.isArray(data?.certificates?.forms) ? [...data.certificates.forms] : [];
    forms.sort((a, b) => (a.index || 0) - (b.index || 0));

    forms.forEach(cert => {
        const item = createEl("div", "portfolio-item");
        item.classList.add("certificate-item");
        item.setAttribute("tabindex", "0");
        item.setAttribute("role", "button");

        const img = createEl("img");
        const src = sourceString(cert?.image?.src);
        setAttr(img, "src", src || "./assets/images/placeholders/no-image-3x4.svg");
        setAttr(img, "alt", sourceString(cert?.image?.alt || cert.title || "Certificate"));

        const caption = createEl("div", "caption");
        const title = createEl("span", "caption-title");
        setText(title, sourceString(cert.title));
        caption.appendChild(title);
        if (cert.year) {
            const sub = createEl("span", "caption-sub");
            setText(sub, sourceString(cert.year));
            caption.appendChild(sub);
        }

        const gallery = buildMediaGallery({
            title: cert.title,
            thumbnail: cert.image,
            media: cert.media
        });
        if (gallery.length) {
            item.dataset.media = JSON.stringify(gallery);
        }

        item.dataset.title = sourceString(cert.title);
        item.dataset.metaLabel = "Issuer";
        item.dataset.meta = sourceString(cert.from);
        let desc = sourceString(cert.descriptionHtml);
        if (cert.credentialId) {
            desc += `<p><strong>ID:</strong> ${escapeHtml(cert.credentialId)}</p>`;
        }
        item.dataset.desc = desc;

        item.append(img, caption);
        grid.appendChild(item);
    });
};

const applyPublications = (data) => {
    const list = document.querySelector("[data-publications]");
    const section = list?.closest(".publication-section");
    if (!list) return;
    clearChildren(list);
    const items = Array.isArray(data?.publications) ? [...data.publications] : [];
    items.sort((a, b) => (b.year || 0) - (a.year || 0));

    if (!items.length) {
        section?.setAttribute("hidden", "");
        return;
    }
    section?.removeAttribute("hidden");

    items.forEach(pub => {
        const card = createEl("article", "publication-item");

        const titleEl = createEl("h3", "publication-title");
        setText(titleEl, sourceString(pub.title));
        card.appendChild(titleEl);

        if (pub.authorsHtml) {
            const authors = createEl("div", "publication-authors");
            setHTML(authors, sourceString(pub.authorsHtml));
            card.appendChild(authors);
        }

        const meta = createEl("div", "publication-meta");
        const venue = sourceString(pub.venue);
        const year = sourceString(pub.year);
        if (venue) {
            const venueSpan = createEl("span");
            setText(venueSpan, venue);
            meta.appendChild(venueSpan);
        }
        if (year) {
            const yearSpan = createEl("span");
            setText(yearSpan, year);
            meta.appendChild(yearSpan);
        }
        card.appendChild(meta);

        if (pub.summary) {
            const summary = createEl("p", "publication-summary");
            setText(summary, sourceString(pub.summary));
            card.appendChild(summary);
        }

        const link = sourceString(pub.link).trim();
        if (link) {
            const anchor = createEl("a", "publication-link");
            anchor.href = link;
            anchor.target = "_blank";
            anchor.rel = "noreferrer";
            anchor.textContent = "View publication";
            card.appendChild(anchor);
        }

        list.appendChild(card);
    });
};

// ====== Testimonials under Education ======
const applyEduTestimonials = (data) => {
    const wrapRoot = document.querySelector("[data-edu-testimonials]");
    const wrap = document.querySelector("[data-edu-testimonials] .testimonials-list");
    if (!wrapRoot || !wrap) return;
    wrap.innerHTML = "";
    const items = Array.isArray(data?.about?.testimonials) ? data.about.testimonials : [];
    const cards = [];
    items.forEach(t => {
        const li = createEl("li", "testimonial-card");
        li.setAttribute("tabindex", "0");
        li.setAttribute("role", "button");

        const head = createEl("div", "testimonial-head");
        const avatarSrc = sourceString(t?.avatar?.src).trim();
        if (avatarSrc) {
            const avatarEl = createEl("img", "testimonial-avatar");
            setAttr(avatarEl, "src", avatarSrc);
            setAttr(avatarEl, "alt", sourceString(t?.avatar?.alt || t.name || "Testimonial"));
            head.appendChild(avatarEl);
        }

        const summary = createEl("div", "testimonial-summary");
        const nameEl = createEl("div", "testimonial-name");
        setText(nameEl, sourceString(t.name));
        summary.appendChild(nameEl);
        if (t.title) {
            const titleEl = createEl("div", "testimonial-title");
            setText(titleEl, sourceString(t.title));
            summary.appendChild(titleEl);
        }
        head.appendChild(summary);
        li.appendChild(head);

        const body = createEl("div", "testimonial-body");
        setHTML(body, sourceString(t?.quoteHtml));
        li.appendChild(body);

        const toggle = () => {
            const isActive = li.classList.toggle("is-active");
            if (isActive) {
                cards.forEach(card => {
                    if (card !== li) card.classList.remove("is-active");
                });
            }
        };

        li.addEventListener("click", toggle);
        li.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                toggle();
            }
        });

        cards.push(li);
        wrap.appendChild(li);
    });
};

// ====== Portfolio/Certificates: notify ready for modal triggers ======
const initPortfolioModalTriggers = () => {
    document.dispatchEvent(new CustomEvent("portfolio-ready", {
        detail: {
            selectors: [".portfolio-item", ".certificate-item"]
        }
    }));
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
const applyAll = (loadedData) => {
    applyMeta(loadedData);
    applyProfile(loadedData);
    applyWorkEducation(loadedData);
    applyServices(loadedData);
    applySkills(loadedData);
    applyPortfolio(loadedData);
    applyCertificates(loadedData);
    applyPublications(loadedData);
    applyEduTestimonials(loadedData);
    applyContact(loadedData);
    applyThanks();
    initPortfolioModalTriggers();
    document.dispatchEvent(new Event("site-data-updated"));
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadData, { once: true });
} else {
    loadData();
}