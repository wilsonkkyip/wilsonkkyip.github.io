/*
  class="[type] [rank]" val="[value]"

  type: Either `icn` or `svg`
  rank: How skillful it is s1 to s5
  value: If type==icn, look for icons from https://icon-sets.iconify.design/
          If type==svg, path to svg file
*/


function getSkillIcon(skill) {
  if (skill.iconType === "iconify") {
    let icon = document.createElement("i");
    icon.className = "iconify";
    icon.setAttribute("data-icon", skill.iconValue);
    return wrapIcon(icon);
  } else if (skill.iconType === "svg") {
    let img = document.createElement("img");
    img.src = skill.iconValue;
    // img.width = 13;
    // img.height = 13;
    // img.style.verticalAlign = "-0.125em";
    // img.style.transform = "rotate(360deg)";
    return wrapIcon(img);
  } else {
      return document.createTextNode("");
  }
}

function getSkillNameIcon(skill) {
  let div = document.createElement("div");
  div.classList.add("skill-name-icon");
  div.classList.add("icon-text-wrapper");
  let name = document.createElement("span");
  name.classList.add("skill-name");
  name.innerHTML = skill.name != "latex" ? skill.name : '<span class="latex">L<sup>a</sup>T<sub>e</sub>X</span>';
  div.appendChild(name);
  div.appendChild(getSkillIcon(skill));
  return div;
}

function getSkillLevel(skill) {
  let div = document.createElement("div");
  div.classList.add("skill-level");
  for (let i = 0; i < 5; i++) {
    let icon = document.createElement("i");
    if (i < skill.proficiency) {
      icon.classList.add("fas");
    } else {
      icon.classList.add("far");
    }
    icon.classList.add("fa-circle");
    div.appendChild(icon);
  }
  return div;
}

function getSkillItem(skill) {
  let div = document.createElement("div");
  div.classList.add("skill-item");
  div.setAttribute("data-skill-name", skill.name.toLowerCase());
  div.setAttribute("data-skill-proficiency", skill.proficiency);
  let nameLevel = document.createElement("div");
  nameLevel.classList.add("skill-name-level");
  let nameIcon = getSkillNameIcon(skill);
  let level = getSkillLevel(skill);
  nameLevel.appendChild(nameIcon);
  nameLevel.appendChild(level);
  div.appendChild(nameLevel);
  return div;
}

function getSkillCategory(category) {
  let div = document.createElement("div");
  div.classList.add("skill-category");
  let title = document.createElement("div");
  title.classList.add("skill-category-title");
  title.innerText = category.name;
  div.appendChild(title);
  let skillList = document.createElement("div");
  skillList.classList.add("skill-list");
  category.content.forEach(skill => {
    skillList.appendChild(getSkillItem(skill));
  });
  div.appendChild(skillList);
  return div;
}

function appendSkills() {
  let section = document.querySelector("#skills");
  skills.forEach(category => {
    section.appendChild(getSkillCategory(category));
  });
}

appendSkills();
