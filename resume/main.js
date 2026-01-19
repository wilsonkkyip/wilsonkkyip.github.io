function sectionTitleUpdate() {
    let h2 = document.querySelectorAll("section#main > h2");
    h2.forEach(x => {
        x.classList.add("section-title");
        switch (x.id) {
            case "education":
                x.appendChild(getFaIcon("fa-solid fa-graduation-cap"));
                break;
            case "experience":
                x.appendChild(getFaIcon("fa-solid fa-briefcase"));
                break;
        }
    })
}

function wrapIcon(icon) {
    let wrapper = document.createElement("span");
    wrapper.classList.add("icon-container");
    wrapper.appendChild(icon);
    return wrapper;
}

function getFaIcon(className) {
    let icon = document.createElement("i");
    className.split(" ").forEach(cn => {
        icon.classList.add(cn);
    });
    return wrapIcon(icon);
}

function findNextSibling(startNode, selector) {
    let next = startNode.nextElementSibling;
    while (next) {
        if (next.matches(selector)) return next;
        next = next.nextElementSibling;
    }
    return null;
}

function processJob(h3) {
    let company = h3;
    let role = company.nextElementSibling;
    let location = role.nextElementSibling;
    let date = location.nextElementSibling;
    let startDate = date.innerHTML.split("-")[0].trim();
    let endDate = date.innerHTML.split("-")[1].trim();
    let node = date.nextElementSibling;
    let content = [];

    while (
        node != null
        && node.tagName.toLowerCase() != "h3" 
        && node.tagName.toLowerCase() != "h2" 
    ) {
        content.push(node.outerHTML);
        node = node.nextElementSibling;
    }
    
    let job = `
    <div class="job-item" data-job-company="${company.innerText}" data-job-role="${role.innerText}" data-job-location="${location.innerText}" data-job-start-date="${startDate}" data-job-end-date="${endDate}">
        <div class="job-heading">
            <div class="job-company-role">
                <div class="job-company">
                    <div class="icon-text-wrapper">
                        <span class="label-text">${company.innerHTML}</span>
                        <span class="icon-container">
                            <i class="iconify" data-icon="mdi:city-variant"></i>
                        </span>
                    </div>
                </div>
                <div class="job-role">
                    <div class="icon-text-wrapper">
                        <span class="label-text">${role.innerHTML}</span>
                        <span class="icon-container">
                            <i class="iconify" data-icon="mdi:account-circle"></i>
                        </span>
                    </div>
                </div>
            </div>
            <div class="job-location-date">
                <div class="job-location">
                    <div class="icon-text-wrapper">
                        <span class="icon-container">
                            <i class="iconify" data-icon="mdi:map-marker"></i>
                        </span>
                        <span class="label-text">${location.innerHTML}</span>
                    </div>
                </div>
                <div class="job-date">
                    <div class="icon-text-wrapper">
                        <span class="icon-container">
                            <i class="iconify" data-icon="ic:baseline-calendar-month"></i>
                        </span>
                        <span class="label-text">${date.innerHTML}</span>
                    </div>
                </div>
            </div>
        </div>
        <div class="job-content">
            ${content.join("\n")}
        </div>
    </div>
    `;
    return job;
}

function processSchool(h3) {
    let school = h3;
    let degree = school.nextElementSibling;
    let location = degree.nextElementSibling;
    let date = location.nextElementSibling;
    let splitDate = date.innerHTML.split("-");
    let startDate = splitDate[0].trim();
    let endDate = splitDate[splitDate.length - 1].trim();
    let node = date.nextElementSibling;
    let content = [];

    while (
        node != null
        && node.tagName.toLowerCase() != "h3" 
        && node.tagName.toLowerCase() != "h2" 
    ) {
        content.push(node.outerHTML);
        node = node.nextElementSibling;
    }
    
    let job = `
    <div class="education-item" data-education-school="${school.innerText}" data-education-degree="${degree.innerText}" data-education-location="${location.innerText}" data-education-start-date="${startDate}" data-education-end-date="${endDate}">
        <div class="education-heading">
            <div class="education-school-degree">
                <div class="education-school">
                    <div class="icon-text-wrapper">
                        <span class="label-text">${school.innerHTML}</span>
                        <span class="icon-container">
                            <i class="iconify" data-icon="fa6-solid:school"></i>
                        </span>
                    </div>
                </div>
                <div class="education-degree">
                    <div class="icon-text-wrapper">
                        <span class="label-text">${degree.innerHTML}</span>
                        <span class="icon-container">
                            <i class="iconify" data-icon="fa6-solid:user-graduate"></i>
                        </span>
                    </div>
                </div>
            </div>
            <div class="education-location-date">
                <div class="education-location">
                    <div class="icon-text-wrapper">
                        <span class="icon-container">
                            <i class="iconify" data-icon="mdi:map-marker"></i>
                        </span>
                        <span class="label-text">${location.innerHTML}</span>
                    </div>
                </div>
                <div class="education-date">
                    <div class="icon-text-wrapper">
                        <span class="icon-container">
                            <i class="iconify" data-icon="ic:baseline-calendar-month"></i>
                        </span>
                        <span class="label-text">${date.innerHTML}</span>
                    </div>
                </div>
            </div>
        </div>
        <div class="education-content">
            ${content.join("\n")}
        </div>
    </div>
    `;
    return job;
}

function processExperience() {
    let jobs = [];
    let h3 = document.querySelector(".input-content #experience").nextElementSibling;
    let prevNode = h3.previousElementSibling;
    if (prevNode.id != "experience") {
        h3 = findNextSibling(prevNode, "h2").nextElementSibling;
    }

    let node = h3;

    while (
        node != null
        && node.nextElementSibling.tagName.toLowerCase() != "h3" 
        && node.nextElementSibling.tagName.toLowerCase() != "h2" 
        && node.nextElementSibling != null
    ) {
        if (node.previousElementSibling.id == 'education') {
            break;
        }
        jobs.push(processJob(node));
        node = findNextSibling(node, "h3");
    }
    let jobsContainer = document.querySelector("#experience .job-list");
    jobsContainer.innerHTML = jobs.join("\n");
}

function processEducation() {
    let educations = [];
    let h3 = document.querySelector(".input-content #education").nextElementSibling;
    let prevNode = h3.previousElementSibling;
    if (prevNode.id != "education") {
        h3 = findNextSibling(prevNode, "h2").nextElementSibling;
    }

    let node = h3;

    while (
        node != null
        && node.nextElementSibling.tagName.toLowerCase() != "h3" 
        && node.nextElementSibling.tagName.toLowerCase() != "h2" 
        && node.nextElementSibling != null
    ) {
        if (node.previousElementSibling.id == 'experience') {
            break;
        }
        educations.push(processSchool(node));
        node = findNextSibling(node, "h3");
    }
    let educationContainer = document.querySelector("#education .education-list");
    educationContainer.innerHTML = educations.join("\n");
}

function processInputContent() {
    processExperience();
    processEducation();
    document.querySelector(".input-content").remove();
}



processInputContent();