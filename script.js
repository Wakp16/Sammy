let currentDate = new Date();

const dateBox = document.getElementById("dateBox");
const dateBig = document.getElementById("dateBig");
const weekday = document.getElementById("weekday");
const wavePath = document.getElementById("wavePath");
const taskView = document.getElementById("taskView");
const todoList = document.getElementById("todoList");
const taskInput = document.getElementById("taskInput");
const greetingEl = document.getElementById("greeting");
const taskHeader = document.getElementById("taskHeader");
const dateView = document.getElementById("dateView");
const monthView = document.getElementById("monthView");
const monthTitle = document.getElementById("monthTitle");
const monthGrid = document.getElementById("monthGrid");

// Initial view
dateView.classList.remove("hidden");
taskView.classList.add("hidden");
monthView.classList.add("hidden");

function key(date=currentDate){ return date.toISOString().split("T")[0]; }
function isToday(){ return new Date().toDateString()===currentDate.toDateString(); }

function updateGreeting(){
    const tasks = JSON.parse(localStorage.getItem(key()))||[];
    greetingEl.classList.remove("show");
    setTimeout(()=>{
        if(tasks.length && tasks.every(t=>t.done)) greetingEl.textContent="Wow sipag";
        else{
            const hour = new Date().getHours();
            greetingEl.textContent = hour<12?"Good morning Sammy":hour<18?"Good afternoon Sammy":"Good evening Sammy";
        }
        greetingEl.classList.add("show");
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
        const txt=document.createElement("span");
        txt.textContent=t.text; txt.className="todoItemText"+(t.done?" done":"");
        const edit=document.createElement("button"); edit.textContent="✎"; edit.className="iconBtn";
        edit.onclick=()=>{ const v=prompt("Edit task",t.text); if(v){t.text=v; save(tasks);} };
        const del=document.createElement("button"); del.textContent="✕"; del.className="iconBtn";
        del.onclick=()=>{ tasks.splice(i,1); save(tasks); };
        li.append(cb,txt,edit,del); todoList.appendChild(li);
    });
}
function save(tasks){ 
    localStorage.setItem(key(),JSON.stringify(tasks)); 
    loadTasks(); 
}
function addTask(){ 
    if(!taskInput.value.trim()) return; 
    const tasks=JSON.parse(localStorage.getItem(key()))||[]; 
    tasks.push({text:taskInput.value, done:false}); 
    taskInput.value=""; 
    save(tasks);
}
document.getElementById("addTask").onclick = addTask;
taskInput.addEventListener("keydown", e=>e.key==="Enter" && addTask());
document.getElementById("clearBtn").onclick = ()=>{ localStorage.removeItem(key()); loadTasks(); };

// Render date
function renderDate() {
    dateBox.classList.toggle("today", isToday());
    dateBig.textContent = currentDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    weekday.textContent = currentDate.toLocaleDateString("en-US", { weekday: "long" });
    updateGreeting();
}

// Views
dateBox.onclick = ()=>{ dateView.classList.add("hidden"); taskView.classList.remove("hidden"); monthView.classList.add("hidden"); loadTasks(); };
document.getElementById("backTaskBtn").onclick = ()=>{ taskView.classList.add("hidden"); dateView.classList.remove("hidden"); };
document.getElementById("monthViewBtn").onclick = ()=>{
    monthView.classList.remove("hidden");
    dateView.classList.add("hidden");
    taskView.classList.add("hidden");
    renderMonth(currentDate);
};
document.getElementById("backMonthBtn").onclick = ()=>{ monthView.classList.add("hidden"); dateView.classList.remove("hidden"); };
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

        tooltip.textContent = tasks.length ? `${tasks.filter(t=>t.done).length}/${tasks.length} done` : "No tasks";
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
    .then(() => console.log("Service Worker registered"))
    .catch(err => console.error("SW registration failed:", err));
}
