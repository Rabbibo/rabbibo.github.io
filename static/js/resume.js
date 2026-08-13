(() => {
  "use strict";

  const root = document.querySelector("[data-resume-root]");
  if (!root) return;

  const source = root.dataset.resumeSource || "/content/resume.json";
  const status = root.querySelector("[data-resume-status]");
  const asArray = (value) => Array.isArray(value) ? value : [];
  const isPlaceholder = (value) => typeof value === "string" && /^\s*\[.*\]\s*$/s.test(value);
  const hasText = (value) => typeof value === "string" && Boolean(value.trim()) && !isPlaceholder(value);
  const firstText = (value, keys = []) => {
    if (typeof value === "string" || typeof value === "number") return String(value);
    if (!value || typeof value !== "object") return "";
    for (const key of keys) {
      if (typeof value[key] === "string" || typeof value[key] === "number") return String(value[key]);
    }
    return "";
  };

  const setText = (selector, value) => {
    const element = root.querySelector(selector);
    if (element && typeof value === "string") element.textContent = value;
  };

  const make = (tag, text, className = "") => {
    const element = document.createElement(tag);
    if (text) element.textContent = text;
    if (className) element.className = className;
    return element;
  };

  const renderPlainList = (selector, items, emptyText) => {
    const container = root.querySelector(selector);
    if (!container) return;
    container.replaceChildren();
    const values = asArray(items)
      .map((item) => {
        const label = firstText(item, ["name", "title", "label", "value", "credential"]);
        const year = item && typeof item === "object" ? firstText(item, ["year", "date"]) : "";
        return label && year ? `${label} — ${year}` : label;
      })
      .filter(Boolean);
    if (!values.length) {
      container.append(make("p", emptyText, "placeholder"));
      return;
    }
    const list = make("ul");
    values.forEach((value) => list.append(make("li", value)));
    container.append(list);
  };

  const appendDetail = (article, item) => {
    const detail = item?.detail ?? item?.description ?? item?.summary ?? item?.responsibilities;
    if (Array.isArray(detail)) {
      const list = make("ul");
      detail.filter((entry) => typeof entry === "string" && entry.trim()).forEach((entry) => list.append(make("li", entry)));
      if (list.children.length) article.append(list);
    } else if (typeof detail === "string" && detail.trim()) {
      article.append(make("p", detail));
    }
  };

  const renderArticles = (selector, items, kind, emptyText) => {
    const container = root.querySelector(selector);
    if (!container) return;
    container.replaceChildren();
    const records = asArray(items).filter((item) => item && typeof item === "object");
    if (!records.length) {
      container.append(make("p", emptyText, "placeholder"));
      return;
    }
    records.forEach((item) => {
      const article = make("article");
      let heading = "";
      let meta = "";
      if (kind === "experience") {
        heading = firstText(item, ["role", "title", "position"]);
        meta = [firstText(item, ["company", "organization", "employer", "name"]), firstText(item, ["dates", "date", "period", "year"])].filter(Boolean).join(" / ");
      } else if (kind === "education") {
        heading = firstText(item, ["credential", "degree", "title", "program"]);
        meta = [firstText(item, ["institution", "school", "organization", "name"]), firstText(item, ["date", "dates", "year"])].filter(Boolean).join(" / ");
      } else {
        heading = firstText(item, ["name", "title"]);
        meta = firstText(item, ["category", "date"]);
      }
      if (heading) article.append(make("h3", heading));
      if (meta) article.append(make("p", meta));
      appendDetail(article, item);
      container.append(article);
    });
  };

  const renderContact = (items) => {
    const list = root.querySelector("[data-resume-contact]");
    if (!list) return;
    list.replaceChildren();
    asArray(items).forEach((item) => {
      if (typeof item === "string") {
        const entry = make("li");
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item)) {
          const link = make("a", item);
          link.href = `mailto:${item}`;
          entry.append(link);
        } else {
          entry.textContent = item;
        }
        list.append(entry);
        return;
      }
      const label = firstText(item, ["label", "name", "type"]);
      const value = firstText(item, ["value", "text", "email", "url"]);
      const email = item && typeof item === "object" ? firstText(item, ["email"]) : "";
      const url = item && typeof item === "object" ? firstText(item, ["url", "href"]) || (email ? `mailto:${email}` : "") : "";
      const display = label && value && label !== value ? `${label}: ${value}` : value || label || firstText(item);
      if (!display) return;
      const entry = make("li");
      if (url) {
        const link = make("a", display);
        link.href = url;
        if (/^https?:/i.test(url)) {
          link.target = "_blank";
          link.rel = "noopener noreferrer";
        }
        entry.append(link);
      } else {
        entry.textContent = display;
      }
      list.append(entry);
    });
    list.hidden = !list.children.length;
  };

  const splitReferences = (value) => String(value)
    .split(/\s*;\s*/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  const referenceValues = (references) => {
    const items = Array.isArray(references) ? references : [references];
    return items.flatMap((item) => {
      if (typeof item === "string" || typeof item === "number") return splitReferences(item);
      if (!item || typeof item !== "object") return [];

      const combined = firstText(item, ["references", "reference", "value", "text"]);
      if (combined) return splitReferences(combined);

      const name = firstText(item, ["name"]);
      const relationship = firstText(item, ["relationship", "role", "title", "position"]);
      const organization = firstText(item, ["organization", "company", "school"]);
      const contact = firstText(item, ["contact", "email", "phone"]);
      const details = [relationship, organization, contact].filter(Boolean);
      return name ? [`${name}${details.length ? ` — ${details.join(" / ")}` : ""}`] : [];
    }).filter(hasText);
  };

  const renderReferences = (references) => {
    const container = root.querySelector("[data-resume-references]");
    if (!container) return;
    container.replaceChildren();
    const values = referenceValues(references);
    if (!values.length) {
      container.append(make("p", "[No references supplied.]", "placeholder"));
      return;
    }
    const list = make("ul");
    values.forEach((value) => list.append(make("li", value)));
    container.append(list);
  };

  const updateRequiredNotice = (resume) => {
    const notice = root.querySelector("[data-resume-notice]");
    const noticeText = root.querySelector("[data-resume-notice-text]");
    if (!notice || !noticeText) return;

    const requiredFields = [
      ["name", resume.name],
      ["professional title", resume.title],
      ["location", resume.location],
      ["professional summary", resume.summary],
    ];
    const missing = requiredFields.filter(([, value]) => !hasText(value)).map(([label]) => label);
    notice.hidden = !missing.length;
    noticeText.textContent = missing.length
      ? `Complete the following required fields in content/resume.json: ${missing.join(", ")}.`
      : "";
  };

  const applyResume = (resume) => {
    setText("[data-resume-name]", resume.name);
    setText("[data-resume-title]", resume.title);
    setText("[data-resume-location]", resume.location);
    setText("[data-resume-summary]", resume.summary);
    renderContact(resume.contact);
    renderArticles("[data-resume-experience]", resume.experience, "experience", "[No work experience supplied. Add verified roles in content/resume.json.]");
    renderArticles("[data-resume-projects]", resume.projects, "projects", "[No selected projects supplied.]");
    renderArticles("[data-resume-education]", resume.education, "education", "[Education not supplied.]");
    renderPlainList("[data-resume-skills]", resume.skills, "[No skills supplied.]");
    renderPlainList("[data-resume-tools]", resume.tools, "[No tools supplied.]");
    renderPlainList("[data-resume-certifications]", resume.certifications, "[None supplied.]");
    renderPlainList("[data-resume-achievements]", resume.achievements, "[None supplied.]");

    renderReferences(resume.references);
    updateRequiredNotice(resume);
  };

  const loadResume = async () => {
    root.setAttribute("aria-busy", "true");
    try {
      const requestUrl = new URL(source, window.location.href);
      requestUrl.searchParams.set("resume-cache", Date.now().toString());
      const response = await fetch(requestUrl, { headers: { Accept: "application/json" }, cache: "no-store" });
      if (!response.ok) throw new Error(`Resume data request returned ${response.status}`);
      const resume = await response.json();
      if (!resume || typeof resume !== "object" || Array.isArray(resume)) throw new Error("Resume data is not an object");
      applyResume(resume);
      root.dataset.resumeState = "loaded";
      if (status) status.textContent = "Resume content loaded.";
    } catch (error) {
      root.dataset.resumeState = "fallback";
      if (status) status.textContent = "The saved resume content is displayed because the live data file could not be loaded.";
      console.error("Could not load resume content.", error);
    } finally {
      root.setAttribute("aria-busy", "false");
    }
  };

  loadResume();
})();
