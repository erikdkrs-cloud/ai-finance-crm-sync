import React, { useState, useEffect, useCallback, useRef } from "react";
import DkrsAppShell from "../components/DkrsAppShell";

var T={title:"CRM Отклики",unread:"непрочитанных",total:"всего",sync:"Синхронизация",syncing:"Синхронизация...",inbox:"Входящие",hired:"Записаны",rejected:"Отказ",all:"Все",vac:"Вакансии",stats:"Аналитика",chat:"Чат",load:"Загрузка...",nomsg:"Сообщений нет",msgph:"Написать сообщение...",search:"Поиск по имени, телефону, вакансии, городу...",allinc:"Все входящие",new_:"Новые",inwork:"В работе",bydate:"По дате",unrfirst:"Сначала новые",found:"Найдено",noresp:"Откликов пока нет",vacancy:"Вакансия",status:"Статус",notes:"Заметки",notesph:"Добавить заметку...",noname:"Без имени",age:"Возраст",years:"лет",allst:"Все статусы",add:"Добавить",cancel:"Отмена",save:"Сохранить",name:"Название",del:"Удалить",delconf:"Точно удалить?",noacc:"Аккаунты не добавлены",novac:"Вакансии не найдены",phone:"Телефон",citizen:"Гражданство",gender:"Пол",male:"Мужской",female:"Женский",notset:"Не указан",info:"Профиль",copied:"Скопировано!",nonotes:"Заметок пока нет",settings:"Настройки"};

function fmt(n){if(!n)return"";return Number(n).toLocaleString("ru-RU")+" ₽";}
function fmtDate(d){if(!d)return"";var date=new Date(d);var diff=new Date()-date;var m=Math.floor(diff/60000);var h=Math.floor(diff/3600000);var dd=Math.floor(diff/86400000);if(m<1)return"сейчас";if(m<60)return m+" мин";if(h<24)return h+"ч";if(dd<7)return dd+"д";return date.toLocaleDateString("ru-RU");}
function fmtTime(ts){if(!ts)return"";return new Date(ts*1000).toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"});}
function fmtDT(ts){if(!ts)return"";var d=new Date(ts*1000);var today=new Date();if(d.toDateString()===today.toDateString())return fmtTime(ts);return d.toLocaleDateString("ru-RU",{day:"2-digit",month:"2-digit"})+" "+fmtTime(ts);}

var ST={"new":{label:"Новый",color:"#3b82f6",bg:"#eff6ff",dark:"#1d4ed8"},processing:{label:"В работе",color:"#f59e0b",bg:"#fffbeb",dark:"#b45309"},hired:{label:"Записан",color:"#10b981",bg:"#ecfdf5",dark:"#047857"},rejected:{label:"Отказ",color:"#ef4444",bg:"#fef2f2",dark:"#b91c1c"}};
function stGet(s){return ST[s]||ST["new"];}

/* ===== STATS ===== */
function StatsPanel(props){
  var R=props.responses,V=props.vacancies;
  var cN=0,cP=0,cH=0,cR=0;
  R.forEach(function(r){if(r.status==="hired")cH++;else if(r.status==="rejected")cR++;else if(r.status==="processing")cP++;else cN++;});
  var now=new Date(),td=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  var ws=new Date(td);ws.setDate(ws.getDate()-7);
  var ms=new Date(td);ms.setDate(ms.getDate()-30);
  var today=0,week=0,month=0;
  R.forEach(function(r){var d=new Date(r.created_at);if(d>=td)today++;if(d>=ws)week++;if(d>=ms)month++;});
  var vm={};R.forEach(function(r){var t=r.vacancy_title||"-";if(!vm[t])vm[t]={title:t,total:0,hired:0,city:r.vacancy_city||""};vm[t].total++;if(r.status==="hired")vm[t].hired++;});
  var topV=Object.values(vm).sort(function(a,b){return b.total-a.total;}).slice(0,8);
  var cm={};R.forEach(function(r){var c=r.vacancy_city||"—";if(!cm[c])cm[c]={city:c,total:0};cm[c].total++;});
  var topC=Object.values(cm).sort(function(a,b){return b.total-a.total;}).slice(0,8);
  var czm={};R.forEach(function(r){var c=r.candidate_citizenship||"Не указано";if(!czm[c])czm[c]=0;czm[c]++;});
  var topCz=Object.entries(czm).sort(function(a,b){return b[1]-a[1];}).slice(0,6);
  var conv=R.length>0?Math.round(cH/R.length*100):0;
  var days=[];for(var i=13;i>=0;i--){var day=new Date(td);day.setDate(day.getDate()-i);var ds=day.toLocaleDateString("ru-RU",{day:"2-digit",month:"2-digit"});var cnt=0;R.forEach(function(r){var rd=new Date(r.created_at);if(rd.getFullYear()===day.getFullYear()&&rd.getMonth()===day.getMonth()&&rd.getDate()===day.getDate())cnt++;});days.push({l:ds,c:cnt});}
  var mx=Math.max.apply(null,days.map(function(d){return d.c;}))||1;
  var bx={background:"#fff",borderRadius:20,padding:"24px",boxShadow:"0 1px 3px rgba(0,0,0,0.04)",border:"1px solid #f1f5f9"};

  return(
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:14}}>
        {[{l:"Всего откликов",v:R.length,c:"#6366f1",ic:"📋",bg:"linear-gradient(135deg,#eef2ff,#e0e7ff)"},{l:"Сегодня",v:today,c:"#3b82f6",ic:"📅",bg:"linear-gradient(135deg,#eff6ff,#dbeafe)"},{l:"За неделю",v:week,c:"#8b5cf6",ic:"📊",bg:"linear-gradient(135deg,#f5f3ff,#ede9fe)"},{l:"Записаны",v:cH,c:"#10b981",ic:"✅",bg:"linear-gradient(135deg,#ecfdf5,#d1fae5)"},{l:"Конверсия",v:conv+"%",c:conv>15?"#10b981":"#f59e0b",ic:"📈",bg:conv>15?"linear-gradient(135deg,#ecfdf5,#d1fae5)":"linear-gradient(135deg,#fffbeb,#fef3c7)"}].map(function(k,i){
          return <div key={i} style={{background:k.bg,borderRadius:20,padding:"24px 20px",textAlign:"center",border:"1px solid #f1f5f9"}}><div style={{fontSize:32,marginBottom:8}}>{k.ic}</div><div style={{fontSize:32,fontWeight:800,color:k.c,lineHeight:1}}>{k.v}</div><div style={{fontSize:12,color:"#64748b",marginTop:8,fontWeight:600,letterSpacing:0.3}}>{k.l}</div></div>;
        })}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"340px 1fr",gap:20}}>
        <div style={bx}>
          <div style={{fontSize:15,fontWeight:700,color:"#1e293b",marginBottom:20}}>{"📊 Воронка"}</div>
          {[{l:"Новые",c:cN,clr:"#3b82f6"},{l:"В работе",c:cP,clr:"#f59e0b"},{l:"Записаны",c:cH,clr:"#10b981"},{l:"Отказ",c:cR,clr:"#ef4444"}].map(function(s,i){var p=R.length>0?Math.round(s.c/R.length*100):0;return <div key={i} style={{marginBottom:16}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:13,fontWeight:600,color:"#475569"}}>{s.l}</span><span style={{fontSize:15,fontWeight:800,color:s.clr}}>{s.c}<span style={{fontSize:11,fontWeight:500,color:"#94a3b8",marginLeft:4}}>{p+"%"}</span></span></div><div style={{height:10,background:"#f1f5f9",borderRadius:5,overflow:"hidden"}}><div style={{height:"100%",width:p+"%",background:s.clr,borderRadius:5,transition:"width 0.6s ease"}}/></div></div>;})}
        </div>
        <div style={bx}>
          <div style={{fontSize:15,fontWeight:700,color:"#1e293b",marginBottom:20}}>{"📈 Отклики за 14 дней"}</div>
          <div style={{display:"flex",alignItems:"flex-end",gap:6,height:180,paddingBottom:24,position:"relative"}}>
            {days.map(function(d,i){var h=Math.max(d.c/mx*150,6);var isT=i===days.length-1;return <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:6}}><span style={{fontSize:10,fontWeight:700,color:d.c>0?"#334155":"#cbd5e1"}}>{d.c||""}</span><div style={{width:"100%",height:h,background:isT?"linear-gradient(180deg,#6366f1,#818cf8)":d.c>0?"linear-gradient(180deg,#c7d2fe,#e0e7ff)":"#f1f5f9",borderRadius:6,transition:"height 0.5s ease"}}/><span style={{fontSize:9,color:isT?"#6366f1":"#94a3b8",fontWeight:isT?700:500}}>{d.l}</span></div>;})}
          </div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
        <div style={bx}>
          <div style={{fontSize:15,fontWeight:700,color:"#1e293b",marginBottom:16}}>{"🏢 Топ вакансий"}</div>
          {topV.map(function(v,i){var p=R.length>0?Math.round(v.total/R.length*100):0;return <div key={i} style={{display:"flex",alignItems:"center",gap:12,marginBottom:10,padding:"8px 12px",borderRadius:12,background:i===0?"#eef2ff":"transparent"}}><div style={{width:28,height:28,borderRadius:8,background:i<3?"#6366f1":"#e2e8f0",color:i<3?"#fff":"#64748b",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,flexShrink:0}}>{i+1}</div><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,color:"#334155",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{v.title}</div><div style={{height:4,background:"#f1f5f9",borderRadius:2,marginTop:4,overflow:"hidden"}}><div style={{height:"100%",width:p+"%",background:"linear-gradient(90deg,#6366f1,#a78bfa)",borderRadius:2}}/></div></div><div style={{textAlign:"right",flexShrink:0}}><div style={{fontSize:14,fontWeight:800,color:"#334155"}}>{v.total}</div>{v.hired>0&&<div style={{fontSize:10,color:"#10b981",fontWeight:700}}>{"✅ "+v.hired}</div>}</div></div>;})}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:20}}>
          <div style={bx}>
            <div style={{fontSize:15,fontWeight:700,color:"#1e293b",marginBottom:12}}>{"📍 География"}</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>{topC.map(function(c,i){return <div key={i} style={{padding:"8px 16px",borderRadius:20,background:i===0?"linear-gradient(135deg,#6366f1,#818cf8)":i<3?"#eef2ff":"#f8fafc",color:i===0?"#fff":i<3?"#4f46e5":"#64748b",fontSize:12,fontWeight:700,border:i>=3?"1px solid #e2e8f0":"none"}}>{c.city+" · "+c.total}</div>;})}</div>
          </div>
          <div style={bx}>
            <div style={{fontSize:15,fontWeight:700,color:"#1e293b",marginBottom:12}}>{"🌍 Гражданство"}</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>{topCz.map(function(c,i){return <div key={i} style={{padding:"8px 16px",borderRadius:20,background:i===0?"linear-gradient(135deg,#f59e0b,#fbbf24)":"#fffbeb",color:i===0?"#fff":"#92400e",fontSize:12,fontWeight:700,border:i>0?"1px solid #fde68a":"none"}}>{c[0]+" · "+c[1]}</div>;})}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
function CandidateModal(props){
  var resp=props.resp,vacancies=props.vacancies,onClose=props.onClose,onUpdate=props.onUpdate,onStatusChange=props.onStatusChange;
  var _mt=useState("info"),modalTab=_mt[0],setModalTab=_mt[1];
  var _n=useState([]),notes=_n[0],setNotes=_n[1];
  var _nt=useState(""),noteText=_nt[0],setNoteText=_nt[1];
  var _f=useState({candidate_name:resp.candidate_name||resp.author_name||"",candidate_age:resp.candidate_age||"",candidate_gender:resp.candidate_gender||"",candidate_citizenship:resp.candidate_citizenship||"",phone:resp.phone||""}),form=_f[0],setForm=_f[1];
  var _sv=useState(false),saving=_sv[0],setSaving=_sv[1];
  var _cp=useState(false),copied=_cp[0],setCopied=_cp[1];
  var _cm=useState([]),chatMsgs=_cm[0],setChatMsgs=_cm[1];
  var _cl=useState(false),chatLoad=_cl[0],setChatLoad=_cl[1];
  var _ct=useState(""),chatText=_ct[0],setChatText=_ct[1];
  var _sn=useState(false),sending=_sn[0],setSending=_sn[1];
  var chatEndRef=useRef(null);
  
  useEffect(function(){fetch("/api/avito/candidate/"+resp.id).then(function(r){return r.json();}).then(function(d){if(d.notes)setNotes(d.notes);}).catch(function(){});},[resp.id]);
  useEffect(function(){if(chatEndRef.current)chatEndRef.current.scrollIntoView({behavior:"smooth"});},[chatMsgs]);

  function loadChat(){setChatLoad(true);fetch("/api/avito/chat?chat_id="+resp.avito_chat_id+"&account_id="+resp.account_id).then(function(r){return r.json();}).then(function(d){if(d.ok)setChatMsgs(d.messages||[]);setChatLoad(false);}).catch(function(){setChatLoad(false);});}
  function saveField(f,v){setSaving(true);var b={};b[f]=v;fetch("/api/avito/candidate/"+resp.id,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)}).then(function(r){return r.json();}).then(function(d){setSaving(false);if(d.candidate)onUpdate(d.candidate);}).catch(function(){setSaving(false);});}
  function addNote(){if(!noteText.trim())return;fetch("/api/avito/candidate/notes",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({response_id:resp.id,text:noteText})}).then(function(r){return r.json();}).then(function(d){if(d.notes)setNotes(d.notes);setNoteText("");}).catch(function(){});}
  function deleteNote(nid){fetch("/api/avito/candidate/notes?id="+nid,{method:"DELETE"}).then(function(){setNotes(notes.filter(function(n){return n.id!==nid;}));});}
  function copyPhone(){if(form.phone){navigator.clipboard.writeText(form.phone);setCopied(true);setTimeout(function(){setCopied(false);},1500);}}
  function sendMsg(){if(!chatText.trim()||sending)return;setSending(true);fetch("/api/avito/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({chat_id:resp.avito_chat_id,account_id:resp.account_id,text:chatText.trim()})}).then(function(r){return r.json();}).then(function(d){if(d.ok){setChatMsgs(function(p){return p.concat([{id:Date.now(),direction:"out",content:chatText.trim(),created:Math.floor(Date.now()/1000)}]);});setChatText("");}setSending(false);}).catch(function(){setSending(false);});}

  var addr="";
  if(resp.vacancy_address&&resp.vacancy_address.length>3)addr=resp.vacancy_address;
  else{var v=vacancies.find(function(vv){return vv.id===resp.vacancy_id;});if(v){if(v.raw_data&&v.raw_data.address)addr=v.raw_data.address;else if(v.address)addr=v.address;else if(v.city)addr=v.city;}if(!addr)addr=resp.vacancy_city||"";}

  var tabStyle=function(active){return{flex:1,padding:"14px 0",border:"none",borderBottom:active?"3px solid #6366f1":"3px solid transparent",background:"transparent",color:active?"#6366f1":"#94a3b8",cursor:"pointer",fontWeight:700,fontSize:13,transition:"all 0.2s"};};

  return(
    <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(15,23,42,0.6)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(8px)"}} onClick={onClose}>
      <div style={{background:"#fff",borderRadius:28,width:"95%",maxWidth:840,maxHeight:"92vh",overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:"0 25px 80px rgba(0,0,0,0.25)"}} onClick={function(e){e.stopPropagation();}}>

        <div style={{background:"linear-gradient(135deg,#0f172a,#1e293b)",padding:"28px 32px",color:"#fff",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:-40,right:-40,width:200,height:200,borderRadius:"50%",background:"rgba(99,102,241,0.1)"}}/>
          <div style={{position:"absolute",bottom:-60,right:60,width:150,height:150,borderRadius:"50%",background:"rgba(139,92,246,0.08)"}}/>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",position:"relative"}}>
            <div style={{display:"flex",alignItems:"center",gap:18}}>
              <div style={{width:64,height:64,borderRadius:20,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,boxShadow:"0 8px 24px rgba(99,102,241,0.4)"}}>{"👤"}</div>
              <div>
                <h2 style={{margin:0,fontSize:24,fontWeight:800,letterSpacing:-0.5}}>{form.candidate_name||T.noname}</h2>
                <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap"}}>
                  {form.candidate_age&&<span style={{padding:"4px 12px",borderRadius:8,background:"rgba(255,255,255,0.1)",fontSize:12,fontWeight:600,backdropFilter:"blur(10px)"}}>{"🎂 "+form.candidate_age+" лет"}</span>}
                  {form.candidate_citizenship&&<span style={{padding:"4px 12px",borderRadius:8,background:"rgba(255,255,255,0.1)",fontSize:12,fontWeight:600}}>{"🌍 "+form.candidate_citizenship}</span>}
                  {resp.vacancy_city&&<span style={{padding:"4px 12px",borderRadius:8,background:"rgba(255,255,255,0.1)",fontSize:12,fontWeight:600}}>{"📍 "+resp.vacancy_city}</span>}
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{background:"rgba(255,255,255,0.1)",border:"none",color:"#fff",width:44,height:44,borderRadius:14,cursor:"pointer",fontSize:18,backdropFilter:"blur(10px)",transition:"all 0.2s"}}>{"✕"}</button>
          </div>
        </div>

        <div style={{display:"flex",borderBottom:"1px solid #f1f5f9",background:"#fafbfc"}}>
          {[{key:"info",label:"👤 "+T.info},{key:"chat",label:"💬 "+T.chat},{key:"notes",label:"📝 "+T.notes+" ("+notes.length+")"}].map(function(t){
            return <button key={t.key} onClick={function(){setModalTab(t.key);if(t.key==="chat"&&chatMsgs.length===0)loadChat();}} style={tabStyle(modalTab===t.key)}>{t.label}</button>;
          })}
        </div>

        <div style={{flex:1,overflow:"auto",padding:modalTab==="chat"?0:"28px 32px"}}>

          {modalTab==="info"&&(<div style={{display:"flex",flexDirection:"column",gap:24}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              {[{l:"Имя",k:"candidate_name",v:form.candidate_name,type:"text"},{l:T.age,k:"candidate_age",v:form.candidate_age,type:"text"},{l:T.citizen,k:"candidate_citizenship",v:form.candidate_citizenship,type:"text"},{l:T.phone,k:"phone",v:form.phone,type:"phone"}].map(function(f){
                return <div key={f.k}><label style={{fontSize:11,color:"#94a3b8",fontWeight:700,textTransform:"uppercase",letterSpacing:0.8,display:"block",marginBottom:6}}>{f.l}</label><input value={f.v} onChange={function(e){var u={};u[f.k]=e.target.value;setForm(Object.assign({},form,u));}} onBlur={function(){saveField(f.k,form[f.k]);}} style={{width:"100%",padding:"14px 16px",border:"2px solid #e2e8f0",borderRadius:14,fontSize:15,boxSizing:"border-box",transition:"border-color 0.2s",outline:"none"}} placeholder={f.l+"..."}/></div>;
              })}
            </div>
            <div><label style={{fontSize:11,color:"#94a3b8",fontWeight:700,textTransform:"uppercase",letterSpacing:0.8,display:"block",marginBottom:6}}>{T.gender}</label>
              <div style={{display:"flex",gap:8}}>
                {[{v:"",l:"❓ "+T.notset},{v:"male",l:"👨 "+T.male},{v:"female",l:"👩 "+T.female}].map(function(g){var act=form.candidate_gender===g.v;return <button key={g.v} onClick={function(){setForm(Object.assign({},form,{candidate_gender:g.v}));saveField("candidate_gender",g.v);}} style={{flex:1,padding:"12px",borderRadius:12,border:act?"2px solid #6366f1":"2px solid #e2e8f0",background:act?"#eef2ff":"#fff",color:act?"#4f46e5":"#64748b",cursor:"pointer",fontWeight:act?700:500,fontSize:13,transition:"all 0.2s"}}>{g.l}</button>;})}
              </div>
            </div>
            {form.phone&&<div style={{display:"flex",gap:8}}>
              <button onClick={copyPhone} style={{flex:1,padding:"14px",background:copied?"#10b981":"#f8fafc",color:copied?"#fff":"#334155",border:"1px solid #e2e8f0",borderRadius:14,cursor:"pointer",fontWeight:700,fontSize:13,transition:"all 0.2s"}}>{copied?"✅ Скопировано":"📋 Копировать номер"}</button>
              <a href={"tel:"+form.phone} style={{flex:1,padding:"14px",background:"linear-gradient(135deg,#10b981,#34d399)",color:"#fff",borderRadius:14,textDecoration:"none",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13}}>{"📞 Позвонить"}</a>
                            <a href={"https://t.me/+"+form.phone.replace(/[^0-9]/g,"")} target="_blank" rel="noreferrer" style={{flex:1,padding:"14px",background:"linear-gradient(135deg,#0088cc,#33b5e5)",color:"#fff",borderRadius:14,textDecoration:"none",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13}}>{"✈️ Telegram"}</a>
            </div>}
            <div style={{padding:20,background:"linear-gradient(135deg,#f8fafc,#f1f5f9)",borderRadius:20,border:"1px solid #e2e8f0"}}>
              <div style={{fontSize:11,color:"#94a3b8",fontWeight:700,letterSpacing:0.8,marginBottom:8}}>{"ВАКАНСИЯ"}</div>
              <div style={{fontWeight:700,fontSize:17,color:"#1e293b"}}>{resp.vacancy_title||"-"}</div>
              {addr&&<div style={{fontSize:13,color:"#64748b",marginTop:6}}>{"📍 "+addr}</div>}
            </div>
            <div>
              <div style={{fontSize:11,color:"#94a3b8",fontWeight:700,letterSpacing:0.8,marginBottom:10}}>{"СТАТУС"}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10}}>
                {Object.keys(ST).map(function(key){var s=ST[key];var act=(resp.status||"new")===key;return <button key={key} onClick={function(){onStatusChange(resp.id,key);}} style={{padding:"16px 8px",borderRadius:16,border:act?"2px solid "+s.color:"2px solid #e2e8f0",background:act?s.bg:"#fff",cursor:"pointer",fontWeight:act?800:500,fontSize:13,color:act?s.dark:"#64748b",transition:"all 0.2s",textAlign:"center"}}><div style={{fontSize:20,marginBottom:4}}>{key==="new"?"🔵":key==="processing"?"🟡":key==="hired"?"✅":"❌"}</div>{s.label}</button>;})}
              </div>
            </div>
            {saving&&<div style={{color:"#6366f1",fontSize:12,fontWeight:600}}>{"💾 Сохранение..."}</div>}
          </div>)}

          {modalTab==="chat"&&(<div style={{display:"flex",flexDirection:"column",height:520}}>
            <div style={{flex:1,overflowY:"auto",padding:20,display:"flex",flexDirection:"column",gap:10,background:"linear-gradient(180deg,#f8fafc,#fff)"}}>
              {chatLoad&&<div style={{textAlign:"center",color:"#94a3b8",paddingTop:80,fontSize:14}}>{T.load}</div>}
              {!chatLoad&&chatMsgs.length===0&&<div style={{textAlign:"center",paddingTop:80}}><div style={{fontSize:48,marginBottom:12}}>{"💬"}</div><div style={{color:"#94a3b8",fontSize:14}}>{T.nomsg}</div></div>}
              {!chatLoad&&chatMsgs.map(function(m){var out=m.direction==="out";return <div key={m.id} style={{display:"flex",justifyContent:out?"flex-end":"flex-start"}}><div style={{maxWidth:"75%",padding:"12px 16px",borderRadius:out?"18px 18px 4px 18px":"18px 18px 18px 4px",background:out?"linear-gradient(135deg,#6366f1,#818cf8)":"#fff",color:out?"#fff":"#1e293b",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}><div style={{fontSize:14,whiteSpace:"pre-line",lineHeight:1.6}}>{m.content}</div><div style={{fontSize:10,marginTop:4,opacity:0.5,textAlign:"right"}}>{fmtDT(m.created)}</div></div></div>;})}
              <div ref={chatEndRef}/>
            </div>
            <div style={{padding:"16px 20px",borderTop:"1px solid #f1f5f9",display:"flex",gap:10,background:"#fff"}}>
              <input value={chatText} onChange={function(e){setChatText(e.target.value);}} onKeyDown={function(e){if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMsg();}}} placeholder={T.msgph} style={{flex:1,padding:"14px 18px",borderRadius:16,border:"2px solid #e2e8f0",fontSize:14,outline:"none",transition:"border-color 0.2s"}}/>
              <button onClick={sendMsg} disabled={sending||!chatText.trim()} style={{padding:"14px 24px",borderRadius:16,border:"none",background:chatText.trim()?"linear-gradient(135deg,#6366f1,#818cf8)":"#f1f5f9",color:chatText.trim()?"#fff":"#cbd5e1",fontWeight:700,cursor:chatText.trim()?"pointer":"default",fontSize:16,transition:"all 0.2s"}}>{sending?"⏳":"➤"}</button>
            </div>
          </div>)}

          {modalTab==="notes"&&(<div>
            <div style={{display:"flex",gap:10,marginBottom:20}}>
              <input value={noteText} onChange={function(e){setNoteText(e.target.value);}} onKeyDown={function(e){if(e.key==="Enter")addNote();}} placeholder={T.notesph} style={{flex:1,padding:"14px 18px",border:"2px solid #e2e8f0",borderRadius:16,fontSize:14,outline:"none"}}/>
              <button onClick={addNote} style={{padding:"14px 24px",background:"linear-gradient(135deg,#6366f1,#818cf8)",color:"#fff",border:"none",borderRadius:16,cursor:"pointer",fontWeight:700,fontSize:13}}>{T.add}</button>
            </div>
            {notes.length===0&&<div style={{textAlign:"center",padding:48}}><div style={{fontSize:48,marginBottom:12}}>{"📝"}</div><div style={{color:"#94a3b8",fontSize:14}}>{T.nonotes}</div></div>}
            {notes.map(function(note){return <div key={note.id} style={{padding:16,background:"linear-gradient(135deg,#fffbeb,#fef3c7)",borderRadius:16,marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"flex-start",border:"1px solid #fde68a"}}><div><div style={{fontSize:14,color:"#1e293b",lineHeight:1.5}}>{note.text}</div><div style={{fontSize:11,color:"#94a3b8",marginTop:6}}>{"🕐 "+new Date(note.created_at).toLocaleString("ru")}</div></div><button onClick={function(){deleteNote(note.id);}} style={{background:"rgba(239,68,68,0.1)",border:"none",cursor:"pointer",color:"#ef4444",fontSize:14,width:32,height:32,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{"✕"}</button></div>;})}
          </div>)}
        </div>
      </div>
    </div>
  );
}
export default function VacanciesPage(){
  var _v=useState([]),vacancies=_v[0],setVacancies=_v[1];
  var _r=useState([]),responses=_r[0],setResponses=_r[1];
  var _a=useState([]),accounts=_a[0],setAccounts=_a[1];
  var _tab=useState("dashboard"),tab=_tab[0],setTab=_tab[1];
  var _ld=useState(true),loading=_ld[0],setLoading=_ld[1];
  var _sy=useState(false),syncing=_sy[0],setSyncing=_sy[1];
  var _msg=useState(null),xmsg=_msg[0],setXmsg=_msg[1];
  var _se=useState(""),search=_se[0],setSearch=_se[1];
  var _sf=useState("all"),statusFilter=_sf[0],setStatusFilter=_sf[1];
  var _sa=useState(false),showAdd=_sa[0],setShowAdd=_sa[1];
  var _af=useState({name:"",client_id:"",client_secret:""}),accForm=_af[0],setAccForm=_af[1];
  var _sv2=useState(null),selVac=_sv2[0],setSelVac=_sv2[1];
  var _so=useState("date"),sortBy=_so[0],setSortBy=_so[1];
  var _vs=useState(""),vacSearch=_vs[0],setVacSearch=_vs[1];
  var _modal=useState(null),modalResp=_modal[0],setModalResp=_modal[1];

  var fetchData=useCallback(function(){
    setLoading(true);
    Promise.all([fetch("/api/avito/vacancies").then(function(r){return r.json();}),fetch("/api/avito/responses").then(function(r){return r.json();}),fetch("/api/avito/accounts").then(function(r){return r.json();})]).then(function(res){setVacancies(res[0].data||[]);setResponses(res[1].data||[]);setAccounts(res[2].data||[]);setLoading(false);}).catch(function(){setLoading(false);});
  },[]);
  useEffect(function(){fetchData();},[fetchData]);

  function doSync(syncMode){
    setSyncing(true);setXmsg(null);var sm=syncMode||"fast";
    fetch("/api/avito/sync?mode=items").then(function(r){return r.json();}).then(function(d1){
      var vc=d1.synced?d1.synced.vacancies:0;setXmsg({type:"success",text:"Вакансии: "+vc+"..."});
      var tR=0;var tS=0;var pn=0;
      function go(){fetch("/api/avito/sync?mode=chats&chat_page="+pn+"&sync_mode="+sm).then(function(r){return r.json();}).then(function(d){
        var b=d.synced?d.synced.responses:0;var sk=d.synced?d.synced.skipped||0:0;var stopped=d.synced?d.synced.stopped:false;tR+=b;tS+=sk;
        setXmsg({type:"success",text:tR+" откликов ("+tS+" из кэша)..."});
        if(b>0&&!d.errors&&!stopped&&sm==="full"){pn++;go();}
        else if(b>0&&!d.errors&&!stopped&&sm==="fast"&&sk<b){pn++;go();}
        else{setSyncing(false);setXmsg({type:"success",text:"✅ "+vc+" вак, "+tR+" откл, "+tS+" кэш"});fetchData();}
      }).catch(function(){setSyncing(false);fetchData();});}
      go();
    }).catch(function(e){setSyncing(false);setXmsg({type:"error",text:e.message});});
  }

  function updStatus(id,st){fetch("/api/avito/response-update",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:id,status:st})}).then(function(){setResponses(function(p){return p.map(function(x){return x.id===id?Object.assign({},x,{status:st}):x;});});if(modalResp&&modalResp.id===id)setModalResp(Object.assign({},modalResp,{status:st}));});}
  function onModalUpdate(updated){setResponses(function(p){return p.map(function(x){return x.id===updated.id?Object.assign({},x,updated):x;});});setModalResp(Object.assign({},modalResp,updated));}
  function openModal(r){setModalResp(r);if(!r.is_read){fetch("/api/avito/response-update",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:r.id,is_read:true,mark_read:true})}).then(function(){setResponses(function(p){return p.map(function(x){return x.id===r.id?Object.assign({},x,{is_read:true}):x;});});});}}
  function addAcc(e){e.preventDefault();fetch("/api/avito/accounts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(accForm)}).then(function(r){return r.json();}).then(function(d){if(d.ok){setShowAdd(false);setAccForm({name:"",client_id:"",client_secret:""});fetchData();}});}
  function delAcc(id){if(!confirm(T.delconf))return;fetch("/api/avito/accounts?id="+id,{method:"DELETE"}).then(function(){fetchData();});}

  function matchVac(r){return vacancies.find(function(v){return String(v.avito_id)===String(r.vacancy_code);});}
  function getVacTitle(r){if(r.vacancy_title&&r.vacancy_title.length>2)return r.vacancy_title;var v=matchVac(r);if(v&&v.title)return v.title;return"—";}
  function getAddr(r){if(r.vacancy_address&&r.vacancy_address.length>3)return r.vacancy_address;var v=matchVac(r);if(v){if(v.address)return v.address;if(v.city)return v.city;}return r.vacancy_city||"";}
  function getVacCode(r){return"";}

  var unread=responses.filter(function(r){return!r.is_read;}).length;
  var cNew=responses.filter(function(r){return r.status==="new"||!r.status;}).length;
  var cProc=responses.filter(function(r){return r.status==="processing";}).length;
  var cHired=responses.filter(function(r){return r.status==="hired";}).length;
  var cRej=responses.filter(function(r){return r.status==="rejected";}).length;

  var filtered=responses.filter(function(r){
    if(tab==="responses"){if(statusFilter==="all")return r.status==="new"||!r.status||r.status==="processing";return r.status===statusFilter;}
    if(tab==="hired")return r.status==="hired";
    if(tab==="rejected")return r.status==="rejected";
    if(tab==="all"){if(statusFilter!=="all")return r.status===statusFilter;return true;}
    return true;
  });
   if(selVac)filtered=filtered.filter(function(r){return String(r.vacancy_code)===String(selVac.avito_id);});
  if(search){var q=search.toLowerCase();filtered=filtered.filter(function(r){return(r.author_name||"").toLowerCase().indexOf(q)!==-1||(r.candidate_name||"").toLowerCase().indexOf(q)!==-1||(r.phone||"").indexOf(q)!==-1||(r.vacancy_title||"").toLowerCase().indexOf(q)!==-1||(r.vacancy_city||"").toLowerCase().indexOf(q)!==-1;});}
  filtered.sort(function(a,b){if(sortBy==="unread"){if(!a.is_read&&b.is_read)return-1;if(a.is_read&&!b.is_read)return 1;}return new Date(b.created_at||0)-new Date(a.created_at||0);});
    var navItems=[
    {key:"dashboard",icon:"📊",label:"Дашборд"},
    {key:"responses",icon:"📥",label:T.inbox,badge:cNew+cProc},
    {key:"hired",icon:"✅",label:T.hired,badge:cHired},
    {key:"rejected",icon:"❌",label:T.rejected,badge:cRej},
    {key:"all",icon:"📋",label:T.all,badge:responses.length},
    {key:"vacancies",icon:"🏢",label:T.vac,badge:vacancies.length},
    {key:"settings",icon:"⚙️",label:T.settings,badge:accounts.length}
  ];

  return(
    <DkrsAppShell>
      <div style={{maxWidth:1500,margin:"0 auto",padding:"0 8px"}}>

        {/* TOP BAR */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,padding:"20px 24px",background:"linear-gradient(135deg,#0f172a,#1e293b)",borderRadius:24,color:"#fff",boxShadow:"0 4px 24px rgba(15,23,42,0.3)"}}>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <div style={{width:48,height:48,borderRadius:16,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,boxShadow:"0 4px 16px rgba(99,102,241,0.4)"}}>{"📋"}</div>
            <div>
              <h1 style={{margin:0,fontSize:22,fontWeight:800,letterSpacing:-0.5}}>{T.title}</h1>
              <p style={{margin:"4px 0 0",color:"#94a3b8",fontSize:13}}>{responses.length+" "+T.total+" · "+unread+" "+T.unread}</p>
            </div>
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            {xmsg&&<div style={{padding:"8px 16px",borderRadius:12,fontSize:12,fontWeight:600,background:xmsg.type==="success"?"rgba(16,185,129,0.15)":"rgba(239,68,68,0.15)",color:xmsg.type==="success"?"#34d399":"#f87171",maxWidth:300,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{xmsg.text}</div>}
            <button onClick={function(){doSync("fast");}} disabled={syncing} style={{background:"linear-gradient(135deg,#6366f1,#818cf8)",color:"#fff",border:"none",borderRadius:14,padding:"12px 24px",fontWeight:700,fontSize:13,cursor:syncing?"default":"pointer",opacity:syncing?0.7:1,boxShadow:"0 4px 16px rgba(99,102,241,0.3)",transition:"all 0.2s"}}>{syncing?"⏳ "+T.syncing:"⚡ "+T.sync}</button>
            <button onClick={function(){doSync("full");}} disabled={syncing} style={{background:"rgba(255,255,255,0.08)",color:"#e2e8f0",border:"1px solid rgba(255,255,255,0.12)",borderRadius:14,padding:"12px 18px",fontWeight:600,fontSize:13,cursor:syncing?"default":"pointer",opacity:syncing?0.5:1,backdropFilter:"blur(10px)"}}>{"🔄 Полная"}</button>
          </div>
        </div>

        {/* NAV TABS */}
        <div style={{display:"flex",gap:6,marginBottom:20,padding:6,background:"#f8fafc",borderRadius:18,border:"1px solid #f1f5f9"}}>
          {navItems.map(function(n){var ac=tab===n.key;return(
            <button key={n.key} onClick={function(){setTab(n.key);setSelVac(null);setSearch("");setVacSearch("");setStatusFilter("all");}}
              style={{flex:1,padding:"12px 8px",border:"none",cursor:"pointer",fontWeight:ac?700:500,fontSize:13,background:ac?"#fff":"transparent",color:ac?"#1e293b":"#94a3b8",borderRadius:14,boxShadow:ac?"0 2px 8px rgba(0,0,0,0.06)":"none",transition:"all 0.2s",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
              <span>{n.icon}</span><span>{n.label}</span>
              {n.badge>0&&<span style={{padding:"2px 8px",borderRadius:8,fontSize:10,fontWeight:700,background:ac?"#6366f1":"#e2e8f0",color:ac?"#fff":"#64748b"}}>{n.badge}</span>}
            </button>);
          })}
        </div>

        {/* DASHBOARD */}
        {tab==="dashboard"&&(
          <div>
            {/* Quick stats row */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:24}}>
              {[{l:"Новые",v:cNew,icon:"🔵",c:"#3b82f6",bg:"linear-gradient(135deg,#eff6ff,#dbeafe)"},{l:"В работе",v:cProc,icon:"🟡",c:"#f59e0b",bg:"linear-gradient(135deg,#fffbeb,#fef3c7)"},{l:"Записаны",v:cHired,icon:"✅",c:"#10b981",bg:"linear-gradient(135deg,#ecfdf5,#d1fae5)"},{l:"Непрочитанные",v:unread,icon:"🔔",c:"#ef4444",bg:"linear-gradient(135deg,#fef2f2,#fecaca)"}].map(function(s,i){
                return <div key={i} onClick={function(){if(i===0){setTab("responses");setStatusFilter("new");}else if(i===1){setTab("responses");setStatusFilter("processing");}else if(i===2)setTab("hired");else{setTab("responses");setSortBy("unread");}}} style={{background:s.bg,borderRadius:20,padding:"24px",cursor:"pointer",border:"1px solid #f1f5f9",transition:"all 0.2s"}}
                  onMouseEnter={function(e){e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 24px rgba(0,0,0,0.08)";}}
                  onMouseLeave={function(e){e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="none";}}>
                  <div style={{fontSize:32,marginBottom:10}}>{s.icon}</div>
                  <div style={{fontSize:36,fontWeight:800,color:s.c,lineHeight:1}}>{s.v}</div>
                  <div style={{fontSize:13,color:"#64748b",marginTop:8,fontWeight:600}}>{s.l}</div>
                </div>;
              })}
            </div>
            {/* Recent responses */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
              <div style={{background:"#fff",borderRadius:24,padding:"24px",boxShadow:"0 1px 3px rgba(0,0,0,0.04)",border:"1px solid #f1f5f9"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                  <div style={{fontSize:16,fontWeight:700,color:"#1e293b"}}>{"🕐 Последние отклики"}</div>
                  <button onClick={function(){setTab("all");}} style={{fontSize:12,color:"#6366f1",fontWeight:700,background:"#eef2ff",border:"none",borderRadius:10,padding:"6px 14px",cursor:"pointer"}}>{"Все →"}</button>
                </div>
                {responses.slice(0,6).map(function(r){var st=stGet(r.status);var ur=!r.is_read;return(
                  <div key={r.id} onClick={function(){openModal(r);}} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 14px",marginBottom:6,borderRadius:14,cursor:"pointer",background:ur?"#fffbeb":"transparent",border:ur?"1px solid #fde68a":"1px solid transparent",transition:"all 0.15s"}}
                    onMouseEnter={function(e){e.currentTarget.style.background=ur?"#fff7cc":"#f8fafc";}}
                    onMouseLeave={function(e){e.currentTarget.style.background=ur?"#fffbeb":"transparent";}}>
                    <div style={{width:42,height:42,borderRadius:14,background:"linear-gradient(135deg,#6366f1,#a78bfa)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0,position:"relative"}}>{"👤"}{ur&&<div style={{position:"absolute",top:-3,right:-3,width:12,height:12,borderRadius:"50%",background:"#ef4444",border:"2px solid #fff"}}/>}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:700,fontSize:14,color:"#1e293b",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.candidate_name||r.author_name||T.noname}</div>
                                                                  <div style={{fontSize:12,color:"#6366f1",display:"flex",alignItems:"center",gap:6,fontWeight:700}}>
                        <span style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{"🏢 "+getVacTitle(r)}</span>
                        {getVacCode(r)&&<span style={{padding:"1px 6px",borderRadius:4,background:"#f0fdf4",border:"1px solid #bbf7d0",fontSize:9,fontWeight:800,color:"#15803d"}}>{getVacCode(r)}</span>}
                      </div>
                      <div style={{display:"flex",gap:4,marginTop:3,flexWrap:"wrap"}}>
                        {r.vacancy_city&&<span style={{fontSize:10,padding:"1px 8px",borderRadius:6,background:"#fef3c7",color:"#92400e",fontWeight:600}}>{"📍 "+r.vacancy_city}</span>}
                        {r.candidate_age&&<span style={{fontSize:10,padding:"1px 8px",borderRadius:6,background:"#e0f2fe",color:"#0c4a6e",fontWeight:600}}>{r.candidate_age+" лет"}</span>}
                        {r.phone&&<span style={{fontSize:10,padding:"1px 8px",borderRadius:6,background:"#dcfce7",color:"#166534",fontWeight:700}}>{"📞 "+r.phone}</span>}
                      </div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{padding:"3px 10px",borderRadius:8,fontSize:10,fontWeight:700,background:st.bg,color:st.color}}>{st.label}</div>
                      <div style={{fontSize:10,color:"#cbd5e1",marginTop:4}}>{fmtDate(r.created_at)}</div>
                    </div>
                  </div>);
                })}
              </div>
              <StatsPanel responses={responses} vacancies={vacancies}/>
            </div>
          </div>
        )}

        {/* RESPONSES / HIRED / REJECTED / ALL */}
        {(tab==="responses"||tab==="hired"||tab==="rejected"||tab==="all")&&(
          <div>
            <div style={{display:"flex",gap:10,marginBottom:16,padding:"14px 18px",background:"#fff",borderRadius:18,boxShadow:"0 1px 3px rgba(0,0,0,0.04)",border:"1px solid #f1f5f9",flexWrap:"wrap",alignItems:"center"}}>
              <div style={{flex:1,minWidth:220,position:"relative"}}>
                <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:16}}>{"🔍"}</span>
                <input placeholder={T.search} value={search} onChange={function(e){setSearch(e.target.value);}} style={{width:"100%",padding:"12px 14px 12px 42px",borderRadius:14,border:"2px solid #f1f5f9",fontSize:13,outline:"none",boxSizing:"border-box",transition:"border-color 0.2s"}}/>
              </div>
              {(tab==="responses"||tab==="all")&&(
                <select value={statusFilter} onChange={function(e){setStatusFilter(e.target.value);}} style={{padding:"12px 16px",borderRadius:14,border:"2px solid #f1f5f9",fontSize:13,background:"#fff",cursor:"pointer"}}>
                  <option value="all">{tab==="responses"?T.allinc:T.allst}</option>
                  <option value="new">{T.new_+" ("+cNew+")"}</option>
                  <option value="processing">{T.inwork+" ("+cProc+")"}</option>
                  {tab==="all"&&<option value="hired">{T.hired+" ("+cHired+")"}</option>}
                  {tab==="all"&&<option value="rejected">{T.rejected+" ("+cRej+")"}</option>}
                </select>)}
                   <select value={selVac?String(selVac.id):""} onChange={function(e){if(!e.target.value){setSelVac(null);}else{var found=vacancies.find(function(v){return String(v.id)===e.target.value;});setSelVac(found||null);}}} style={{padding:"12px 16px",borderRadius:14,border:"2px solid #f1f5f9",fontSize:13,background:"#fff",cursor:"pointer",maxWidth:420}}>
                <option value="">{"🏢 Все вакансии"}</option>
                {vacancies.sort(function(a,b){var ac=responses.filter(function(r){return String(r.vacancy_code)===String(a.avito_id);}).length;var bc=responses.filter(function(r){return String(r.vacancy_code)===String(b.avito_id);}).length;return bc-ac;}).map(function(v){var rc=responses.filter(function(r){return String(r.vacancy_code)===String(v.avito_id);}).length;var addr=v.address||v.city||"";return <option key={v.id} value={String(v.id)}>{v.title+(addr?" — "+addr:"")+" ("+rc+")"}</option>;})}
              </select>
              <select value={sortBy} onChange={function(e){setSortBy(e.target.value);}} style={{padding:"12px 16px",borderRadius:14,border:"2px solid #f1f5f9",fontSize:13,background:"#fff",cursor:"pointer"}}>
                <option value="date">{T.bydate}</option>
                <option value="unread">{T.unrfirst}</option>
              </select>
              {selVac&&<button onClick={function(){setSelVac(null);}} style={{padding:"10px 18px",borderRadius:14,background:"#eef2ff",color:"#4f46e5",border:"1px solid #c7d2fe",fontSize:12,cursor:"pointer",fontWeight:700}}>{"✕ "+selVac.title.slice(0,25)}</button>}
              <div style={{padding:"12px 0",fontSize:13,color:"#94a3b8",fontWeight:600}}>{T.found+": "+filtered.length}</div>
            </div>

            {loading?<div style={{textAlign:"center",padding:60,color:"#94a3b8",fontSize:15}}><div style={{fontSize:48,marginBottom:12}}>{"⏳"}</div>{T.load}</div>
            :filtered.length===0?<div style={{textAlign:"center",padding:60,background:"#fff",borderRadius:24}}><div style={{fontSize:48,marginBottom:12}}>{"📭"}</div><div style={{color:"#94a3b8",fontSize:15}}>{T.noresp}</div></div>
            :(
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {filtered.slice(0,100).map(function(r){
                  var st=stGet(r.status||"new");var ur=!r.is_read;var addr=getAddr(r);
                  return(
                    <div key={r.id} onClick={function(){openModal(r);}}
                      style={{background:"#fff",borderRadius:20,cursor:"pointer",border:ur?"2px solid #fbbf24":"1px solid #f1f5f9",overflow:"hidden",transition:"all 0.2s",position:"relative"}}
                      onMouseEnter={function(e){e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 12px 40px rgba(0,0,0,0.08)";}}
                      onMouseLeave={function(e){e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="none";}}>
                      {ur&&<div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,#fbbf24,#f97316)"}}/>}
                      <div style={{padding:"18px 24px",display:"flex",alignItems:"center",gap:18}}>
                        <div style={{position:"relative",flexShrink:0}}>
                          <div style={{width:52,height:52,borderRadius:16,background:ur?"linear-gradient(135deg,#f59e0b,#f97316)":"linear-gradient(135deg,#6366f1,#a78bfa)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,boxShadow:ur?"0 4px 12px rgba(245,158,11,0.3)":"0 4px 12px rgba(99,102,241,0.2)"}}>{"👤"}</div>
                          {ur&&<div style={{position:"absolute",top:-4,right:-4,width:14,height:14,borderRadius:"50%",background:"#ef4444",border:"2.5px solid #fff"}}/>}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
                            <span style={{fontWeight:800,fontSize:16,color:"#0f172a"}}>{r.candidate_name||r.author_name||T.noname}</span>
                            {ur&&<span style={{fontSize:9,padding:"3px 10px",borderRadius:8,background:"linear-gradient(135deg,#fbbf24,#f97316)",color:"#fff",fontWeight:800,letterSpacing:0.5}}>{"NEW"}</span>}
                          </div>
                                                                              <div style={{fontSize:13,color:"#6366f1",marginBottom:6,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                            <span style={{fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:300}}>{"🏢 "+getVacTitle(r)}</span>
                            {getVacCode(r)&&<span style={{padding:"2px 8px",borderRadius:6,background:"#f0fdf4",border:"1px solid #bbf7d0",fontSize:10,fontWeight:800,color:"#15803d",letterSpacing:0.5}}>{getVacCode(r)}</span>}
                          </div>
                          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                            {addr&&<span style={{padding:"3px 10px",borderRadius:8,background:"#fef3c7",fontSize:11,fontWeight:600,color:"#92400e"}}>{"📍 "+addr}</span>}
                            {r.candidate_age&&<span style={{padding:"3px 10px",borderRadius:8,background:"#e0f2fe",fontSize:11,fontWeight:600,color:"#0c4a6e"}}>{r.candidate_age+" "+T.years}</span>}
                            {r.candidate_citizenship&&<span style={{padding:"3px 10px",borderRadius:8,background:"#fce7f3",fontSize:11,fontWeight:600,color:"#9d174d"}}>{r.candidate_citizenship}</span>}
                            {r.phone&&<span style={{padding:"3px 10px",borderRadius:8,background:"#dcfce7",fontSize:11,fontWeight:700,color:"#166534"}}>{"📞 "+r.phone}</span>}
                          </div>
                        </div>
                        <div style={{textAlign:"right",flexShrink:0}}>
                          <div style={{fontSize:12,color:"#cbd5e1",marginBottom:8}}>{fmtDate(r.created_at)}</div>
                          <span style={{padding:"6px 14px",borderRadius:12,fontSize:11,fontWeight:700,background:st.bg,color:st.color,display:"inline-block"}}>{(st===ST["new"]?"🔵":st===ST.processing?"🟡":st===ST.hired?"✅":"❌")+" "+st.label}</span>
                        </div>
                        <div style={{display:"flex",gap:4,flexShrink:0,marginLeft:8}}>
                          {Object.keys(ST).map(function(key){var s2=ST[key];var isA=(r.status||"new")===key;
                            return <button key={key} title={s2.label} onClick={function(e){e.stopPropagation();updStatus(r.id,key);}}
                              style={{width:36,height:36,borderRadius:10,border:isA?"2px solid "+s2.color:"1.5px solid #e2e8f0",background:isA?s2.bg:"#fff",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s"}}>{key==="new"?"🔵":key==="processing"?"🟡":key==="hired"?"✅":"❌"}</button>;
                          })}
                        </div>
                      </div>
                    </div>);
                })}
              </div>)}
          </div>)}
        {/* VACANCIES TAB */}
        {tab==="vacancies"&&(
          <div>
            <div style={{display:"flex",gap:10,marginBottom:16,padding:"14px 18px",background:"#fff",borderRadius:18,border:"1px solid #f1f5f9",alignItems:"center"}}>
              <div style={{flex:1,position:"relative"}}>
                <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:16}}>{"🔍"}</span>
                <input placeholder={T.search} value={vacSearch} onChange={function(e){setVacSearch(e.target.value);}} style={{width:"100%",padding:"12px 14px 12px 42px",borderRadius:14,border:"2px solid #f1f5f9",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
              </div>
              <span style={{fontSize:13,color:"#94a3b8",fontWeight:600,padding:"0 8px"}}>{T.total+": "+vacancies.length}</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {vacancies.filter(function(v){if(!vacSearch)return true;var qq=vacSearch.toLowerCase();return(v.title||"").toLowerCase().indexOf(qq)!==-1||(v.city||"").toLowerCase().indexOf(qq)!==-1||String(v.avito_id).indexOf(qq)!==-1;}).map(function(v){
                var rc=v.responses_count||0;
                return(
                  <div key={v.id} onClick={function(){setSelVac(v);setTab("responses");setSearch("");}}
                    style={{background:"#fff",borderRadius:20,padding:"20px 24px",cursor:"pointer",border:"1px solid #f1f5f9",transition:"all 0.2s",position:"relative",overflow:"hidden"}}
                    onMouseEnter={function(e){e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 30px rgba(0,0,0,0.06)";e.currentTarget.style.borderColor="#c7d2fe";}}
                    onMouseLeave={function(e){e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="none";e.currentTarget.style.borderColor="#f1f5f9";}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:700,fontSize:15,color:"#1e293b",marginBottom:6}}>{v.title}</div>
                        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                          {(v.address||v.city)&&<span style={{padding:"3px 10px",borderRadius:8,background:"#f8fafc",fontSize:11,fontWeight:600,color:"#64748b"}}>{"📍 "+(v.address||v.city)}</span>}
                          {v.salary_from&&<span style={{padding:"3px 10px",borderRadius:8,background:"#ecfdf5",fontSize:11,fontWeight:600,color:"#047857"}}>{fmt(v.salary_from)}</span>}
                          <span style={{padding:"3px 10px",borderRadius:8,background:"#f8fafc",fontSize:11,color:"#94a3b8"}}>{"ID: "+v.avito_id}</span>
                          {v.url&&<a href={v.url} target="_blank" rel="noreferrer" onClick={function(e){e.stopPropagation();}} style={{padding:"3px 10px",borderRadius:8,background:"#eef2ff",fontSize:11,fontWeight:700,color:"#6366f1",textDecoration:"none"}}>{"Avito ↗"}</a>}
                        </div>
                      </div>
                      <div style={{width:56,height:56,borderRadius:16,background:rc>0?"linear-gradient(135deg,#6366f1,#818cf8)":"#f8fafc",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:rc>0?"0 4px 12px rgba(99,102,241,0.3)":"none"}}>
                        <span style={{fontSize:20,fontWeight:800,color:rc>0?"#fff":"#cbd5e1"}}>{rc}</span>
                      </div>
                    </div>
                  </div>);
              })}
              {vacancies.length===0&&<div style={{gridColumn:"1/3",textAlign:"center",padding:60,background:"#fff",borderRadius:24}}><div style={{fontSize:48,marginBottom:12}}>{"🏢"}</div><div style={{color:"#94a3b8",fontSize:15}}>{T.novac}</div></div>}
            </div>
          </div>)}

        {/* SETTINGS TAB */}
        {tab==="settings"&&(
          <div style={{maxWidth:800}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <h2 style={{margin:0,fontSize:20,fontWeight:800,color:"#1e293b"}}>{"⚙️ Аккаунты Avito"}</h2>
              <button onClick={function(){setShowAdd(!showAdd);}} style={{background:showAdd?"#f1f5f9":"linear-gradient(135deg,#6366f1,#818cf8)",color:showAdd?"#64748b":"#fff",border:"none",borderRadius:14,padding:"12px 24px",fontWeight:700,fontSize:13,cursor:"pointer",boxShadow:showAdd?"none":"0 4px 16px rgba(99,102,241,0.3)",transition:"all 0.2s"}}>{showAdd?T.cancel:"➕ "+T.add}</button>
            </div>

            {showAdd&&(
              <form onSubmit={addAcc} style={{background:"#fff",borderRadius:24,padding:"28px",marginBottom:20,border:"1px solid #f1f5f9",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,marginBottom:20}}>
                  {[{l:T.name,k:"name",ph:"Мой аккаунт"},{l:"Client ID",k:"client_id",ph:"ID приложения"},{l:"Client Secret",k:"client_secret",ph:"Секрет",type:"password"}].map(function(f){
                    return <div key={f.k}><label style={{fontSize:11,color:"#94a3b8",fontWeight:700,textTransform:"uppercase",letterSpacing:0.8,display:"block",marginBottom:6}}>{f.l}</label><input value={accForm[f.k]} onChange={function(e){var u={};u[f.k]=e.target.value;setAccForm(Object.assign({},accForm,u));}} type={f.type||"text"} required placeholder={f.ph} style={{width:"100%",padding:"14px 16px",borderRadius:14,border:"2px solid #e2e8f0",fontSize:14,boxSizing:"border-box",outline:"none"}}/></div>;
                  })}
                </div>
                <button type="submit" style={{background:"linear-gradient(135deg,#10b981,#34d399)",color:"#fff",border:"none",borderRadius:14,padding:"14px 32px",fontWeight:700,cursor:"pointer",fontSize:14,boxShadow:"0 4px 16px rgba(16,185,129,0.3)"}}>{"✅ "+T.save}</button>
              </form>)}

            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {accounts.map(function(acc){
                return(
                  <div key={acc.id} style={{background:"#fff",borderRadius:20,padding:"20px 24px",border:"1px solid #f1f5f9",display:"flex",justifyContent:"space-between",alignItems:"center",transition:"all 0.2s"}}
                    onMouseEnter={function(e){e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.04)";}}
                    onMouseLeave={function(e){e.currentTarget.style.boxShadow="none";}}>
                    <div style={{display:"flex",alignItems:"center",gap:16}}>
                      <div style={{width:48,height:48,borderRadius:16,background:"linear-gradient(135deg,#6366f1,#818cf8)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,color:"#fff"}}>{"🔑"}</div>
                      <div>
                        <div style={{fontWeight:700,fontSize:16,color:"#1e293b"}}>{acc.name}</div>
                        <div style={{fontSize:12,color:"#94a3b8",marginTop:2}}>{"ID: "+(acc.client_id||"").slice(0,12)+"... | User: "+(acc.user_id||"-")}</div>
                      </div>
                    </div>
                    <button onClick={function(){delAcc(acc.id);}} style={{background:"#fef2f2",color:"#dc2626",border:"1px solid #fecaca",borderRadius:14,padding:"10px 20px",cursor:"pointer",fontWeight:700,fontSize:12,transition:"all 0.2s"}}>{"🗑️ "+T.del}</button>
                  </div>);
              })}
              {accounts.length===0&&<div style={{textAlign:"center",padding:60,background:"#fff",borderRadius:24}}><div style={{fontSize:48,marginBottom:12}}>{"🔑"}</div><div style={{color:"#94a3b8",fontSize:15}}>{T.noacc}</div></div>}
            </div>
          </div>)}

        {/* STATS FULL PAGE */}
        {tab==="stats"&&<StatsPanel responses={responses} vacancies={vacancies}/>}

        {/* MODAL */}
        {modalResp&&<CandidateModal resp={modalResp} vacancies={vacancies} onClose={function(){setModalResp(null);}} onUpdate={onModalUpdate} onStatusChange={updStatus}/>}
      </div>
    </DkrsAppShell>
  );
}
