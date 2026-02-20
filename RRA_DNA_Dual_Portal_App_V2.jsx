import { useState, useEffect, useCallback } from "react";

const B = {
  pk:"#E96BB0",pkL:"#FDF0F7",pkM:"#F5C6DE",bl:"#0075C9",blL:"#EEF4FA",
  nv:"#323E48",nvD:"#001D48",w:"#FFF",g50:"#F8F9FB",g100:"#F2F4F8",
  g200:"#E0E4EB",g400:"#9CA3AF",g600:"#4A4A6A",g800:"#1A1A2E",
  grn:"#10B981",amb:"#F59E0B",red:"#EF4444",prp:"#8B5CF6",sky:"#0EA5E9",org:"#FF6B35"
};
const F="'Montserrat',sans-serif";
const LOGO='data:image/png;base64,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';

// ═══ DATA ═══
const ROLES=[{id:"batter",label:"Specialist Batter",sh:"BAT"},{id:"pace",label:"Pace Bowler",sh:"PACE"},{id:"spin",label:"Spin Bowler",sh:"SPIN"},{id:"keeper",label:"WK-Batter",sh:"WK"},{id:"allrounder",label:"Batting All-Rounder",sh:"AR"}];
const ASSOCS=["VTCA","ECA","RDCA","DDCA","BHRDCA","Peninsula","Gippsland","CV Pathway","Premier Cricket","Other"];
const AGE_GS=["U11","U12","U13","U14","U15","U16","U17","U18","Open/Senior"];
const FMTS=["T20","One-Day / Limited Overs","Two-Day / Multi-Day"];
// Ranked competition levels — player picks, tier auto-assigned
const COMP_LEVELS=[
  {id:"prem_1",label:"Premier Cricket — 1st XI",tier:1.0,cat:"Premier / Pathway"},
  {id:"prem_low",label:"Premier Cricket — 2nd–4th XI",tier:0.9,cat:"Premier / Pathway"},
  {id:"dowling",label:"Dowling Shield / U18 Pathway",tier:0.85,cat:"Premier / Pathway"},
  {id:"sr_sub",label:"Senior Sub-District / Association",tier:0.8,cat:"Senior Cricket"},
  {id:"jgc",label:"J.G. Craig U15 / Representative",tier:0.85,cat:"Representative"},
  {id:"vmcu",label:"VMCU Representative",tier:0.75,cat:"Representative"},
  {id:"local_sr",label:"Local Club — Senior Cricket",tier:0.7,cat:"Local Club"},
  {id:"local_j1",label:"Local Club — Junior Shield 1 / Premier",tier:0.75,cat:"Local Club — Junior"},
  {id:"local_j2",label:"Local Club — Junior Shield 2 / Div 1",tier:0.6,cat:"Local Club — Junior"},
  {id:"local_j3",label:"Local Club — Junior Shield 3+ / Div 2+",tier:0.45,cat:"Local Club — Junior"},
];
const BAT_H=["Right-Hand Bat","Left-Hand Bat"];
const BWL_T=["Right-Arm Fast","Left-Arm Fast","Right-Arm Medium","Left-Arm Medium","Right-Arm Offspin","Left-Arm Orthodox","Right-Arm Legspin","Left-Arm Wrist","N/A"];

const BAT_ARCH=[
  {id:"firestarter",nm:"THE FIRESTARTER",sub:"Lights up the Powerplay.",c:B.pk},
  {id:"controller",nm:"THE CONTROLLER",sub:"Dictates tempo. Finds gaps.",c:B.bl},
  {id:"closer",nm:"THE CLOSER",sub:"Gets the job done under pressure.",c:B.pk},
  {id:"dual",nm:"THE DUAL THREAT",sub:"Dangerous with bat and ball.",c:B.bl}
];
const BWL_ARCH=[
  {id:"hunter",nm:"WICKET HUNTER",sub:"Hunts breakthroughs. Strike bowler.",c:B.pk},
  {id:"weapon",nm:"THE WEAPON",sub:"Shuts you down AND gets you out.",c:B.bl},
  {id:"squeeze",nm:"THE SQUEEZE",sub:"Suffocates scoring. Builds pressure.",c:B.bl},
  {id:"developer",nm:"THE DEVELOPER",sub:"Building their game. Clear path.",c:B.g400}
];

const BAT_ITEMS=["Stance & Setup","Trigger Movement & Balance","Front-Foot Drive","Back-Foot Play","Power Hitting","Sweep & Reverse Sweep","Playing Spin","Playing Pace","Strike Rotation","Death-Over Hitting"];
const PACE_ITEMS=["Run-Up Rhythm","Action Alignment","Front-Leg Brace","Wrist & Seam","Stock Ball Control","Yorker Execution","Slower Ball Variation","Bouncer Effectiveness","Wide-Line Strategy","Bowling to Plans"];
const SPIN_ITEMS=["Stock Ball Accuracy","Revolutions & Spin Rate","Wrong'un Execution","Flight & Dip Control","Use of Crease","Match-Up Bowling","Middle-Over Control","Powerplay Tactics","Death-Over Spin","Reading the Batter"];
const KEEP_ITEMS=["Stance & Ready Position","Footwork to Pace","Standing Up to Spin","Glove Work","Stumping Speed","Diving & Athleticism","Communication","Throwing Accuracy"];
const IQ_ITEMS=["Powerplay Awareness","Middle-Over Management","Death-Over Decisions","Match Reading","Field Awareness","Adaptability"];
const MN_ITEMS=["Courage Under Pressure","Curiosity & Learning","Emotional Regulation","Competitive Drive","Communication & Leadership","Coachability","Resilience"];
const PH_MAP={
  pace:["Explosive Power","Core Stability","Eccentric Quad Strength","Shoulder Mobility","Aerobic Recovery"],
  spin:["Shoulder Flexibility","Core & Rotational Power","Aerobic Endurance","Balance & Landing","General Movement"],
  keeper:["Lateral Movement","Squat Endurance","Hand-Eye Coordination","Core Stability","Aerobic Fitness"],
  batter:["Explosive Power","Agility & Running","Core Balance","Upper Body Power","Aerobic Fitness"],
  allrounder:["Explosive Power","Bowling Athleticism","Core Balance","Aerobic Fitness","General Movement"]
};
const PHASES=[{id:"pp",nm:"POWERPLAY (1-6)"},{id:"mid",nm:"MIDDLE (7-16)"},{id:"death",nm:"DEATH (17-20)"}];
const VOICE_QS=["What part of your game are you most proud of?","What's the one thing you most want to improve?","Describe a match situation where you feel most confident.","What does success look like in the next 12 weeks?"];

// ═══ COMPETITION CONTEXT ENGINE ═══
const TIERS_BY_ID=Object.fromEntries(COMP_LEVELS.map(c=>[c.id,c.tier]));
function getAge(dob){if(!dob)return null;const p=dob.split("/");return p.length===3?2026-Number(p[2]):null;}
function getBracket(dob){const a=getAge(dob);if(!a)return"?";if(a<=13)return"U11-U13";if(a<=16)return"U14-U16";if(a<=19)return"U17-U19";return"U20+";}
function ageRelMult(age,ag){if(!age||!ag)return 1;if(ag==="Open/Senior"&&age<18)return 1.3;const n=parseInt(ag.replace("U",""));if(isNaN(n))return 1;const d=n-age;if(d>=2)return 1.3;if(d>=1)return 1.15;if(d>=-1)return 1;if(d>=-2)return 0.8;return 0.6;}
function fmtMult(f,age){if(!age||age<16)return 1;if(f==="T20")return 1.15;if(f==="Two-Day / Multi-Day")return 0.9;return 1;}

function calcCPS(grades,role,dob){
  const age=getAge(dob);if(!grades||!grades.length)return{cps:0,gs:[]};
  let bN=0,bD=0,wN=0,wD=0;
  const gs=grades.map(g=>{
    const t=TIERS_BY_ID[g.level]||0.6,ar=ageRelMult(age,g.ageGroup),fm=fmtMult(g.format,age),ccm=Math.round(t*ar*fm*100)/100;
    const runs=+g.runs||0,hs=+g.hs||0,ba=+g.avg||0;
    const rb=(ba*0.60)+(hs*0.25)+(runs*0.01)+(+g.matches||0)*0.50;
    if(runs>0){bN+=rb*ccm*ccm;bD+=ccm;}
    const ov=+g.overs||0,wk=+g.wkts||0;
    const bwA=+g.bAvg||99,ec=+g.econ||99;
    const rw=((40-bwA)*0.5)+((6-ec)*3)+(wk*0.3)+(ov*0.05);
    if(ov>0){wN+=rw*ccm*ccm;wD+=ccm;}
    return{...g,ccm,ba,bwA:wk>0?bwA:null,ec:ov>0?ec:null};
  });
  const bpi=bD>0?bN/bD:0,wpi=wD>0?wN/wD:0;
  const bl={batter:[.85,.15],pace:[.25,.75],spin:[.25,.75],keeper:[.8,.2],allrounder:[.55,.45]};
  const[bw,ww]=bl[role]||[.5,.5];
  const hb=bD>0,hw=wD>0;
  let raw;if(hb&&hw)raw=bpi*bw+wpi*ww;else if(hb)raw=bpi;else if(hw)raw=wpi;else raw=0;
  return{cps:Math.max(0,Math.min(100,Math.round(raw*2.5))),gs};
}

// ═══ DNA SCORING ENGINE ═══
const RW={batter:{p:.35,s:.10,i:.20,m:.20,h:.15},pace:{p:.35,s:.10,i:.15,m:.20,h:.20},spin:{p:.35,s:.10,i:.15,m:.20,h:.20},keeper:{p:.30,s:.15,i:.15,m:.20,h:.20},allrounder:{p:.30,s:.15,i:.15,m:.20,h:.20}};
const DM=[{k:"p",l:"Primary Technical",c:B.pk},{k:"s",l:"Secondary Technical",c:B.bl},{k:"i",l:"Game Intelligence",c:B.sky},{k:"m",l:"Mental & Character",c:B.prp},{k:"h",l:"Physical & Athletic",c:B.nv}];

function techItems(r){
  if(r==="pace")return{pri:PACE_ITEMS,sec:BAT_ITEMS.slice(0,6),pL:"Pace Bowling",sL:"Batting"};
  if(r==="spin")return{pri:SPIN_ITEMS,sec:BAT_ITEMS.slice(0,6),pL:"Spin Bowling",sL:"Batting"};
  if(r==="keeper")return{pri:KEEP_ITEMS,sec:BAT_ITEMS,pL:"Wicketkeeping",sL:"Batting"};
  if(r==="allrounder")return{pri:BAT_ITEMS.slice(0,7),sec:["Stock Ball Control","Variation Execution","Bowling to Plans","Death Execution","Match-Up Awareness"],pL:"Batting",sL:"Bowling"};
  return{pri:BAT_ITEMS,sec:["Ground Fielding","Catching","Part-Time Bowling","Running Between"],pL:"Batting",sL:"Fielding"};
}
function dAvg(d,pfx,n){let s=0,r=0;for(let i=0;i<n;i++){const v=d[`${pfx}${i}`];if(v>0){s+=v;r++;}}return r>0?{a:s/r,r,t:n}:{a:0,r:0,t:n};}
function calcDNA(d,role){
  const t=techItems(role),w=RW[role]||RW.batter;
  const dims={p:dAvg(d,"t1_",t.pri.length),s:dAvg(d,"t2_",t.sec.length),i:dAvg(d,"iq_",IQ_ITEMS.length),m:dAvg(d,"mn_",MN_ITEMS.length),h:dAvg(d,"ph_",(PH_MAP[role]||PH_MAP.batter).length)};
  let tr=0,ti=0,ws=0,aw=0;
  const ds=DM.map(x=>{const dm=dims[x.k],s100=dm.a>0?(dm.a/5)*100:0;tr+=dm.r;ti+=dm.t;if(dm.r>0){ws+=s100*w[x.k];aw+=w[x.k];}return{...x,...dm,s100,wt:w[x.k]};});
  const hl=aw>0?Math.round(ws/aw):0,cp=ti>0?Math.round(tr/ti*100):0;
  let g="—",gc=B.g400;
  if(hl>=85){g="ELITE";gc=B.grn;}else if(hl>=70){g="ADVANCED";gc=B.bl;}else if(hl>=55){g="COMPETENT";gc=B.amb;}else if(hl>=40){g="EMERGING";gc=B.pk;}else if(hl>0){g="DEVELOPING";gc=B.g600;}
  return{hl,g,gc,ds,cp,tr,ti};
}

// ═══ MOCK PLAYERS ═══
const MOCK=[
  {id:"p1",name:"Liam Patel",dob:"15/03/2012",club:"Doncaster CC",assoc:"ECA",role:"pace",bat:"Right-Hand Bat",bowl:"Right-Arm Fast",
    voice:["My outswinger","Yorker under pressure","Bowling with new ball in powerplay","Take 15+ wickets"],
    grades:[
      {level:"local_j1",ageGroup:"U14",shield:"Shield 1",team:"Doncaster U14",association:"ECA",matches:"12",runs:"285",hs:"67",avg:"28.5",overs:"68",wkts:"24",sr:"17.0",bAvg:"17.9",econ:"6.32",ct:"6",ro:"2",st:"",format:""},
      {level:"local_j2",ageGroup:"U16",shield:"Shield 2",team:"Doncaster U16",association:"ECA",matches:"6",runs:"98",hs:"34",avg:"16.3",overs:"32",wkts:"11",sr:"17.5",bAvg:"16.9",econ:"5.81",ct:"3",ro:"0",st:"",format:""}],
    injury:"Mild lower back stiffness",goals:"Dowling Shield selection & death bowling",submitted:true,
    cd:{batA:"dual",bwlA:"hunter",t1_0:4,t1_1:3,t1_2:4,t1_3:3,t1_4:3,t1_5:2,t1_6:3,t1_7:4,t1_8:3,t1_9:3,t2_0:3,t2_1:3,t2_2:3,t2_3:2,t2_4:3,t2_5:2,iq_0:3,iq_1:3,iq_2:2,iq_3:3,iq_4:3,iq_5:3,mn_0:4,mn_1:4,mn_2:3,mn_3:4,mn_4:3,mn_5:4,mn_6:3,ph_0:4,ph_1:3,ph_2:3,ph_3:3,ph_4:3}},
  {id:"p2",name:"Maya Chen",dob:"22/07/2010",club:"Fitzroy Doncaster CC",assoc:"Premier Cricket",role:"batter",bat:"Left-Hand Bat",bowl:"Right-Arm Offspin",
    voice:["Building innings and accelerating","Playing genuine pace","Chasing in middle overs","Score 400+ runs, avg 35+"],
    grades:[
      {level:"local_j1",ageGroup:"U16",shield:"Premier",team:"FD U16",association:"Premier Cricket",matches:"14",runs:"412",hs:"87",avg:"37.5",overs:"12",wkts:"3",sr:"24.0",bAvg:"26.0",econ:"6.5",ct:"8",ro:"3",st:"",format:""},
      {level:"prem_low",ageGroup:"Open/Senior",shield:"3rd XI",team:"FD 3rds",association:"Premier Cricket",matches:"3",runs:"64",hs:"41",avg:"21.3",overs:"0",wkts:"0",sr:"",bAvg:"",econ:"",ct:"2",ro:"1",st:"",format:"One-Day / Limited Overs"}],
    injury:"None",goals:"Dowling Shield & Vic U17",submitted:true,cd:{}},
  {id:"p3",name:"Josh Williams",dob:"08/11/2013",club:"Preston CC",assoc:"VTCA",role:"allrounder",bat:"Right-Hand Bat",bowl:"Right-Arm Medium",
    voice:["Batting in the powerplay","Death bowling gets expensive","Opening and getting off to good starts","Make a rep squad"],
    grades:[
      {level:"local_j1",ageGroup:"U12",shield:"Shield 1",team:"Preston U12 Gold",association:"VTCA",matches:"10",runs:"198",hs:"52",avg:"22.0",overs:"28",wkts:"8",sr:"21.0",bAvg:"20.6",econ:"5.89",ct:"5",ro:"1",st:"",format:""}],
    injury:"None",goals:"Death bowling & yorkers",submitted:true,cd:{}},
  {id:"p4",name:"Tom Richardson",dob:"19/05/2007",club:"Ringwood CC",assoc:"ECA",role:"keeper",bat:"Right-Hand Bat",bowl:"N/A",
    voice:["Glovework standing up to spin","Death-over hitting","Keeping to our spinner","Play seniors consistently"],
    grades:[
      {level:"local_j1",ageGroup:"U18",shield:"Shield 1",team:"Ringwood U18",association:"ECA",matches:"11",runs:"356",hs:"78",avg:"39.6",overs:"0",wkts:"0",sr:"",bAvg:"",econ:"",ct:"14",ro:"2",st:"6",format:""},
      {level:"prem_low",ageGroup:"Open/Senior",shield:"2nd XI",team:"Ringwood 2nds",association:"ECA",matches:"8",runs:"189",hs:"54",avg:"27.0",overs:"0",wkts:"0",sr:"",bAvg:"",econ:"",ct:"18",ro:"0",st:"4",format:"Two-Day / Multi-Day"},
      {level:"prem_low",ageGroup:"Open/Senior",shield:"2nd XI",team:"Ringwood 2nds T20",association:"ECA",matches:"4",runs:"87",hs:"42",avg:"29.0",overs:"0",wkts:"0",sr:"",bAvg:"",econ:"",ct:"3",ro:"1",st:"2",format:"T20"}],
    injury:"Previous R index finger dislocation (2024) — recovered",goals:"Lock down 2nd XI keeping, push for 1sts",submitted:true,cd:{}}
];

// ═══ UI HELPERS ═══
const sCard={background:B.w,borderRadius:12,padding:16,border:`1px solid ${B.g200}`,marginBottom:12};
const sGrad={background:`linear-gradient(135deg,${B.nvD} 0%,${B.bl} 60%,${B.pk} 100%)`};

function Hdr({label}){return(
  <div style={{...sGrad,padding:"16px 16px 14px",position:"relative",overflow:"hidden"}}>
    <div style={{position:"absolute",top:-20,right:-30,width:180,height:180,borderRadius:"50%",border:"2px solid rgba(255,255,255,0.06)"}}/>
    <div style={{display:"flex",alignItems:"center",gap:10}}>
      <img src={LOGO} alt="" style={{width:40,height:40,objectFit:"contain"}}/>
      <div>
        <div style={{fontSize:9,fontWeight:700,color:"rgba(255,255,255,0.6)",letterSpacing:2,textTransform:"uppercase",fontFamily:F}}>Rajasthan Royals Academy Melbourne</div>
        <div style={{fontSize:17,fontWeight:800,color:B.w,fontFamily:F}}>Player DNA Report</div>
      </div>
    </div>
    <div style={{display:"inline-block",marginTop:5,padding:"2px 8px",borderRadius:4,fontSize:10,fontWeight:700,fontFamily:F,background:label==="COACH PORTAL"?"rgba(255,255,255,0.2)":B.pk,color:B.w}}>{label}</div>
    <div style={{position:"absolute",bottom:0,left:0,right:0,height:3,background:B.pk}}/>
  </div>
);}

function SecH({title,sub}){return(
  <div style={{marginTop:20,marginBottom:10,paddingLeft:10,borderLeft:`3px solid ${B.pk}`}}>
    <div style={{fontSize:13,fontWeight:800,color:B.nvD,textTransform:"uppercase",fontFamily:F,letterSpacing:.5}}>{title}</div>
    {sub&&<div style={{fontSize:10,color:B.g600,fontStyle:"italic",marginTop:1,fontFamily:F}}>{sub}</div>}
  </div>
);}

function Inp({label,value,onChange,ph,half,type="text"}){return(
  <div style={{flex:half?1:"auto",minWidth:half?130:"auto",marginBottom:8}}>
    {label&&<div style={{fontSize:10,color:B.g600,fontFamily:F,marginBottom:1}}>{label}</div>}
    <input type={type} value={value||""} onChange={e=>onChange(e.target.value)} placeholder={ph}
      style={{width:"100%",border:"none",borderBottom:`1.5px solid ${B.g200}`,padding:"5px 0",fontSize:12,fontFamily:F,color:B.g800,outline:"none",background:"transparent",boxSizing:"border-box"}}/>
  </div>
);}

function Sel({label,value,onChange,opts,half}){return(
  <div style={{flex:half?1:"auto",minWidth:half?130:"auto",marginBottom:8}}>
    {label&&<div style={{fontSize:10,color:B.g600,fontFamily:F,marginBottom:1}}>{label}</div>}
    <select value={value||""} onChange={e=>onChange(e.target.value)}
      style={{width:"100%",border:"none",borderBottom:`1.5px solid ${B.g200}`,padding:"5px 0",fontSize:12,fontFamily:F,color:value?B.g800:B.g400,outline:"none",background:"transparent",boxSizing:"border-box"}}>
      <option value="">Select...</option>
      {opts.map(o=><option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);}

function TArea({label,value,onChange,ph,rows=2}){return(
  <div style={{marginBottom:10}}>
    {label&&<div style={{fontSize:11,fontWeight:600,color:B.g800,fontStyle:"italic",fontFamily:F,marginBottom:3}}>{label}</div>}
    <textarea value={value||""} onChange={e=>onChange(e.target.value)} placeholder={ph} rows={rows}
      style={{width:"100%",border:`1px solid ${B.g200}`,borderRadius:6,padding:"6px 8px",fontSize:12,fontFamily:F,color:B.g800,resize:"vertical",outline:"none",boxSizing:"border-box"}}/>
  </div>
);}

function NumInp({label,value,onChange,w=52}){return(
  <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:w}}>
    <div style={{fontSize:8,fontWeight:700,color:B.g400,fontFamily:F,marginBottom:2,textTransform:"uppercase"}}>{label}</div>
    <input type="number" value={value||""} onChange={e=>onChange(e.target.value)} placeholder="—"
      style={{width:"100%",border:"none",borderBottom:`1.5px solid ${B.g200}`,padding:"4px 0",fontSize:13,fontWeight:600,fontFamily:F,color:B.g800,outline:"none",background:"transparent",boxSizing:"border-box",textAlign:"center"}}/>
  </div>
);}

function CompLevelSel({value,onChange}){
  const cats=[...new Set(COMP_LEVELS.map(c=>c.cat))];
  return(
    <select value={value||""} onChange={e=>onChange(e.target.value)}
      style={{width:"100%",border:`1px solid ${B.g200}`,borderRadius:6,padding:"8px 6px",fontSize:11,fontFamily:F,color:value?B.g800:B.g400,outline:"none",background:B.w,boxSizing:"border-box"}}>
      <option value="">Select competition level...</option>
      {cats.map(cat=><optgroup key={cat} label={cat}>{COMP_LEVELS.filter(c=>c.cat===cat).map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</optgroup>)}
    </select>
  );
}

function Dots({value,onChange,color=B.pk}){return(
  <div style={{display:"flex",gap:5}}>
    {[1,2,3,4,5].map(n=>(
      <button key={n} onClick={()=>onChange(value===n?0:n)}
        style={{width:26,height:26,borderRadius:"50%",border:`2px solid ${value>=n?color:B.g200}`,
          background:value>=n?color:"transparent",cursor:"pointer",transition:"all 0.2s",
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,
          color:value>=n?B.w:B.g400,fontFamily:F}}>{n}</button>
    ))}
  </div>
);}

function AssRow({label,value,onR,color}){return(
  <div style={{background:B.g100,borderRadius:6,padding:"10px 12px",marginBottom:5}}>
    <div style={{fontSize:12,fontWeight:600,color:B.g800,fontFamily:F,marginBottom:6}}>{label}</div>
    <Dots value={value||0} onChange={onR} color={color}/>
  </div>
);}

function Ring({value,size=100,color=B.pk,label}){
  const r=(size-12)/2,c=2*Math.PI*r,off=c-(c*(value||0)/100);
  return(
    <div style={{position:"relative",width:size,height:size,flexShrink:0}}>
      <svg width={size} height={size}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={value>0?color:"rgba(255,255,255,0.1)"}
          strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={value>0?off:c}
          transform={`rotate(-90 ${size/2} ${size/2})`} style={{transition:"stroke-dashoffset 1s"}}/></svg>
      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
        <div style={{fontSize:size*.26,fontWeight:900,color:B.w,fontFamily:F,lineHeight:1}}>{value>0?value:"—"}</div>
        {label&&<div style={{fontSize:7,fontWeight:700,color:"rgba(255,255,255,0.5)",fontFamily:F,marginTop:1}}>{label}</div>}
      </div>
    </div>
  );
}

// ═══ MAIN APP ═══
export default function App(){
  const[portal,setPortal]=useState(null);
  const[players,setPlayers]=useState(MOCK);
  const[pStep,setPStep]=useState(0);
  const[pd,setPd]=useState({grades:[{}]});
  const pu=(k,v)=>setPd(d=>({...d,[k]:v}));
  const[selP,setSelP]=useState(null);
  const[cView,setCView]=useState("list");
  const[cPage,setCPage]=useState(0);

  // ═══ SPLASH ═══
  if(!portal)return(
    <div style={{minHeight:"100vh",...sGrad,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,600;0,700;0,800;0,900&display=swap" rel="stylesheet"/>
      <img src={LOGO} alt="" style={{width:100,height:100,objectFit:"contain",marginBottom:20,filter:"drop-shadow(0 4px 12px rgba(0,0,0,0.3))"}}/>
      <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.5)",letterSpacing:3,textTransform:"uppercase",fontFamily:F}}>Rajasthan Royals Academy</div>
      <div style={{fontSize:26,fontWeight:900,color:B.w,fontFamily:F,textAlign:"center",marginTop:4}}>Player DNA Report</div>
      <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",fontFamily:F,marginTop:4,marginBottom:36}}>Onboarding & Assessment System</div>
      <button onClick={()=>setPortal("player")} style={{width:"100%",maxWidth:300,padding:"16px 20px",borderRadius:12,border:`2px solid ${B.pk}`,background:B.pk,color:B.w,fontSize:15,fontWeight:800,fontFamily:F,cursor:"pointer",marginBottom:8,letterSpacing:1}}>I'M A PLAYER</button>
      <div style={{fontSize:9,color:"rgba(255,255,255,0.35)",fontFamily:F,marginBottom:16}}>Complete your onboarding survey</div>
      <button onClick={()=>setPortal("coach")} style={{width:"100%",maxWidth:300,padding:"16px 20px",borderRadius:12,border:"2px solid rgba(255,255,255,0.25)",background:"rgba(255,255,255,0.08)",color:B.w,fontSize:15,fontWeight:800,fontFamily:F,cursor:"pointer",letterSpacing:1}}>I'M A COACH</button>
      <div style={{fontSize:9,color:"rgba(255,255,255,0.35)",fontFamily:F,marginTop:8}}>Access player assessments</div>
    </div>
  );

  const goTop=()=>window.scrollTo(0,0);
  const btnSty=(ok,full)=>({padding:full?"14px 20px":"8px 16px",borderRadius:8,border:"none",background:ok?`linear-gradient(135deg,${B.bl},${B.pk})`:B.g200,color:ok?B.w:B.g400,fontSize:13,fontWeight:800,fontFamily:F,cursor:ok?"pointer":"default",letterSpacing:.5,textTransform:"uppercase",width:full?"100%":"auto",marginTop:6});
  const backBtn={marginTop:8,padding:"10px 16px",border:`1px solid ${B.g200}`,borderRadius:6,background:"transparent",fontSize:11,fontWeight:600,color:B.g600,cursor:"pointer",fontFamily:F,width:"100%"};

  // ═══ PLAYER PORTAL ═══
  if(portal==="player"){
    const stpN=["Profile","Competition History","Playing Style","Self-Assessment","Medical & Goals","Review"];
    const age=getAge(pd.dob);
    const show16=age&&age>=16;

    const renderP=()=>{
      if(pStep===0)return(
        <div style={sCard}>
          <SecH title="Player Profile" sub="Tell us about yourself"/>
          <div style={{display:"flex",flexWrap:"wrap",gap:"0 12px"}}>
            <Inp half label="Full Name *" value={pd.name} onChange={v=>pu("name",v)} ph="Your full name"/>
            <Inp half label="Date of Birth *" value={pd.dob} onChange={v=>pu("dob",v)} ph="DD/MM/YYYY"/>
            <Inp half label="Phone" value={pd.phone} onChange={v=>pu("phone",v)} ph="Mobile"/>
            <Inp half label="Email" value={pd.email} onChange={v=>pu("email",v)} ph="Email"/>
            <Inp half label="Club" value={pd.club} onChange={v=>pu("club",v)} ph="e.g. Doncaster CC"/>
            <Sel half label="Association" value={pd.assoc} onChange={v=>pu("assoc",v)} opts={ASSOCS}/>
          </div>
          <SecH title="Parent / Guardian" sub="Required for under 18"/>
          <div style={{display:"flex",flexWrap:"wrap",gap:"0 12px"}}>
            <Inp half label="Parent Name" value={pd.parentName} onChange={v=>pu("parentName",v)} ph="Full name"/>
            <Inp half label="Parent Email" value={pd.parentEmail} onChange={v=>pu("parentEmail",v)} ph="Email"/>
          </div>
        </div>
      );

      if(pStep===1){
        const gs=pd.grades||[{}];
        const ug=(i,k,v)=>{const n=[...gs];n[i]={...n[i],[k]:v};pu("grades",n);};
        const canAdd=gs.length<3;
        return(<div>
          <SecH title="Competition History" sub="Your top grades from last season (2025/26). Up to 3, highest level first."/>
          <div style={{background:B.blL,borderRadius:8,padding:10,marginBottom:12,fontSize:10,color:B.bl,fontFamily:F,lineHeight:1.5}}>
            <strong>Start with your highest level played</strong> — Premier, Senior, Rep cricket first. Then add lower grades if you played at multiple levels.
          </div>
          {gs.map((g,gi)=>{
            const lvl=COMP_LEVELS.find(c=>c.id===g.level);
            return(<div key={gi} style={{...sCard,borderLeft:`3px solid ${[B.pk,B.bl,B.nv][gi]||B.pk}`,padding:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontSize:11,fontWeight:800,color:B.nvD,fontFamily:F}}>GRADE {gi+1}{lvl?<span style={{fontWeight:400,color:B.g400}}> — {lvl.cat}</span>:""}</div>
                {gs.length>1&&<button onClick={()=>pu("grades",gs.filter((_,i)=>i!==gi))} style={{fontSize:9,color:B.red,background:"none",border:"none",cursor:"pointer",fontFamily:F}}>✕ Remove</button>}
              </div>
              <CompLevelSel value={g.level} onChange={v=>ug(gi,"level",v)}/>
              <div style={{display:"flex",flexWrap:"wrap",gap:"0 8px",marginTop:8}}>
                <Sel half label="Age Group" value={g.ageGroup} onChange={v=>ug(gi,"ageGroup",v)} opts={AGE_GS}/>
                <Inp half label="Club / Team" value={g.team} onChange={v=>ug(gi,"team",v)} ph="e.g. Doncaster U14"/>
                <Inp half label="Matches" value={g.matches} onChange={v=>ug(gi,"matches",v)} type="number" ph="0"/>
                {show16&&<Sel half label="Format" value={g.format} onChange={v=>ug(gi,"format",v)} opts={FMTS}/>}
              </div>
              {/* Compact stat rows */}
              <div style={{marginTop:10,padding:"8px 6px",background:B.pkL,borderRadius:6}}>
                <div style={{fontSize:9,fontWeight:700,color:B.pk,fontFamily:F,marginBottom:6}}>BAT</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  <NumInp label="Runs" value={g.runs} onChange={v=>ug(gi,"runs",v)}/>
                  <NumInp label="HS" value={g.hs} onChange={v=>ug(gi,"hs",v)} w={44}/>
                  <NumInp label="Avg" value={g.avg} onChange={v=>ug(gi,"avg",v)} w={48}/>
                </div>
              </div>
              <div style={{marginTop:4,padding:"8px 6px",background:B.blL,borderRadius:6}}>
                <div style={{fontSize:9,fontWeight:700,color:B.bl,fontFamily:F,marginBottom:6}}>BOWL</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  <NumInp label="Ovrs" value={g.overs} onChange={v=>ug(gi,"overs",v)} w={44}/>
                  <NumInp label="Wkts" value={g.wkts} onChange={v=>ug(gi,"wkts",v)} w={44}/>
                  <NumInp label="SR" value={g.sr} onChange={v=>ug(gi,"sr",v)} w={40}/>
                  <NumInp label="Avg" value={g.bAvg} onChange={v=>ug(gi,"bAvg",v)} w={44}/>
                  <NumInp label="Econ" value={g.econ} onChange={v=>ug(gi,"econ",v)} w={44}/>
                </div>
              </div>
              <div style={{marginTop:4,padding:"8px 6px",background:B.g100,borderRadius:6}}>
                <div style={{fontSize:9,fontWeight:700,color:B.nv,fontFamily:F,marginBottom:6}}>FIELD</div>
                <div style={{display:"flex",gap:8}}>
                  <NumInp label="Ct" value={g.ct} onChange={v=>ug(gi,"ct",v)} w={40}/>
                  <NumInp label="RO" value={g.ro} onChange={v=>ug(gi,"ro",v)} w={40}/>
                  <NumInp label="St" value={g.st} onChange={v=>ug(gi,"st",v)} w={40}/>
                </div>
              </div>
            </div>);
          })}
          {canAdd&&<button onClick={()=>pu("grades",[...gs,{}])} style={{...btnSty(true,true),background:B.bl,fontSize:12}}>+ ADD GRADE ({3-gs.length} remaining)</button>}
          {!canAdd&&<div style={{fontSize:10,color:B.g400,fontFamily:F,textAlign:"center",marginTop:4}}>Maximum 3 grades — choose your highest levels played</div>}
        </div>);
      }

      if(pStep===2)return(<div style={sCard}>
        <SecH title="Playing Style"/>
        <div style={{display:"flex",flexWrap:"wrap",gap:"0 12px"}}>
          <Sel half label="Primary Role" value={pd.role} onChange={v=>pu("role",v)} opts={ROLES.map(r=>r.label)}/>
          <Sel half label="Batting Hand" value={pd.bat} onChange={v=>pu("bat",v)} opts={BAT_H}/>
          <Sel half label="Bowling Type" value={pd.bowl} onChange={v=>pu("bowl",v)} opts={BWL_T}/>
        </div>
      </div>);

      if(pStep===3)return(<div style={sCard}>
        <SecH title="Player Voice" sub="Tell us about your game"/>
        {VOICE_QS.map((q,i)=><TArea key={i} label={q} value={pd[`v_${i}`]} onChange={v=>pu(`v_${i}`,v)} rows={2}/>)}
      </div>);

      if(pStep===4)return(<div style={sCard}>
        <SecH title="Injury & Medical"/>
        <TArea value={pd.injury} onChange={v=>pu("injury",v)} ph="Current or past injuries..." rows={3}/>
        <SecH title="Goals & Aspirations"/>
        <TArea value={pd.goals} onChange={v=>pu("goals",v)} ph="What do you want from the program?" rows={3}/>
      </div>);

      if(pStep===5){
        const gc=(pd.grades||[]).filter(g=>g.level).length;
        return(<div>
          <SecH title="Review & Submit"/>
          <div style={sCard}><div style={{fontSize:12,fontWeight:700,color:B.nvD,fontFamily:F}}>{pd.name||"—"}</div><div style={{fontSize:11,color:B.g400,fontFamily:F}}>{pd.dob||"—"} • {pd.club||"—"} • {gc} grade(s)</div></div>
          <button onClick={()=>{
            const rid=ROLES.find(r=>r.label===pd.role)?.id||"batter";
            setPlayers(p=>[...p,{id:`pn_${Date.now()}`,name:pd.name,dob:pd.dob,club:pd.club,assoc:pd.assoc,role:rid,bat:pd.bat,bowl:pd.bowl,
              voice:VOICE_QS.map((_,i)=>pd[`v_${i}`]||""),grades:pd.grades||[],injury:pd.injury,goals:pd.goals,submitted:true,cd:{}}]);
            setPStep(6);
          }} style={btnSty(pd.name&&pd.dob,true)}>SUBMIT SURVEY</button>
        </div>);
      }

      if(pStep===6)return(<div style={{textAlign:"center",padding:40}}>
        <div style={{fontSize:44,marginBottom:12}}>✓</div>
        <div style={{fontSize:18,fontWeight:800,color:B.grn,fontFamily:F}}>Survey Submitted!</div>
        <div style={{fontSize:12,color:B.g600,fontFamily:F,marginTop:6}}>Your coaching team will review your details.</div>
      </div>);
      return null;
    };

    return(<div style={{minHeight:"100vh",fontFamily:F,background:B.g50}}>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,600;0,700;0,800;0,900&display=swap" rel="stylesheet"/>
      <Hdr label="PLAYER ONBOARDING"/>
      {pStep<6&&<div style={{padding:"6px 12px",background:B.w,borderBottom:`1px solid ${B.g200}`,display:"flex",alignItems:"center",gap:6}}>
        <div style={{fontSize:10,fontWeight:700,color:B.pk,fontFamily:F}}>STEP {pStep+1}/6</div>
        <div style={{fontSize:11,fontWeight:600,color:B.nvD,fontFamily:F}}>{stpN[pStep]}</div>
        <div style={{flex:1,height:3,background:B.g200,borderRadius:2,marginLeft:6}}>
          <div style={{width:`${((pStep+1)/6)*100}%`,height:"100%",background:`linear-gradient(90deg,${B.bl},${B.pk})`,borderRadius:2,transition:"width 0.3s"}}/>
        </div>
      </div>}
      <div style={{padding:12,paddingBottom:pStep<6?70:12}}>{renderP()}</div>
      {pStep<6&&<div style={{position:"fixed",bottom:0,left:0,right:0,background:B.w,borderTop:`1px solid ${B.g200}`,padding:"8px 12px",display:"flex",justifyContent:"space-between",zIndex:100}}>
        <button onClick={()=>{if(pStep>0){setPStep(s=>s-1);goTop();}else setPortal(null);}} style={{padding:"8px 14px",borderRadius:6,border:`1px solid ${B.g200}`,background:"transparent",fontSize:11,fontWeight:600,color:B.g600,cursor:"pointer",fontFamily:F}}>← Back</button>
        <button onClick={()=>{setPStep(s=>Math.min(s+1,5));goTop();}} style={{padding:"8px 14px",borderRadius:6,border:"none",background:`linear-gradient(135deg,${B.bl},${B.pk})`,fontSize:11,fontWeight:700,color:B.w,cursor:"pointer",fontFamily:F}}>Next →</button>
      </div>}
    </div>);
  }

  // ═══ COACH PORTAL ═══
  if(portal==="coach"){
    const sp=selP?players.find(p=>p.id===selP):null;

    // LIST
    if(cView==="list")return(<div style={{minHeight:"100vh",fontFamily:F,background:B.g50}}>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,600;0,700;0,800;0,900&display=swap" rel="stylesheet"/>
      <Hdr label="COACH PORTAL"/>
      <div style={{padding:12}}>
        <SecH title={`Player Roster (${players.filter(p=>p.submitted).length})`} sub="Tap player to view survey or assess"/>
        {players.filter(p=>p.submitted).map(p=>{
          const cps=calcCPS(p.grades,p.role,p.dob);
          const dn=Object.keys(p.cd||{}).filter(k=>k.match(/^t1_/)).length>0?calcDNA(p.cd,p.role):null;
          const a=getAge(p.dob),br=getBracket(p.dob),ro=ROLES.find(r=>r.id===p.role);
          const ini=p.name?p.name.split(" ").map(w=>w[0]).join("").slice(0,2):"?";
          return(<div key={p.id} style={{...sCard,cursor:"pointer",display:"flex",gap:10}} onClick={()=>{setSelP(p.id);setCView("survey");goTop();}}>
            <div style={{width:40,height:40,borderRadius:"50%",...sGrad,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <span style={{color:B.w,fontSize:13,fontWeight:800,fontFamily:F}}>{ini}</span>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontSize:13,fontWeight:700,color:B.nvD,fontFamily:F}}>{p.name}</div>
                <div style={{display:"flex",gap:4}}>
                  {dn&&<div style={{padding:"1px 6px",borderRadius:3,fontSize:9,fontWeight:800,fontFamily:F,background:`${dn.gc}20`,color:dn.gc}}>DNA {dn.hl}</div>}
                  {cps.cps>0&&<div style={{padding:"1px 6px",borderRadius:3,fontSize:9,fontWeight:800,fontFamily:F,background:`${B.bl}20`,color:B.bl}}>CPS {cps.cps}</div>}
                </div>
              </div>
              <div style={{fontSize:10,color:B.g400,fontFamily:F,marginTop:1}}>{a}yo • {br} • {ro?.sh||"?"} • {p.club}</div>
              <div style={{fontSize:9,color:B.g400,fontFamily:F}}>{p.grades?.length||0} grade(s) • {Object.keys(p.cd||{}).filter(k=>k.match(/^t1_/)).length>0?"Assessment started":"Awaiting"}</div>
            </div>
          </div>);
        })}
        <button onClick={()=>setPortal(null)} style={backBtn}>← Back to start</button>
      </div>
    </div>);

    // SURVEY VIEW
    if(cView==="survey"&&sp){
      const cps=calcCPS(sp.grades,sp.role,sp.dob);
      const a=getAge(sp.dob),br=getBracket(sp.dob),ro=ROLES.find(r=>r.id===sp.role);
      return(<div style={{minHeight:"100vh",fontFamily:F,background:B.g50}}>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,600;0,700;0,800;0,900&display=swap" rel="stylesheet"/>
        <Hdr label="COACH PORTAL"/>
        <div style={{padding:12}}>
          <div style={{background:`linear-gradient(135deg,${B.nvD},${B.nv})`,borderRadius:14,padding:16,marginBottom:12,display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:140}}>
              <div style={{fontSize:16,fontWeight:800,color:B.w,fontFamily:F}}>{sp.name}</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",fontFamily:F,marginTop:2}}>{a}yo • {br} • {ro?.label} • {sp.club}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",fontFamily:F,marginTop:1}}>{sp.bat} • {sp.bowl}</div>
            </div>
            {cps.cps>0&&<Ring value={cps.cps} size={70} color={B.bl} label="CPS"/>}
          </div>

          <SecH title="Competition History" sub={`${sp.grades?.length||0} grade(s)`}/>
          {(sp.grades||[]).map((g,gi)=>{
            const pg=cps.gs[gi];const lvl=COMP_LEVELS.find(c=>c.id===g.level);
            return(<div key={gi} style={{...sCard,borderLeft:`3px solid ${gi%2===0?B.pk:B.bl}`}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <div style={{fontSize:12,fontWeight:700,color:B.nvD,fontFamily:F}}>{lvl?.label||g.level} — {g.ageGroup}</div>
                <div style={{padding:"1px 6px",borderRadius:3,fontSize:9,fontWeight:800,background:`${B.pk}15`,color:B.pk,fontFamily:F}}>CCM {pg?.ccm||"—"}</div>
              </div>
              <div style={{fontSize:10,color:B.g400,fontFamily:F}}>{g.team} • {g.matches}m{g.format?` • ${g.format}`:""}</div>
              <div style={{display:"flex",gap:12,marginTop:6,flexWrap:"wrap"}}>
                {+g.runs>0&&<div style={{fontSize:10,fontFamily:F}}><span style={{color:B.pk,fontWeight:700}}>BAT</span> <span style={{color:B.g600}}>{g.runs}r HS {g.hs} @ {g.avg}</span></div>}
                {+g.overs>0&&<div style={{fontSize:10,fontFamily:F}}><span style={{color:B.bl,fontWeight:700}}>BOWL</span> <span style={{color:B.g600}}>{g.wkts}w SR {g.sr} Avg {g.bAvg} Ec {g.econ}</span></div>}
                {(+g.ct>0||+g.st>0)&&<div style={{fontSize:10,fontFamily:F}}><span style={{color:B.nv,fontWeight:700}}>FIELD</span> <span style={{color:B.g600}}>{g.ct||0}ct {+g.ro>0?`${g.ro}ro `:""}{+g.st>0?`${g.st}st`:""}</span></div>}
              </div>
            </div>);
          })}

          <SecH title="Player Voice"/>
          <div style={sCard}>{VOICE_QS.map((q,i)=>(<div key={i} style={{marginBottom:8}}>
            <div style={{fontSize:10,fontWeight:600,color:B.g400,fontFamily:F}}>{q}</div>
            <div style={{fontSize:12,color:B.g800,fontFamily:F,marginTop:1}}>{sp.voice?.[i]||"—"}</div>
          </div>))}</div>

          <SecH title="Medical & Goals"/>
          <div style={sCard}>
            <div style={{fontSize:10,fontWeight:600,color:B.g400,fontFamily:F}}>Injury</div>
            <div style={{fontSize:12,color:B.g800,fontFamily:F,marginBottom:8}}>{sp.injury||"None"}</div>
            <div style={{fontSize:10,fontWeight:600,color:B.g400,fontFamily:F}}>Goals</div>
            <div style={{fontSize:12,color:B.g800,fontFamily:F}}>{sp.goals||"—"}</div>
          </div>

          <button onClick={()=>{setCView("assess");setCPage(0);goTop();}} style={btnSty(true,true)}>BEGIN ASSESSMENT →</button>
          <button onClick={()=>{setCView("list");setSelP(null);}} style={backBtn}>← Back to roster</button>
        </div>
      </div>);
    }

    // ASSESSMENT
    if(cView==="assess"&&sp){
      const cd=sp.cd||{};
      const cU=(k,v)=>setPlayers(ps=>ps.map(p=>p.id===sp.id?{...p,cd:{...p.cd,[k]:v}}:p));
      const t=techItems(sp.role);
      const dn=calcDNA(cd,sp.role);
      const cps=calcCPS(sp.grades,sp.role,sp.dob);
      const pgN=["Identity","Technical","Tactical/Mental/Physical","DNA Summary"];

      const renderAP=()=>{
        if(cPage===0)return(<div style={{padding:"0 12px 16px"}}>
          <SecH title="Batting Archetype"/>
          <div style={{display:"grid",gap:6}}>{BAT_ARCH.map(a=>(<div key={a.id} onClick={()=>cU("batA",a.id)}
            style={{background:cd.batA===a.id?B.pkL:B.w,border:`2px solid ${cd.batA===a.id?a.c:B.g200}`,borderLeft:`4px solid ${a.c}`,borderRadius:8,padding:10,cursor:"pointer"}}>
            <div style={{fontSize:12,fontWeight:800,color:B.nvD,fontFamily:F}}>{a.nm}</div>
            <div style={{fontSize:10,color:B.g600,fontFamily:F}}>{a.sub}</div>
          </div>))}</div>
          <SecH title="Bowling Archetype"/>
          <div style={{display:"grid",gap:6}}>{BWL_ARCH.map(a=>(<div key={a.id} onClick={()=>cU("bwlA",a.id)}
            style={{background:cd.bwlA===a.id?B.blL:B.w,border:`2px solid ${cd.bwlA===a.id?a.c:B.g200}`,borderLeft:`4px solid ${a.c}`,borderRadius:8,padding:10,cursor:"pointer"}}>
            <div style={{fontSize:12,fontWeight:800,color:B.nvD,fontFamily:F}}>{a.nm}</div>
            <div style={{fontSize:10,color:B.g600,fontFamily:F}}>{a.sub}</div>
          </div>))}</div>
          <SecH title="Phase Effectiveness"/>
          {PHASES.map(ph=>(<div key={ph.id} style={{background:B.g100,borderRadius:6,padding:10,marginBottom:6}}>
            <div style={{fontSize:12,fontWeight:700,color:B.nvD,fontFamily:F,marginBottom:6}}>{ph.nm}</div>
            <div style={{display:"flex",gap:16}}>
              <div><div style={{fontSize:9,fontWeight:700,color:B.pk,fontFamily:F}}>BAT</div><Dots value={cd[`pb_${ph.id}`]||0} onChange={v=>cU(`pb_${ph.id}`,v)} color={B.pk}/></div>
              <div><div style={{fontSize:9,fontWeight:700,color:B.bl,fontFamily:F}}>BOWL</div><Dots value={cd[`pw_${ph.id}`]||0} onChange={v=>cU(`pw_${ph.id}`,v)} color={B.bl}/></div>
            </div>
          </div>))}
        </div>);

        if(cPage===1)return(<div style={{padding:"0 12px 16px"}}>
          <SecH title={t.pL} sub="Rate 1-5"/>
          <div style={{fontSize:9,color:B.g400,fontFamily:F,marginBottom:6}}>1=Developing 2=Emerging 3=Competent 4=Advanced 5=Elite</div>
          {t.pri.map((item,i)=><AssRow key={item} label={item} value={cd[`t1_${i}`]} onR={v=>cU(`t1_${i}`,v)} color={B.pk}/>)}
          <SecH title={t.sL}/>
          {t.sec.map((item,i)=><AssRow key={item} label={item} value={cd[`t2_${i}`]} onR={v=>cU(`t2_${i}`,v)} color={B.bl}/>)}
        </div>);

        if(cPage===2)return(<div style={{padding:"0 12px 16px"}}>
          <SecH title="Game Intelligence"/>
          {IQ_ITEMS.map((item,i)=><AssRow key={item} label={item} value={cd[`iq_${i}`]} onR={v=>cU(`iq_${i}`,v)} color={B.sky}/>)}
          <SecH title="Mental & Character" sub="Royals Way aligned"/>
          {MN_ITEMS.map((item,i)=><AssRow key={item} label={item} value={cd[`mn_${i}`]} onR={v=>cU(`mn_${i}`,v)} color={B.prp}/>)}
          <SecH title="Physical & Athletic"/>
          {(PH_MAP[sp.role]||PH_MAP.batter).map((item,i)=><AssRow key={item} label={item} value={cd[`ph_${i}`]} onR={v=>cU(`ph_${i}`,v)} color={B.nv}/>)}
        </div>);

        if(cPage===3)return(<div style={{padding:"0 12px 16px"}}>
          <SecH title="Score Dashboard" sub="Coach-eyes only"/>
          <div style={{background:`linear-gradient(135deg,${B.nvD},${B.nv})`,borderRadius:14,padding:16,marginBottom:12,display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
            <Ring value={dn.hl} size={90} color={dn.gc} label="DNA"/>
            <Ring value={cps.cps} size={70} color={B.bl} label="CPS"/>
            <div style={{flex:1,minWidth:100}}>
              <div style={{fontSize:16,fontWeight:800,color:dn.gc,fontFamily:F}}>{dn.g}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.5)",fontFamily:F}}>{dn.tr}/{dn.ti} rated ({dn.cp}%)</div>
            </div>
          </div>
          {dn.ds.map(d=>(<div key={d.k} style={{marginBottom:6}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
              <span style={{fontSize:10,fontWeight:700,color:B.g800,fontFamily:F}}>{d.l} <span style={{fontSize:8,color:B.g400}}>×{Math.round(d.wt*100)}%</span></span>
              <span style={{fontSize:12,fontWeight:800,color:d.r>0?d.c:B.g400,fontFamily:F}}>{d.r>0?Math.round(d.s100):"—"}</span>
            </div>
            <div style={{height:5,borderRadius:3,background:B.g100}}>
              <div style={{height:"100%",borderRadius:3,background:d.r>0?d.c:"transparent",width:`${d.s100}%`,transition:"width 0.8s"}}/>
            </div>
          </div>))}

          <SecH title="DNA Narrative" sub="Archetype, phase fit, character, ceiling"/>
          <TArea value={cd.narrative} onChange={v=>cU("narrative",v)} ph="Who is this player right now?" rows={3}/>
          <div style={{display:"flex",gap:8,marginBottom:6}}>
            <div style={{flex:1}}>
              <SecH title="Strengths"/>
              <div style={{background:B.pkL,borderRadius:6,padding:8}}>{[1,2,3].map(n=><Inp key={n} label={`${n}.`} value={cd[`str${n}`]} onChange={v=>cU(`str${n}`,v)}/>)}</div>
            </div>
            <div style={{flex:1}}>
              <SecH title="Priorities"/>
              <div style={{background:B.blL,borderRadius:6,padding:8}}>{[1,2,3].map(n=><Inp key={n} label={`${n}.`} value={cd[`pri${n}`]} onChange={v=>cU(`pri${n}`,v)}/>)}</div>
            </div>
          </div>
          <SecH title="12-Week Plan"/>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:8}}>
            {[{k:"explore",l:"EXPLORE (1-4)",c:B.pk},{k:"challenge",l:"CHALLENGE (5-8)",c:B.bl},{k:"execute",l:"EXECUTE (9-12)",c:B.nvD}].map(ph=>(
              <div key={ph.k} style={{background:B.g100,borderRadius:6,padding:8,borderTop:`3px solid ${ph.c}`}}>
                <div style={{fontSize:10,fontWeight:800,color:ph.c,fontFamily:F,marginBottom:3}}>{ph.l}</div>
                <TArea value={cd[`pl_${ph.k}`]} onChange={v=>cU(`pl_${ph.k}`,v)} ph="Focus..." rows={2}/>
              </div>
            ))}
          </div>
          <SecH title="Squad Recommendation"/>
          <Inp value={cd.sqRec} onChange={v=>cU("sqRec",v)} ph="e.g. Squad 3 — U14/U16 advanced"/>
        </div>);
        return null;
      };

      const ro=ROLES.find(r=>r.id===sp.role);
      const ini=sp.name?sp.name.split(" ").map(w=>w[0]).join("").slice(0,2):"?";

      return(<div style={{minHeight:"100vh",fontFamily:F,background:B.g50}}>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,600;0,700;0,800;0,900&display=swap" rel="stylesheet"/>
        <Hdr label="COACH PORTAL"/>
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:B.w,borderBottom:`1px solid ${B.g200}`}}>
          <div style={{width:30,height:30,borderRadius:"50%",...sGrad,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <span style={{color:B.w,fontSize:11,fontWeight:800,fontFamily:F}}>{ini}</span>
          </div>
          <div style={{flex:1}}><div style={{fontSize:12,fontWeight:700,color:B.nvD,fontFamily:F}}>{sp.name}</div><div style={{fontSize:9,color:B.g400,fontFamily:F}}>{ro?.label} • {sp.club}</div></div>
          <button onClick={()=>setCView("survey")} style={{fontSize:9,fontWeight:600,color:B.bl,background:"none",border:`1px solid ${B.bl}`,borderRadius:4,padding:"3px 6px",cursor:"pointer",fontFamily:F}}>Survey</button>
        </div>
        <div style={{padding:"6px 12px",background:B.g50,borderBottom:`1px solid ${B.g200}`,display:"flex",gap:4,overflowX:"auto"}}>
          {pgN.map((n,i)=>(<button key={i} onClick={()=>{setCPage(i);goTop();}}
            style={{padding:"5px 10px",borderRadius:20,border:"none",background:i===cPage?B.pk:"transparent",color:i===cPage?B.w:B.g400,fontSize:10,fontWeight:700,fontFamily:F,cursor:"pointer",whiteSpace:"nowrap"}}>{n}</button>))}
        </div>
        <div style={{paddingBottom:60}}>{renderAP()}</div>
        <div style={{position:"fixed",bottom:0,left:0,right:0,background:B.w,borderTop:`1px solid ${B.g200}`,padding:"8px 12px",display:"flex",justifyContent:"space-between",zIndex:100}}>
          <button onClick={()=>{if(cPage>0){setCPage(p=>p-1);goTop();}else{setCView("survey");goTop();}}} style={{padding:"8px 14px",borderRadius:6,border:`1px solid ${B.g200}`,background:"transparent",fontSize:11,fontWeight:600,color:B.g600,cursor:"pointer",fontFamily:F}}>← {cPage>0?"Back":"Survey"}</button>
          {cPage<3&&<button onClick={()=>{setCPage(p=>p+1);goTop();}} style={{padding:"8px 14px",borderRadius:6,border:"none",background:`linear-gradient(135deg,${B.bl},${B.pk})`,fontSize:11,fontWeight:700,color:B.w,cursor:"pointer",fontFamily:F}}>Next →</button>}
          {cPage===3&&<button onClick={()=>{setCView("list");setSelP(null);goTop();}} style={{padding:"8px 14px",borderRadius:6,border:"none",background:B.grn,fontSize:11,fontWeight:700,color:B.w,cursor:"pointer",fontFamily:F}}>✓ Done</button>}
        </div>
      </div>);
    }
  }
  return null;
}
