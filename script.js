const carousel = document.getElementById("carousel");
const dots = document.getElementById("dots");
const detailPanel = document.getElementById("detailPanel");
const detailTitle = document.getElementById("detailTitle");
const detailBadge = document.getElementById("detailBadge");
const detailIntro = document.getElementById("detailIntro");
const detailRole = document.getElementById("detailRole");
const detailSituation = document.getElementById("detailSituation");
const detailActions = document.getElementById("detailActions");
const detailResults = document.getElementById("detailResults");
const detailTags = document.getElementById("detailTags");
const evidenceSummary = document.getElementById("evidenceSummary");
const evidenceGallery = document.getElementById("evidenceGallery");
const prevButton = document.getElementById("prevButton");
const nextButton = document.getElementById("nextButton");
const heroCta = document.getElementById("heroCta");
const projectShowcase = document.getElementById("projectShowcase");
const imageModal = document.getElementById("imageModal");
const imageModalBackdrop = document.getElementById("imageModalBackdrop");
const imageModalClose = document.getElementById("imageModalClose");
const imageModalImage = document.getElementById("imageModalImage");
const imageModalTitle = document.getElementById("imageModalTitle");

let activeIndex = 0;
let autoPlayTimer = null;
let touchStartX = 0;
let detailAnimationToken = 0;
let cards = [];
let shouldResumeAutoPlayAfterModal = false;
let isCarouselInView = true;

function renderSiteContent() {
  document.title = siteContent.pageTitle;
  document.getElementById("heroEyebrow").textContent = siteContent.eyebrow;
  document.getElementById("heroTitle").textContent = siteContent.heroTitle;
  document.getElementById("heroSummary").textContent = siteContent.heroSummary;
  heroCta.textContent = siteContent.heroCta;
  document.getElementById("aboutTag").textContent = siteContent.aboutTag;
  document.getElementById("aboutTitle").textContent = siteContent.aboutTitle;
  document.getElementById("aboutSummary").textContent = siteContent.aboutSummary;
  document.getElementById("sliderTag").textContent = siteContent.sliderTag;
  document.getElementById("sliderTitle").textContent = siteContent.sliderTitle;
  document.getElementById("sliderHint").textContent = siteContent.sliderHint;
  document.getElementById("detailTag").textContent = siteContent.detailTag;
  document.getElementById("detailRoleLabel").textContent = siteContent.detailSections.role;
  document.getElementById("detailSituationLabel").textContent = siteContent.detailSections.situation;
  document.getElementById("detailActionsLabel").textContent = siteContent.detailSections.actions;
  document.getElementById("detailResultsLabel").textContent = siteContent.detailSections.results;
  document.getElementById("detailTagsLabel").textContent = siteContent.detailSections.tags;
  document.getElementById("detailEvidenceLabel").textContent = siteContent.detailSections.evidence;

  const heroMetrics = document.getElementById("heroMetrics");
  heroMetrics.innerHTML = siteContent.metrics
    .map(
      (item) => `
        <div class="metric-chip">
          <span class="metric-chip__label">${item.label}</span>
          <strong>${item.value}</strong>
        </div>
      `
    )
    .join("");

  const aboutTags = document.getElementById("aboutTags");
  aboutTags.innerHTML = siteContent.aboutTags.map((item) => `<span>${item}</span>`).join("");
}

function wrapIndex(index) {
  const total = projects.length;
  return (index + total) % total;
}

function createCard(project, index) {
  const card = document.createElement("article");
  card.className = "project-card";
  card.dataset.index = String(index);
  card.innerHTML = `
    <span class="project-card__index">${project.number}</span>
    <h3>${project.title}</h3>
    <p>${project.headline}</p>
    <div class="project-card__meta">
      ${project.metrics.map((metric) => `<span>${metric}</span>`).join("")}
    </div>
  `;

  card.addEventListener("click", () => {
    if (activeIndex === index) {
      restartAutoPlay();
      return;
    }
    activeIndex = index;
    render();
    restartAutoPlay();
  });

  return card;
}

function updateCardPosition(card, offset) {
  const absOffset = Math.abs(offset);
  const direction = Math.sign(offset);
  const isActive = absOffset === 0;
  const isNear = absOffset === 1;
  const translateX = isActive ? 0 : offset * 112;
  const translateZ = isActive ? 0 : -absOffset * 170;
  const rotateY = isActive ? 0 : direction * -9;
  const rotateX = 0;
  const scale = isActive ? 1 : isNear ? 0.88 : 0.78;
  const opacity = absOffset > 2 ? 0 : isActive ? 1 : isNear ? 0.78 : 0.34;

  card.style.transform = `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) rotateX(${rotateX}deg) scale(${scale})`;
  card.style.opacity = String(Math.max(opacity, 0));
  card.style.filter = isActive ? "blur(0px) saturate(1.04)" : isNear ? "blur(0.25px) saturate(0.98)" : "blur(0.8px) saturate(0.9)";
  card.style.zIndex = String(100 - absOffset);
  card.classList.toggle("project-card--active", isActive);
  card.classList.toggle("project-card--near", isNear);
}

function syncCardPositions() {
  cards.forEach((card, index) => {
    let offset = index - activeIndex;

    if (offset > 2) offset -= projects.length;
    if (offset < -2) offset += projects.length;

    updateCardPosition(card, offset);
  });
}

function initializeCarousel() {
  carousel.innerHTML = "";
  cards = projects.map((project, index) => {
    const card = createCard(project, index);
    carousel.appendChild(card);
    return card;
  });
  syncCardPositions();
}

function renderDots() {
  dots.innerHTML = "";

  projects.forEach((project, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.classList.toggle("active", index === activeIndex);
    dot.setAttribute("aria-label", `切换到 ${project.title}`);
    dot.addEventListener("click", () => {
      if (activeIndex === index) {
        restartAutoPlay();
        return;
      }
      activeIndex = index;
      render();
      restartAutoPlay();
    });
    dots.appendChild(dot);
  });
}

function refreshDots() {
  const dotNodes = Array.from(dots.children);
  dotNodes.forEach((dot, index) => {
    dot.classList.toggle("active", index === activeIndex);
  });
}

function renderEvidence(project) {
  const evidence = project.evidence || { summary: "", images: [] };
  evidenceSummary.textContent = evidence.summary || "该项目证据图位置已预留。";

  if (!evidence.images || evidence.images.length === 0) {
    evidenceGallery.innerHTML = `
      <article class="evidence-card evidence-card--placeholder">
        <div class="evidence-card__placeholder">截图待补充</div>
      </article>
    `;
    return;
  }

  evidenceGallery.innerHTML = evidence.images
    .map(
      (image, index) => `
        <article class="evidence-card">
          <div class="evidence-card__tag">${image.label}</div>
          <button
            class="evidence-card__preview"
            type="button"
            data-image-index="${index}"
            aria-label="放大查看：${image.label}"
          >
            <img class="evidence-card__image" src="${image.src}" alt="${image.alt}" />
            <span class="evidence-card__zoom">点击放大</span>
          </button>
        </article>
      `
    )
    .join("");

  evidenceGallery.querySelectorAll(".evidence-card__preview").forEach((button) => {
    button.addEventListener("click", () => {
      const image = evidence.images[Number(button.dataset.imageIndex)];
      openImageModal(image);
    });
  });
}

function openImageModal(image) {
  shouldResumeAutoPlayAfterModal = Boolean(autoPlayTimer);
  stopAutoPlay();
  imageModalImage.src = image.src;
  imageModalImage.alt = image.alt;
  imageModalTitle.textContent = image.label;
  imageModal.classList.add("is-open");
  imageModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  imageModalClose.focus();
}

function closeImageModal() {
  if (!imageModal.classList.contains("is-open")) return;
  imageModal.classList.remove("is-open");
  imageModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  imageModalImage.src = "";
  imageModalImage.alt = "";
  imageModalTitle.textContent = "";

  if (shouldResumeAutoPlayAfterModal) {
    startAutoPlay();
  }
  shouldResumeAutoPlayAfterModal = false;
}

function applyDetailContent(project) {
  detailTitle.textContent = project.title;
  detailBadge.textContent = project.category;
  detailIntro.textContent = project.headline;
  detailRole.innerHTML = project.role.map((item) => `<span>${item}</span>`).join("");
  detailSituation.textContent = project.situation;
  detailActions.innerHTML = project.actions.map((item) => `<li>${item}</li>`).join("");
  detailResults.innerHTML = project.results.map((item) => `<li>${item}</li>`).join("");
  detailTags.innerHTML = project.tags.map((tag) => `<span class="detail-tag">${tag}</span>`).join("");
  renderEvidence(project);
}

function animateDetailChange(project) {
  const token = ++detailAnimationToken;

  if (!detailPanel.animate) {
    applyDetailContent(project);
    return;
  }

  detailPanel.animate(
    [
      { opacity: 1, transform: "translateY(0px) scale(1)" },
      { opacity: 0.2, transform: "translateY(14px) scale(0.985)" }
    ],
    {
      duration: 180,
      easing: "cubic-bezier(0.4, 0, 1, 1)",
      fill: "forwards"
    }
  ).onfinish = () => {
    if (token !== detailAnimationToken) {
      return;
    }

    applyDetailContent(project);

    detailPanel.animate(
      [
        { opacity: 0.2, transform: "translateY(14px) scale(0.985)" },
        { opacity: 1, transform: "translateY(0px) scale(1)" }
      ],
      {
        duration: 320,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "forwards"
      }
    );
  };
}

function renderDetail(animated = true) {
  const project = projects[activeIndex];

  if (!animated) {
    applyDetailContent(project);
    return;
  }

  animateDetailChange(project);
}

function render(animated = true) {
  syncCardPositions();
  refreshDots();
  renderDetail(animated);
}

function move(step) {
  activeIndex = wrapIndex(activeIndex + step);
  render();
}

function startAutoPlay() {
  if (!isCarouselInView || imageModal.classList.contains("is-open")) return;
  stopAutoPlay();
  autoPlayTimer = window.setInterval(() => {
    move(1);
  }, 4200);
}

function stopAutoPlay() {
  if (!autoPlayTimer) return;
  window.clearInterval(autoPlayTimer);
  autoPlayTimer = null;
}

function restartAutoPlay() {
  startAutoPlay();
}

function updateAutoPlayVisibility(isVisible) {
  isCarouselInView = isVisible;

  if (!isCarouselInView) {
    stopAutoPlay();
    return;
  }

  startAutoPlay();
}

function setupAutoPlayVisibility() {
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      ([entry]) => {
        updateAutoPlayVisibility(entry.isIntersecting && entry.intersectionRatio >= 0.45);
      },
      { threshold: [0, 0.45, 0.75] }
    );

    observer.observe(carousel);
    return;
  }

  const checkVisibility = () => {
    const rect = carousel.getBoundingClientRect();
    const visibleHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
    updateAutoPlayVisibility(visibleHeight / rect.height >= 0.45);
  };

  window.addEventListener("scroll", checkVisibility, { passive: true });
  window.addEventListener("resize", checkVisibility);
  checkVisibility();
}

prevButton.addEventListener("click", () => {
  move(-1);
  restartAutoPlay();
});

nextButton.addEventListener("click", () => {
  move(1);
  restartAutoPlay();
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeImageModal();
    return;
  }

  if (imageModal.classList.contains("is-open")) {
    return;
  }

  if (event.key === "ArrowLeft") {
    move(-1);
    restartAutoPlay();
  }
  if (event.key === "ArrowRight") {
    move(1);
    restartAutoPlay();
  }
});

imageModalBackdrop.addEventListener("click", closeImageModal);
imageModalClose.addEventListener("click", closeImageModal);
heroCta.addEventListener("click", () => {
  projectShowcase.scrollIntoView({ behavior: "smooth", block: "start" });
});

carousel.addEventListener("mouseenter", stopAutoPlay);
carousel.addEventListener("mouseleave", startAutoPlay);
carousel.addEventListener("touchstart", (event) => {
  touchStartX = event.changedTouches[0].clientX;
  stopAutoPlay();
});

carousel.addEventListener("touchend", (event) => {
  const touchEndX = event.changedTouches[0].clientX;
  const delta = touchEndX - touchStartX;

  if (Math.abs(delta) >= 40) {
    move(delta > 0 ? -1 : 1);
  }

  startAutoPlay();
});

renderSiteContent();
initializeCarousel();
renderDots();
renderDetail(false);
setupAutoPlayVisibility();
startAutoPlay();
