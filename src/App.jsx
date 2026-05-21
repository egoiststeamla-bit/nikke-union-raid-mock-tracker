import { useState, useEffect } from 'react';
import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const DEFAULT_MEMBERS = ['Ada','Adema','Anda','Cray','Creature','Dragg','Egoist','Elija','John','Jose','Kenty','Klein','Kuhaku','Mailibub','Malice50','Metamor','Mikohara','Nasury','Niotrink','No','Presens','Pyra','Ranzuken','Reign','Shareph','Surdax','Thearic','Twogainz','Vitap','Yuly','Zarock','몰렁'];
const DEFAULT_BOSS_NAMES = ['Boss 1','Boss 2','Boss 3','Boss 4','Boss 5'];
const BOSSES = 5, UPR = 5, MAX_ACTUAL = 3, ADMIN_PW = 'union';
const UNITS = ['2B','A2','Ada Wong','Ade','Ade: Agent Bunny','Admi','Alice','Alice: Wonderland Bunny','Anchor','Anchor: Innocent Maid','Anis','Anis: Sparkling Summer','Anis: Star','Anne: Miracle Fairy','Arcana','Arcana: Fortune Mate','Aria','Asuka Shikinami Langley','Asuka Shikinami Langley: Wille','Bay','Belorta','Biscuit','Blanc','Bready','Brid','Brid: Silent Track','Centi','Chime','Chisato Nishikigi','Cinderella','Claire Redfield','Clay','Cocoa','Crow','Crown','Crust','D','D: Killer Wife','Delta','Delta: Ninja Thief','Diesel','Diesel: Winter Sweets','Dolla','Dorothy','Dorothy: Serendipity','Drake','E.H.','Ein','Elegg','Elegg: Boom and Shock','Emilia','Emma','Emma: Tactical Upgrade','Epinel','Ether','Eunhwa','Eunhwa: Tactical Upgrade','Eve','Exia','Flora','Folkwang','Frima','Grave','Guillotine','Guillotine: Winter Slayer','Guilty','Harran','Helm','Helm: Aquamarine','Himeno','Isabel','Jackal','Jill Valentine','Julia','K','Kilo','Kurumi','Label','Laplace','Leona','Liberalio','Lily','Liter','Little Mermaid (Siren)','Ludmilla','Ludmilla: Winter Owner','Maiden','Maiden: Ice Rose','Makima','Mana','Marciana','Mari Makinami Illustrious','Mary','Mary: Bay Goddess','Mast','Mast: Romantic Maid','Maxwell','Mica','Mica: Snow Buddy','Mihara','Mihara: Bonding Chain','Milk','Milk: Blooming Bunny','Miranda','Misato Katsuragi','Modernia','Moran','Mori','N102','Naga','Nayuta','Neon','Neon: Blue Ocean','Neon: Vision Eye','Nero','Neve','Nihilister','Noah','Noir','Noise','Novel','Pascal','Pepper','Phantom','Poli','Power','Privaty','Privaty: Unkind Maid','Product 08','Product 12','Product 23','Quency','Quency: Escape Queen','Quiry','Ram','Rapi','Rapi: Red Hood','Rapunzel','Rapunzel: Pure Grace','Raven','Red Hood','Rei','Rei Ayanami','Rei Ayanami (Tentative Name)','Rem','Rosanna','Rosanna: Chic Ocean','Rouge','Rumani','Rupee','Rupee: Winter Shopper','S. Anis','Sakura','Sakura: Bloom in Summer','SBS','Scarlet','Scarlet: Black Shadow','Signal','Snow Crane','Snow White','Snow White: Heavy Arms','Soda','Soline','Soline: Forsaken Aqua','Sugar','Tia','Tikka','Tove','Venia','Vesti','Viper','Zwei'];

const emptyRun = () => ({ units: Array(UPR).fill(''), damage: '', excluded: false, isActual: false });
const emptyData = () => ({ runs: Array(BOSSES).fill(null).map(() => [emptyRun(),emptyRun(),emptyRun(),emptyRun(),emptyRun()]), doubleHit: Array(BOSSES).fill(false) });

const fmt = (n) => { const v=parseFloat(n); if(!v||isNaN(v)) return ''; if(v>=1e9) return (v/1e9).toFixed(2)+'B'; if(v>=1e6) return (v/1e6).toFixed(1)+'M'; if(v>=1e3) return (v/1e3).toFixed(0)+'K'; return v.toLocaleString(); };
const allActualUnits = (d) => { const s=new Set(); d.runs.flat().forEach(r=>{if(r.isActual)r.units.forEach(u=>u&&s.add(u));}); return s; };
const bossActualUnits = (d,bi) => { const s=new Set(); d.runs[bi].forEach(r=>{if(r.isActual)r.units.forEach(u=>u&&s.add(u));}); return s; };
const totalActuals = (d) => d.runs.flat().filter(r=>r.isActual).length;
const bossActualCount = (d,bi) => d.runs[bi].filter(r=>r.isActual).length;
const runIsBlocked = (run,data,boss,ri) => { const s=new Set(); data.runs.forEach((br,bi)=>br.forEach((r,i)=>{if(r.isActual&&!(bi===boss&&i===ri))r.units.forEach(u=>u&&s.add(u));})); return run.units.some(u=>u&&s.has(u)); };
const deepSet = (obj,path,val) => { const d=JSON.parse(JSON.stringify(obj)); let c=d; for(let i=0;i<path.length-1;i++) c=c[path[i]]; c[path[path.length-1]]=val; return d; };
const exportCSV = (allData,bossNames,members) => { const rows=[['Member','Boss','Run#','Is Actual','Damage','Unit1','Unit2','Unit3','Unit4','Unit5']]; members.forEach(m=>{const d=allData[m]??emptyData(); d.runs.forEach((br,bi)=>br.forEach((run,ri)=>{if(!run.damage&&run.units.every(u=>!u))return; rows.push([m,bossNames[bi],ri+1,run.isActual?'YES':'',run.damage||'',...run.units]);}));}); const csv=rows.map(r=>r.map(v=>`"${v}"`).join(',')).join('\n'); const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download=`union_raid_${new Date().toISOString().slice(0,10)}.csv`; a.click(); };

const C = { bg:'#0f1117',surf:'#16181f',surf2:'#1e2130',bdr:'#2a2d3e',txt:'#e8eaf0',mut:'#6b7280',grn:'#4ade80',gld:'#fbbf24',red:'#f87171',dang:'#7f1d1d',succ:'#14532d' };
const f = { fontFamily:'Helvetica, Arial, sans-serif' };
const pill = (bg,color) => ({ fontSize:10,padding:'2px 7px',background:bg,border:`1px solid ${C.bdr}`,borderRadius:999,color,whiteSpace:'nowrap' });

// Firebase helpers — single doc "raid" in collection "data"
const DOC_REF = () => doc(db, 'data', 'raid');

const loadFromFirebase = async () => {
  try {
    const snap = await getDoc(DOC_REF());
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    console.error("Firestore load failed:", e);
    return null;
  }
};

const saveToFirebase = async (payload) => {
  try {
    console.log("🔥 writing to Firestore...", payload);

    // 🧯 FIX: remove nested arrays before saving
    const cleaned = {
      ...payload,
      data: Object.fromEntries(
        Object.entries(payload.data).map(([member, d]) => [
          member,
          {
            ...d,
            runs: d.runs.map(bossRuns =>
              Array.isArray(bossRuns)
                ? bossRuns.map(run => ({ ...run }))
                : bossRuns
            )
          }
        ])
      )
    };

    await setDoc(DOC_REF(), cleaned);

    console.log("✅ write success");
  } catch (e) {
    console.error("❌ Firestore save failed:", e);
  }
};
//const saveToFirebase = async (payload) => {
//  try {
//    console.log("🔥 writing to Firestore...", payload);
//
//    await setDoc(DOC_REF(), payload);
//
//    console.log("✅ write success");
//  } catch (e) {
//    console.error("❌ Firestore save failed:", e);
//  }
//};

//const saveToFirebase = async (payload) => {
//  try {
 //   await setDoc(DOC_REF(), payload);
//  } catch (e) {
//    console.error("Firestore save failed:", e);
//  }
//};


export default function App() {
  const [view,setView]       = useState('login');
  const [member,setMember]   = useState(null);
  const [allData,setAll]     = useState({});
  const [bossNames,setBN]    = useState([...DEFAULT_BOSS_NAMES]);
  const [members,setMembers] = useState([...DEFAULT_MEMBERS]);
  const [loading,setLoading] = useState(true);
  const [saving,setSaving]   = useState(false);

  useEffect(()=>{
    (async()=>{
      const p = await loadFromFirebase();
      if(p){ setAll(p.data||{}); setBN(p.bossNames||[...DEFAULT_BOSS_NAMES]); setMembers(p.members||[...DEFAULT_MEMBERS]); }
      setLoading(false);
    })();
  },[]);

  const sanitizeForFirestore = (data) => {
  const copy = structuredClone(data);

  copy.runs = Object.fromEntries(
    copy.runs.map((bossRuns, bossIndex) => [bossIndex, bossRuns])
  );

  return copy;};
  
  //const persist = (data,bn,mems) => saveToFirebase({data,bossNames:bn,members:mems});
  const persist = (data,bn,mems) => {
  console.log("🔥 ABOUT TO SAVE allData =", data);
  console.log("🔥 FULL PAYLOAD =", { data, bossNames: bn, members: mems });

  saveToFirebase({
  data: sanitizeForFirestore(data),
  bossNames: bn,
  members: mems});};
  //const save = async(n,d) => { setSaving(true); const next={...allData,[n]:d}; setAll(next); await persist(next,bossNames,members); setSaving(false); };
  
  const save = async(n,d) => {
  setSaving(true);

  const next = { ...allData, [n]: d };

  // 🔥 PUT DEBUG HERE
  console.log("🚨 CHECK NESTING:", JSON.stringify(next, null, 2));

  setAll(next);
  await persist(next,bossNames,members);
  setSaving(false);};
  const saveBN = async(n) => { setBN(n); await persist(allData,n,members); };
  const saveMems = async(m) => { setMembers(m); await persist(allData,bossNames,m); };
  const wipe = async() => { setAll({}); await persist({},bossNames,members); };
  const getData = n => allData[n]??emptyData();

  if(loading) return (
    <div style={{height:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:C.bg,...f}}>
      <div style={{width:28,height:28,borderRadius:'50%',border:`2px solid ${C.bdr}`,borderTopColor:C.txt,animation:'spin 0.7s linear infinite'}}/>
      <p style={{color:C.mut,fontSize:13,marginTop:12}}>Loading…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if(view==='login') return <LoginView members={members} onMember={n=>{setMember(n);setView('member');}} onAdmin={()=>setView('admin')}/>;
  if(view==='admin') return <AdminView allData={allData} bossNames={bossNames} members={members} onBack={()=>setView('login')} onOverride={save} onSaveBN={saveBN} onSaveMembers={saveMems} onWipe={wipe} onExport={()=>exportCSV(allData,bossNames,members)} getData={getData}/>;
  return <MemberView name={member} data={getData(member)} bossNames={bossNames} allData={allData} members={members} saving={saving} onSave={d=>save(member,d)} onBack={()=>setView('login')}/>;
}

function LoginView({members,onMember,onAdmin}) {
  const [sel,setSel]=useState('');
  return (
    <div style={{minHeight:'100vh',background:C.bg,display:'flex',alignItems:'center',justifyContent:'center',...f}}>
      <div style={{background:C.surf,border:`1px solid ${C.bdr}`,borderRadius:16,width:'100%',maxWidth:400,overflow:'hidden'}}>
        <div style={{background:C.surf2,padding:'2rem',textAlign:'center',borderBottom:`1px solid ${C.bdr}`}}>
          <div style={{fontSize:40,marginBottom:8}}>⚔</div>
          <h1 style={{fontSize:20,fontWeight:700,color:C.txt,margin:0}}>Union Raid</h1>
          <p style={{fontSize:13,color:C.mut,margin:'4px 0 0'}}>Mock Run Tracker</p>
        </div>
        <div style={{padding:'1.5rem',display:'flex',flexDirection:'column',gap:12}}>
          <label style={{fontSize:11,color:C.mut,fontWeight:600,textTransform:'uppercase',letterSpacing:1}}>Select your name</label>
          <select value={sel} onChange={e=>setSel(e.target.value)} style={{width:'100%',padding:'10px 12px',fontSize:13,border:`1px solid ${C.bdr}`,borderRadius:8,background:C.surf2,color:C.txt,cursor:'pointer'}}>
            <option value=''>— choose member —</option>
            {members.map(m=><option key={m} value={m}>{m}</option>)}
          </select>
          <button style={{width:'100%',padding:11,fontSize:13,fontWeight:600,background:C.txt,color:C.bg,border:'none',borderRadius:8,cursor:'pointer',opacity:sel?1:0.4}} disabled={!sel} onClick={()=>onMember(sel)}>Enter my runs →</button>
          <button style={{width:'100%',padding:10,fontSize:13,background:'transparent',color:C.mut,border:`1px solid ${C.bdr}`,borderRadius:8,cursor:'pointer'}} onClick={onAdmin}>Admin view</button>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function MemberView({name,data,bossNames,allData,members,saving,onSave,onBack}) {
  const [boss,setBoss]=useState(0);
  const upd=(path,val)=>onSave(deepSet(data,path,val));
  const gu=allActualUnits(data),tot=totalActuals(data),dh=data.doubleHit[boss];
  const bAct=bossActualCount(data,boss),maxB=dh?2:1;
  const bu=bossActualUnits(data,boss);
  const otherBU=(ri)=>{const s=new Set();data.runs[boss].forEach((r,i)=>{if(i!==ri&&r.isActual)r.units.forEach(u=>u&&s.add(u));});return s;};
  const addRun=()=>{const d=JSON.parse(JSON.stringify(data));d.runs[boss].push(emptyRun());onSave(d);};

  return (
    <div style={{minHeight:'100vh',background:C.bg,display:'flex',gap:16,padding:'2rem 1rem',alignItems:'flex-start',...f}}>
      <div style={{background:C.surf,border:`1px solid ${C.bdr}`,borderRadius:16,flex:'1 1 400px',maxWidth:680,overflow:'hidden'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'1.25rem 1rem 0.75rem',flexWrap:'wrap',gap:8}}>
          <div>
            <button style={{background:'none',border:'none',cursor:'pointer',fontSize:12,color:C.mut,padding:'0 0 4px',display:'block'}} onClick={onBack}>← back</button>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <h2 style={{fontSize:20,fontWeight:700,color:C.txt,margin:0}}>{name}</h2>
              <span style={{fontSize:11,color:C.mut,padding:'2px 8px',background:C.surf2,borderRadius:999}}>{saving?'saving…':'saved ✓'}</span>
            </div>
          </div>
          <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4}}>
            <span style={{fontSize:11,color:C.mut}}>Actual runs used</span>
            <span style={{fontSize:11,fontWeight:700,padding:'2px 10px',borderRadius:999,color:'#fff',background:tot>=MAX_ACTUAL?C.dang:C.succ}}>{tot}/{MAX_ACTUAL}</span>
          </div>
        </div>

        <div style={{display:'flex',gap:6,padding:'0 1rem 1rem',flexWrap:'wrap'}}>
          {Array(BOSSES).fill(0).map((_,bi)=>{
            const best=Math.max(0,...data.runs[bi].map(r=>parseFloat(r.damage)||0));
            const ba=bossActualCount(data,bi);
            return <button key={bi} onClick={()=>setBoss(bi)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2,padding:'8px 12px',borderRadius:8,cursor:'pointer',minWidth:72,border:`1px solid ${bi===boss?'#4a5280':C.bdr}`,background:bi===boss?C.surf2:'transparent',color:C.txt}}>
              <span style={{fontSize:11,fontWeight:600}}>{bossNames[bi]}</span>
              {best>0&&<span style={{fontSize:10,color:C.grn}}>{fmt(best)}</span>}
              {ba>0&&<span style={{fontSize:10,color:C.gld}}>✓{ba}</span>}
            </button>;
          })}
        </div>

        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 1rem 1rem',flexWrap:'wrap',gap:8}}>
          <label style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:C.gld,cursor:'pointer'}}>
            <input type='checkbox' checked={dh} onChange={e=>{
              const next=deepSet(data,['doubleHit',boss],e.target.checked);
              if(!e.target.checked){let f=0;next.runs[boss]=next.runs[boss].map(r=>{if(r.isActual){f++;if(f===2)return{...r,isActual:false};}return r;});}
              onSave(next);
            }}/> Double hit this boss
          </label>
          <span style={{fontSize:11,color:bAct>=maxB?C.gld:C.mut}}>{bAct}/{maxB} actual for this boss</span>
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:8,padding:'0 1rem 1rem'}}>
          {data.runs[boss].map((run,ri)=>{
            const otu=otherBU(ri);
            const gBad=u=>gu.has(u)&&!bu.has(u),iBad=u=>otu.has(u);
            const anyConflict=run.units.some(u=>u&&(gBad(u)||iBad(u)));
            const blocked=runIsBlocked(run,data,boss,ri);
            const canCheck=!run.isActual&&tot<MAX_ACTUAL&&bAct<maxB&&!blocked;
            return (
              <div key={ri} style={{background:run.isActual?'#1a1500':C.surf2,border:`1px solid ${run.isActual?C.gld+'60':C.bdr}`,borderRadius:10,overflow:'hidden',opacity:run.excluded?0.45:1}}>
                <div style={{display:'flex',alignItems:'center',gap:8,padding:'9px 12px',borderBottom:`1px solid ${C.bdr}`,flexWrap:'wrap'}}>
                  <span style={{fontSize:11,fontWeight:700,color:C.mut,textTransform:'uppercase',letterSpacing:1}}>Run {ri+1}</span>
                  {run.damage&&<span style={{fontSize:12,fontWeight:700,color:C.grn,padding:'1px 8px',background:'#0d2818',borderRadius:999}}>{fmt(run.damage)}</span>}
                  {run.isActual&&<span style={{fontSize:11,color:C.gld,padding:'1px 8px',background:'#2d2000',borderRadius:999}}>✓ Actual</span>}
                  {anyConflict&&!run.isActual&&<span style={{fontSize:11,color:C.red,padding:'1px 8px',background:'#2d0f0f',borderRadius:999}}>⚠ locked units</span>}
                  {blocked&&!run.isActual&&<span style={{fontSize:11,color:C.red,padding:'1px 8px',background:'#2d0f0f',borderRadius:999}}>⚠ can't mark — unit locked</span>}
                  <label style={{display:'flex',alignItems:'center',gap:5,marginLeft:'auto',opacity:!run.isActual&&!canCheck?0.3:1,cursor:!run.isActual&&!canCheck?'not-allowed':'pointer'}}>
                    <input type='checkbox' checked={run.isActual} disabled={!run.isActual&&!canCheck} onChange={()=>{if(run.isActual){upd(['runs',boss,ri,'isActual'],false);return;}if(!canCheck)return;upd(['runs',boss,ri,'isActual'],true);}}/>
                    <span style={{fontSize:11,color:run.isActual?C.gld:blocked?C.red:C.mut}}>Actual run</span>
                  </label>
                  {!run.isActual&&<label style={{display:'flex',alignItems:'center',gap:5,cursor:'pointer'}}>
                    <input type='checkbox' checked={run.excluded} onChange={e=>upd(['runs',boss,ri,'excluded'],e.target.checked)}/>
                    <span style={{fontSize:11,color:C.mut}}>Exclude</span>
                  </label>}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:5,padding:'8px 12px'}}>
                  {run.units.map((u,ui)=>{
                    const bad=u&&(gBad(u)||iBad(u));
                    return <select key={ui} value={u} onChange={e=>upd(['runs',boss,ri,'units',ui],e.target.value)} style={{fontSize:11,padding:'5px 4px',borderRadius:6,border:`1px solid ${bad?C.red:u?'#4ade8060':C.bdr}`,background:bad?'#2d0f0f':u?'#0d2818':C.surf,color:bad?C.red:C.txt,cursor:'pointer',width:'100%'}}>
                      <option value=''>Unit {ui+1}</option>
                      {UNITS.map(un=>{const g=gBad(un),i2=iBad(un);return<option key={un} value={un} style={g||i2?{color:C.red}:{}}>{g?'🚫 ':i2?'⚠ ':''}{un}</option>;})}
                    </select>;
                  })}
                </div>
                <div style={{display:'flex',alignItems:'center',gap:10,padding:'7px 12px',borderTop:`1px solid ${C.bdr}`}}>
                  <span style={{fontSize:11,color:C.mut,minWidth:52}}>Damage</span>
                  <input type='number' placeholder='Enter damage in millions' value={run.damage?Math.round(parseFloat(run.damage)/1_000_000):''} style={{flex:1,fontSize:12,padding:'5px 8px',borderRadius:6,textAlign:'right',border:`1px solid ${C.bdr}`,background:C.surf,color:C.txt}}
                    onChange={e=>{const v=e.target.value;upd(['runs',boss,ri,'damage'],v?String(parseFloat(v)*1_000_000):'');}}/>
                  <span style={{fontSize:11,color:C.mut}}>M</span>
                </div>
              </div>
            );
          })}
          <button style={{padding:'9px',fontSize:12,background:'transparent',color:C.mut,border:`1px dashed ${C.bdr}`,borderRadius:8,cursor:'pointer',width:'100%'}} onClick={addRun}>+ Add another run</button>
        </div>
      </div>

      <div style={{flex:'1 1 260px',minWidth:240,maxWidth:380,position:'sticky',top:'2rem',height:'calc(100vh - 4rem)',background:C.surf,border:`1px solid ${C.bdr}`,borderRadius:16,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <OverviewPanel allData={allData} bossNames={bossNames} members={members} activeBoss={boss}/>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function OverviewPanel({allData,bossNames,members,activeBoss}) {
  const [expand,setExpand]=useState(null);
  const [hideConflicts,setHideConflicts]=useState(false);
  const [minDamage,setMinDamage]=useState('');
  const [hideActualUsed,setHideActualUsed]=useState(false);
  const rows=members.map(m=>{
    const d=allData[m]??emptyData();
    const gu=allActualUnits(d);
    const runs=d.runs[activeBoss].filter(r=>!r.excluded&&r.damage).map(r=>({...r,hasConflict:r.units.some(u=>u&&gu.has(u)&&!r.isActual)}));
    let vis=hideConflicts?runs.filter(r=>!r.hasConflict):runs;
    const minV=(parseFloat(minDamage)||0)*1_000_000;
    if(minV>0) vis=vis.filter(r=>(parseFloat(r.damage)||0)>=minV);
    const best=vis.length?Math.max(...vis.map(r=>parseFloat(r.damage)||0)):null;
    const alreadyActual=d.runs[activeBoss].some(r=>r.isActual);
    if(hideActualUsed&&alreadyActual) return null;
    return{m,valid:vis,best};
  }).filter(Boolean).sort((a,b)=>(b.best||0)-(a.best||0));

  return <>
    <div style={{padding:'10px 12px 8px',borderBottom:`1px solid ${C.bdr}`,flexShrink:0}}>
      <span style={{fontSize:11,fontWeight:700,color:C.mut,textTransform:'uppercase',letterSpacing:1}}>Overview — {bossNames[activeBoss]}</span>
      <div style={{display:'flex',alignItems:'center',gap:8,marginTop:8,flexWrap:'wrap'}}>
        <input type='number' placeholder='Min dmg' value={minDamage} onChange={e=>setMinDamage(e.target.value)} style={{width:80,fontSize:11,padding:'4px 6px',borderRadius:6,border:`1px solid ${C.bdr}`,background:C.surf,color:C.txt}}/>
        <span style={{fontSize:11,color:C.mut}}>M</span>
        <label style={{fontSize:11,color:C.mut,display:'flex',alignItems:'center',gap:4,cursor:'pointer'}}>
          <input type='checkbox' checked={hideConflicts} onChange={e=>setHideConflicts(e.target.checked)}/> Hide repeated
        </label>
        <label style={{fontSize:11,color:C.mut,display:'flex',alignItems:'center',gap:4,cursor:'pointer'}}>
          <input type='checkbox' checked={hideActualUsed} onChange={e=>setHideActualUsed(e.target.checked)}/> Hide actual
        </label>
      </div>
    </div>
    <div style={{overflowY:'auto',flex:1}}>
      {rows.map(({m,valid,best},i)=>{
        const isExp=expand===m;
        return <div key={m} style={{borderBottom:`1px solid ${C.bdr}`}}>
          <div style={{display:'flex',alignItems:'center',gap:6,padding:'7px 10px',cursor:'pointer',background:i%2===0?'transparent':'rgba(255,255,255,0.02)'}} onClick={()=>setExpand(isExp?null:m)}>
            <span style={{fontSize:10,color:C.mut,width:16,flexShrink:0}}>{i+1}</span>
            <span style={{fontSize:12,fontWeight:700,color:C.txt,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m}</span>
            <span style={{fontSize:12,fontWeight:700,color:best?C.grn:C.mut,flexShrink:0}}>{best?fmt(best):'—'}</span>
            <span style={{fontSize:10,color:C.mut}}>{isExp?'▲':'▼'}</span>
          </div>
          {isExp&&<div style={{padding:'4px 10px 8px',display:'flex',flexDirection:'column',gap:4}}>
            {valid.length===0&&<p style={{fontSize:11,color:C.mut,margin:0}}>No valid runs.</p>}
            {valid.map((run,ri)=><div key={ri} style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',padding:'4px 6px',background:C.surf2,borderRadius:6,border:`1px solid ${run.isActual?C.gld+'60':C.bdr}`}}>
              <span style={{fontSize:10,color:C.mut,flexShrink:0,minWidth:20}}>R{ri+1}</span>
              <span style={{fontSize:11,fontWeight:700,color:run.isActual?C.gld:C.grn,flexShrink:0}}>{fmt(run.damage)}</span>
              <div style={{display:'flex',flexWrap:'wrap',gap:2,flex:1}}>{run.units.filter(Boolean).map((u,ui)=><span key={ui} style={pill(C.surf2,C.mut)}>{u}</span>)}</div>
              <div style={{display:'flex',alignItems:'center',gap:4}}>
                {run.hasConflict&&<span style={{fontSize:9,color:C.red,flexShrink:0}}>🚫REPEAT</span>}
                {run.isActual&&<span style={{fontSize:9,color:C.gld,flexShrink:0}}>✓ACT</span>}
              </div>
            </div>)}
          </div>}
        </div>;
      })}
    </div>
  </>;
}

function AdminView({allData,bossNames,members,onBack,onOverride,onSaveBN,onSaveMembers,onWipe,onExport,getData}) {
  const [unlocked,setUnlocked]=useState(false);
  const [pw,setPw]=useState(''),[pwErr,setPwErr]=useState(false);
  const [boss,setBoss]=useState(0),[minDmg,setMinDmg]=useState('');
  const [hideActualUsed,setHideActualUsed]=useState(false);
  const [editMember,setEditMember]=useState(null);
  const [editBN,setEditBN]=useState(false),[draftBN,setDraftBN]=useState([...bossNames]);
  const [editMems,setEditMems]=useState(false),[draftMems,setDraftMems]=useState(members.join('\n'));
  const [expandRun,setExpandRun]=useState(null),[confirmWipe,setConfirmWipe]=useState(false);

  if(!unlocked) return (
    <div style={{minHeight:'100vh',background:C.bg,display:'flex',alignItems:'center',justifyContent:'center',...f}}>
      <div style={{background:C.surf,border:`1px solid ${C.bdr}`,borderRadius:16,width:'100%',maxWidth:400,overflow:'hidden'}}>
        <div style={{background:C.surf2,padding:'2rem',textAlign:'center',borderBottom:`1px solid ${C.bdr}`}}>
          <div style={{fontSize:40,marginBottom:8}}>🛡</div>
          <h1 style={{fontSize:20,fontWeight:700,color:C.txt,margin:0}}>Admin</h1>
          <p style={{fontSize:13,color:C.mut,margin:'4px 0 0'}}>Password required</p>
        </div>
        <div style={{padding:'1.5rem',display:'flex',flexDirection:'column',gap:12}}>
          <input type='password' placeholder='password' value={pw} style={{width:'100%',padding:'10px 12px',fontSize:13,border:`1px solid ${pwErr?C.red:C.bdr}`,borderRadius:8,background:C.surf2,color:C.txt,boxSizing:'border-box'}}
            onChange={e=>{setPw(e.target.value);setPwErr(false);}} onKeyDown={e=>e.key==='Enter'&&(pw===ADMIN_PW?setUnlocked(true):setPwErr(true))}/>
          {pwErr&&<p style={{color:C.red,fontSize:12,margin:'-8px 0 0'}}>Wrong password</p>}
          <button style={{width:'100%',padding:11,fontSize:13,fontWeight:600,background:C.txt,color:C.bg,border:'none',borderRadius:8,cursor:'pointer'}} onClick={()=>pw===ADMIN_PW?setUnlocked(true):setPwErr(true)}>Unlock</button>
          <button style={{width:'100%',padding:10,fontSize:13,background:'transparent',color:C.mut,border:`1px solid ${C.bdr}`,borderRadius:8,cursor:'pointer'}} onClick={onBack}>← back</button>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if(editMember) return <MemberView name={editMember} data={getData(editMember)} bossNames={bossNames} allData={allData} members={members} saving={false} onSave={d=>onOverride(editMember,d)} onBack={()=>setEditMember(null)}/>;

  const rows=members.map(m=>{
    const d=allData[m]??emptyData(),gu=allActualUnits(d),bu=bossActualUnits(d,boss);
    const bRuns=d.runs[boss];
    const valid=bRuns.filter(r=>!r.excluded&&r.damage&&!r.units.some(u=>u&&gu.has(u)&&!bu.has(u)));
    const best=valid.length?Math.max(...valid.map(r=>parseFloat(r.damage)||0)):null;
    return{m,d,gu,bu,bRuns,valid,best,tot:totalActuals(d)};
  });
  const minV=(parseFloat(minDmg)||0)*1_000_000;
  const qualified=minV>0?rows.flatMap(({m,valid,d})=>{
    if(hideActualUsed&&d.runs[boss].some(r=>r.isActual)) return [];
    return valid.filter(r=>(parseFloat(r.damage)||0)>=minV).map(r=>({name:m,dmg:parseFloat(r.damage),units:r.units.filter(Boolean),isActual:r.isActual}));
  }).sort((a,b)=>b.dmg-a.dmg):[];
  const smBtn={padding:'5px 12px',fontSize:12,background:'transparent',color:C.mut,border:`1px solid ${C.bdr}`,borderRadius:6,cursor:'pointer'};
  const inp={width:'100%',padding:'10px 12px',fontSize:13,border:`1px solid ${C.bdr}`,borderRadius:8,background:C.surf2,color:C.txt,boxSizing:'border-box'};

  return (
    <div style={{minHeight:'100vh',background:C.bg,display:'flex',justifyContent:'center',padding:'2rem 1rem',...f}}>
      <div style={{background:C.surf,border:`1px solid ${C.bdr}`,borderRadius:16,width:'100%',maxWidth:1000,alignSelf:'flex-start',overflow:'hidden'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'1.25rem 1rem 0.75rem',flexWrap:'wrap',gap:8}}>
          <div>
            <button style={{background:'none',border:'none',cursor:'pointer',fontSize:12,color:C.mut,padding:'0 0 4px',display:'block'}} onClick={onBack}>← back</button>
            <h2 style={{fontSize:20,fontWeight:700,color:C.txt,margin:0}}>Admin View</h2>
          </div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <button style={smBtn} onClick={onExport}>⬇ Export CSV</button>
            <button style={{...smBtn,color:C.red,borderColor:C.red}} onClick={()=>setConfirmWipe(true)}>🗑 New UR</button>
          </div>
        </div>

        {confirmWipe&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100}}>
          <div style={{background:C.surf,border:`1px solid ${C.bdr}`,borderRadius:12,padding:'1.5rem',maxWidth:380,width:'90%'}}>
            <h3 style={{margin:'0 0 8px',color:C.txt}}>Start new Union Raid?</h3>
            <p style={{fontSize:13,color:C.mut,margin:'0 0 16px'}}>Exports current data then wipes all run inputs. Boss names and member list are kept.</p>
            <div style={{display:'flex',gap:8}}>
              <button style={{flex:1,padding:11,fontSize:13,fontWeight:600,background:C.red,color:'#fff',border:'none',borderRadius:8,cursor:'pointer'}} onClick={()=>{onExport();onWipe();setConfirmWipe(false);}}>Export &amp; Wipe</button>
              <button style={{flex:1,padding:10,fontSize:13,background:'transparent',color:C.mut,border:`1px solid ${C.bdr}`,borderRadius:8,cursor:'pointer'}} onClick={()=>setConfirmWipe(false)}>Cancel</button>
            </div>
          </div>
        </div>}

        <div style={{padding:'0 1rem 0.75rem',display:'flex',gap:8,flexWrap:'wrap'}}>
          {!editBN&&<button style={smBtn} onClick={()=>{setDraftBN([...bossNames]);setEditBN(true);}}>✏ Edit boss names</button>}
          {!editMems&&<button style={smBtn} onClick={()=>{setDraftMems(members.join('\n'));setEditMems(true);}}>👥 Edit member list</button>}
        </div>

        {editBN&&<div style={{padding:'0 1rem 1rem',display:'flex',flexDirection:'column',gap:8}}>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {draftBN.map((n,i)=><input key={i} value={n} style={{...inp,width:130,padding:'6px 10px',fontSize:12}} onChange={e=>{const d=[...draftBN];d[i]=e.target.value;setDraftBN(d);}}/>)}
          </div>
          <div style={{display:'flex',gap:8}}>
            <button style={{...smBtn,color:C.txt}} onClick={()=>{onSaveBN(draftBN);setEditBN(false);}}>Save names</button>
            <button style={smBtn} onClick={()=>setEditBN(false)}>Cancel</button>
          </div>
        </div>}

        {editMems&&<div style={{padding:'0 1rem 1rem',display:'flex',flexDirection:'column',gap:8}}>
          <p style={{fontSize:12,color:C.mut,margin:0}}>One name per line:</p>
          <textarea value={draftMems} rows={10} style={{...inp,resize:'vertical',fontFamily:'Helvetica,Arial,sans-serif',fontSize:12,padding:'6px'}} onChange={e=>setDraftMems(e.target.value)}/>
          <div style={{display:'flex',gap:8}}>
            <button style={{...smBtn,color:C.txt}} onClick={()=>{onSaveMembers(draftMems.split('\n').map(s=>s.trim()).filter(Boolean));setEditMems(false);}}>Save members</button>
            <button style={smBtn} onClick={()=>setEditMems(false)}>Cancel</button>
          </div>
        </div>}

        <div style={{display:'flex',gap:6,padding:'0 1rem 1rem',flexWrap:'wrap'}}>
          {Array(BOSSES).fill(0).map((_,bi)=><button key={bi} onClick={()=>setBoss(bi)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2,padding:'8px 12px',borderRadius:8,cursor:'pointer',minWidth:72,border:`1px solid ${bi===boss?'#4a5280':C.bdr}`,background:bi===boss?C.surf2:'transparent',color:C.txt}}>
            <span style={{fontSize:11,fontWeight:600}}>{bossNames[bi]}</span>
          </button>)}
        </div>

        <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',background:C.surf2,border:`1px solid ${C.bdr}`,borderRadius:10,padding:'12px 1rem',margin:'0 1rem 1rem'}}>
          <span>⚡</span>
          <span style={{fontSize:11,color:C.mut}}>Min dmg:</span>
          <input type='number' placeholder='Damage (millions)' value={minDmg} style={{flex:1,fontSize:12,padding:'5px 8px',borderRadius:6,textAlign:'right',border:`1px solid ${C.bdr}`,background:C.surf,color:C.txt,minWidth:160}} onChange={e=>setMinDmg(e.target.value)}/>
          <span style={{fontSize:11,color:C.mut}}>M</span>
          <label style={{display:'flex',alignItems:'center',gap:4,fontSize:11,color:C.mut,cursor:'pointer'}}>
            <input type='checkbox' checked={hideActualUsed} onChange={e=>setHideActualUsed(e.target.checked)}/> Hide members who already did actual run
          </label>
          {qualified.length>0&&<div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:8,width:'100%'}}>
            {qualified.map((q,i)=><div key={i} style={{display:'flex',flexDirection:'column',gap:4,padding:'10px 12px',background:'#0d2818',border:`1px solid ${q.isActual?C.gld:'#4ade8040'}`,borderRadius:8,fontSize:12,color:C.txt,minWidth:160}}>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <span style={{fontWeight:700,color:C.grn}}>{q.name}</span>
                {q.isActual&&<span style={{fontSize:10,color:C.gld,background:'#2d2000',padding:'1px 6px',borderRadius:999}}>actual</span>}
              </div>
              <span style={{color:C.mut,fontSize:12,fontWeight:600}}>{fmt(q.dmg)}</span>
              <div style={{display:'flex',flexWrap:'wrap',gap:3}}>{q.units.map((u,i)=><span key={i} style={pill(C.surf2,C.mut)}>{u}</span>)}</div>
            </div>)}
          </div>}
          {minV>0&&qualified.length===0&&<span style={{fontSize:12,color:C.red}}>No one hits {fmt(minV)} on {bossNames[boss]}</span>}
        </div>

        <div style={{overflowX:'auto',padding:'0 1rem 1.5rem'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead>
              <tr>{['Member','Actuals','Best Mock',...(rows[0]?.bRuns||[]).map((_,ri)=>`Run ${ri+1}`),'Status',''].map((h,i)=>(
                <th key={i} style={{padding:'6px',textAlign:i===0?'left':'center',fontSize:10,fontWeight:700,color:C.mut,background:C.surf2,borderBottom:`1px solid ${C.bdr}`,textTransform:'uppercase',letterSpacing:0.5,whiteSpace:'nowrap',minWidth:i>2&&i<(rows[0]?.bRuns||[]).length+3?90:undefined}}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {rows.sort((a,b)=>(b.best||0)-(a.best||0)).map(({m,bRuns,gu,bu,tot,best},i)=>(
                <tr key={m} style={{background:i%2===0?'transparent':'rgba(255,255,255,0.02)',verticalAlign:'top'}}>
                  <td style={{padding:'6px',borderBottom:`1px solid ${C.bdr}`,color:C.txt,fontWeight:700}}>{m}</td>
                  <td style={{padding:'6px',borderBottom:`1px solid ${C.bdr}`,color:C.txt,textAlign:'center'}}>
                    <span style={{fontSize:11,fontWeight:700,padding:'2px 10px',borderRadius:999,color:'#fff',background:tot>=MAX_ACTUAL?C.dang:C.surf2}}>{tot}/{MAX_ACTUAL}</span>
                  </td>
                  <td style={{padding:'6px',borderBottom:`1px solid ${C.bdr}`,color:C.grn,fontWeight:700,textAlign:'center'}}>{best?fmt(best):'—'}</td>
                  {bRuns.map((run,ri)=>{
                    const locked=run.units.some(u=>u&&gu.has(u)&&!bu.has(u));
                    const key=`${m}-${ri}`,isExp=expandRun===key;
                    return <td key={ri} style={{padding:'6px',borderBottom:`1px solid ${C.bdr}`,color:C.txt,fontSize:11,cursor:'pointer',minWidth:90}} onClick={()=>setExpandRun(isExp?null:key)}>
                      <div style={{display:'flex',alignItems:'center',gap:4,justifyContent:'center'}}>
                        <span style={{color:run.excluded||locked?C.mut:run.isActual?C.gld:run.damage?C.txt:C.mut,textDecoration:run.excluded||locked?'line-through':'none',fontWeight:run.isActual?700:400}}>{run.damage?fmt(run.damage):'—'}</span>
                        {run.isActual&&<span style={{fontSize:9,color:C.gld}}>✓</span>}
                        {locked&&<span style={{fontSize:9,color:C.red}}>🚫</span>}
                        {run.excluded&&<span style={{fontSize:9,color:C.mut}}>excl</span>}
                        {run.damage&&<span style={{fontSize:9,color:C.mut}}>{isExp?'▲':'▼'}</span>}
                      </div>
                      {isExp&&<div style={{marginTop:4,display:'flex',flexWrap:'wrap',gap:3,justifyContent:'center'}}>
                        {run.units.filter(Boolean).map((u,ui)=><span key={ui} style={pill(C.surf2,C.mut)}>{u}</span>)}
                        {run.units.every(u=>!u)&&<span style={{fontSize:10,color:C.mut}}>no units</span>}
                      </div>}
                    </td>;
                  })}
                  <td style={{padding:'6px',borderBottom:`1px solid ${C.bdr}`,color:C.txt,textAlign:'center'}}>{tot>=MAX_ACTUAL?'✅':tot===0?'⬜':`⏳${tot}/${MAX_ACTUAL}`}</td>
                  <td style={{padding:'6px',borderBottom:`1px solid ${C.bdr}`,color:C.txt}}>
                    <button style={{fontSize:11,padding:'3px 10px',borderRadius:5,cursor:'pointer',background:'transparent',color:C.mut,border:`1px solid ${C.bdr}`}} onClick={()=>setEditMember(m)}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
