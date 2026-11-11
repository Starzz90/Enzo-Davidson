const skillsTrack = document.querySelector(".skills-track");
const skillsGroup = skillsTrack.querySelector(".skills-group");
const skillsCarousel = document.querySelector(".skills-carousel");
const skillsViewport = skillsCarousel.querySelector(".skills");
const skillsButtons = skillsCarousel.querySelectorAll(".skills-button");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const workDetailsToggles = document.querySelectorAll(".toggle-description");
const workDetailsAnimations = new WeakMap();
const themeToggle = document.querySelector(".theme-toggle");
const projectSearch = document.querySelector("#project-search");
const projectSearchStatus = document.querySelector("#project-search-status");
const projectEmptyMessage = document.querySelector("#project-empty");
const projects = document.querySelector(".projects");
const projectCards = Array.from(document.querySelectorAll(".project-card"));
const projectRows = Array.from(new Set(projectCards.map((card) => card.parentElement)));
const certificateDialog = document.querySelector(".certificate-dialog");
const certificateDialogImage = certificateDialog.querySelector(".certificate-dialog-image");
const certificateDialogTitle = certificateDialog.querySelector(".certificate-dialog-title");
const certificatePreviews = Array.from(document.querySelectorAll(".certificate-preview"));
const certificateNavigationButtons = certificateDialog.querySelectorAll(".certificate-nav");
let skillIndex = 0;
let queuedMoves = [];
let moving = false;
let trackAnimation;
let certificateIndex = 0;

const savedTheme = localStorage.getItem("portfolio-theme");
if (savedTheme === "dark") {
    document.documentElement.dataset.theme = "dark";
    themeToggle.setAttribute("aria-pressed", "true");
}

themeToggle.addEventListener("click", () => {
    const isDark = document.documentElement.dataset.theme !== "dark";
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    themeToggle.setAttribute("aria-pressed", String(isDark));
    localStorage.setItem("portfolio-theme", isDark ? "dark" : "light");
});

const updateProjectResults = () => {
    const searchTerms = projectSearch.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    let visibleProjects = 0;
    projects.classList.toggle("is-searching", searchTerms.length > 0);

    projectCards.forEach((card) => {
        const searchableText = card.textContent.toLowerCase();
        const matches = searchTerms.every((term) => searchableText.includes(term));
        card.hidden = !matches;
        visibleProjects += Number(matches);
    });

    projectRows.forEach((row) => {
        row.hidden = !Array.from(row.querySelectorAll(".project-card")).some((card) => !card.hidden);
    });

    projectSearchStatus.textContent = searchTerms.length
        ? `Showing ${visibleProjects} of ${projectCards.length} projects.`
        : `${projectCards.length} projects`;
    projectEmptyMessage.hidden = visibleProjects > 0;
};

projectSearch.addEventListener("input", updateProjectResults);
updateProjectResults();

const showCertificate = (index) => {
    certificateIndex = (index + certificatePreviews.length) % certificatePreviews.length;
    const preview = certificatePreviews[certificateIndex];
    const image = preview.querySelector("img");
    const title = preview.closest(".certification-card").querySelector(".certification-name").textContent;
    certificateDialogImage.src = image.src;
    certificateDialogImage.alt = image.alt;
    certificateDialogTitle.textContent = title;
};

certificatePreviews.forEach((preview, index) => {
    preview.addEventListener("click", () => {
        showCertificate(index);
        certificateDialog.showModal();
    });
});

certificateNavigationButtons.forEach((button) => {
    button.addEventListener("click", () => {
        showCertificate(certificateIndex + Number(button.dataset.direction));
    });
});

certificateDialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        showCertificate(certificateIndex + (event.key === "ArrowRight" ? 1 : -1));
    }
});

certificateDialog.addEventListener("click", (event) => {
    if (event.target === certificateDialog) {
        certificateDialog.close();
    }
});

workDetailsToggles.forEach((toggle) => {
    const details = document.getElementById(toggle.getAttribute("aria-controls"));

    toggle.addEventListener("click", () => {
        const isExpanded = toggle.getAttribute("aria-expanded") === "true";
        const currentHeight = details.hidden ? 0 : details.getBoundingClientRect().height;
        const currentAnimation = workDetailsAnimations.get(details);
        if (currentAnimation) {
            currentAnimation.cancel();
        }

        details.hidden = false;
        toggle.setAttribute("aria-expanded", String(!isExpanded));
        toggle.setAttribute("aria-label", isExpanded ? "Show details" : "Hide details");

        const targetHeight = isExpanded ? 0 : details.scrollHeight;
        if (reducedMotion.matches) {
            details.hidden = isExpanded;
            return;
        }

        const animation = details.animate(
            [
                { height: `${currentHeight}px`, opacity: isExpanded ? 1 : 0 },
                { height: `${targetHeight}px`, opacity: isExpanded ? 0 : 1 }
            ],
            { duration: 250, easing: "ease" }
        );
        workDetailsAnimations.set(details, animation);
        animation.onfinish = () => {
            details.hidden = isExpanded;
            workDetailsAnimations.delete(details);
        };
    });
});

const cloneSkillsGroup = (suffix) => {
    const clone = skillsGroup.cloneNode(true);
    const clonedIds = new Map();

    clone.setAttribute("aria-hidden", "true");
    clone.querySelectorAll("[id]").forEach((element, index) => {
        clonedIds.set(element.id, `${element.id}-carousel-${suffix}-${index}`);
        element.id = `${element.id}-carousel-${suffix}-${index}`;
    });
    clone.querySelectorAll("*").forEach((element) => {
        Array.from(element.attributes).forEach((attribute) => {
            let value = attribute.value;
            clonedIds.forEach((newId, oldId) => {
                value = value.replaceAll(`#${oldId}`, `#${newId}`);
            });
            if (value !== attribute.value) {
                element.setAttribute(attribute.name, value);
            }
        });
    });
    return clone;
};

skillsTrack.prepend(cloneSkillsGroup("previous"));
skillsTrack.append(cloneSkillsGroup("next"));

const getSkillStep = () => {
    const skills = skillsGroup.querySelectorAll(".box-skill");
    return skills.length > 1
        ? skills[1].offsetLeft - skills[0].offsetLeft
        : skills[0].getBoundingClientRect().width;
};

const getSkillTransform = () => {
    const step = getSkillStep();
    const previousGroupWidth = skillsGroup.previousElementSibling.offsetWidth;
    const skillWidth = skillsGroup.querySelector(".box-skill").offsetWidth;
    const viewportStyles = getComputedStyle(skillsViewport);
    const paddingLeft = parseFloat(viewportStyles.paddingLeft);
    const paddingRight = parseFloat(viewportStyles.paddingRight);
    const centeredOffset = (skillsViewport.clientWidth - paddingLeft - paddingRight) / 2 - skillWidth / 2;
    const translateX = centeredOffset - previousGroupWidth - skillIndex * step;
    return `translateX(${translateX}px)`;
};

const setSkillPosition = () => {
    skillsTrack.style.transform = getSkillTransform();
};

const normalizeSkillIndex = () => {
    const skillCount = skillsGroup.querySelectorAll(".box-skill").length;
    if (skillIndex >= skillCount) {
        skillIndex = 0;
        setSkillPosition();
    } else if (skillIndex < 0) {
        skillIndex = skillCount - 1;
        setSkillPosition();
    }
};

const moveSkill = (direction) => {
    if (moving) {
        queuedMoves.push(direction);
        return;
    }

    const from = getComputedStyle(skillsTrack).transform;
    skillIndex += direction;
    const to = getSkillTransform();
    moving = true;

    if (trackAnimation) {
        trackAnimation.cancel();
    }

    trackAnimation = skillsTrack.animate(
        [{ transform: from }, { transform: to }],
        { duration: reducedMotion.matches ? 0 : 350, easing: "ease" }
    );
    trackAnimation.onfinish = () => {
        skillsTrack.style.transform = to;
        trackAnimation.cancel();
        trackAnimation = undefined;
        normalizeSkillIndex();
        moving = false;
        if (queuedMoves.length) {
            moveSkill(queuedMoves.shift());
        }
    };
};

skillsButtons.forEach((button) => {
    button.addEventListener("click", () => {
        moveSkill(Number(button.dataset.direction));
    });

    button.addEventListener("pointerenter", () => {
        button.animate(
            [{ backgroundColor: "var(--background-color)", color: "var(--accents-40)" },
                { backgroundColor: "var(--accents-40)", color: "var(--background-color)" }],
            { duration: 150, fill: "forwards" }
        );
    });
    button.addEventListener("pointerleave", () => {
        button.getAnimations().forEach((animation) => animation.cancel());
        button.animate(
            [{ backgroundColor: "var(--accents-40)", color: "var(--background-color)" },
                { backgroundColor: "var(--background-color)", color: "var(--accents-40)" }],
            { duration: 150, fill: "forwards" }
        );
    });
});

window.addEventListener("resize", () => {
    if (moving) {
        return;
    }
    setSkillPosition();
});

setSkillPosition();