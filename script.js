let currentDate = new Date();

const dateBox = document.getElementById("dateBox");
const dateBig = document.getElementById("dateBig");
const weekday = document.getElementById("weekday");
const miniSamples = 20;
const isMobile = window.innerWidth < 768;
const taskView = document.getElementById("taskView");
const todoList = document.getElementById("todoList");
const taskInput = document.getElementById("taskInput");
const deadlineInput = document.getElementById("deadlineInput");
const greetingEl = document.getElementById("greeting");
const greetingEl2 = document.getElementById("greeting2");
const taskHeader = document.getElementById("taskHeader");
const dateView = document.getElementById("dateView");
const monthView = document.getElementById("monthView");
const monthTitle = document.getElementById("monthTitle");
const monthGrid = document.getElementById("monthGrid");
const deadlineView = document.getElementById("deadlineView");
const deadlineList = document.getElementById("deadlineList");
const editOverlay = document.getElementById("editOverlay");
const editTaskInput = document.getElementById("editTaskInput");
const editDeadlineInput = document.getElementById("editDeadlineInput");
const editCancelBtn = document.getElementById("editCancelBtn");
const editSaveBtn = document.getElementById("editSaveBtn");
const deadlineField = document.querySelector(".deadlineField");
let swipeStartX = 0;
let swipeStartY = 0;
let swipeActive = false;

let editContext = null;

// Initial view
dateView.classList.remove("hidden");
taskView.classList.add("hidden");
monthView.classList.add("hidden");
deadlineView.classList.add("hidden");

function showView(view){
    dateView.classList.add("hidden");
    taskView.classList.add("hidden");
    monthView.classList.add("hidden");
    deadlineView.classList.add("hidden");
    if(view === "task") taskView.classList.remove("hidden");
    else if(view === "month") monthView.classList.remove("hidden");
    else if(view === "deadlines") deadlineView.classList.remove("hidden");
    else dateView.classList.remove("hidden");

    if(view === "task"){
        setTimeout(()=> taskInput.focus(), 50);
    }
}

function pushView(view){
    if (history.state?.view === view) return;
    history.pushState({view}, "", location.pathname + location.search);
}

history.replaceState({view:"date"}, "", location.pathname + location.search);
window.addEventListener("popstate", (e)=>{
    const view = e.state?.view || "date";
    showView(view);
    if(view === "task") loadTasks();
    if(view === "month") renderMonth(currentDate);
    if(view === "deadlines") renderDeadlineList();
});

document.addEventListener("visibilitychange", ()=>{
    if (document.hidden) return;
    if (monthViewActive && !miniFrame) animateMiniWaves();
});

function handleSwipe(deltaX, deltaY){
    if (Math.abs(deltaX) < 40 || Math.abs(deltaX) < Math.abs(deltaY)) return;
    if (dateView.classList.contains("hidden")) return;
    if (deltaX < 0) {
        currentDate.setDate(currentDate.getDate()+1);
    } else {
        currentDate.setDate(currentDate.getDate()-1);
    }
    renderDate();
}

dateBox.addEventListener("touchstart", (e)=>{
    if (e.touches.length !== 1) return;
    swipeActive = true;
    swipeStartX = e.touches[0].clientX;
    swipeStartY = e.touches[0].clientY;
}, {passive:true});

dateBox.addEventListener("touchend", (e)=>{
    if (!swipeActive) return;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - swipeStartX;
    const deltaY = touch.clientY - swipeStartY;
    swipeActive = false;
    handleSwipe(deltaX, deltaY);
}, {passive:true});

function key(date=currentDate){ return date.toISOString().split("T")[0]; }
function isToday(){ return new Date().toDateString()===currentDate.toDateString(); }

function updateGreeting(){
    const tasks = JSON.parse(localStorage.getItem(key()))||[];
    const deadlineTasks = getDeadlineTasks();
    const allTasksDone = tasks.length > 0 && tasks.every(t=>t.done);
    const allDeadlinesDone = deadlineTasks.length > 0 && deadlineTasks.every(t=>t.done);
    greetingEl.classList.remove("show");
    greetingEl2.classList.remove("show");
    setTimeout(()=>{
        if(allTasksDone && (!deadlineTasks.length || allDeadlinesDone)) {
            greetingEl.textContent="Wow sipag";
            greetingEl2.textContent = allDeadlinesDone ? "\u{1F63D} \u{1F63D} \u{1F63D}" : "Nice job";
        } else {
            const hour = new Date().getHours();
            const base = hour<12 ? "good morning bibi" : hour<18 ? "good afternoon bibi" : "good evening bibi";
            const followUps = hour<11
                ? ["nag breakfast na you?"]
                : hour<16
                    ? ["nag lunch na you?"]
                    : ["nag dinner na you?"];
            greetingEl.textContent = base;
            greetingEl2.textContent = allDeadlinesDone ? "\u{1F63D} \u{1F63D} \u{1F63D}" : followUps[Math.floor(Math.random()*followUps.length)];
        }
        greetingEl.classList.add("show");
        greetingEl2.classList.add("show");
    },100);
}

// Progress animation
let currentProgress = 0;
let targetProgress = 0;
let progressFrame = 0;
const prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const progressCircle = document.getElementById("progressCircle");
const circumference = 2 * Math.PI * 90; // radius is 90

let lastProgressTime = 0;
function animateProgress(ts=0){
    if (prefersReducedMotion || document.hidden || dateView.classList.contains("hidden")) {
        lastProgressTime = ts;
        progressFrame = requestAnimationFrame(animateProgress);
        return;
    }
    const dt = ts - lastProgressTime;
    lastProgressTime = ts;
    const tasks = JSON.parse(localStorage.getItem(key()))||[];
    targetProgress = tasks.length ? tasks.filter(t=>t.done).length/tasks.length : 0;
    currentProgress += (targetProgress - currentProgress) * 0.05;

    const progress = currentProgress;
    const dashLength = progress * circumference;
    const gapLength = circumference - dashLength;
    progressCircle.setAttribute("stroke-dasharray", `${dashLength} ${gapLength}`);
    progressFrame = requestAnimationFrame(animateProgress);
}
animateProgress();

// Tasks
function loadTasks(){
    todoList.innerHTML="";
    const tasks = JSON.parse(localStorage.getItem(key()))||[];
    taskHeader.textContent = currentDate.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
    tasks.forEach((t,i)=>{
        const li=document.createElement("li");
        const cb=document.createElement("div");
        cb.className="todoCheckbox"+(t.done ? " checked" : "");
        cb.onclick=()=>{ t.done=!t.done; save(tasks); };

        const wrap=document.createElement("div");
        wrap.className="todoTextWrap";
        const txt=document.createElement("span");
        txt.textContent=t.text; txt.className="todoItemText"+(t.done ? " done" : "");
        wrap.appendChild(txt);

        if(t.deadline){
            const deadlineDate=parseDeadlineDate(t.deadline);
            if(deadlineDate){
                const deadlineEl=document.createElement("span");
                deadlineEl.className="deadlineText";
                const todayStart=startOfDay(new Date());
                const deadlineEnd=endOfDay(deadlineDate);
                const dueSoonEnd=endOfDay(new Date(todayStart.getTime()+24*60*60*1000));
                if(!t.done && deadlineEnd < todayStart) deadlineEl.classList.add("overdue");
                else if(!t.done && deadlineEnd <= dueSoonEnd) deadlineEl.classList.add("dueSoon");
                deadlineEl.textContent = `Deadline: ${deadlineDate.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}`;
                wrap.appendChild(deadlineEl);
            }
        }

        const edit=document.createElement("button"); edit.className="iconBtn"; edit.innerHTML="&#9998;"; edit.setAttribute("aria-label","Edit task"); edit.title="Edit";
        edit.onclick=()=>{
            openEditModal({ dateKey: key(), taskIndex: i, text: t.text, deadline: t.deadline || "" });
        };

        const del=document.createElement("button"); del.className="iconBtn"; del.innerHTML="&#10006;"; del.setAttribute("aria-label","Delete task"); del.title="Delete";
        del.onclick=()=>{ tasks.splice(i,1); save(tasks); };

        li.append(cb,wrap,edit,del); todoList.appendChild(li);
    });
}
function save(tasks){ 
    localStorage.setItem(key(),JSON.stringify(tasks)); 
    loadTasks(); 
    updateGreeting();
}
function addTask(){ 
    if(!taskInput.value.trim()) return; 
    const tasks=JSON.parse(localStorage.getItem(key()))||[]; 
    const deadline = deadlineInput.value ? normalizeDeadlineString(deadlineInput.value) : null;
    tasks.push({text:taskInput.value.trim(), done:false, deadline}); 
    taskInput.value=""; 
    deadlineInput.value=""; 
    updateDeadlinePlaceholder();
    save(tasks);
    taskInput.focus();
}
document.getElementById("addTask").onclick = addTask;
taskInput.addEventListener("keydown", e=>e.key==="Enter" && addTask());
deadlineInput.addEventListener("keydown", e=>e.key==="Enter" && addTask());
taskInput.addEventListener("paste", (e)=>{
    const text = (e.clipboardData || window.clipboardData).getData("text");
    if(!text || !text.includes("\n")) return;
    e.preventDefault();
    const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean).map(l=>l.replace(/^[-*\u2022]\s+/, "").replace(/^\d+[.)]\s+/, "").trim()).filter(Boolean);
    if(!lines.length) return;
    const tasks = JSON.parse(localStorage.getItem(key()))||[];
    lines.forEach(line => tasks.push({text: line, done:false, deadline:null}));
    taskInput.value="";
    save(tasks);
});
document.getElementById("clearBtn").onclick = ()=>{ localStorage.removeItem(key()); loadTasks(); };

function normalizeDeadlineString(value){
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if(!match) return null;
    return value;
}

function openEditModal({dateKey, taskIndex, text, deadline}){
    editContext = {dateKey, taskIndex};
    editTaskInput.value = text || "";
    editDeadlineInput.value = deadline || "";
    editOverlay.classList.remove("hidden");
    editTaskInput.focus();
}

function closeEditModal(){
    editContext = null;
    editOverlay.classList.add("hidden");
}

editCancelBtn.onclick = closeEditModal;
editOverlay.addEventListener("click", (e)=>{ if(e.target === editOverlay) closeEditModal(); });
editSaveBtn.onclick = ()=>{
    if(!editContext) return closeEditModal();
    const tasks = JSON.parse(localStorage.getItem(editContext.dateKey)) || [];
    const task = tasks[editContext.taskIndex];
    if(task){
        const text = editTaskInput.value.trim();
        if(text) task.text = text;
        const deadline = normalizeDeadlineString(editDeadlineInput.value);
        task.deadline = deadline ? deadline : null;
        localStorage.setItem(editContext.dateKey, JSON.stringify(tasks));
        if(editContext.dateKey === key()) loadTasks();
        renderDeadlineList();
        updateGreeting();
    }
    closeEditModal();
};
document.addEventListener("keydown", (e)=>{
    if(e.key === "Escape" && !editOverlay.classList.contains("hidden")){
        closeEditModal();
    }
});

function updateDeadlinePlaceholder(){
    if(!deadlineField) return;
    deadlineField.classList.toggle("filled", !!deadlineInput.value);
}
deadlineInput.addEventListener("change", updateDeadlinePlaceholder);
deadlineInput.addEventListener("input", updateDeadlinePlaceholder);
updateDeadlinePlaceholder();

function parseDeadlineDate(value){
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if(!match) return null;
    const y = Number(match[1]);
    const m = Number(match[2]) - 1;
    const d = Number(match[3]);
    const date = new Date(y, m, d);
    return isNaN(date.getTime()) ? null : date;
}

function startOfDay(date){
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date){
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function getDeadlineTasks(){
    const items = [];
    for(let i=0; i<localStorage.length; i++){
        const k = localStorage.key(i);
        if(!k || !/^\d{4}-\d{2}-\d{2}$/.test(k)) continue;
        const tasks = JSON.parse(localStorage.getItem(k)) || [];
        tasks.forEach((t, idx)=>{
            if(!t.deadline) return;
            const d = parseDeadlineDate(t.deadline);
            if(!d) return;
            items.push({
                dateKey: k,
                taskIndex: idx,
                text: t.text,
                done: !!t.done,
                deadlineDate: d
            });
        });
    }
    items.sort((a,b)=> a.deadlineDate - b.deadlineDate);
    return items;
}

function renderDeadlineList(){
    deadlineList.innerHTML = "";
    const items = getDeadlineTasks();
    if(!items.length){
        const empty = document.createElement("li");
        empty.textContent = "No deadlines yet";
        deadlineList.appendChild(empty);
        return;
    }
    const todayStart = startOfDay(new Date());
    const dueSoonEnd = endOfDay(new Date(todayStart.getTime()+24*60*60*1000));
    items.forEach(item=>{
        const li = document.createElement("li");
        const cb = document.createElement("div");
        cb.className = "todoCheckbox" + (item.done ? " checked" : "");
        cb.onclick = (e)=>{
            e.stopPropagation();
            const tasks = JSON.parse(localStorage.getItem(item.dateKey)) || [];
            if(tasks[item.taskIndex]){
                tasks[item.taskIndex].done = !tasks[item.taskIndex].done;
                localStorage.setItem(item.dateKey, JSON.stringify(tasks));
                renderDeadlineList();
                updateGreeting();
            }
        };
        const line = document.createElement("div");
        line.className = "deadlineRowLine";
        const title = document.createElement("span");
        title.className = "deadlineTaskText";
        title.textContent = item.text;
        const badge = document.createElement("span");
        badge.className = "deadlineBadge";
        const deadlineEnd = endOfDay(item.deadlineDate);
        if(!item.done && deadlineEnd < todayStart) { badge.classList.add("overdue"); badge.textContent = "Overdue"; }
        else if(!item.done && deadlineEnd <= dueSoonEnd) { badge.classList.add("dueSoon"); badge.textContent = "Due soon"; }
        else badge.textContent = item.done ? "Done" : "Upcoming";
        line.append(title, badge);
        const meta = document.createElement("div");
        meta.className = "deadlineMeta";
        const dateLabel = item.deadlineDate.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
        meta.textContent = `${dateLabel} - ${item.dateKey}`;
        li.append(cb, line, meta);
        li.onclick = ()=>{
            currentDate = new Date(item.dateKey + "T00:00:00");
            renderDate();
            deadlineView.classList.add("hidden");
            dateView.classList.remove("hidden");
        };
        deadlineList.appendChild(li);
    });
}

// Render date
function renderDate() {
    dateBox.classList.toggle("today", isToday());
    dateBig.textContent = currentDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    weekday.textContent = currentDate.toLocaleDateString("en-US", { weekday: "long" });
    updateGreeting();
}

// Views
dateBox.onclick = ()=>{
    showView("task");
    loadTasks();
    pushView("task");
};
document.getElementById("backTaskBtn").onclick = ()=>{ showView("date"); pushView("date"); };
document.getElementById("monthViewBtn").onclick = ()=>{
    showView("month");
    renderMonth(currentDate);
    pushView("month");
};
document.getElementById("backMonthBtn").onclick = ()=>{ monthViewActive = false; showView("date"); pushView("date"); };
document.getElementById("deadlineListBtn").onclick = ()=>{
    monthViewActive = false;
    showView("deadlines");
    renderDeadlineList();
    pushView("deadlines");
};
document.getElementById("backDeadlineBtn").onclick = ()=>{ showView("date"); pushView("date"); };
document.getElementById("prevDay").onclick = () => { currentDate.setDate(currentDate.getDate()-1); renderDate(); };
document.getElementById("nextDay").onclick = () => { currentDate.setDate(currentDate.getDate()+1); renderDate(); };
document.getElementById("todayBtn").onclick = () => { currentDate=new Date(); renderDate(); };

// Month view + mini waves
let miniWaves = [];
let monthViewActive = false;
let miniFrame = 0;
let miniFrameCount = 0;

function renderMonth(date){
    monthTitle.textContent = date.toLocaleDateString("en-US",{month:"long", year:"numeric"});
    monthGrid.innerHTML = "";
    miniWaves = [];
    monthViewActive = true;

    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    const daysInMonth = new Date(date.getFullYear(), date.getMonth()+1, 0).getDate();

    for(let i=0;i<firstDay;i++) monthGrid.appendChild(document.createElement("div"));

    for(let d=1; d<=daysInMonth; d++){
        const div = document.createElement("div");
        div.className = "monthDayBox";
        const boxDate = new Date(date.getFullYear(), date.getMonth(), d);
        div.textContent = d;

        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS,"svg");
        svg.setAttribute("viewBox","0 0 100 50");
        svg.setAttribute("preserveAspectRatio","none");

        const defs = document.createElementNS(svgNS,"defs");
        const grad = document.createElementNS(svgNS, "linearGradient");
        grad.setAttribute("id", `waveGradientMini${d}`);
        grad.setAttribute("x1","0"); grad.setAttribute("y1","0");
        grad.setAttribute("x2","0"); grad.setAttribute("y2","1");

        ["#ff9ad5","#ff4fa3","#a80057"].forEach((color,idx)=>{
            const stop = document.createElementNS(svgNS,"stop");
            stop.setAttribute("offset", idx===0 ? "0%" : idx===1 ? "50%" : "100%");
            stop.setAttribute("stop-color", color);
            stop.setAttribute("stop-opacity", idx===0 ? "0.8" : idx===1 ? "0.6" : "0.4");
            grad.appendChild(stop);
        });

        defs.appendChild(grad);
        svg.appendChild(defs);

        const path = document.createElementNS(svgNS,"path");
        path.setAttribute("fill", `url(#waveGradientMini${d})`);
        svg.appendChild(path);
        div.appendChild(svg);

        div.dataset.date = boxDate.toISOString().split("T")[0];

        const tooltip = document.createElement("div");
        tooltip.className = "tooltip";
        div.appendChild(tooltip);

        miniWaves.push({path, boxDate, currentFill:0, t:Math.random()*10, tooltip});

        div.onclick = ()=>{ currentDate = boxDate; renderDate(); monthView.classList.add("hidden"); dateView.classList.remove("hidden"); };

        monthGrid.appendChild(div);
    }

    scrollToToday();
    if (!miniFrame) animateMiniWaves();
}

function animateMiniWaves(){
    if (!monthViewActive || document.hidden || prefersReducedMotion || isMobile) { miniFrame = 0; return; }
    miniFrame = requestAnimationFrame(animateMiniWaves);
    miniFrameCount = (miniFrameCount + 1) % 12;
    const updateTooltip = miniFrameCount === 0;
    miniWaves.forEach(obj=>{
        obj.t += 0.03;
        const {path, boxDate, tooltip} = obj;
        const tasks = JSON.parse(localStorage.getItem(boxDate.toISOString().split("T")[0])) || [];
        const targetFill = tasks.length ? tasks.filter(t=>t.done).length / tasks.length : 0;

        obj.currentFill += (targetFill - obj.currentFill)*0.05;
        const fill = obj.currentFill;

        const base = 50*(1-fill);
        const parts = [`M0 50 L0 ${base}`];
        for(let i=0;i<=miniSamples;i++){
            const t = i / miniSamples;
            const edgeDamp = Math.sin(t * Math.PI);
            const x = t * 100;
            const y = base + Math.sin(obj.t + i*0.2)*2.0*edgeDamp + Math.sin(obj.t*0.7 + i*0.1)*1.4*edgeDamp;
            parts.push(`${x} ${y}`);
        }
        parts.push("L100 50 Z");
        path.setAttribute("d", parts.join(" "));

        if(updateTooltip){
            const todayStart = startOfDay(new Date());
            const overdueCount = tasks.filter(t=>{
                if(!t.deadline || t.done) return false;
                const d = parseDeadlineDate(t.deadline);
                if(!d) return false;
                return endOfDay(d) < todayStart;
            }).length;
            tooltip.textContent = tasks.length ? `${tasks.filter(t=>t.done).length}/${tasks.length} done${overdueCount ? ` - ${overdueCount} overdue` : ""}` : "No tasks";
        }
    });
}

// Scroll month view to today
function scrollToToday(){
    const todayKey = new Date().toISOString().split("T")[0];
    const todayBox = [...monthGrid.children].find(div => div.dataset && div.dataset.date === todayKey);
    if(todayBox){
        todayBox.scrollIntoView({behavior:"smooth", inline:"center"});
    }
}

renderDate();

document.addEventListener("keydown", (e)=>{
    if (editOverlay && !editOverlay.classList.contains("hidden")) return;
    const active = document.activeElement;
    if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) return;
    if (dateView.classList.contains("hidden")) return;
    if (e.key === "ArrowLeft") { currentDate.setDate(currentDate.getDate()-1); renderDate(); }
    if (e.key === "ArrowRight") { currentDate.setDate(currentDate.getDate()+1); renderDate(); }
});

// --- Export / Import / Versioning & Service Worker update flow ---
const CURRENT_VERSION = '2';
(function ensureVersion(){
  try{
    const ver = localStorage.getItem('sammy_version');
    if(!ver) {
      localStorage.setItem('sammy_version', CURRENT_VERSION);
    } else if (ver !== CURRENT_VERSION){
      // placeholder for migrations from older versions
      // add migration logic here when format changes
      localStorage.setItem('sammy_version', CURRENT_VERSION);
    }
  }catch(e){ console.warn('version check failed', e); }
})();

const exportBtn = document.getElementById('exportBtn');
const importFile = document.getElementById('importFile');
const updateBanner = document.getElementById('updateBanner');
const updateBtn = document.getElementById('updateBtn');
const dismissUpdateBtn = document.getElementById('dismissUpdateBtn');
let pendingSWRegistration = null;

function exportData(){
  const data = {};
  for(let i=0;i<localStorage.length;i++){
    const k = localStorage.key(i);
    if(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(k) || k.startsWith('sammy') ){
      data[k]=localStorage.getItem(k);
    }
  }
  const blob = new Blob([JSON.stringify(data)],{type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'sammy-backup.json';
  a.click();
}

function mergeTasks(existing, incoming){
  const map = new Map();
  existing.forEach(t=> map.set((t.text||'')+'|'+(t.deadline||''), t));
  incoming.forEach(t=>{ const key=(t.text||'')+'|'+(t.deadline||''); if(!map.has(key)) map.set(key,t); });
  return Array.from(map.values());
}

function importDataFromObject(obj){
  try{
    Object.entries(obj).forEach(([k,v])=>{
      if(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(k)){
        let incoming = [];
        try{ incoming = JSON.parse(v); }catch(e){ return; }
        const existing = JSON.parse(localStorage.getItem(k)||'[]');
        const merged = mergeTasks(existing, incoming);
        localStorage.setItem(k, JSON.stringify(merged));
      } else if (!localStorage.getItem(k)){
        localStorage.setItem(k, v);
      }
    });
    // refresh UI
    renderDate();
    if(!dateView.classList.contains('hidden')) loadTasks();
    renderDeadlineList();
    alert('Import complete — data merged where appropriate.');
  }catch(e){ alert('Import failed: invalid file'); }
}

importFile && importFile.addEventListener('change', (e)=>{
  const f = e.target.files && e.target.files[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const obj = JSON.parse(reader.result);
      if(confirm('Import will merge data from file into local data. Proceed?')){
        importDataFromObject(obj);
      }
    }catch(err){ alert('Invalid JSON file'); }
  };
  reader.readAsText(f);
});

exportBtn && (exportBtn.onclick = ()=>{
  exportData();
});

// Service worker: register and show update banner when new SW is waiting
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js')
    .then(reg => {
      // if there's already a waiting SW, show update
      if (reg.waiting) {
        pendingSWRegistration = reg;
        updateBanner.classList.remove('hidden');
      }

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed') {
            // a new SW is installed and waiting to activate
            pendingSWRegistration = reg;
            updateBanner.classList.remove('hidden');
          }
        });
      });

      // periodic check
      reg.update();
      setInterval(() => reg.update(), 30 * 60 * 1000);
      window.addEventListener('focus', () => reg.update());
    })
    .catch(err => console.error('SW registration failed:', err));

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

updateBtn && (updateBtn.onclick = ()=>{
  if(!pendingSWRegistration) return;
  // Suggest export before update
  if(confirm('It is recommended to export your data before updating. Export now?')){
    exportData();
  }
  const worker = pendingSWRegistration.waiting || pendingSWRegistration.installing;
  if(worker) worker.postMessage({type:'SKIP_WAITING'});
});

dismissUpdateBtn && (dismissUpdateBtn.onclick = ()=>{
  updateBanner.classList.add('hidden');
});

