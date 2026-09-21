import { useEffect, useState } from "react";
import type { ReactNode, Dispatch, SetStateAction } from "react";
import { supabase } from "./lib/supabase";
import { BookOpen, CalendarDays, Check, ChevronRight, Clock3, Command, Flame, Gauge, GraduationCap, LayoutDashboard, Menu, Pencil, Plus, Settings, Sparkles, Target, Trash2, Trophy, TrendingUp, X, Zap } from "lucide-react";

type Page = "dashboard" | "study" | "exams" | "scores" | "focus" | "journey" | "settings";
type Task = { id:number; title:string; subject:string; date:string; done:boolean; minutes:number };
type Exam = { id:number; name:string; subject:string; date:string; portion:string; progress:number };
type Score = { id:number; subject:string; test:string; obtained:number; max:number; date:string };
const today = new Date().toISOString().slice(0,10);
const seedTasks:Task[]=[
 {id:1,title:"Quadratic equations practice",subject:"Maths",date:today,done:false,minutes:45},
 {id:2,title:"Revise electricity notes",subject:"Science",date:today,done:true,minutes:30},
 {id:3,title:"Read English chapter",subject:"English",date:today,done:false,minutes:25},
 {id:4,title:"SST map practice",subject:"SST",date:today,done:false,minutes:35}
];
const seedExams:Exam[]=[
 {id:1,name:"Maths Unit Test",subject:"Maths",date:"2026-10-02",portion:"Quadratic Equations, Arithmetic Progressions",progress:62},
 {id:2,name:"Science Term Assessment",subject:"Science",date:"2026-10-09",portion:"Electricity, Magnetic Effects",progress:38}
];
const seedScores:Score[]=[
 {id:1,subject:"Science",test:"Periodic Test",obtained:34,max:40,date:"2026-09-10"},
 {id:2,subject:"SST",test:"Periodic Test",obtained:37,max:40,date:"2026-09-10"},
 {id:3,subject:"English",test:"Periodic Test",obtained:37,max:40,date:"2026-09-10"}
];

type SavedData = { tasks:Task[]; exams:Exam[]; scores:Score[]; journey:string; classLevel:string; displayName:string };
declare global { interface Window { __studentosData?: SavedData; __studentosEmail?: string; __studentosUserId?: string } }


function blankData():SavedData{
 return {
  tasks:seedTasks.map(x=>({...x})),
  exams:seedExams.map(x=>({...x})),
  scores:seedScores.map(x=>({...x})),
  journey:"Make meaningful progress", classLevel:"", displayName:"Student"
 };
}

async function loadCloudData(userId:string):Promise<SavedData>{
 if(!supabase) return blankData();
 const {data,error}=await supabase.from("studentos_profiles").select("data").eq("id",userId).maybeSingle();
 if(error){console.error(error);return blankData();}
 return data?.data ? {...blankData(), ...(data.data as Partial<SavedData>)} : blankData();
}

async function saveCloudData(userId:string,data:SavedData){
 if(!supabase) return;
 const {error}=await supabase.from("studentos_profiles").upsert({id:userId,data,updated_at:new Date().toISOString()});
 if(error) console.error(error);
}

function StudentOSApp({mode,onExit,onSignIn}:{mode:"anonymous"|"account";onExit:()=>void;onSignIn:()=>void}){
 const [page,setPage]=useState<Page>("dashboard"),[mobileNav,setMobileNav]=useState(false),[sidebarCollapsed,setSidebarCollapsed]=useState(false);
 const initial=window.__studentosData||blankData();
 const [tasks,setTasks]=useState(initial.tasks),[exams,setExams]=useState(initial.exams),[scores,setScores]=useState(initial.scores);
 const [journey,setJourney]=useState(initial.journey),[classLevel,setClassLevel]=useState(initial.classLevel||""),[showTask,setShowTask]=useState(false),[editingTask,setEditingTask]=useState<Task|null>(null),[showScore,setShowScore]=useState(false),[showExam,setShowExam]=useState(false);
 const [focusSeconds,setFocusSeconds]=useState(1500),[focusRunning,setFocusRunning]=useState(false),[accountError,setAccountError]=useState("");
 useEffect(()=>{
  if(mode!=="account"||!window.__studentosUserId)return;
  const payload={tasks,exams,scores,journey,classLevel,displayName:initial.displayName||"Student"};
  const timer=window.setTimeout(()=>{void saveCloudData(window.__studentosUserId!,payload)},250);
  return()=>window.clearTimeout(timer);
 },[mode,tasks,exams,scores,journey,classLevel]);
 useEffect(()=>{if(!focusRunning)return;const timer=window.setInterval(()=>setFocusSeconds(s=>{if(s<=1){setFocusRunning(false);return 1500}return s-1}),1000);return()=>window.clearInterval(timer)},[focusRunning]);
 const completed=tasks.filter(t=>t.done).length;
 const scoreAverage=scores.length?Math.round(scores.reduce((a,s)=>a+s.obtained/s.max,0)/scores.length*100):0;
 const navigate=(p:Page)=>{setPage(p);setMobileNav(false)}; const profileAction=()=>{if(mode==="anonymous")navigate("settings");else onExit()};
 return <div className="app-shell">
  <aside className={(mobileNav?"sidebar open ":"sidebar ")+(sidebarCollapsed?"collapsed":"")}>
   <div className="brand"><div className="brand-mark"><Command size={19}/></div><div><strong>StudentOS</strong><span>your school operating system</span></div><button className="icon-btn mobile-close" aria-label="Collapse sidebar" onClick={()=>{setSidebarCollapsed(!sidebarCollapsed);setMobileNav(false)}}>{sidebarCollapsed?<ChevronRight size={18}/>:<X size={18}/>}</button></div>
   <nav>
    <NavItem icon={<LayoutDashboard size={18}/>} label="Dashboard" active={page==="dashboard"} onClick={()=>navigate("dashboard")}/>
    <NavItem icon={<BookOpen size={18}/>} label="Study" active={page==="study"} onClick={()=>navigate("study")}/>
    <NavItem icon={<CalendarDays size={18}/>} label="Exams" active={page==="exams"} onClick={()=>navigate("exams")}/>
    <NavItem icon={<TrendingUp size={18}/>} label="Scores" active={page==="scores"} onClick={()=>navigate("scores")}/>
    <NavItem icon={<Clock3 size={18}/>} label="Focus" active={page==="focus"} onClick={()=>navigate("focus")}/>
    <NavItem icon={<Target size={18}/>} label="Journey" active={page==="journey"} onClick={()=>navigate("journey")}/>
   </nav>
   <div className="sidebar-bottom"><div className="free-pill"><Zap size={15}/> Free mode</div><NavItem icon={<Settings size={18}/>} label="Settings" active={page==="settings"} onClick={()=>navigate("settings")}/></div>
  </aside>
  <main className="main">
   <header className="topbar"><button className="icon-btn mobile-menu" onClick={()=>setMobileNav(true)}><Menu size={21}/></button><div><div className="eyebrow">STUDENTOS</div><h1>{pageTitle(page)}</h1></div><div className="top-actions"><div className="mode-badge"><span className="dot"/>{mode==="account"?"Saved account":"Anonymous session"}</div><button className="avatar" onClick={profileAction} title={mode==="anonymous"?"Open profile settings":"Sign out"}>{(mode==="account"?window.__studentosEmail?.slice(0,1):initial.displayName?.slice(0,1))?.toUpperCase()||"S"}</button></div></header>
   <div className="content">
    {page==="dashboard"&&<Dashboard journey={journey} classLevel={classLevel} completed={completed} tasks={tasks} exams={exams} scoreAverage={scoreAverage} navigate={navigate} setTasks={setTasks} onAddTask={()=>setShowTask(true)} onEditTask={setEditingTask} onDeleteTask={id=>setTasks(all=>all.filter(x=>x.id!==id))}/>} 
    {page==="study"&&<Study tasks={tasks} setTasks={setTasks} onAdd={()=>setShowTask(true)}/>}
    {page==="exams"&&<Exams exams={exams} setExams={setExams} onAdd={()=>setShowExam(true)}/>}
    {page==="scores"&&<Scores scores={scores} setScores={setScores} onAdd={()=>setShowScore(true)}/>}
    {page==="focus"&&<Focus seconds={focusSeconds} running={focusRunning} setRunning={setFocusRunning} reset={()=>{setFocusRunning(false);setFocusSeconds(1500)}}/>}
    {page==="journey"&&<Journey journey={journey} setJourney={setJourney} completed={completed} exams={exams} scoreAverage={scoreAverage}/>}
    {page==="settings"&&<SettingsPage journey={journey} setJourney={setJourney} classLevel={classLevel} setClassLevel={setClassLevel} mode={mode} onSignIn={()=>{if(!supabase){setAccountError("Supabase is not connected yet. Sign up & sync will be available after the StudentOS Supabase environment is configured.");return;}setAccountError("");onSignIn()}} accountError={accountError}/>}
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
  <section className="hero-card"><div><div className="hero-kicker"><Sparkles size={15}/> YOUR PERSONAL OPERATING SYSTEM FOR SCHOOL</div><h2>Turn school into a <span>mission.</span></h2><p>Plan your work, track your progress, and know exactly what to do next.</p><button className="primary-btn" onClick={()=>p.navigate("study")}>Open today's plan <ChevronRight size={17}/></button></div><div className="hero-orbit"><div><GraduationCap size={34}/><strong>{p.classLevel||"—"}</strong><span>{p.classLevel?"Class / Grade":"Set your class"}</span></div></div></section>
  <div className="section-heading"><div><h3>Today</h3><p>Your next actions, without the clutter.</p></div><button className="ghost-btn" onClick={p.onAddTask}><Plus size={16}/> Add task</button></div>
  <section className="stats-grid"><Stat icon={<Target/>} label="Main priority" value={p.journey}/><Stat icon={<Check/>} label="Study tasks" value={p.completed+"/"+p.tasks.length+" complete"}/><Stat icon={<TrendingUp/>} label="Score average" value={p.scoreAverage+"%"}/><Stat icon={<CalendarDays/>} label="Upcoming exams" value={String(p.exams.length)}/></section>
  <div className="two-col">
   <section className="panel"><div className="panel-head"><div><h3>Today's study plan</h3><p>{todayTasks.length} sessions scheduled</p></div><button className="text-btn" onClick={()=>p.navigate("study")}>View all</button></div><div className="task-list">{todayTasks.map(t=><TaskRow key={t.id} task={t} toggle={()=>p.setTasks(all=>all.map(x=>x.id===t.id?{...x,done:!x.done}:x))} onEdit={()=>p.onEditTask(t)} onDelete={()=>p.onDeleteTask(t.id)}/>)}</div></section>
   <section className="panel"><div className="panel-head"><div><h3>Upcoming exams</h3><p>Keep your portions moving.</p></div><button className="text-btn" onClick={()=>p.navigate("exams")}>View all</button></div>{p.exams.map(e=><div className="exam-mini" key={e.id}><div className="date-box"><strong>{new Date(e.date+"T12:00:00").getDate()}</strong><span>{new Date(e.date+"T12:00:00").toLocaleString("en",{month:"short"})}</span></div><div className="grow"><strong>{e.name}</strong><span>{e.subject+" · "+e.progress+"% prepared"}</span><div className="progress"><i style={{width:e.progress+"%"}}/></div></div></div>)}</section>
  </div>
  <section className="mission-strip"><div className="mission-icon"><Flame size={22}/></div><div><span>CURRENT FOCUS</span><strong>{p.journey}</strong></div><button onClick={()=>p.navigate("journey")}>Open journey <ChevronRight size={16}/></button></section>
 </div>
}
function Study(p:{tasks:Task[];setTasks:Dispatch<SetStateAction<Task[]>>;onAdd:()=>void;onEditTask:(task:Task)=>void;onDeleteTask:(id:number)=>void}){const [filter,setFilter]=useState("All");const subjects=["All",...Array.from(new Set(p.tasks.map(t=>t.subject)))];const shown=filter==="All"?p.tasks:p.tasks.filter(t=>t.subject===filter);return <div className="stack"><PageIntro title="Study command center" text="Turn your syllabus into small, finishable sessions." action={<button className="primary-btn" onClick={p.onAdd}><Plus size={17}/> Add study session</button>}/><div className="filter-row">{subjects.map(s=><button key={s} className={filter===s?"filter active":"filter"} onClick={()=>setFilter(s)}>{s}</button>)}</div><section className="panel"><div className="panel-head"><div><h3>Study sessions</h3><p>Tap a session when it is done.</p></div><span className="count-pill">{shown.filter(t=>t.done).length+"/"+shown.length}</span></div><div className="task-list large">{shown.map(t=><TaskRow key={t.id} task={t} toggle={()=>p.setTasks(all=>all.map(x=>x.id===t.id?{...x,done:!x.done}:x))} onEdit={()=>p.onEditTask(t)} onDelete={()=>p.onDeleteTask(t.id)} detailed/>)}</div></section></div>}
function Exams(p:{exams:Exam[];setExams:Dispatch<SetStateAction<Exam[]>>;onAdd:()=>void}){return <div className="stack"><PageIntro title="Exam control" text="Know what's coming and how ready you actually are." action={<button className="primary-btn" onClick={p.onAdd}><Plus size={17}/> Add exam</button>}/><div className="exam-grid">{p.exams.map(e=><section className="panel exam-card" key={e.id}><div className="exam-card-top"><div className="date-box"><strong>{new Date(e.date+"T12:00:00").getDate()}</strong><span>{new Date(e.date+"T12:00:00").toLocaleString("en",{month:"short"})}</span></div><button className="icon-btn" onClick={()=>p.setExams(all=>all.filter(x=>x.id!==e.id))}><X size={16}/></button></div><span className="tag">{e.subject}</span><h3>{e.name}</h3><p>{e.portion}</p><div className="progress-label"><span>Preparation</span><strong>{e.progress+"%"}</strong></div><div className="progress"><i style={{width:e.progress+"%"}}/></div></section>)}</div></div>}
function Scores(p:{scores:Score[];setScores:Dispatch<SetStateAction<Score[]>>;onAdd:()=>void}){const total=p.scores.reduce((a,s)=>a+s.obtained,0),max=p.scores.reduce((a,s)=>a+s.max,0);return <div className="stack"><PageIntro title="Score tracker" text="Record marks and watch your progress build over time." action={<button className="primary-btn" onClick={p.onAdd}><Plus size={17}/> Add score</button>}/><div className="stats-grid"><Stat icon={<Gauge/>} label="Overall recorded" value={(max?Math.round(total/max*100):0)+"%"}/><Stat icon={<Trophy/>} label="Tests recorded" value={String(p.scores.length)}/></div><section className="panel"><div className="panel-head"><div><h3>Recent scores</h3><p>Your recorded assessments.</p></div></div><div className="score-table"><div className="score-row head"><span>Subject</span><span>Assessment</span><span>Marks</span><span>Percent</span><span/></div>{p.scores.map(s=><div className="score-row" key={s.id}><strong>{s.subject}</strong><span>{s.test}</span><span>{s.obtained+"/"+s.max}</span><strong>{Math.round(s.obtained/s.max*100)+"%"}</strong><button className="icon-btn" onClick={()=>p.setScores(all=>all.filter(x=>x.id!==s.id))}><X size={15}/></button></div>)}</div></section></div>}
function Focus(p:{seconds:number;running:boolean;setRunning:(x:boolean)=>void;reset:()=>void}){const m=Math.floor(p.seconds/60).toString().padStart(2,"0"),s=(p.seconds%60).toString().padStart(2,"0");return <div className="focus-page"><div className="focus-card"><div className="hero-kicker"><Clock3 size={15}/> FOCUS MODE</div><h2>{m+":"+s}</h2><p>One focused block. One clear objective.</p><div className="focus-actions"><button className="primary-btn" onClick={()=>p.setRunning(!p.running)}>{p.running?"Pause":"Start focus"}</button><button className="ghost-btn" onClick={p.reset}>Reset</button></div><div className="focus-note"><Zap size={17}/> 25-minute Pomodoro · no subscription required</div></div></div>}
function Journey(p:{journey:string;setJourney:(s:string)=>void;completed:number;exams:Exam[];scoreAverage:number}){const [editing,setEditing]=useState(false),[draft,setDraft]=useState(p.journey);return <div className="stack"><PageIntro title="Your journey" text="Give the next phase of school a name that means something to you."/><section className="journey-card"><div className="journey-badge"><Target size={27}/></div><div className="grow"><span className="eyebrow">CURRENT JOURNEY</span>{editing?<div className="inline-edit"><input value={draft} onChange={e=>setDraft(e.target.value)}/><button className="primary-btn small" onClick={()=>{p.setJourney(draft);setEditing(false)}}>Save</button></div>:<h2>{p.journey}</h2>}<p>Keep this objective visible when deciding what deserves your attention.</p></div>{!editing&&<button className="ghost-btn" onClick={()=>setEditing(true)}>Edit</button>}</section><div className="journey-grid"><Stat icon={<Check/>} label="Study sessions done" value={String(p.completed)}/><Stat icon={<TrendingUp/>} label="Recorded score level" value={p.scoreAverage+"%"}/><Stat icon={<CalendarDays/>} label="Exams on radar" value={String(p.exams.length)}/></div></div>}
function SettingsPage(p:{journey:string;setJourney:(s:string)=>void;classLevel:string;setClassLevel:(s:string)=>void;mode:"anonymous"|"account";onSignIn:()=>void;accountError:string}){
 const [objective,setObjective]=useState(p.journey),[grade,setGrade]=useState(p.classLevel);
 return <div className="stack"><PageIntro title="Settings" text="Make StudentOS yours. Your profile choices shape what you see."/>
 <section className="panel settings-panel">
  <SettingBlock title="Profile & preferences" text="Choose the class or grade you want StudentOS to display. You can change this anytime." right={<span className="status-pill"><span className="dot"/> Personalised</span>}>
   <div className="preference-row"><label>Class / grade<select className="setting-input" value={grade} onChange={e=>{setGrade(e.target.value);p.setClassLevel(e.target.value)}}><option value="">Not set</option>{Array.from({length:12},(_,i)=><option key={i+1} value={String(i+1)}>Class {i+1}</option>)}<option value="College">College</option></select></label></div>
  </SettingBlock>
  <SettingBlock title="Session mode" text={p.mode==="account"?"Your StudentOS workspace is connected to your account and syncs your changes.":"Anonymous mode keeps this session in memory only. Sign up anytime to keep your workspace across sessions."} right={<span className="status-pill"><span className="dot"/> {p.mode==="account"?"Account synced":"Anonymous"}</span>}/>
  <SettingBlock title="Journey objective" text="This is the main objective shown around StudentOS." right={<button className="ghost-btn" onClick={()=>p.setJourney(objective)}>Save</button>}><input className="setting-input" value={objective} onChange={e=>setObjective(e.target.value)}/></SettingBlock>
  <SettingBlock title="Account & sync" text={p.mode==="account"?"Your account is connected. StudentOS saves your workspace to the cloud as you make changes.":"Create or sign in to an account to keep your StudentOS workspace synced across sessions."} right={p.mode==="account"?<span className="status-pill"><span className="dot"/> Synced</span>:<button className="primary-btn setting-signin" onClick={p.onSignIn}>Sign up & sync <ChevronRight size={15}/></button>}>
   {p.accountError&&<div className="auth-error settings-auth-error">{p.accountError}</div>}
  </SettingBlock>
  <SettingBlock title="Data" text={p.mode==="account"?"Your tasks, exams, scores, journey and profile preferences are stored in your account database.":"Anonymous data stays in memory and is not uploaded to a cloud account."} right={<span className="muted">{p.mode==="account"?"Cloud saved":"Local only"}</span>}/>
 </section></div>
}
function SettingBlock(p:{title:string;text:string;right:ReactNode;children?:ReactNode}){return <div className="setting-block"><div className="grow"><h3>{p.title}</h3><p>{p.text}</p>{p.children}</div><div>{p.right}</div></div>}
function Stat(p:{icon:ReactNode;label:string;value:string}){return <div className="stat-card"><div className="stat-icon">{p.icon}</div><div><span>{p.label}</span><strong>{p.value}</strong></div></div>}
function TaskRow(p:{task:Task;toggle:()=>void;onEdit:()=>void;onDelete:()=>void;detailed?:boolean}){return <div className={p.task.done?"task-row done":"task-row"}><button className="check-btn" onClick={p.toggle} aria-label={p.task.done?"Mark incomplete":"Mark complete"}>{p.task.done?<Check size={15}/>:null}</button><div className="grow"><strong>{p.task.title}</strong><span>{p.task.subject+(p.detailed?" · "+p.task.date:"")}</span></div><span className="minutes">{p.task.minutes+"m"}</span><div className="task-actions"><button className="task-action" onClick={p.onEdit} aria-label={"Edit "+p.task.title} title="Edit"><Pencil size={14}/></button><button className="task-action danger" onClick={p.onDelete} aria-label={"Delete "+p.task.title} title="Delete"><Trash2 size={14}/></button></div></div>}
function PageIntro(p:{title:string;text:string;action?:ReactNode}){return <div className="page-intro"><div><h2>{p.title}</h2><p>{p.text}</p></div>{p.action}</div>}
function Modal(p:{title:string;close:()=>void;children:ReactNode}){return <div className="modal-backdrop" onMouseDown={p.close}><div className="modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><h3>{p.title}</h3><button className="icon-btn" onClick={p.close}><X/></button></div>{p.children}</div></div>}
function ModalActions(p:{close:()=>void;save:()=>void}){return <div className="modal-actions"><button className="ghost-btn" onClick={p.close}>Cancel</button><button className="primary-btn" onClick={p.save}>Save</button></div>}
function FormInput(p:{label:string;value:string;onChange:(s:string)=>void;placeholder?:string;type?:string}){return <label className="field"><span>{p.label}</span><input type={p.type||"text"} value={p.value} onChange={e=>p.onChange(e.target.value)} placeholder={p.placeholder}/></label>}
function TaskModal(p:{close:()=>void;add?:(t:Task)=>void;task?:Task;save?:(t:Task)=>void}){const editing=!!p.task;const [title,setTitle]=useState(p.task?.title||"");const [subject,setSubject]=useState(p.task?.subject||"Maths");const [minutes,setMinutes]=useState(String(p.task?.minutes||30));const [date,setDate]=useState(p.task?.date||today);const submit=()=>{const task:Task={id:p.task?.id||Date.now(),title:title.trim()||"Untitled study session",subject:subject.trim()||"Other",date,done:p.task?.done||false,minutes:Math.max(1,Number(minutes)||30)};if(editing)p.save?.(task);else p.add?.(task)};return <Modal title={editing?"Edit study session":"Add study session"} close={p.close}><FormInput label="Session" value={title} onChange={setTitle} placeholder="e.g. Trigonometry practice"/><FormInput label="Subject" value={subject} onChange={setSubject}/><div className="form-two"><FormInput label="Minutes" value={minutes} onChange={setMinutes} type="number"/><FormInput label="Date" value={date} onChange={setDate} type="date"/></div><ModalActions close={p.close} save={submit}/></Modal>}
function ScoreModal(p:{close:()=>void;add:(s:Score)=>void}){const [subject,setSubject]=useState("Maths"),[test,setTest]=useState(""),[obtained,setObtained]=useState(""),[max,setMax]=useState("40");return <Modal title="Record a score" close={p.close}><FormInput label="Subject" value={subject} onChange={setSubject}/><FormInput label="Assessment" value={test} onChange={setTest} placeholder="Unit test"/><div className="form-two"><FormInput label="Marks" value={obtained} onChange={setObtained} type="number"/><FormInput label="Out of" value={max} onChange={setMax} type="number"/></div><ModalActions close={p.close} save={()=>p.add({id:Date.now(),subject,test:test||"Assessment",obtained:Number(obtained)||0,max:Number(max)||40,date:today})}/></Modal>}
function ExamModal(p:{close:()=>void;add:(e:Exam)=>void}){const [name,setName]=useState(""),[subject,setSubject]=useState("Maths"),[date,setDate]=useState("2026-10-15"),[portion,setPortion]=useState("");return <Modal title="Add exam" close={p.close}><FormInput label="Exam name" value={name} onChange={setName}/><FormInput label="Subject" value={subject} onChange={setSubject}/><FormInput label="Date" value={date} onChange={setDate} type="date"/><FormInput label="Portion" value={portion} onChange={setPortion} placeholder="Chapters / topics"/><ModalActions close={p.close} save={()=>p.add({id:Date.now(),name:name||"New exam",subject,date,portion:portion||"Portion not added yet",progress:0})}/></Modal>}
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
 if(screen==="app")return <StudentOSApp mode={mode} onExit={exit} onSignIn={()=>{setAuthMode("signup");setAuthOpen(true);setScreen("welcome")}}/>;
 return <div className="welcome-shell">
  <header className="welcome-nav"><div className="welcome-brand"><div className="brand-mark"><Command size={20}/></div><strong>StudentOS</strong></div><div className="welcome-nav-actions"><button className="nav-auth-link" onClick={enterAnonymous}>Try anonymously</button><button className="nav-auth-btn" onClick={()=>{setAuthMode("signup");setAuthOpen(true)}}>Get started <ChevronRight size={16}/></button></div></header>
  <Welcome onAnonymous={enterAnonymous} openAuth={(m)=>{setAuthMode(m);setAuthOpen(true)}} onSocial={social} error={error}/>
  {anonymousSetupOpen&&<AnonymousSetupModal close={()=>setAnonymousSetupOpen(false)} continueSetup={finishAnonymousSetup} account={false}/>} {accountSetupOpen&&<AnonymousSetupModal close={()=>setAccountSetupOpen(false)} continueSetup={finishAccountSetup} account={true}/>}
  {authOpen&&<AuthModal mode={authMode} setMode={setAuthMode} close={()=>{setAuthOpen(false);setError("")}} onSocial={social} onEmail={emailAuth} error={error}/>}
 </div>
}

function AnonymousSetupModal(p:{close:()=>void;continueSetup:(displayName:string,journey:string,classLevel:string)=>void|Promise<void>;account:boolean}){const [name,setName]=useState(""),[journey,setJourney]=useState(""),[classLevel,setClassLevel]=useState("");return <div className="modal-backdrop auth-backdrop" onMouseDown={p.close}><div className="auth-card auth-modal setup-modal" onMouseDown={e=>e.stopPropagation()}><button className="auth-close icon-btn" onClick={p.close} aria-label="Close"><X size={18}/></button><div className="auth-icon"><Command size={22}/></div><h1>{p.account?"Welcome to StudentOS":"Let's set up your StudentOS"}</h1><p>{p.account?"Your account is ready. Tell us a little about yourself so we can personalize your workspace.":"You're continuing anonymously, so we'll personalize your workspace without creating an account."}</p><label className="field"><span>What should we call you?</span><input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" autoFocus/></label><label className="field"><span>What would you like to name your journey?</span><input value={journey} onChange={e=>setJourney(e.target.value)} placeholder="e.g. 90%+ Mission, Road to Engineering"/></label><label className="field"><span>What class / year are you in?</span><input value={classLevel} onChange={e=>setClassLevel(e.target.value)} placeholder="e.g. Class 10"/></label><button className="primary-btn auth-submit reference-continue" onClick={()=>p.continueSetup(name,journey,classLevel)} disabled={!name.trim()||!journey.trim()}>Enter StudentOS <ChevronRight size={17}/></button><small className="auth-note">{p.account?"You can change these preferences anytime in Settings.":"Anonymous mode stays on this device/session and is not saved to a cloud account."}</small></div></div>}

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
 return <main className="welcome-main">
  <section className="welcome-hero interactive-hero">
   <div className="hero-orb orb-one"/><div className="hero-orb orb-two"/>
   <div className="welcome-copy reveal">
    <div className="hero-kicker"><span className="welcome-dot"/> PERSONAL ACADEMIC COMMAND CENTER</div>
    <h1>Make school feel <span>lighter.</span><br/>Make progress feel <span>visible.</span></h1>
    <p>Plan your work, understand your progress, prepare for what is next, and keep your long-term direction in one beautiful student workspace.</p>
    <div className="hero-cta-row"><button className="primary-btn welcome-primary" onClick={()=>p.openAuth("signup")}>Get started <ChevronRight size={18}/></button><button className="ghost-btn welcome-secondary" onClick={p.onAnonymous}>Try anonymously</button></div>
    <div className="trust-row"><span>✓ No credit card</span><span>✓ Anonymous mode</span><span>✓ Cloud sync when signed in</span></div>
   </div>
   <div className="hero-product reveal-delay">
    <div className="float-chip chip-one"><TrendingUp size={15}/> Scores <strong>92%</strong></div>
    <div className="float-chip chip-two"><Clock3 size={15}/> Focus <strong>24:18</strong></div>
    <div className="product-window"><div className="window-top"><div className="window-dots"><i/><i/><i/></div><span>STUDENTOS / DASHBOARD</span><span className="window-status">LIVE</span></div><div className="window-main"><div className="window-title">Your next move</div><div className="window-mission">Finish what matters today.</div><div className="window-grid"><div><span>TODAY</span><strong>4 tasks</strong></div><div><span>EXAMS</span><strong>2 upcoming</strong></div><div><span>FOCUS</span><strong>01:25</strong></div></div><div className="window-progress"><span>Journey progress</span><i><b/></i></div></div></div>
   </div>
  </section>
  <section className="ticker"><span>STUDY</span><i/> <span>EXAMS</span><i/> <span>SCORES</span><i/> <span>FOCUS</span><i/> <span>JOURNEY</span><i/> <span>YOUR NEXT MOVE</span></section>
  <section className="how-section welcome-how reveal-section"><div className="how-heading"><div><div className="hero-kicker"><Sparkles size={15}/> BUILT FOR DIFFERENT STUDENTS</div><h3>One system. Your way.</h3><p>Your class, goals, subjects and pace are preferences—not assumptions. Change them whenever you want.</p></div><div className="how-badge"><Zap size={13}/> FLEXIBLE BY DESIGN</div></div><div className="how-grid">
   <FeatureCard number="01" icon={<Target/>} title="Shape your workspace" text="Choose your class or grade, set a personal objective, and make the dashboard yours."/>
   <FeatureCard number="02" icon={<BookOpen/>} title="Plan the next move" text="Break schoolwork into focused sessions instead of staring at a giant to-do list."/>
   <FeatureCard number="03" icon={<CalendarDays/>} title="See what's coming" text="Keep exams, portions and preparation progress in one place."/>
   <FeatureCard number="04" icon={<TrendingUp/>} title="Understand your scores" text="Record assessments and see your performance build over time."/>
   <FeatureCard number="05" icon={<Clock3/>} title="Lock in focus" text="Use focused work blocks when it is time to actually get things done."/>
   <FeatureCard number="06" icon={<Flame/>} title="Keep the bigger picture" text="Give your current journey a name and keep your long-term direction visible."/>
  </div></section>
  <section className="showcase-grid reveal-section"><div className="showcase-copy"><span className="hero-kicker">A DASHBOARD THAT MOVES WITH YOU</span><h2>Less clutter.<br/><span>More momentum.</span></h2><p>StudentOS is designed around the feeling of knowing what matters next. The interface surfaces the useful stuff without turning school into another spreadsheet.</p><div className="mini-points"><div><Sparkles size={16}/><span>Clear daily priorities</span></div><div><Zap size={16}/><span>Fast, lightweight tools</span></div><div><Target size={16}/><span>Personal goals & preferences</span></div></div></div><div className="stacked-cards"><div className="float-card card-a"><span>MONDAY</span><strong>Maths · 45 min</strong><small>Quadratics practice</small></div><div className="float-card card-b"><span>JOURNEY</span><strong>Finish what matters.</strong><small>Keep moving, one session at a time.</small></div><div className="float-card card-c"><span>FOCUS</span><strong>25:00</strong><small>One block. One objective.</small></div></div></section>
 </main>
}

function pageTitle(p:Page){return {dashboard:"Dashboard",study:"Study",exams:"Exams",scores:"Scores",focus:"Focus",journey:"Journey",settings:"Settings"}[p]}

export default App;
