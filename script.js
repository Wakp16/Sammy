let currentDate = new Date();

const dateBox = document.getElementById("dateBox");
const dateBig = document.getElementById("dateBig");
const weekday = document.getElementById("weekday");
const wavePath = document.getElementById("wavePath");
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

let editContext = null;

// Initial view
dateView.classList.remove("hidden");
taskView.classList.add("hidden");
monthView.classList.add("hidden");
deadlineView.classList.add("hidden");

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
            greetingEl2.textContent = allDeadlinesDone ? "All deadlines done!" : "😼😼😼";
        } else {
            const hour = new Date().getHours();
            const base = hour<12?"good morning bibi":hour<18?"good afternoon bibi":"good evening bibi";
            const followUps = hour<11
                ? ["nag breakfast na you?"]
                : hour<16
                    ? ["nag lunch na you?"]
                    : ["nag dinner na you?"];
            greetingEl.textContent = base;
            greetingEl2.textContent = allDeadlinesDone ? "All deadlines done!" : followUps[Math.floor(Math.random()*followUps.length)];
        }
        greetingEl.classList.add("show");
        greetingEl2.classList.add("show");
    },100);
}

// Wave animation
let t=0, currentFill=0, targetFill=0;
function animateWave(){
    t+=0.03;
    const tasks = JSON.parse(localStorage.getItem(key()))||[];
    targetFill = tasks.length ? tasks.filter(t=>t.done).length/tasks.length : 0;
    currentFill += (targetFill-currentFill)*0.05;

    const boxHeight = dateBox.offsetHeight;
    const waveBase = (1-currentFill)*boxHeight;
    wavePath.setAttribute("fill","url(#waveGradient)");

    let d=`M0 ${boxHeight} L0 ${waveBase} `;
    for(let i=0;i<=200;i++){
        let x=(i/200)*1440, edgeDamp=Math.sin((i/200)*Math.PI);
        let y=waveBase + Math.sin(t+i*0.05)*8*edgeDamp + Math.sin(t*0.7+i*0.1)*5*edgeDamp + Math.sin(t*2.2+i*0.03)*3*edgeDamp;
        d+=`${x} ${y} `;
    }
    d+=`L1440 ${boxHeight} L0 ${boxHeight} Z`;
    wavePath.setAttribute("d",d);
    requestAnimationFrame(animateWave);
}
animateWave();

// Tasks
function loadTasks(){
    todoList.innerHTML="";
    const tasks = JSON.parse(localStorage.getItem(key()))||[];
    taskHeader.textContent = currentDate.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
    tasks.forEach((t,i)=>{
        const li=document.createElement("li");
        const cb=document.createElement("div");
        cb.className="todoCheckbox"+(t.done?" checked":"");
        cb.onclick=()=>{ t.done=!t.done; save(tasks); };

        const wrap=document.createElement("div");
        wrap.className="todoTextWrap";
        const txt=document.createElement("span");
        txt.textContent=t.text; txt.className="todoItemText"+(t.done?" done":"");
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

        const edit=document.createElement("button"); edit.textContent="✎"; edit.className="iconBtn";
        edit.onclick=()=>{
            openEditModal({ dateKey: key(), taskIndex: i, text: t.text, deadline: t.deadline || "" });
        };

        const del=document.createElement("button"); del.textContent="✕"; del.className="iconBtn";
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
    save(tasks);
}
document.getElementById("addTask").onclick = addTask;
taskInput.addEventListener("keydown", e=>e.key==="Enter" && addTask());
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
        meta.textContent = `${dateLabel} • ${item.dateKey}`;
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
dateBox.onclick = ()=>{ dateView.classList.add("hidden"); taskView.classList.remove("hidden"); monthView.classList.add("hidden"); deadlineView.classList.add("hidden"); loadTasks(); };
document.getElementById("backTaskBtn").onclick = ()=>{ taskView.classList.add("hidden"); dateView.classList.remove("hidden"); };
document.getElementById("monthViewBtn").onclick = ()=>{
    monthView.classList.remove("hidden");
    dateView.classList.add("hidden");
    taskView.classList.add("hidden");
    deadlineView.classList.add("hidden");
    renderMonth(currentDate);
};
document.getElementById("backMonthBtn").onclick = ()=>{ monthView.classList.add("hidden"); dateView.classList.remove("hidden"); };
document.getElementById("deadlineListBtn").onclick = ()=>{
    deadlineView.classList.remove("hidden");
    dateView.classList.add("hidden");
    taskView.classList.add("hidden");
    monthView.classList.add("hidden");
    renderDeadlineList();
};
document.getElementById("backDeadlineBtn").onclick = ()=>{ deadlineView.classList.add("hidden"); dateView.classList.remove("hidden"); };
document.getElementById("prevDay").onclick = () => { currentDate.setDate(currentDate.getDate()-1); renderDate(); };
document.getElementById("nextDay").onclick = () => { currentDate.setDate(currentDate.getDate()+1); renderDate(); };
document.getElementById("todayBtn").onclick = () => { currentDate=new Date(); renderDate(); };

// Month view + mini waves
let miniWaves = [];

function renderMonth(date){
    monthTitle.textContent = date.toLocaleDateString("en-US",{month:"long", year:"numeric"});
    monthGrid.innerHTML = "";
    miniWaves = [];

    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    const daysInMonth = new Date(date.getFullYear(), date.getMonth()+1, 0).getDate();

    for(let i=0;i<firstDay;i++) monthGrid.appendChild(document.createElement("div"));

    for(let d=1; d<=daysInMonth; d++){
        const div = document.createElement("div");
        div.className = "monthDayBox dateGlow";
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
            stop.setAttribute("offset", idx===0?"0%":idx===1?"50%":"100%");
            stop.setAttribute("stop-color", color);
            stop.setAttribute("stop-opacity", idx===0?"0.8":idx===1?"0.6":"0.4");
            grad.appendChild(stop);
        });

        defs.appendChild(grad);
        svg.appendChild(defs);

        const path = document.createElementNS(svgNS,"path");
        path.setAttribute("fill", `url(#waveGradientMini${d})`);
        svg.appendChild(path);
        div.appendChild(svg);

        const tooltip = document.createElement("div");
        tooltip.className = "tooltip";
        div.appendChild(tooltip);

        miniWaves.push({path, boxDate, currentFill:0, t:Math.random()*10, tooltip});

        div.onclick = ()=>{ currentDate = boxDate; renderDate(); monthView.classList.add("hidden"); dateView.classList.remove("hidden"); };

        monthGrid.appendChild(div);
    }

    scrollToToday();
}

function animateMiniWaves(){
    miniWaves.forEach(obj=>{
        obj.t += 0.05;
        const {path, boxDate, tooltip} = obj;
        const tasks = JSON.parse(localStorage.getItem(boxDate.toISOString().split("T")[0])) || [];
        const targetFill = tasks.length ? tasks.filter(t=>t.done).length / tasks.length : 0;

        obj.currentFill += (targetFill - obj.currentFill)*0.05;
        const fill = obj.currentFill;

        let d = `M0 50 L0 ${50*(1-fill)} `;
        for(let i=0;i<=100;i++){
            const edgeDamp = Math.sin((i/100)*Math.PI);
            const y = 50*(1-fill) + Math.sin(obj.t + i*0.2)*3*edgeDamp + Math.sin(obj.t*0.7 + i*0.1)*2*edgeDamp;
            d += `${i} ${y} `;
        }
        d += "L100 50 Z";
        path.setAttribute("d",d);

        const todayStart = startOfDay(new Date());
        const overdueCount = tasks.filter(t=>{
            if(!t.deadline || t.done) return false;
            const d = parseDeadlineDate(t.deadline);
            if(!d) return false;
            return endOfDay(d) < todayStart;
        }).length;
        tooltip.textContent = tasks.length ? `${tasks.filter(t=>t.done).length}/${tasks.length} done${overdueCount ? ` • ${overdueCount} overdue` : ""}` : "No tasks";
    });
    requestAnimationFrame(animateMiniWaves);
}
animateMiniWaves();

// Scroll month view to today
function scrollToToday(){
    const todayBox = [...monthGrid.children].find(div => div.boxDate && new Date(div.boxDate).toDateString() === new Date().toDateString());
    if(todayBox){
        todayBox.scrollIntoView({behavior:"smooth", inline:"center"});
    }
}

renderDate();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js')
    .then(reg => {
      if (reg.waiting) {
        reg.waiting.postMessage({ type: "SKIP_WAITING" });
      }
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            newWorker.postMessage({ type: "SKIP_WAITING" });
          }
        });
      });
    })
    .catch(err => console.error("SW registration failed:", err));

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    window.location.reload();
  });
}
