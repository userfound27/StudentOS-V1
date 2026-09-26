import { useEffect, useRef, useState } from "react";
import type { ReactNode, Dispatch, SetStateAction } from "react";
import { supabase } from "./lib/supabase";
import { ArrowUpRight, BookOpen, CalendarDays, Check, ChevronRight, Clock3, Command, Flame, Gauge, GraduationCap, LayoutDashboard, Menu, Pencil, Plus, LogOut, Settings, Sparkles, Target, Trash2, Trophy, TrendingUp, Upload, UserRound, X, Zap } from "lucide-react";

type Page = "dashboard" | "study" | "exams" | "scores" | "focus" | "journey" | "settings";
type Task = { id:number; title:string; subject:string; date:string; done:boolean; minutes:number };
type ExamLesson = { id:number; title:string; done:boolean };
type Exam = { id:number; name:string; subject:string; date:string; portion:string; progress:number; lessons:ExamLesson[]; revisionRounds:number; practiceTests:number; confidence:number; weakAreas:string };
type Score = { id:number; subject:string; test:string; obtained:number; max:number; date:string };
const today = (()=>{const d=new Date();const local=new Date(d.getTime()-d.getTimezoneOffset()*60000);return local.toISOString().slice(0,10)})();
const seedTasks:Task[]=[
 {id:1,title:"Quadratic equations practice",subject:"Maths",date:today,done:false,minutes:45},
 {id:2,title:"Revise electricity notes",subject:"Science",date:today,done:true,minutes:30},
 {id:3,title:"Read English chapter",subject:"English",date:today,done:false,minutes:25},
 {id:4,title:"SST map practice",subject:"SST",date:today,done:false,minutes:35}
];
const seedExams:Exam[]=[
 {id:1,name:"Maths Unit Test",subject:"Maths",date:"2026-10-02",portion:"Quadratic Equations, Arithmetic Progressions",progress:0,lessons:[{id:101,title:"Quadratic Equations",done:false},{id:102,title:"Arithmetic Progressions",done:false}],revisionRounds:0,practiceTests:0,confidence:0,weakAreas:""},
 {id:2,name:"Science Term Assessment",subject:"Science",date:"2026-10-09",portion:"Electricity, Magnetic Effects",progress:0,lessons:[{id:201,title:"Electricity",done:false},{id:202,title:"Magnetic Effects",done:false}],revisionRounds:0,practiceTests:0,confidence:0,weakAreas:""}
];
const seedScores:Score[]=[
 {id:1,subject:"Science",test:"Periodic Test",obtained:34,max:40,date:"2026-09-10"},
 {id:2,subject:"SST",test:"Periodic Test",obtained:37,max:40,date:"2026-09-10"},
 {id:3,subject:"English",test:"Periodic Test",obtained:37,max:40,date:"2026-09-10"}
];

type SavedData = { tasks:Task[]; exams:Exam[]; scores:Score[]; journey:string; classLevel:string; displayName:string; avatarUrl:string };
declare global { interface Window { __studentosData?: SavedData; __studentosEmail?: string; __studentosUserId?: string; __studentosUpdate?:()=>Promise<void> } }


function normalizeExam(exam:Partial<Exam>):Exam{
 const rawLessons=Array.isArray(exam.lessons)?exam.lessons:[];
 const lessons=rawLessons.length?rawLessons.map((l,i)=>({id:Number(l.id)||Date.now()+i,title:String(l.title||"Untitled lesson"),done:Boolean(l.done)})):String(exam.portion||"").split(",").map((title,i)=>({id:Date.now()+i,title:title.trim(),done:false})).filter(l=>l.title);
 const progress=lessons.length?Math.round(lessons.filter(l=>l.done).length/lessons.length*100):0;
 return {id:Number(exam.id)||Date.now(),name:String(exam.name||"New exam"),subject:String(exam.subject||"Other"),date:String(exam.date||today),portion:String(exam.portion||lessons.map(l=>l.title).join(", ")),progress,lessons,revisionRounds:Math.max(0,Number(exam.revisionRounds)||0),practiceTests:Math.max(0,Number(exam.practiceTests)||0),confidence:Math.min(5,Math.max(0,Number(exam.confidence)||0)),weakAreas:String(exam.weakAreas||"")};
}
function blankData():SavedData{
 return {tasks:seedTasks.map(x=>({...x})),exams:seedExams.map(x=>normalizeExam(x)),scores:seedScores.map(x=>({...x})),journey:"Make meaningful progress",classLevel:"",displayName:"Student",avatarUrl:""};
}

async function loadCloudData(userId:string):Promise<SavedData>{
 if(!supabase) return blankData();
 const {data,error}=await supabase.from("studentos_profiles").select("data").eq("id",userId).maybeSingle();
 if(error){console.error(error);return blankData();}
 if(!data?.data)return blankData();
 const merged={...blankData(),...(data.data as Partial<SavedData>)};
 return {...merged,exams:(merged.exams||[]).map(e=>normalizeExam(e))};
}

async function saveCloudData(userId:string,data:SavedData){
 if(!supabase) return;
 const {error}=await supabase.from("studentos_profiles").upsert({id:userId,data,updated_at:new Date().toISOString()});
 if(error) console.error(error);
}

function StudentOSApp({mode,onExit,onSignIn,onDeleteAccount}:{mode:"anonymous"|"account";onExit:()=>Promise<void>|void;onSignIn:()=>void;onDeleteAccount:()=>Promise<string>}){
 const [page,setPage]=useState<Page>(()=>{const saved=sessionStorage.getItem("studentos-page");return saved&&["dashboard","study","exams","scores","focus","journey","settings"].includes(saved)?saved as Page:"dashboard"}),[sidebarCollapsed,setSidebarCollapsed]=useState(true),[selectedExamId,setSelectedExamId]=useState<number|null>(null);
 const initial=window.__studentosData||blankData();
 const [tasks,setTasks]=useState(initial.tasks),[exams,setExams]=useState(initial.exams),[scores,setScores]=useState(initial.scores);
 const [journey,setJourney]=useState(initial.journey),[classLevel,setClassLevel]=useState(initial.classLevel||""),[displayName,setDisplayName]=useState(initial.displayName||"Student"),[avatarUrl,setAvatarUrl]=useState(initial.avatarUrl||""),[showTask,setShowTask]=useState(false),[editingTask,setEditingTask]=useState<Task|null>(null),[showScore,setShowScore]=useState(false),[showExam,setShowExam]=useState(false);
 const [focusSeconds,setFocusSeconds]=useState(1500),[focusMinutes,setFocusMinutes]=useState(25),[focusRunning,setFocusRunning]=useState(false),[focusTaskTitle,setFocusTaskTitle]=useState(""),[accountError,setAccountError]=useState("");
 useEffect(()=>{
  if(mode!=="account"||!window.__studentosUserId)return;
  const payload={tasks,exams,scores,journey,classLevel,displayName,avatarUrl};
  const timer=window.setTimeout(()=>{void saveCloudData(window.__studentosUserId!,payload)},250);
  return()=>window.clearTimeout(timer);
 },[mode,tasks,exams,scores,journey,classLevel,displayName,avatarUrl]);
 useEffect(()=>{if(!focusRunning)return;const timer=window.setInterval(()=>setFocusSeconds(s=>{if(s<=1){setFocusRunning(false);return focusMinutes*60}return s-1}),1000);return()=>window.clearInterval(timer)},[focusRunning,focusMinutes]);
 useEffect(()=>{window.__studentosUpdate=async()=>{if(!("serviceWorker" in navigator))return false;const registration=await navigator.serviceWorker.getRegistration();if(!registration)return false;const previousWaiting=registration.waiting;await registration.update();const installing=registration.installing;if(installing){await new Promise<void>(resolve=>{const done=()=>{if(installing.state==="installed"||installing.state==="redundant"){installing.removeEventListener("statechange",done);resolve()}};installing.addEventListener("statechange",done);});}const waiting=registration.waiting;if(!waiting||waiting===previousWaiting)return false;sessionStorage.setItem("studentos-page",page);waiting.postMessage({type:"SKIP_WAITING"});await new Promise<void>(resolve=>{const timer=window.setTimeout(resolve,5000);navigator.serviceWorker.addEventListener("controllerchange",()=>{window.clearTimeout(timer);resolve()},{once:true})});window.location.reload();return true};return()=>{delete window.__studentosUpdate}},[page]);
 useEffect(()=>{sessionStorage.setItem("studentos-page",page)},[page]);
 const completed=tasks.filter(t=>t.done).length;
 const scoreAverage=scores.length?Math.round(scores.reduce((a,s)=>a+s.obtained/s.max,0)/scores.length*100):0;
 const navigate=(p:Page)=>{setPage(p);setMobileNav(false)}; const profileAction=()=>{navigate("settings")};
 const saveProfile=async(name:string,file?:File)=>{if(mode!=="account"||!supabase||!window.__studentosUserId)return "Sign in to update your profile.";const nextName=name.trim().slice(0,60);if(!nextName)return "Enter a display name.";let nextAvatar=avatarUrl;if(file){const allowed=["image/jpeg","image/png","image/webp","image/gif"];if(!allowed.includes(file.type))return "Choose a JPG, PNG, WebP, or GIF image.";if(file.size>5*1024*1024)return "Choose an image smaller than 5 MB.";const path=window.__studentosUserId+"/avatar";const bucket=supabase.storage.from("studentos-avatars");const {error:uploadError}=await bucket.upload(path,file,{upsert:true,contentType:file.type,cacheControl:"3600"});if(uploadError)return "Image upload failed: "+uploadError.message;const {data:urlData}=bucket.getPublicUrl(path);nextAvatar=urlData.publicUrl+"?v="+Date.now();}const {error:authError}=await supabase.auth.updateUser({data:{display_name:nextName,avatar_url:nextAvatar}});if(authError)return "Profile save failed: "+authError.message;setDisplayName(nextName);setAvatarUrl(nextAvatar);return "";};
 return <div className="app-shell">
  <button className={"sidebar-toggle "+(sidebarCollapsed?"is-closed":"is-open")} aria-label={sidebarCollapsed?"Open navigation":"Close navigation"} aria-expanded={!sidebarCollapsed} onClick={()=>setSidebarCollapsed(v=>!v)}>
   <span className="toggle-icon toggle-menu"><Menu size={21}/></span><span className="toggle-icon toggle-close"><X size={21}/></span>
  </button>
  <aside className={"sidebar "+(sidebarCollapsed?"collapsed":"")}>
   <div className="brand"><div className="brand-mark"><Command size={19}/></div><div><strong>StudentOS</strong><span>your school operating system</span></div></div>
   <nav>
    <NavItem icon={<LayoutDashboard size={18}/>} label="Dashboard" active={page==="dashboard"} onClick={()=>navigate("dashboard")}/>
    <NavItem icon={<BookOpen size={18}/>} label="Study" active={page==="study"} onClick={()=>navigate("study")}/>
    <NavItem icon={<CalendarDays size={18}/>} label="Exams" active={page==="exams"} onClick={()=>navigate("exams")}/>
    <NavItem icon={<TrendingUp size={18}/>} label="Scores" active={page==="scores"} onClick={()=>navigate("scores")}/>
    <NavItem icon={<Clock3 size={18}/>} label="Focus" active={page==="focus"} onClick={()=>navigate("focus")}/>
    <NavItem icon={<Target size={18}/>} label="Journey" active={page==="journey"} onClick={()=>navigate("journey")}/>
   </nav>
   <div className="sidebar-bottom"><div className="free-pill"><Zap size={15}/> Pricing</div><NavItem icon={<Settings size={18}/>} label="Settings" active={page==="settings"} onClick={()=>navigate("settings")}/></div>
  </aside>
  {!sidebarCollapsed&&<button className="mobile-sidebar-backdrop" aria-label="Close navigation" onClick={()=>setSidebarCollapsed(true)}/>}
  <main className="main">
   <header className="topbar"><div><div className="eyebrow">STUDENTOS</div><h1>{pageTitle(page)}</h1></div><div className="top-actions"><div className="mode-badge"><span className="dot"/>{mode==="account"?"Saved account":"Anonymous session"}</div><button className="avatar" onClick={profileAction} title="Open profile settings">{avatarUrl?<img src={avatarUrl} alt="Profile"/>:displayName.slice(0,1).toUpperCase()||"S"}</button></div></header>
   <div className="content">
    {page==="dashboard"&&<Dashboard journey={journey} classLevel={classLevel} completed={completed} tasks={tasks} exams={exams} scoreAverage={scoreAverage} navigate={navigate} setTasks={setTasks} onAddTask={()=>setShowTask(true)} onEditTask={setEditingTask} onDeleteTask={id=>setTasks(all=>all.filter(x=>x.id!==id))}/>} 
    {page==="study"&&<Study tasks={tasks} setTasks={setTasks} onAdd={()=>setShowTask(true)} onEditTask={setEditingTask} onDeleteTask={id=>setTasks(all=>all.filter(x=>x.id!==id))} onFocus={task=>{setFocusTaskTitle(task.title);setFocusMinutes(task.minutes);setFocusSeconds(task.minutes*60);setFocusRunning(false);setPage("focus")}}/>}
    {page==="exams"&&<Exams exams={exams} setExams={setExams} onAdd={()=>setShowExam(true)} selectedExamId={selectedExamId} setSelectedExamId={setSelectedExamId}/>}
    {page==="scores"&&<Scores scores={scores} setScores={setScores} onAdd={()=>setShowScore(true)}/>}
    {page==="focus"&&<Focus seconds={focusSeconds} minutes={focusMinutes} setMinutes={setFocusMinutes} running={focusRunning} setRunning={setFocusRunning} taskTitle={focusTaskTitle} reset={(minutes)=>{setFocusRunning(false);setFocusSeconds((minutes??focusMinutes)*60)}}/>}
    {page==="journey"&&<Journey journey={journey} setJourney={setJourney} completed={completed} exams={exams} scoreAverage={scoreAverage}/>}
    {page==="settings"&&<SettingsPage journey={journey} setJourney={setJourney} classLevel={classLevel} setClassLevel={setClassLevel} mode={mode} displayName={displayName} avatarUrl={avatarUrl} onProfileSave={saveProfile} onLogout={onExit} onDeleteAccount={onDeleteAccount} onSignIn={()=>{if(!supabase){setAccountError("Supabase is not connected yet. Sign up & sync will be available after the StudentOS Supabase environment is configured.");return;}setAccountError("");onSignIn()}} accountError={accountError}/>}
   </div>
  </main>
  {showTask&&<TaskModal close={()=>{setShowTask(false);setEditingTask(null)}} add={t=>{setTasks(x=>[...x,t]);setShowTask(false)}}/>}
  {editingTask&&<TaskModal task={editingTask} close={()=>setEditingTask(null)} save={updated=>{setTasks(all=>all.map(x=>x.id===updated.id?updated:x));setEditingTask(null)}}/>}
  {showScore&&<ScoreModal close={()=>setShowScore(false)} add={s=>{setScores(x=>[...x,s]);setShowScore(false)}}/>}
  {showExam&&<ExamModal close={()=>setShowExam(false)} add={e=>{setExams(x=>[...x,e]);setShowExam(false)}}/>}
 </div>
}

function FeatureCard(p:{number:string;icon:ReactNode;title:string;text:string}){return <article className="feature-card"><div className="feature-top"><span>{p.number}</span><div className="feature-icon">{p.icon}</div></div><h4>{p.title}</h4><p>{p.text}</p><div className="feature-line"/></article>}
function NavItem(p:{icon:ReactNode;label:string;active:boolean;onClick:()=>void}){return <button className={p.active?"nav-item active":"nav-item"} onClick={p.onClick}>{p.icon}<span>{p.label}</span>{p.active&&<ChevronRight size={15}/>}</button>}
function Dashboard(p:{journey:string;classLevel:string;completed:number;tasks:Task[];exams:Exam[];scoreAverage:number;navigate:(x:Page)=>void;setTasks:Dispatch<SetStateAction<Task[]>>;onAddTask:()=>void;onEditTask:(task:Task)=>void;onDeleteTask:(id:number)=>void}){
 const todayTasks=p.tasks.filter(t=>t.date===today);
 return <div className="stack">
  <section className="hero-card"><div><div className="hero-kicker"><Sparkles size={15}/> YOUR PERSONAL OPERATING SYSTEM FOR SCHOOL</div><h2>Here’s what matters today.</h2><p>Your tasks, next exam, and current goal — without making you hunt for them.</p><button className="primary-btn" onClick={()=>p.navigate("study")}>Open today's plan <ChevronRight size={17}/></button></div><div className="hero-orbit"><div><GraduationCap size={34}/><strong>{p.classLevel||"—"}</strong><span>{p.classLevel?"Class / Grade":"Set your class"}</span></div></div></section>
  <div className="section-heading"><div><h3>Today</h3><p>Start here. Everything else can wait.</p></div><button className="ghost-btn" onClick={p.onAddTask}><Plus size={16}/> Add task</button></div>
  <section className="stats-grid"><Stat icon={<Target/>} label="Main priority" value={p.journey}/><Stat icon={<Check/>} label="Study tasks" value={p.completed+"/"+p.tasks.length+" complete"}/><Stat icon={<TrendingUp/>} label="Score average" value={p.scoreAverage+"%"}/><Stat icon={<CalendarDays/>} label="Upcoming exams" value={String(p.exams.length)}/></section>
  <div className="two-col">
   <section className="panel"><div className="panel-head"><div><h3>Today's study plan</h3><p>{todayTasks.length} sessions scheduled</p></div><button className="text-btn" onClick={()=>p.navigate("study")}>View all</button></div><div className="task-list">{todayTasks.map(t=><TaskRow key={t.id} task={t} toggle={()=>p.setTasks(all=>all.map(x=>x.id===t.id?{...x,done:!x.done}:x))} onEdit={()=>p.onEditTask(t)} onDelete={()=>p.onDeleteTask(t.id)}/>)}</div></section>
   <section className="panel"><div className="panel-head"><div><h3>Upcoming exams</h3><p>See what is coming and how ready you are.</p></div><button className="text-btn" onClick={()=>p.navigate("exams")}>View all</button></div>{p.exams.map(e=><div className="exam-mini" key={e.id}><div className="date-box"><strong>{new Date(e.date+"T12:00:00").getDate()}</strong><span>{new Date(e.date+"T12:00:00").toLocaleString("en",{month:"short"})}</span></div><div className="grow"><strong>{e.name}</strong><span>{e.subject+" · "+e.progress+"% prepared"}</span><div className="progress"><i style={{width:e.progress+"%"}}/></div></div></div>)}</section>
  </div>
  <section className="mission-strip"><div className="mission-icon"><Flame size={22}/></div><div><span>YOUR WHY</span><strong>{p.journey}</strong></div><button onClick={()=>p.navigate("journey")}>Open journey <ChevronRight size={16}/></button></section>
 </div>
}
function Study(p:{tasks:Task[];setTasks:Dispatch<SetStateAction<Task[]>>;onAdd:()=>void;onEditTask:(task:Task)=>void;onDeleteTask:(id:number)=>void;onFocus:(task:Task)=>void}){const [filter,setFilter]=useState("All");const subjects=["All",...Array.from(new Set(p.tasks.map(t=>t.subject)))];const shown=filter==="All"?p.tasks:p.tasks.filter(t=>t.subject===filter);return <div className="stack"><PageIntro title="Study command center" text="Turn your syllabus into small, finishable sessions." action={<button className="primary-btn" onClick={p.onAdd}><Plus size={17}/> Add study session</button>}/><div className="filter-row">{subjects.map(s=><button key={s} className={filter===s?"filter active":"filter"} onClick={()=>setFilter(s)}>{s}</button>)}</div><section className="panel"><div className="panel-head"><div><h3>Study sessions</h3><p>Tap a session when it is done.</p></div><span className="count-pill">{shown.filter(t=>t.done).length+"/"+shown.length}</span></div><div className="task-list large">{shown.map(t=><TaskRow key={t.id} task={t} toggle={()=>p.setTasks(all=>all.map(x=>x.id===t.id?{...x,done:!x.done}:x))} onEdit={()=>p.onEditTask(t)} onDelete={()=>p.onDeleteTask(t.id)} onFocus={()=>p.onFocus(t)} detailed/>)}</div></section></div>}
function Exams(p:{exams:Exam[];setExams:Dispatch<SetStateAction<Exam[]>>;onAdd:()=>void;selectedExamId:number|null;setSelectedExamId:(id:number|null)=>void}){
 return <div className="stack"><PageIntro title="Exam control" text="Know what's coming and how ready you actually are." action={<button className="primary-btn" onClick={p.onAdd}><Plus size={17}/> Add exam</button>}/>
  <div className="exam-grid">{p.exams.map(e=><section className="panel exam-card exam-card-clickable" key={e.id} onClick={()=>p.setSelectedExamId(e.id)}>
   <div className="exam-card-top"><div className="date-box"><strong>{new Date(e.date+"T12:00:00").getDate()}</strong><span>{new Date(e.date+"T12:00:00").toLocaleString("en",{month:"short"})}</span></div><button className="icon-btn" aria-label={"Delete "+e.name} onClick={event=>{event.stopPropagation();p.setExams(all=>all.filter(x=>x.id!==e.id));if(p.selectedExamId===e.id)p.setSelectedExamId(null)}}><X size={16}/></button></div>
   <span className="tag">{e.subject}</span><h3>{e.name}</h3><p>{e.portion||"No lessons added yet."}</p>
   <div className="progress-label"><span>Preparation</span><strong>{e.progress+"%"}</strong></div><div className="progress"><i style={{width:e.progress+"%"}}/></div>
   <div className="exam-meta"><span>{e.lessons.filter(l=>l.done).length}/{e.lessons.length} lessons studied</span><span>{e.revisionRounds} revisions · {e.practiceTests} practice tests</span></div>
  </section>)}</div>
  {p.selectedExamId!==null&&p.exams.some(e=>e.id===p.selectedExamId)&&<ExamDetail key={p.selectedExamId} exam={p.exams.find(e=>e.id===p.selectedExamId)!} setExams={p.setExams} close={()=>p.setSelectedExamId(null)}/>}
 </div>
}
function ExamDetail(p:{exam:Exam;setExams:Dispatch<SetStateAction<Exam[]>>;close:()=>void}){
 const e=p.exam,studied=e.lessons.filter(l=>l.done).length,progress=e.lessons.length?Math.round(studied/e.lessons.length*100):0;
 const [newLesson,setNewLesson]=useState(""),[weakAreas,setWeakAreas]=useState(e.weakAreas),[revision,setRevision]=useState(String(e.revisionRounds)),[practice,setPractice]=useState(String(e.practiceTests)),[confidence,setConfidence]=useState(String(e.confidence));
 const update=(patch:Partial<Exam>)=>p.setExams(all=>all.map(x=>x.id===e.id?normalizeExam({...e,...patch}):x));
 const toggleLesson=(id:number)=>{const lessons=e.lessons.map(l=>l.id===id?{...l,done:!l.done}:l);p.setExams(all=>all.map(x=>x.id===e.id?normalizeExam({...e,lessons}):x));};
 const addLesson=()=>{const title=newLesson.trim();if(!title)return;const lessons=[...e.lessons,{id:Date.now(),title,done:false}];p.setExams(all=>all.map(x=>x.id===e.id?normalizeExam({...e,lessons,portion:lessons.map(l=>l.title).join(", ")}):x));setNewLesson("");};
 const removeLesson=(id:number)=>{const lessons=e.lessons.filter(l=>l.id!==id);p.setExams(all=>all.map(x=>x.id===e.id?normalizeExam({...e,lessons,portion:lessons.map(l=>l.title).join(", ")}):x));};
 return <div className="panel exam-detail"><div className="exam-detail-head"><div><span className="eyebrow">EXAM PROGRESS</span><h3>{e.name} · {e.subject}</h3><p>{e.date}</p></div><button className="icon-btn" onClick={p.close} aria-label="Close exam progress"><X size={17}/></button></div>
  <div className="exam-progress-hero"><div><span>Progress</span><strong>{progress}%</strong></div><div className="progress"><i style={{width:progress+"%"}}/></div></div>
  <div className="exam-kpis"><div><span>Lessons studied</span><strong>{studied}</strong><small>of {e.lessons.length}</small></div><div><span>Lessons left</span><strong>{Math.max(0,e.lessons.length-studied)}</strong><small>to complete</small></div><div><span>Revisions</span><strong>{e.revisionRounds}</strong><small>rounds</small></div><div><span>Practice tests</span><strong>{e.practiceTests}</strong><small>completed</small></div></div>
  <div className="exam-detail-grid">
   <section><div className="panel-head"><div><h4>Lessons</h4><p>Progress is calculated from completed lessons.</p></div></div><div className="lesson-list">{e.lessons.map(l=><div className={l.done?"lesson-row done":"lesson-row"} key={l.id}><button className="check-btn" onClick={()=>toggleLesson(l.id)} aria-label={l.done?"Mark lesson incomplete":"Mark lesson complete"}>{l.done?<Check size={14}/>:null}</button><span>{l.title}</span><button className="icon-btn" onClick={()=>removeLesson(l.id)} aria-label={"Remove "+l.title}><Trash2 size={14}/></button></div>)}</div>
    <div className="add-lesson"><input value={newLesson} onChange={event=>setNewLesson(event.target.value)} placeholder="Add new lesson"/><button className="primary-btn small" onClick={addLesson}><Plus size={15}/> Add</button></div></section>
   <section className="exam-side-controls"><label className="field"><span>Revision rounds</span><input type="number" min="0" value={revision} onChange={event=>{setRevision(event.target.value);update({revisionRounds:Math.max(0,Number(event.target.value)||0)})}}/></label><label className="field"><span>Practice tests completed</span><input type="number" min="0" value={practice} onChange={event=>{setPractice(event.target.value);update({practiceTests:Math.max(0,Number(event.target.value)||0)})}}/></label><label className="field"><span>Confidence (0–5)</span><input type="number" min="0" max="5" value={confidence} onChange={event=>{setConfidence(event.target.value);update({confidence:Math.min(5,Math.max(0,Number(event.target.value)||0))})}}/></label><label className="field"><span>Weak areas / notes</span><textarea value={weakAreas} onChange={event=>{setWeakAreas(event.target.value);update({weakAreas:event.target.value})}} placeholder="Topics to revisit..."/></label></section>
  </div>
 </div>
}

function UpdateControl(){
 const [status,setStatus]=useState<"idle"|"checking"|"updated"|"latest"|"error">("idle");
 const check=async()=>{setStatus("checking");try{const changed=await window.__studentosUpdate?.();setStatus(changed?"updated":"latest")}catch{setStatus("error")}};
 const text=status==="checking"?"Checking the latest StudentOS deployment…":status==="updated"?"New version installed. Your current section will be restored.":status==="latest"?"You're up to date.":"Check whether a newer StudentOS deployment is available.";
 return <SettingBlock title="App updates" text={text} right={<button className="ghost-btn" disabled={status==="checking"} onClick={()=>void check()}>{status==="checking"?"Checking…":"Check for updates"}</button>}/>;
}
function Scores(p:{scores:Score[];setScores:Dispatch<SetStateAction<Score[]>>;onAdd:()=>void}){const total=p.scores.reduce((a,s)=>a+s.obtained,0),max=p.scores.reduce((a,s)=>a+s.max,0);return <div className="stack"><PageIntro title="Score tracker" text="Record marks and watch your progress build over time." action={<button className="primary-btn" onClick={p.onAdd}><Plus size={17}/> Add score</button>}/><div className="stats-grid"><Stat icon={<Gauge/>} label="Overall recorded" value={(max?Math.round(total/max*100):0)+"%"}/><Stat icon={<Trophy/>} label="Tests recorded" value={String(p.scores.length)}/></div><section className="panel"><div className="panel-head"><div><h3>Recent scores</h3><p>Your recorded assessments.</p></div></div><div className="score-table"><div className="score-row head"><span>Subject</span><span>Assessment</span><span>Marks</span><span>Percent</span><span/></div>{p.scores.map(s=><div className="score-row" key={s.id}><strong>{s.subject}</strong><span>{s.test}</span><span>{s.obtained+"/"+s.max}</span><strong>{Math.round(s.obtained/s.max*100)+"%"}</strong><button className="icon-btn" onClick={()=>p.setScores(all=>all.filter(x=>x.id!==s.id))}><X size={15}/></button></div>)}</div></section></div>}
function Focus(p:{seconds:number;minutes:number;setMinutes:(x:number)=>void;running:boolean;setRunning:(x:boolean)=>void;taskTitle?:string;reset:(minutes?:number)=>void}){const m=Math.floor(p.seconds/60).toString().padStart(2,"0"),s=(p.seconds%60).toString().padStart(2,"0");const [draft,setDraft]=useState(String(p.minutes));useEffect(()=>{if(!p.running)setDraft(String(p.minutes))},[p.minutes,p.running]);const applyDuration=(value:string)=>{setDraft(value);if(value==="")return;const numeric=Number(value);if(!Number.isFinite(numeric))return;const next=Math.min(180,Math.max(1,Math.floor(numeric)));p.setMinutes(next);if(!p.running)p.reset(next)};const commitDuration=()=>{const numeric=Number(draft);const next=Number.isFinite(numeric)&&numeric>0?Math.min(180,Math.max(1,Math.floor(numeric))):1;setDraft(String(next));p.setMinutes(next);if(!p.running)p.reset(next)};const step=(delta:number)=>{const current=Number(draft)||p.minutes;const next=Math.min(180,Math.max(1,current+delta));setDraft(String(next));p.setMinutes(next);if(!p.running)p.reset(next)};return <div className="focus-page"><div className="focus-card"><div className="hero-kicker"><Clock3 size={15}/> FOCUS MODE</div><h2>{m+":"+s}</h2><p>{p.taskTitle?<>Working on <strong>{p.taskTitle}</strong>. Stay with it until the block ends.</>: "One focused block. One clear objective."}</p><div className="focus-actions"><button className="primary-btn" onClick={()=>p.setRunning(!p.running)}>{p.running?"Pause":"Start focus"}</button><button className="ghost-btn" onClick={()=>p.reset()}>Reset</button></div><div className="focus-duration"><label htmlFor="focus-minutes">Session length</label><div className="duration-control"><button type="button" className="duration-step" aria-label="Decrease session length by 1 minute" disabled={p.running||p.minutes<=1} onClick={()=>step(-1)}>−</button><input id="focus-minutes" type="text" inputMode="numeric" pattern="[0-9]*" value={draft} disabled={p.running} onChange={e=>applyDuration(e.target.value.replace(/\D/g,"").slice(0,3))} onBlur={commitDuration} onKeyDown={e=>{if(e.key==="Enter")e.currentTarget.blur()}} aria-describedby="focus-duration-help"/><button type="button" className="duration-step" aria-label="Increase session length by 1 minute" disabled={p.running||p.minutes>=180} onClick={()=>step(1)}>+</button><span>minutes</span></div><div className="duration-presets">{[15,25,45,60,90].map(v=><button key={v} type="button" className={p.minutes===v?"duration-preset active":"duration-preset"} disabled={p.running} onClick={()=>{setDraft(String(v));p.setMinutes(v);p.reset(v)}}>{v}m</button>)}</div></div><div className="focus-note" id="focus-duration-help"><Zap size={17}/> Choose any focus length from 1–180 minutes.</div></div></div>}function Journey(p:{journey:string;setJourney:(s:string)=>void;completed:number;exams:Exam[];scoreAverage:number}){const [editing,setEditing]=useState(false),[draft,setDraft]=useState(p.journey);return <div className="stack"><PageIntro title="Your journey" text="Give the next phase of school a name that means something to you."/><section className="journey-card"><div className="journey-badge"><Target size={27}/></div><div className="grow"><span className="eyebrow">CURRENT JOURNEY</span>{editing?<div className="inline-edit"><input value={draft} onChange={e=>setDraft(e.target.value)}/><button className="primary-btn small" onClick={()=>{p.setJourney(draft);setEditing(false)}}>Save</button></div>:<h2>{p.journey}</h2>}<p>Keep this objective visible when deciding what deserves your attention.</p></div>{!editing&&<button className="ghost-btn" onClick={()=>setEditing(true)}>Edit</button>}</section><div className="journey-grid"><Stat icon={<Check/>} label="Study sessions done" value={String(p.completed)}/><Stat icon={<TrendingUp/>} label="Recorded score level" value={p.scoreAverage+"%"}/><Stat icon={<CalendarDays/>} label="Exams on radar" value={String(p.exams.length)}/></div></div>}
function SettingsPage(p:{journey:string;setJourney:(s:string)=>void;classLevel:string;setClassLevel:(s:string)=>void;mode:"anonymous"|"account";onSignIn:()=>void;accountError:string;displayName:string;avatarUrl:string;onProfileSave:(name:string,file?:File)=>Promise<string>;onLogout:()=>Promise<void>|void;onDeleteAccount:()=>Promise<string>}) {
 const [objective,setObjective]=useState(p.journey),[grade,setGrade]=useState(p.classLevel),[name,setName]=useState(p.displayName),[profileMessage,setProfileMessage]=useState(""),[savingProfile,setSavingProfile]=useState(false),[deleting,setDeleting]=useState(false);
 const fileInput=useRef<HTMLInputElement>(null);
 const [selectedImageUrl,setSelectedImageUrl]=useState("");
 useEffect(()=>()=>{if(selectedImageUrl)URL.revokeObjectURL(selectedImageUrl)},[selectedImageUrl]);
 const chooseImage=(file?:File)=>{if(!file){setSelectedImageUrl("");return;}if(selectedImageUrl)URL.revokeObjectURL(selectedImageUrl);setSelectedImageUrl(URL.createObjectURL(file));};
 const saveProfile=async()=>{setSavingProfile(true);const message=await p.onProfileSave(name,fileInput.current?.files?.[0]);setProfileMessage(message||"Profile saved.");setSavingProfile(false);if(!message&&fileInput.current){fileInput.current.value="";setSelectedImageUrl("");}};
 const deleteAccount=async()=>{if(!window.confirm("Permanently delete your StudentOS account and all saved data? This cannot be undone."))return;setDeleting(true);const message=await p.onDeleteAccount();setDeleting(false);setProfileMessage(message);};
 return <div className="stack"><PageIntro title="Settings" text="Make StudentOS yours. Your profile choices shape what you see."/>
 <section className="panel settings-panel">
  {p.mode==="account"&&<SettingBlock title="Your profile" text="Update your name or choose a new profile image. Images are saved under your account." right={<button className="ghost-btn" disabled={savingProfile} onClick={saveProfile}>{savingProfile?"Saving…":"Save profile"}</button>}>
   <div className="profile-editor"><button className="profile-image-button" type="button" aria-label="Choose profile image" onClick={()=>fileInput.current?.click()}>{selectedImageUrl||p.avatarUrl?<img src={selectedImageUrl||p.avatarUrl} alt="Profile preview"/>:<UserRound size={28}/>}<span className="profile-edit-badge" aria-hidden="true"><Pencil size={13}/></span></button><input ref={fileInput} className="visually-hidden" id="profile-image-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" aria-label="Choose profile image" onChange={e=>chooseImage(e.target.files?.[0])}/><label>Display name<input className="setting-input" value={name} maxLength={60} onChange={e=>setName(e.target.value)} placeholder="Your name"/></label></div>{profileMessage&&<div className={profileMessage==="Profile saved."?"auth-success":"auth-error settings-auth-error"}>{profileMessage}</div>}
  </SettingBlock>}
  <SettingBlock title="Profile & preferences" text="Choose the class or grade you want StudentOS to display. You can change this anytime." right={<span className="status-pill"><span className="dot"/> Personalised</span>}>
   <div className="preference-row"><label>Class / grade<select className="setting-input" value={grade} onChange={e=>{setGrade(e.target.value);p.setClassLevel(e.target.value)}}><option value="">Not set</option>{Array.from({length:12},(_,i)=><option key={i+1} value={String(i+1)}>Class {i+1}</option>)}<option value="College">College</option></select></label></div>
  </SettingBlock>
  <SettingBlock title="Session mode" text={p.mode==="account"?"Your StudentOS workspace is connected to your account and syncs your changes.":"Anonymous mode keeps this session in memory only. Sign up anytime to keep your workspace across sessions."} right={<span className="status-pill"><span className="dot"/> {p.mode==="account"?"Account synced":"Anonymous"}</span>}/>
  <SettingBlock title="Journey objective" text="This is the main objective shown around StudentOS." right={<button className="ghost-btn" onClick={()=>p.setJourney(objective)}>Save</button>}><input className="setting-input" value={objective} onChange={e=>setObjective(e.target.value)}/></SettingBlock>
  <SettingBlock title="Account & sync" text={p.mode==="account"?"Your account is connected. StudentOS saves your workspace to the cloud as you make changes.":"Create or sign in to an account to keep your StudentOS workspace synced across sessions."} right={p.mode==="account"?<button className="ghost-btn" onClick={()=>void p.onLogout()}><LogOut size={15}/> Log out</button>:<button className="primary-btn setting-signin" onClick={p.onSignIn}>Sign up & sync <ChevronRight size={15}/></button>}>
   {p.accountError&&<div className="auth-error settings-auth-error">{p.accountError}</div>}
  </SettingBlock>
  <UpdateControl />
  {p.mode==="account"&&<SettingBlock title="Delete account" text="Permanently remove your account, synced workspace, and profile image. This cannot be undone." right={<button className="danger-btn" disabled={deleting} onClick={deleteAccount}>{deleting?"Deleting…":"Delete account"}</button>}/>}
  <SettingBlock title="Data" text={p.mode==="account"?"Your tasks, exams, scores, journey and profile preferences are stored in your account database.":"Anonymous data stays in memory and is not uploaded to a cloud account."} right={<span className="muted">{p.mode==="account"?"Cloud saved":"Local only"}</span>}/>
 </section></div>
}
function SettingBlock(p:{title:string;text:string;right:ReactNode;children?:ReactNode}){return <div className="setting-block"><div className="grow"><h3>{p.title}</h3><p>{p.text}</p>{p.children}</div><div>{p.right}</div></div>}
function Stat(p:{icon:ReactNode;label:string;value:string}){return <div className="stat-card"><div className="stat-icon">{p.icon}</div><div><span>{p.label}</span><strong>{p.value}</strong></div></div>}
function TaskRow(p:{task:Task;toggle:()=>void;onEdit:()=>void;onDelete:()=>void;onFocus?:()=>void;detailed?:boolean}){return <div className={p.task.done?"task-row done":"task-row"}><button className="check-btn" onClick={p.toggle} aria-label={p.task.done?"Mark incomplete":"Mark complete"}>{p.task.done?<Check size={15}/>:null}</button><div className="grow"><strong>{p.task.title}</strong><span>{p.task.subject+(p.detailed?" · "+p.task.date:"")}</span></div><span className="minutes">{p.task.minutes+"m"}</span><div className="task-actions">{p.onFocus&&<button className="task-action" onClick={p.onFocus} aria-label={"Focus on "+p.task.title} title="Start focus"><Zap size={14}/></button>}<button className="task-action" onClick={p.onEdit} aria-label={"Edit "+p.task.title} title="Edit"><Pencil size={14}/></button><button className="task-action danger" onClick={p.onDelete} aria-label={"Delete "+p.task.title} title="Delete"><Trash2 size={14}/></button></div></div>}
function PageIntro(p:{title:string;text:string;action?:ReactNode}){return <div className="page-intro"><div><h2>{p.title}</h2><p>{p.text}</p></div>{p.action}</div>}
function Modal(p:{title:string;close:()=>void;children:ReactNode}){return <div className="modal-backdrop" onMouseDown={p.close}><div className="modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><h3>{p.title}</h3><button className="icon-btn" onClick={p.close}><X/></button></div>{p.children}</div></div>}
function ModalActions(p:{close:()=>void;save:()=>void}){return <div className="modal-actions"><button className="ghost-btn" onClick={p.close}>Cancel</button><button className="primary-btn" onClick={p.save}>Save</button></div>}
function FormInput(p:{label:string;value:string;onChange:(s:string)=>void;placeholder?:string;type?:string}){return <label className="field"><span>{p.label}</span><input type={p.type||"text"} value={p.value} onChange={e=>p.onChange(e.target.value)} placeholder={p.placeholder}/></label>}
function TaskModal(p:{close:()=>void;add?:(t:Task)=>void;task?:Task;save?:(t:Task)=>void}){const editing=!!p.task;const [title,setTitle]=useState(p.task?.title||"");const [subject,setSubject]=useState(p.task?.subject||"Maths");const [minutes,setMinutes]=useState(String(p.task?.minutes||30));const [date,setDate]=useState(p.task?.date||today);const submit=()=>{const task:Task={id:p.task?.id||Date.now(),title:title.trim()||"Untitled study session",subject:subject.trim()||"Other",date,done:p.task?.done||false,minutes:Math.max(1,Number(minutes)||30)};if(editing)p.save?.(task);else p.add?.(task)};return <Modal title={editing?"Edit study session":"Add study session"} close={p.close}><FormInput label="Session" value={title} onChange={setTitle} placeholder="e.g. Trigonometry practice"/><FormInput label="Subject" value={subject} onChange={setSubject}/><div className="form-two"><FormInput label="Minutes" value={minutes} onChange={setMinutes} type="number"/><FormInput label="Date" value={date} onChange={setDate} type="date"/></div><ModalActions close={p.close} save={submit}/></Modal>}
function ScoreModal(p:{close:()=>void;add:(s:Score)=>void}){const [subject,setSubject]=useState("Maths"),[test,setTest]=useState(""),[obtained,setObtained]=useState(""),[max,setMax]=useState("40");return <Modal title="Record a score" close={p.close}><FormInput label="Subject" value={subject} onChange={setSubject}/><FormInput label="Assessment" value={test} onChange={setTest} placeholder="Unit test"/><div className="form-two"><FormInput label="Marks" value={obtained} onChange={setObtained} type="number"/><FormInput label="Out of" value={max} onChange={setMax} type="number"/></div><ModalActions close={p.close} save={()=>p.add({id:Date.now(),subject,test:test||"Assessment",obtained:Number(obtained)||0,max:Number(max)||40,date:today})}/></Modal>}
function ExamModal(p:{close:()=>void;add:(e:Exam)=>void}){const [name,setName]=useState(""),[subject,setSubject]=useState("Maths"),[date,setDate]=useState("2026-10-15"),[portion,setPortion]=useState("");const submit=()=>{const lessons=portion.split(",").map(title=>title.trim()).filter(Boolean).map((title,i)=>({id:Date.now()+i,title,done:false}));p.add(normalizeExam({id:Date.now(),name:name||"New exam",subject,date,portion:portion.trim(),lessons,progress:0,revisionRounds:0,practiceTests:0,confidence:0,weakAreas:""}));};return <Modal title="Add exam" close={p.close}><FormInput label="Exam name" value={name} onChange={setName}/><FormInput label="Subject" value={subject} onChange={setSubject}/><FormInput label="Date" value={date} onChange={setDate} type="date"/><FormInput label="Lessons / chapters" value={portion} onChange={setPortion} placeholder="Separate lessons with commas"/><small className="form-help">StudentOS calculates progress from the lessons you add. You can add or remove lessons after creating the exam.</small><ModalActions close={p.close} save={submit}/></Modal>}
function App(){
 const [screen,setScreen]=useState<"welcome"|"app">("welcome");
 const [mode,setMode]=useState<"anonymous"|"account">("anonymous");
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [authOpen,setAuthOpen]=useState(false);
 const [anonymousSetupOpen,setAnonymousSetupOpen]=useState(false);
 const [accountSetupOpen,setAccountSetupOpen]=useState(false);
 const [authMode,setAuthMode]=useState<"signin"|"signup">("signin");

 useEffect(()=>{
  let active=true;
  const boot=async()=>{
   if(!supabase){setLoading(false);return;}
   const {data}=await supabase.auth.getSession();
   if(data.session&&active){
    const user=data.session.user; const cloud=await loadCloudData(user.id);
    window.__studentosData=cloud; window.__studentosEmail=user.email||""; window.__studentosUserId=user.id;
    sessionStorage.removeItem("studentos_pending_signup"); setMode("account");setScreen("app");
   }
   setLoading(false);
  };
  void boot();
  if(!supabase)return;
  const {data:listener}=supabase.auth.onAuthStateChange((_event,session)=>{
   if(!session)return;
   void (async()=>{if(active){await finishCloudSession(session.user);setLoading(false);}})();
  });
  return()=>{active=false;listener.subscription.unsubscribe()};
 },[]);

 const enterAnonymous=()=>{setAnonymousSetupOpen(true)};
 const finishAccountSetup=async(displayName:string,journey:string,classLevel:string)=>{const data={...(window.__studentosData||blankData()),displayName:displayName.trim()||"Student",journey:journey.trim()||"Make meaningful progress",classLevel:classLevel.trim()};window.__studentosData=data;setAccountSetupOpen(false);if(window.__studentosUserId)await saveCloudData(window.__studentosUserId,data)};
 const finishAnonymousSetup=(displayName:string,journey:string,classLevel:string)=>{const data=blankData();data.displayName=displayName.trim()||"Student";data.journey=journey.trim()||"Make meaningful progress";data.classLevel=classLevel.trim();window.__studentosData=data;window.__studentosEmail="";window.__studentosUserId="";setAnonymousSetupOpen(false);setMode("anonymous");setScreen("app")};
 const exit=async()=>{if(supabase&&mode==="account")await supabase.auth.signOut();window.__studentosData=undefined;window.__studentosEmail="";window.__studentosUserId="";setMode("anonymous");setScreen("welcome")};
 const deleteAccount=async()=>{if(!supabase)return "Supabase is not connected.";const {error:deleteError}=await supabase.functions.invoke("delete-studentos-account",{method:"POST"});if(deleteError)return deleteError.message||"Account deletion failed.";await exit();return "";};

 const finishCloudSession=async(user:{id:string;email?:string|null})=>{const anonymousSnapshot=mode==="anonymous"?window.__studentosData:undefined;const cloud=anonymousSnapshot?anonymousSnapshot:await loadCloudData(user.id);if(anonymousSnapshot)await saveCloudData(user.id,cloud);window.__studentosData=cloud;window.__studentosEmail=user.email||"";window.__studentosUserId=user.id;const needsSetup=sessionStorage.getItem("studentos_pending_signup")==="1";sessionStorage.removeItem("studentos_pending_signup");setMode("account");setScreen("app");setAuthOpen(false);if(needsSetup)setAccountSetupOpen(true)};

 const social=async(provider:"google"|"notion")=>{
  setError("");
  if(authMode==="signup")sessionStorage.setItem("studentos_pending_signup","1");else sessionStorage.removeItem("studentos_pending_signup");
  if(!supabase){setError("Cloud sign-in needs the StudentOS Supabase project connected.");return;}
  const {error:e}=await supabase.auth.signInWithOAuth({provider,options:{redirectTo:window.location.origin,scopes:undefined}});
  if(e)setError(e.message);
 };
 const emailAuth=async(email:string,code?:string):Promise<boolean>=>{
  setError("");
  if(!code){if(authMode==="signup")sessionStorage.setItem("studentos_pending_signup","1");else sessionStorage.removeItem("studentos_pending_signup");}
  if(!supabase){setError("Supabase is not connected yet. Add the StudentOS Supabase environment variables first.");return false;}
  if(code){
   const result=await supabase.auth.verifyOtp({email,token:code.trim(),type:"email"});
   if(result.error){setError(result.error.message);return false;}
   if(result.data.session?.user){await finishCloudSession(result.data.session.user);return true;}
   setError("Verification succeeded, but no active session was returned. Please try again.");return false;
  }
  const result=await supabase.auth.signInWithOtp({email,options:{shouldCreateUser:true,emailRedirectTo:window.location.origin}});
  if(result.error){setError(result.error.message);return false;}
  return true;
 };

 if(loading)return <div className="welcome-shell auth-loading"><div><div className="auth-icon"><Command size={24}/></div><strong>Loading StudentOS…</strong></div></div>;
 if(screen==="app")return <StudentOSApp mode={mode} onExit={exit} onDeleteAccount={deleteAccount} onSignIn={()=>{setAuthMode("signup");setAuthOpen(true);setScreen("welcome")}}/>;
 return <div className="welcome-shell">
  <header className="welcome-nav"><div className="welcome-brand"><div className="brand-mark"><Command size={20}/></div><strong>StudentOS</strong></div><div className="welcome-nav-actions"><button className="nav-auth-link" onClick={enterAnonymous}>Try anonymously</button><button className="nav-auth-btn" onClick={()=>{setAuthMode("signup");setAuthOpen(true)}}>Get started <ChevronRight size={16}/></button></div></header>
  <Welcome onAnonymous={enterAnonymous} openAuth={(m)=>{setAuthMode(m);setAuthOpen(true)}} onSocial={social} error={error}/>
  {anonymousSetupOpen&&<AnonymousSetupModal close={()=>setAnonymousSetupOpen(false)} continueSetup={finishAnonymousSetup} account={false}/>} {accountSetupOpen&&<AnonymousSetupModal close={()=>setAccountSetupOpen(false)} continueSetup={finishAccountSetup} account={true}/>}
  {authOpen&&<AuthModal mode={authMode} setMode={setAuthMode} close={()=>{setAuthOpen(false);setError("")}} onSocial={social} onEmail={emailAuth} error={error}/>}
 </div>
}

function AnonymousSetupModal(p:{close:()=>void;continueSetup:(displayName:string,journey:string,classLevel:string)=>void|Promise<void>;account:boolean}){const [name,setName]=useState(""),[journey,setJourney]=useState(""),[classLevel,setClassLevel]=useState("");return <div className="modal-backdrop auth-backdrop" onMouseDown={p.close}><div className="auth-card auth-modal setup-modal" onMouseDown={e=>e.stopPropagation()}><button className="auth-close icon-btn" onClick={p.close} aria-label="Close"><X size={18}/></button><div className="auth-icon"><Command size={22}/></div><h1>{p.account?"Welcome to StudentOS":"Let's set up your StudentOS"}</h1><p>{p.account?"Your account is ready. Tell us a little about yourself so we can personalize your workspace.":"You're continuing anonymously, so we'll personalize your workspace without creating an account."}</p><label className="field"><span>What should we call you?</span><input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" autoFocus/></label><label className="field"><span>What would you like to name your journey?</span><input value={journey} onChange={e=>setJourney(e.target.value)} placeholder="e.g. 90%+ Mission, Road to Engineering"/></label><label className="field"><span>What class / year are you in?</span><select value={classLevel} onChange={e=>setClassLevel(e.target.value)} aria-label="Class or year"><option value="" disabled>Select your class / year</option><option value="Class 1">Class 1</option><option value="Class 2">Class 2</option><option value="Class 3">Class 3</option><option value="Class 4">Class 4</option><option value="Class 5">Class 5</option><option value="Class 6">Class 6</option><option value="Class 7">Class 7</option><option value="Class 8">Class 8</option><option value="Class 9">Class 9</option><option value="Class 10">Class 10</option><option value="Class 11">Class 11</option><option value="Class 12">Class 12</option><option value="University">University</option></select></label><button className="primary-btn auth-submit reference-continue" onClick={()=>p.continueSetup(name,journey,classLevel)} disabled={!name.trim()||!journey.trim()}>Enter StudentOS <ChevronRight size={17}/></button><small className="auth-note">{p.account?"You can change these preferences anytime in Settings.":"Anonymous mode stays on this device/session and is not saved to a cloud account."}</small></div></div>}

function AuthModal(p:{mode:"signin"|"signup";setMode:(m:"signin"|"signup")=>void;close:()=>void;onSocial:(x:"google"|"notion")=>void;onEmail:(email:string,code?:string)=>Promise<boolean>;error:string}){
 const [email,setEmail]=useState(""),[code,setCode]=useState(""),[codeSent,setCodeSent]=useState(false);
 const errorIsSent=p.error==="CODE_SENT";
 const sendCode=async()=>{if(!email.trim())return;const ok=await p.onEmail(email.trim());if(ok)setCodeSent(true)};
 const verify=async()=>{if(code.trim().length!==6)return;await p.onEmail(email.trim(),code.trim())};
 return <div className="modal-backdrop auth-backdrop" onMouseDown={p.close}><div className="auth-card auth-modal auth-reference-modal" onMouseDown={e=>e.stopPropagation()}>
  <button className="auth-close icon-btn" onClick={p.close} aria-label="Close"><X size={18}/></button>
  <div className="auth-icon"><Command size={22}/></div>
  <h1>Log in or sign up</h1>
  <p>Save your StudentOS workspace in the cloud and pick up where you left off on any device.</p>
  <button className="social-btn google-auth" onClick={()=>p.onSocial("google")}><span className="google-g">G</span> Continue with Google <ChevronRight size={16}/></button>
  <button className="social-btn notion-auth" onClick={()=>p.onSocial("notion")}><span className="notion-mark">N</span> Continue with Notion <ChevronRight size={16}/></button>
  <div className="auth-divider"><span>OR</span></div>
  {!codeSent ? <>
   <label className="field"><span>Email address</span><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" autoFocus/></label>
   <button className="primary-btn auth-submit reference-continue" onClick={sendCode} disabled={!email.trim()}>Send verification code <ChevronRight size={17}/></button>
  </> : <>
   <label className="field"><span>Verification code</span><input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,"").slice(0,6))} placeholder="6-digit code" autoFocus/></label>
   <p className="auth-code-hint">We sent a verification code to <strong>{email}</strong>.</p>
   <button className="primary-btn auth-submit reference-continue" onClick={verify} disabled={code.length!==6}>Verify & continue <ChevronRight size={17}/></button>
   <button className="text-btn auth-resend" onClick={sendCode}>Resend code</button>
   <button className="text-btn auth-change-email" onClick={()=>{setCode("");setCodeSent(false)}}>Use a different email</button>
  </>}
  {errorIsSent?<div className="auth-success">Verification code sent. Check your email.</div>:p.error&&<div className="auth-error">{p.error}</div>}
  <div className="auth-switch">{p.mode==="signup"?<><span>Already have an account?</span><button onClick={()=>p.setMode("signin")}>Log in</button></>:<><span>New to StudentOS?</span><button onClick={()=>p.setMode("signup")}>Sign up</button></>}</div>
  <small className="auth-note">Email sign-in uses a one-time verification code. No password is required.</small>
 </div></div>
}

function Welcome(p:{onAnonymous:()=>void;openAuth:(m:"signin"|"signup")=>void;onSocial:(x:"google"|"notion")=>void;error:string}){
 const [intro,setIntro]=useState(true);
 const [scrollY,setScrollY]=useState(0);
 useEffect(()=>{
   const onScroll=()=>setScrollY(window.scrollY);
   window.addEventListener("scroll",onScroll,{passive:true});
   const t=window.setTimeout(()=>setIntro(false),1450);
   return()=>{window.removeEventListener("scroll",onScroll);window.clearTimeout(t)};
 },[]);
 const drift=(speed:number)=>({transform:`translate3d(0,${Math.min(120,scrollY*speed)}px,0)`});
 return <>
  {intro&&<div className="landing-intro-v2" aria-hidden="true"><div className="landing-intro-mark"><Command size={34}/></div><div className="landing-intro-word">STUDENTOS</div><div className="landing-intro-line"/></div>}
  <main className="welcome-main-v2"><div className="scroll-object-v2" style={{transform:`translate3d(0,${Math.min(180,scrollY*.22)}px,0) rotate(${Math.min(28,scrollY*.035)}deg)`}}><div className="scroll-object-core"><Command size={20}/></div></div>
  <section className="landing-hero-v2">
   <div className="landing-hero-copy">
    <div className="landing-eyebrow"><span/> STUDENTOS · YOUR SCHOOL OS</div>
    <h1>Know what matters.<br/><em>Do what matters.</em></h1>
    <p>One calm workspace for your tasks, exams, scores, focus sessions and the journey you're building beyond school.</p>
    <div className="landing-actions-v2">
      <button className="landing-primary-v2" onClick={()=>p.openAuth("signup")}>Build my workspace <ChevronRight size={17}/></button>
      <button className="landing-text-v2" onClick={p.onAnonymous}>Explore anonymously <ArrowUpRight size={16}/></button>
    </div>
    <div className="landing-proof-v2"><span>NO CARD REQUIRED</span><i/> <span>ANONYMOUS FIRST</span><i/> <span>SYNC WHEN YOU SIGN IN</span></div>
   </div>
   <div className="landing-stage-v2"><div className="stage-orbit stage-orbit-a" style={drift(-.08)}/><div className="stage-orbit stage-orbit-b" style={drift(.12)}/>
    <div className="stage-glow"/>
    <div className="stage-label">LIVE WORKSPACE <span>●</span></div>
    <div className="stage-window">
      <div className="stage-top"><div className="stage-brand"><div className="stage-mark"><Command size={13}/></div> STUDENTOS</div><span>MONDAY · 08:42</span></div>
      <div className="stage-body">
       <span className="stage-kicker">YOUR NEXT MOVE</span>
       <h2>Finish what<br/><b>matters today.</b></h2>
       <div className="stage-focus"><div><span>FOCUS</span><strong>25:00</strong></div><div><span>TASKS</span><strong>4 open</strong></div><div><span>EXAMS</span><strong>2 next</strong></div></div>
       <div className="stage-line"><span>JOURNEY</span><b>68%</b><i><em/></i></div>
      </div>
    </div>
    <div className="stage-float stage-score" style={drift(.16)}><TrendingUp size={14}/><span>Score average</span><b>92%</b></div>
    <div className="stage-float stage-mission" style={drift(-.12)}><Target size={14}/><span>Today</span><b>Maths · 45 min</b></div>
   </div>
  </section>

  <section className="landing-manifesto-v2">
   <div className="manifesto-index">01 / THE IDEA</div>
   <div><h2>School is already complicated.<br/><em>Your tools shouldn't be.</em></h2><p>StudentOS turns the scattered pieces of school into one clear system. You decide the goal. StudentOS keeps the next move visible.</p></div>
  </section>

  <section className="landing-modules-v2">
   <div className="module-heading"><span>02 / THE SYSTEM</span><h2>Everything you need.<br/><em>Nothing you don't.</em></h2></div>
   <div className="module-grid-v2">
    <article className="module-large"><div className="module-number">01</div><BookOpen/><h3>Study</h3><p>Turn a pile of schoolwork into a focused list of things you can actually finish.</p><div className="module-demo"><span>UP NEXT</span><b>Quadratics practice</b><small>45 min · Today</small></div></article>
    <article className="module-dark"><div className="module-number">02</div><CalendarDays/><h3>Exams</h3><p>Know what is coming, what you've covered, and where your preparation stands.</p><div className="module-demo"><span>NEXT EXAM</span><b>Mathematics</b><small>12 days · 6 lessons</small></div></article>
    <article className="module-dark"><div className="module-number">03</div><TrendingUp/><h3>Scores</h3><p>Keep assessments in one place and make progress visible over time.</p><div className="module-demo score-demo"><span>AVERAGE</span><b>92%</b><small>↑ 6% this term</small></div></article>
    <article className="module-accent"><div className="module-number">04</div><Clock3/><h3>Focus</h3><p>When it's time to work, remove the noise and start the clock.</p><div className="module-demo timer-demo"><b>25:00</b><small>ONE SESSION · ONE OBJECTIVE</small></div></article>
    <article className="module-wide"><div><div className="module-number">05</div><Target/><h3>Journey</h3><p>Name the thing you're working toward and keep it visible. College, a score, a skill — it's yours.</p></div><div className="journey-demo"><span>YOUR JOURNEY</span><b>90%+ MISSION</b><i><em/></i></div></article>
   </div>
  </section>

  <section className="landing-close-v2">
   <span>03 / START HERE</span>
   <h2>Your next move<br/><em>starts here.</em></h2>
   <div className="landing-close-actions"><button className="landing-primary-v2" onClick={()=>p.openAuth("signup")}>Get started <ChevronRight size={17}/></button><button className="landing-text-v2" onClick={p.onAnonymous}>Try anonymously <ArrowUpRight size={16}/></button></div>
  </section>
 </main>
 </>
}
function pageTitle(p:Page){return {dashboard:"Dashboard",study:"Study",exams:"Exams",scores:"Scores",focus:"Focus",journey:"Journey",settings:"Settings"}[p]}

export default App;