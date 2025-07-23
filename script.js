const elements = {
    itemInput: document.querySelector("textarea"),
    itemsList: document.querySelector(".items-list"),
    container: document.querySelector(".to-do-container"),
    filter: document.querySelector(".group-select"),
    draggables: null
};
const btns = {
    groupContainer: document.querySelector(".groud-select"),
    clearCompletedBtn: document.querySelector(".clear-completed"),
    lightToggle: document.querySelector(".lighting-mode")
};
let items = JSON.parse(localStorage.getItem("items")) || [];
let idCount = items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 0;
const renderedIds = new Set();
const batchSize = 20;
const whiteSpaceRegex = /^\s*$/;

//main
getLightMode();
lazyLoadItems();

elements.itemsList.addEventListener('dragover', (e) => {
    e.preventDefault()
    const afterElement = getDragAfterElement(elements.itemsList, e.clientY)
    const draggable = document.querySelector('.dragging');
    if (afterElement == null) {
        container.appendChild(draggable)
    } else {
        elements.itemsList.insertBefore(draggable, afterElement)
    }
})
elements.itemInput.addEventListener("keydown", (e) => {
    if (e.key == "Enter") {
        e.preventDefault();
        if (whiteSpaceRegex.test(elements.itemInput.value)) {
            return false;
        }
        const isCompleted = elements.itemInput.closest(".item-input").classList.contains("completed");
        addItem(elements.itemInput.value, isCompleted);
        elements.itemInput.value = "";
    }
})
elements.container.addEventListener("click", toggleCheck);
elements.itemsList.addEventListener("click", removeItem);
elements.filter.addEventListener("click", filterItems);
btns.clearCompletedBtn.addEventListener("click", clearCompleted);
btns.lightToggle.addEventListener("click", toggleLightMode);

//end main

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.draggable:not(.dragging)')]
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect()
        const offset = y - box.top - box.height / 2
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child }
        } else {
            return closest
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element
}
function lazyLoadItems() {
    let loaded = 0;

    for (let i = 0; i < items.length && loaded < batchSize; i++) {
        const id = items[i].id;
        if (!renderedIds.has(id) && !document.getElementById(id)) {
            addItem(items[i].item.content, items[i].item.isCompleted, id, true);
            renderedIds.add(id);
            loaded++;
        }
    }
    if (items.length !== renderedIds.size) {
        observeItemList();
    }
}
function observeItemList() {
    const observer = new IntersectionObserver((entires) => {
        const lastItem = entires[0];
        if (lastItem.isIntersecting) {
            lazyLoadItems();
            observer.unobserve(lastItem.target);
        }
    }, {
        root: elements.itemsList,
        threshold: 0.75
    })
    observer.observe(elements.itemsList.querySelector(".item:last-child"));
}
function addItem(text, isCompleted, id = idCount, isOnLoad = false) {
    elements.itemsList.insertAdjacentHTML("beforeend", `<div class="item d-flex draggable" id="${id}" draggable="true">
        <div class="check-circle center-flex"><img src="" alt=""></div>
        <p class="content">${text.trim()}</p>
        <button class="remove-item center-flex"><img src="/images/icon-cross.svg" alt=""></button>
        </div>`);
    const createdElement = elements.itemsList.lastElementChild;
    if (isCompleted) {
        createdElement.classList.add("completed");
        createdElement.querySelector(".check-circle img").setAttribute("src", "/images/icon-check.svg");
    }
    if (!isOnLoad) {
        items.push({ "id": id, item: { "content": text.trim(), "isCompleted": isCompleted } });
    }
    createdElement.addEventListener('dragstart', () => {
        createdElement.classList.add('dragging')
    })
    createdElement.addEventListener('dragend', () => {
        createdElement.classList.remove('dragging')
    })
    filterItems({ target: elements.filter.querySelector(".option.all") });
    ++idCount;
    updateLocalStorage();
    adjustItemsCount();
    elements.draggables = document.querySelectorAll(".draggable");
    elements.itemsList.style.height = "fit-content";
}
function updateLocalStorage() {
    localStorage.setItem("items", JSON.stringify(items));
}
function removeItem(event) {
    if (!event.target.closest(".remove-item")) {
        return;
    }
    const itemEl = event.target.closest(".item");
    const itemId = parseInt(itemEl.id);

    elements.itemsList.removeChild(itemEl);
    items = items.filter(item => item.id != itemId);
    renderedIds.delete(itemId);
    ensureVisibleItems();
    updateLocalStorage();
    adjustItemsCount();
    filterItems({ target: elements.filter.querySelector(".option.all") });
    elements.itemsList.style.height = "fit-content";
}
function ensureVisibleItems(minItems = 20) {
    for (let i = 0; i < items.length; i++) {
        const id = items[i].id;
        if (!document.getElementById(id)) {
            addItem(items[i].item.content, items[i].item.isCompleted, id, true);
            break;
        }
    }
}
function adjustItemsCount() {
    document.querySelector(".items-count").innerText = `${items.length} items left`
}
function toggleCheck(event) {
    if (!event.target.closest(".check-circle")) {
        return;
    }
    let element = event.target.closest(".item-input") || event.target.closest(".item");
    element.classList.toggle("completed");
    if (element.classList.contains("completed")) {
        element.querySelector(".check-circle img").setAttribute("src", "/images/icon-check.svg")
    } else {
        element.querySelector(".check-circle img").setAttribute("src", "")
    }
    filterItems({ target: elements.filter.querySelector(".option.selected") });
    if (element.classList.contains("item")) {
        for (let i = 0; i < items.length; i++) {
            if (items[i].id == element.id) {
                items[i].item.isCompleted = element.classList.contains("completed");
                break;
            }
        }
        updateLocalStorage();
    }
}
function filterItems(event) {
    if (!event.target.closest(".option")) {
        return;
    }
    elements.filter.querySelectorAll(".option").forEach((option) => {
        if (option != event.target) {
            option.classList.remove("selected");
        } else {
            option.classList.add("selected");
        }
    })
    const initHight = elements.itemsList.clientHeight;
    elements.itemsList.querySelectorAll(".item").forEach((item) => {
        const isCompleted = item.classList.contains("completed");
        if ((event.target.classList.contains("active") && !isCompleted)
            || (event.target.classList.contains("completed") && isCompleted)
            || (event.target.classList.contains("all"))) {
            item.classList.remove("hidden");
        } else {
            item.classList.add("hidden");
        }
    })
    elements.itemsList.style.height = initHight + "px";
}
function clearCompleted() {
    elements.itemsList.querySelectorAll(".item.completed").forEach((item) => {
        elements.itemsList.removeChild(item);
    })
    items = items.filter(obj => !obj.item.isCompleted);
    updateLocalStorage();
    filterItems({ target: elements.filter.querySelector(".option.all") })
    adjustItemsCount();
    elements.itemsList.style.height = "fit-content";
}
function getLightMode() {
    const storedMode = localStorage.getItem("lightMode");
    let useLight = storedMode === "light";
    if (!storedMode) {
        useLight = window.matchMedia("(prefers-color-scheme: light)").matches;
    }
    if (useLight) {
        document.body.classList.add("light");
        btns.lightToggle.querySelector("img").setAttribute("src", "/images/icon-moon.svg");
    } else {
        document.body.classList.remove("light");
        btns.lightToggle.querySelector("img").setAttribute("src", "/images/icon-sun.svg");
    }
}
function toggleLightMode() {
    document.body.classList.toggle("light");
    if (document.body.classList.contains("light")) {
        btns.lightToggle.querySelector("img").setAttribute("src", "/images/icon-moon.svg");
        localStorage.setItem("lightMode", "light");
    } else {
        btns.lightToggle.querySelector("img").setAttribute("src", "/images/icon-sun.svg");
        localStorage.setItem("lightMode", "dark");
    }
}
