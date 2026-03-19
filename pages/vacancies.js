import React, { useState, useEffect, useCallback, useRef } from "react";
import DkrsAppShell from "../components/DkrsAppShell";

var T_TITLE="CRM Отклики";var T_UNREAD="непрочитанных";var T_TOTAL="всего";var T_SYNC="Синхронизировать";var T_SYNCING="Синхронизация...";var T_INBOX="Входящие";var T_HIRED="Записаны";var T_REJECTED="Отказ";var T_ALL="Все";var T_VAC="Вакансии";var T_STATS="Статистика";var T_CHAT="Чат";var T_LOAD="Загрузка...";var T_NOMSG="Сообщений нет";var T_MSGPH="Сообщение...";var T_SEARCH="Поиск по имени, телефону, вакансии...";var T_ALLINC="Все входящие";var T_NEW="Новые";var T_INWORK="В работе";var T_BYDATE="По дате";var T_UNRFIRST="Непрочитанные";var T_FOUND="Найдено";var T_NORESP="Нет откликов";var T_VACANCY="Вакансия";var T_STATUS="Статус";var T_NOTES="Заметки";var T_NOTESPH="Заметка...";var T_NONAME="Без имени";var T_AGE="Возраст";var T_YEARS="лет";var T_ALLST="Все статусы";var T_ADD="Добавить";var T_CANCEL="Отмена";var T_SAVE="Сохранить";var T_NAME="Название";var T_DEL="Удалить";var T_DELCONF="Удалить?";var T_NOACC="Нет аккаунтов";var T_NOVAC="Нет вакансий";var T_PHONE="Телефон";var T_CITIZEN="Гражданство";var T_GENDER="Пол";var T_MALE="Мужской";var T_FEMALE="Женский";var T_NOTSET="Не указан";var T_INFO="Инфо";var T_COPIED="Скопировано!";var T_NONOTES="Заметок нет";

function fmt(n){if(!n)return"";return Number(n).toLocaleString("ru-RU")+" ₽";}
function fmtDate(d){if(!d)return"";var date=new Date(d);var diff=new Date()-date;var m=Math.floor(diff/60000);var h=Math.floor(diff/3600000);var dd=Math.floor(diff/86400000);if(m<1)return"сейчас";if(m<60)return m+"м";if(h<24)return h+"ч";if(dd<7)return dd+"д";return date.toLocaleDateString("ru-RU");}
function fmtTime(ts){if(!ts)return"";return new Date(ts*1000).toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"});}
function fmtDT(ts){if(!ts)return"";var d=new Date(ts*1000);var today=new Date();if(d.toDateString()===today.toDateString())return fmtTime(ts);return d.toLocaleDateString("ru-RU",{day:"2-digit",month:"2-digit"})+" "+fmtTime(ts);}

var ST={"new":{label:T_NEW,icon:"🔵",color:"#3b82f6",bg:"#eff6ff"},processing:{label:T_INWORK,icon:"🟡",color:"#f59e0b",bg:"#fffbeb"},hired:{label:T_HIRED,icon:"✅",color:"#22c55e",bg:"#f0fdf4"},rejected:{label:T_REJECTED,icon:"❌",color:"#ef4444",bg:"#fef2f2"}};
function stLabel(s){return ST[s]||ST["new"];}

function StatsPanel(props){
  var responses=props.responses;var vacancies=props.vacancies;
  var cNew=0,cProc=0,cHired=0,cRej=0;
  responses.forEach(function(r){if(r.status==="hired")cHired++;else if(r.status==="rejected")cRej++;else if(r.status==="processing")cProc++;else cNew++;});
  var now=new Date();var todayStart=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  var weekStart=new Date(todayStart);weekStart.setDate(weekStart.getDate()-7);
  var monthStart=new Date(todayStart);monthStart.setDate(monthStart.getDate()-30);
  var today=0,week=0,month=0;
  responses.forEach(function(r){var d=new Date(r.created_at);if(d>=todayStart)today++;if(d>=weekStart)week++;if(d>=monthStart)month++;});
  var vacMap={};
  responses.forEach(function(r){var t=r.vacancy_title||"-";if(!vacMap[t])vacMap[t]={title:t,total:0,hired:0,city:r.vacancy_city||""};vacMap[t].total++;if(r.status==="hired")vacMap[t].hired++;});
  var topVac=Object.values(vacMap).sort(function(a,b){return b.total-a.total;}).slice(0,10);
  var cityMap={};
  responses.forEach(function(r){var c=r.vacancy_city||"Не указан";if(!cityMap[c])cityMap[c]={city:c,total:0};cityMap[c].total++;});
  var topCities=Object.values(cityMap).sort(function(a,b){return b.total-a.total;}).slice(0,8);
  var ctzMap={};
  responses.forEach(function(r){var c=r.candidate_citizenship||"Не указано";if(!ctzMap[c])ctzMap[c]=0;ctzMap[c]++;});
  var topCtz=Object.entries(ctzMap).sort(function(a,b){return b[1]-a[1];}).slice(0,6);
  var convRate=responses.length>0?Math.round(cHired/responses.length*100):0;
  var days=[];
  for(var i=13;i>=0;i--){var day=new Date(todayStart);day.setDate(day.getDate()-i);var dayStr=day.toLocaleDateString("ru-RU",{day:"2-digit",month:"2-digit"});var count=0;responses.forEach(function(r){var rd=new Date(r.created_at);if(rd.getFullYear()===day.getFullYear()&&rd.getMonth()===day.getMonth()&&rd.getDate()===day.getDate())count++;});days.push({label:dayStr,count:count});}
  var maxDay=Math.max.apply(null,days.map(function(d){return d.count;}))||1;
  var cs={background:"#fff",borderRadius:16,padding:"20px 24px",border:"1px solid #f0f0f0",boxShadow:"0 2px 8px rgba(0,0,0,0.04)"};
  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12}}>
        {[{label:"Всего",value:responses.length,color:"#6366f1",icon:"📋"},{label:"Сегодня",value:today,color:"#3b82f6",icon:"📅"},{label:"Неделя",value:week,color:"#8b5cf6",icon:"📊"},{label:"Записаны",value:cHired,color:"#22c55e",icon:"✅"},{label:"Конверсия",value:convRate+"%",color:convRate>20?"#22c55e":convRate>10?"#f59e0b":"#ef4444",icon:"📈"}].map(function(k,i){
          return(<div key={i} style={Object.assign({},cs,{textAlign:"center",padding:"20px 12px"})}><div style={{fontSize:28,marginBottom:4}}>{k.icon}</div><div style={{fontSize:28,fontWeight:800,color:k.color}}>{k.value}</div><div style={{fontSize:12,color:"#888",marginTop:4,fontWeight:600}}>{k.label}</div></div>);
        })}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:16}}>
        <div style={cs}><h3 style={{margin:"0 0 16px",fontSize:15,color:"#374151"}}>📊 По статусам</h3>
          {[{label:T_NEW,count:cNew,color:"#3b82f6"},{label:T_INWORK,count:cProc,color:"#f59e0b"},{label:T_HIRED,count:cHired,color:"#22c55e"},{label:T_REJECTED,count:cRej,color:"#ef4444"}].map(function(s,i){var pct=responses.length>0?Math.round(s.count/responses.length*100):0;return(<div key={i} style={{marginBottom:12}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:13,fontWeight:600}}>{s.label}</span><span style={{fontSize:14,fontWeight:800,color:s.color}}>{s.count} ({pct}%)</span></div><div style={{height:8,background:"#f3f4f6",borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",width:pct+"%",background:s.color,borderRadius:4}}/></div></div>);})}
        </div>
        <div style={cs}><h3 style={{margin:"0 0 16px",fontSize:15,color:"#374151"}}>📈 Отклики за 14 дней</h3>
          <div style={{display:"flex",alignItems:"flex-end",gap:4,height:160}}>
            {days.map(function(d,i){var h=Math.max(d.count/maxDay*140,4);var isT=i===days.length-1;return(<div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}><span style={{fontSize:10,fontWeight:700,color:d.count>0?"#374151":"#ccc"}}>{d.count||""}</span><div style={{width:"100%",height:h,background:isT?"linear-gradient(180deg,#6366f1,#8b5cf6)":d.count>0?"#c7d2fe":"#f3f4f6",borderRadius:4}}/><span style={{fontSize:9,color:isT?"#6366f1":"#bbb",fontWeight:isT?700:400}}>{d.label}</span></div>);})}
          </div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"3fr 2fr",gap:16}}>
        <div style={cs}><h3 style={{margin:"0 0 16px",fontSize:15,color:"#374151"}}>🏢 Топ вакансий</h3>
          {topVac.map(function(v,i){var pct=responses.length>0?Math.round(v.total/responses.length*100):0;return(<div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}><span style={{fontSize:12,fontWeight:800,color:"#6366f1",width:20,textAlign:"right"}}>{i+1}</span><div style={{flex:1}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:12,fontWeight:600,maxWidth:250,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v.title}</span><span style={{fontSize:11,color:"#888"}}>{v.total}{v.hired>0?" ✅"+v.hired:""}</span></div><div style={{height:6,background:"#f3f4f6",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:pct+"%",background:"linear-gradient(90deg,#6366f1,#a78bfa)",borderRadius:3}}/></div></div></div>);})}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div style={cs}><h3 style={{margin:"0 0 12px",fontSize:15}}>📍 Города</h3><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{topCities.map(function(c,i){return(<div key={i} style={{padding:"8px 14px",borderRadius:10,background:i<3?"#6366f1":"#f5f3ff",color:i<3?"#fff":"#6366f1",fontSize:12,fontWeight:700}}>{c.city} {c.total}</div>);})}</div></div>
          <div style={cs}><h3 style={{margin:"0 0 12px",fontSize:15}}>🌍 Гражданство</h3><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{topCtz.map(function(c,i){return(<div key={i} style={{padding:"8px 14px",borderRadius:10,background:"#fef3c7",border:"1px solid #fde68a",fontSize:12,fontWeight:700,color:"#92400e"}}>{c[0]} {c[1]}</div>);})}</div></div>
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

  return(
    <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}} onClick={onClose}>
      <div style={{background:"#fff",borderRadius:24,width:"95%",maxWidth:820,maxHeight:"92vh",overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:"0 25px 60px rgba(0,0,0,0.3)"}} onClick={function(e){e.stopPropagation();}}>
        <div style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",padding:"24px 28px",color:"#fff",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <div style={{width:60,height:60,borderRadius:"50%",background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:26}}>{(form.candidate_name||"?")[0].toUpperCase()}</div>
            <div>
              <h2 style={{margin:0,fontSize:22,fontWeight:800}}>{form.candidate_name||T_NONAME}</h2>
              <div style={{display:"flex",gap:8,marginTop:6,flexWrap:"wrap"}}>
                {form.candidate_age&&<span style={{padding:"2px 10px",borderRadius:6,background:"rgba(255,255,255,0.2)",fontSize:12}}>{form.candidate_age} лет</span>}
                {form.candidate_citizenship&&<span style={{padding:"2px 10px",borderRadius:6,background:"rgba(255,255,255,0.2)",fontSize:12}}>{form.candidate_citizenship}</span>}
                {resp.vacancy_city&&<span style={{padding:"2px 10px",borderRadius:6,background:"rgba(255,255,255,0.2)",fontSize:12}}>📍 {resp.vacancy_city}</span>}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"#fff",width:44,height:44,borderRadius:"50%",cursor:"pointer",fontSize:20}}>✕</button>
        </div>

        <div style={{display:"flex",borderBottom:"2px solid #f0f0f0"}}>
          {[{key:"info",label:"📋 "+T_INFO},{key:"chat",label:"💬 "+T_CHAT},{key:"notes",label:"📝 "+T_NOTES+" ("+notes.length+")"}].map(function(t){
            return <button key={t.key} onClick={function(){setModalTab(t.key);if(t.key==="chat"&&chatMsgs.length===0)loadChat();}} style={{flex:1,padding:"14px",border:"none",background:modalTab===t.key?"#6366f1":"#fff",color:modalTab===t.key?"#fff":"#666",cursor:"pointer",fontWeight:700,fontSize:13}}>{t.label}</button>;
          })}
        </div>

        <div style={{flex:1,overflow:"auto",padding:modalTab==="chat"?0:"24px 28px"}}>
          {modalTab==="info"&&(<div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <div><label style={{fontSize:11,color:"#888",fontWeight:700,textTransform:"uppercase"}}>ИМЯ</label>
                <input value={form.candidate_name} onChange={function(e){setForm(Object.assign({},form,{candidate_name:e.target.value}));}} onBlur={function(){saveField("candidate_name",form.candidate_name);}} style={{width:"100%",padding:"12px 14px",border:"2px solid #e5e7eb",borderRadius:12,fontSize:15,marginTop:6,boxSizing:"border-box"}}/></div>
              <div><label style={{fontSize:11,color:"#888",fontWeight:700,textTransform:"uppercase"}}>{T_AGE}</label>
                <input value={form.candidate_age} onChange={function(e){setForm(Object.assign({},form,{candidate_age:e.target.value}));}} onBlur={function(){saveField("candidate_age",form.candidate_age);}} style={{width:"100%",padding:"12px 14px",border:"2px solid #e5e7eb",borderRadius:12,fontSize:15,marginTop:6,boxSizing:"border-box"}}/></div>
              <div><label style={{fontSize:11,color:"#888",fontWeight:700,textTransform:"uppercase"}}>{T_GENDER}</label>
                <select value={form.candidate_gender} onChange={function(e){setForm(Object.assign({},form,{candidate_gender:e.target.value}));saveField("candidate_gender",e.target.value);}} style={{width:"100%",padding:"12px 14px",border:"2px solid #e5e7eb",borderRadius:12,fontSize:15,marginTop:6,boxSizing:"border-box",background:"#fff"}}>
                  <option value="">{T_NOTSET}</option><option value="male">{T_MALE}</option><option value="female">{T_FEMALE}</option></select></div>
              <div><label style={{fontSize:11,color:"#888",fontWeight:700,textTransform:"uppercase"}}>{T_CITIZEN}</label>
                <input value={form.candidate_citizenship} onChange={function(e){setForm(Object.assign({},form,{candidate_citizenship:e.target.value}));}} onBlur={function(){saveField("candidate_citizenship",form.candidate_citizenship);}} style={{width:"100%",padding:"12px 14px",border:"2px solid #e5e7eb",borderRadius:12,fontSize:15,marginTop:6,boxSizing:"border-box"}}/></div>
            </div>
            <div style={{marginTop:16}}><label style={{fontSize:11,color:"#888",fontWeight:700,textTransform:"uppercase"}}>{T_PHONE}</label>
              <div style={{display:"flex",gap:8,marginTop:6}}>
                <input value={form.phone} onChange={function(e){setForm(Object.assign({},form,{phone:e.target.value}));}} onBlur={function(){saveField("phone",form.phone);}} style={{flex:1,padding:"12px 14px",border:"2px solid #e5e7eb",borderRadius:12,fontSize:15,boxSizing:"border-box"}} placeholder="+7..."/>
                <button onClick={copyPhone} style={{padding:"12px 18px",background:copied?"#22c55e":"#6366f1",color:"#fff",border:"none",borderRadius:12,cursor:"pointer",fontWeight:700}}>{copied?"✓":"📋"}</button>
                {form.phone&&<a href={"tel:"+form.phone} style={{padding:"12px 18px",background:"#22c55e",color:"#fff",borderRadius:12,textDecoration:"none",display:"flex",alignItems:"center"}}>📞</a>}
                {form.phone&&<a href={"https://wa.me/"+form.phone.replace(/[^0-9]/g,"")} target="_blank" rel="noreferrer" style={{padding:"12px 18px",background:"#25d366",color:"#fff",borderRadius:12,textDecoration:"none",display:"flex",alignItems:"center",fontWeight:700}}>WA</a>}
              </div>
            </div>
            <div style={{marginTop:20,padding:18,background:"linear-gradient(135deg,#f5f3ff,#ede9fe)",borderRadius:16,border:"1px solid #e0d7fe"}}>
              <div style={{fontSize:11,color:"#888",fontWeight:700,marginBottom:6}}>ВАКАНСИЯ</div>
              <div style={{fontWeight:700,fontSize:16}}>{resp.vacancy_title||"-"}</div>
              {addr&&<div style={{fontSize:13,color:"#666",marginTop:4}}>📍 {addr}</div>}
            </div>
            <div style={{marginTop:20}}><div style={{fontSize:11,color:"#888",fontWeight:700,marginBottom:10}}>СТАТУС</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8}}>
                {Object.keys(ST).map(function(key){var s=ST[key];var act=(resp.status||"new")===key;return <button key={key} onClick={function(){onStatusChange(resp.id,key);}} style={{padding:"14px",borderRadius:14,border:act?"2px solid "+s.color:"2px solid #e5e7eb",background:act?s.bg:"#fff",cursor:"pointer",fontWeight:act?700:500,fontSize:13,color:act?s.color:"#374151"}}>{s.icon} {s.label}</button>;})}
              </div>
            </div>
            {saving&&<div style={{marginTop:8,color:"#6366f1",fontSize:12}}>Сохранение...</div>}
          </div>)}

          {modalTab==="chat"&&(<div style={{display:"flex",flexDirection:"column",height:500}}>
            <div style={{flex:1,overflowY:"auto",padding:16,display:"flex",flexDirection:"column",gap:8,background:"#f8fafc"}}>
              {chatLoad?<div style={{textAlign:"center",color:"#888",paddingTop:60}}>{T_LOAD}</div>
              :chatMsgs.length===0?<div style={{textAlign:"center",color:"#888",paddingTop:60}}>{T_NOMSG}</div>
              :chatMsgs.map(function(m){var out=m.direction==="out";return <div key={m.id} style={{display:"flex",justifyContent:out?"flex-end":"flex-start"}}><div style={{maxWidth:"75%",padding:"10px 14px",borderRadius:14,background:out?"linear-gradient(135deg,#6366f1,#8b5cf6)":"#fff",color:out?"#fff":"#111",boxShadow:"0 1px 3px rgba(0,0,0,0.08)"}}><div style={{fontSize:13,whiteSpace:"pre-line",lineHeight:1.5}}>{m.content}</div><div style={{fontSize:10,marginTop:3,opacity:0.6,textAlign:"right"}}>{fmtDT(m.created)}</div></div></div>;})}<div ref={chatEndRef}/>
            </div>
            <div style={{padding:"12px 16px",borderTop:"1px solid #f0f0f0",display:"flex",gap:8,background:"#fff"}}>
              <input value={chatText} onChange={function(e){setChatText(e.target.value);}} onKeyDown={function(e){if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMsg();}}} placeholder={T_MSGPH} style={{flex:1,padding:"12px 14px",borderRadius:12,border:"1px solid #e5e7eb",fontSize:14}}/>
              <button onClick={sendMsg} disabled={sending||!chatText.trim()} style={{padding:"12px 20px",borderRadius:12,border:"none",background:chatText.trim()?"#6366f1":"#e5e7eb",color:chatText.trim()?"#fff":"#999",fontWeight:700,cursor:chatText.trim()?"pointer":"default"}}>{sending?"...":"➤"}</button>
            </div>
          </div>)}

          {modalTab==="notes"&&(<div>
            <div style={{display:"flex",gap:8,marginBottom:16}}>
              <input value={noteText} onChange={function(e){setNoteText(e.target.value);}} onKeyDown={function(e){if(e.key==="Enter")addNote();}} placeholder={T_NOTESPH} style={{flex:1,padding:"12px 14px",border:"2px solid #e5e7eb",borderRadius:12,fontSize:14}}/>
              <button onClick={addNote} style={{padding:"12px 20px",background:"#6366f1",color:"#fff",border:"none",borderRadius:12,cursor:"pointer",fontWeight:700}}>{T_ADD}</button>
            </div>
            {notes.length===0&&<div style={{textAlign:"center",color:"#888",padding:32}}>{T_NONOTES}</div>}
            {notes.map(function(note){return <div key={note.id} style={{padding:14,background:"#fffbeb",borderRadius:12,marginBottom:8,display:"flex",justifyContent:"space-between",border:"1px solid #fde68a"}}><div><div style={{fontSize:14}}>{note.text}</div><div style={{fontSize:11,color:"#999",marginTop:4}}>{new Date(note.created_at).toLocaleString("ru")}</div></div><button onClick={function(){deleteNote(note.id);}} style={{background:"none",border:"none",cursor:"pointer",color:"#999",fontSize:16}}>✕</button></div>;})}
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
  var _tab=useState("inbox"),tab=_tab[0],setTab=_tab[1];
  var _ld=useState(true),loading=_ld[0],setLoading=_ld[1];
  var _sy=useState(false),syncing=_sy[0],setSyncing=_sy[1];
  var _msg=useState(null),xmsg=_msg[0],setXmsg=_msg[1];
  var _se=useState(""),search=_se[0],setSearch=_se[1];
  var _sf=useState("all"),statusFilter=_sf[0],setStatusFilter=_sf[1];
  var _sr=useState(null),selResp=_sr[0],setSelResp=_sr[1];
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
  function delAcc(id){if(!confirm(T_DELCONF))return;fetch("/api/avito/accounts?id="+id,{method:"DELETE"}).then(function(){fetchData();});}

  function getAddr(r){if(r.vacancy_address&&r.vacancy_address.length>3)return r.vacancy_address;var v=vacancies.find(function(vv){return vv.id===r.vacancy_id;});if(v){if(v.raw_data&&v.raw_data.address)return v.raw_data.address;if(v.address)return v.address;if(v.city)return v.city;}return r.vacancy_city||"";}
  function getVacTitle(r){if(r.vacancy_title&&r.vacancy_title.length>1)return r.vacancy_title;var v=vacancies.find(function(vv){return vv.id===r.vacancy_id;});return v?v.title:"-";}
  function getVacCode(r){var code=r.vacancy_code;if(!code)return"";if(typeof code==="object")return String(code.id||code.value||JSON.stringify(code));return String(code);}

  var unread=responses.filter(function(r){return!r.is_read;}).length;
  var cNew=responses.filter(function(r){return r.status==="new"||!r.status;}).length;
  var cProc=responses.filter(function(r){return r.status==="processing";}).length;
  var cHired=responses.filter(function(r){return r.status==="hired";}).length;
  var cRej=responses.filter(function(r){return r.status==="rejected";}).length;

  var filtered=responses.filter(function(r){
    if(tab==="inbox"){if(statusFilter==="all")return r.status==="new"||!r.status||r.status==="processing";return r.status===statusFilter;}
    if(tab==="hired")return r.status==="hired";if(tab==="rejected")return r.status==="rejected";
    if(tab==="all"){if(statusFilter!=="all")return r.status===statusFilter;return true;}return true;
  });
  if(selVac)filtered=filtered.filter(function(r){return r.vacancy_id===selVac.id;});
  if(search){var q=search.toLowerCase();filtered=filtered.filter(function(r){return(r.author_name||"").toLowerCase().indexOf(q)!==-1||(r.candidate_name||"").toLowerCase().indexOf(q)!==-1||(r.phone||"").indexOf(q)!==-1||(r.vacancy_title||"").toLowerCase().indexOf(q)!==-1||(r.vacancy_city||"").toLowerCase().indexOf(q)!==-1;});}
  filtered.sort(function(a,b){if(sortBy==="unread"){if(!a.is_read&&b.is_read)return-1;if(a.is_read&&!b.is_read)return 1;}return new Date(b.created_at||0)-new Date(a.created_at||0);});

  var B1={background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",border:"none",borderRadius:12,padding:"10px 24px",fontWeight:600,fontSize:14,cursor:"pointer"};

  return(
    <DkrsAppShell>
      <div style={{maxWidth:1500,margin:"0 auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div>
            <h1 style={{margin:0,fontSize:26}}>{T_TITLE}</h1>
            <p style={{margin:"2px 0 0",color:"#888",fontSize:13}}>{unread} {T_UNREAD} | {responses.length} {T_TOTAL}</p>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={function(){doSync("fast");}} disabled={syncing} style={Object.assign({},B1,{opacity:syncing?0.7:1})}>{syncing?T_SYNCING:"⚡ "+T_SYNC}</button>
            <button onClick={function(){doSync("full");}} disabled={syncing} style={{background:"#fff",color:"#6366f1",border:"2px solid #6366f1",borderRadius:12,padding:"10px 16px",fontWeight:600,fontSize:13,cursor:syncing?"default":"pointer",opacity:syncing?0.5:1}}>{"🔄 Полная"}</button>
          </div>
        </div>

        {xmsg&&<div style={{padding:"10px 14px",borderRadius:10,marginBottom:12,fontSize:13,fontWeight:500,background:xmsg.type==="success"?"#f0fdf4":"#fef2f2",color:xmsg.type==="success"?"#16a34a":"#dc2626"}}>{xmsg.text}</div>}

        <div style={{display:"flex",gap:0,marginBottom:16,borderRadius:12,overflow:"hidden",border:"1px solid #e5e7eb"}}>
          {[{key:"inbox",label:T_INBOX,count:cNew+cProc},{key:"hired",label:T_HIRED,count:cHired},{key:"rejected",label:T_REJECTED,count:cRej},{key:"all",label:T_ALL,count:responses.length},{key:"stats",label:T_STATS,count:0},{key:"vacancies",label:T_VAC,count:vacancies.length},{key:"accounts",label:"Settings",count:accounts.length}].map(function(t){
            var ac=tab===t.key;
            return(<button key={t.key} onClick={function(){setTab(t.key);setSelResp(null);setSelVac(null);setSearch("");setVacSearch("");setStatusFilter("all");}}
              style={{flex:1,padding:"12px 0",border:"none",cursor:"pointer",fontWeight:600,fontSize:13,background:ac?"#6366f1":"#fff",color:ac?"#fff":"#374151"}}>
              {t.label}{t.count>0&&<span style={{marginLeft:4,padding:"1px 7px",borderRadius:10,fontSize:11,background:ac?"rgba(255,255,255,0.25)":"#f3f4f6"}}>{t.count}</span>}
            </button>);
          })}
        </div>
        {/* STATS TAB */}
        {tab==="stats"&&<StatsPanel responses={responses} vacancies={vacancies}/>}

        {/* RESPONSES LIST */}
        {tab!=="vacancies"&&tab!=="accounts"&&tab!=="stats"&&(
          <div>
            <div style={{display:"flex",gap:10,marginBottom:14,background:"#fff",padding:"12px 14px",borderRadius:12,boxShadow:"0 1px 4px rgba(0,0,0,0.06)",flexWrap:"wrap",alignItems:"center"}}>
              <input placeholder={T_SEARCH} value={search} onChange={function(e){setSearch(e.target.value);}} style={{flex:1,minWidth:200,padding:"10px 14px",borderRadius:10,border:"1px solid #e5e7eb",fontSize:13}}/>
              {(tab==="inbox"||tab==="all")&&(
                <select value={statusFilter} onChange={function(e){setStatusFilter(e.target.value);}} style={{padding:"10px 12px",borderRadius:10,border:"1px solid #e5e7eb",fontSize:13}}>
                  <option value="all">{tab==="inbox"?T_ALLINC:T_ALLST}</option>
                  <option value="new">{T_NEW} ({cNew})</option>
                  <option value="processing">{T_INWORK} ({cProc})</option>
                  {tab==="all"&&<option value="hired">{T_HIRED} ({cHired})</option>}
                  {tab==="all"&&<option value="rejected">{T_REJECTED} ({cRej})</option>}
                </select>)}
              <select value={sortBy} onChange={function(e){setSortBy(e.target.value);}} style={{padding:"10px 12px",borderRadius:10,border:"1px solid #e5e7eb",fontSize:13}}>
                <option value="date">{T_BYDATE}</option><option value="unread">{T_UNRFIRST}</option></select>
              {selVac&&(<button onClick={function(){setSelVac(null);}} style={{padding:"10px 14px",borderRadius:10,background:"#f5f3ff",color:"#6366f1",border:"1px solid #c7d2fe",fontSize:12,cursor:"pointer",fontWeight:600}}>✕ {selVac.title.slice(0,30)}</button>)}
              <div style={{fontSize:13,color:"#888",padding:"10px 0"}}>{T_FOUND}: {filtered.length}</div>
            </div>

            {loading?<div style={{textAlign:"center",padding:40,color:"#888"}}>{T_LOAD}</div>
            :filtered.length===0?<div style={{textAlign:"center",padding:40,color:"#888",background:"#fff",borderRadius:16}}>{T_NORESP}</div>
            :(
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {filtered.slice(0,100).map(function(r){
                  var st=stLabel(r.status||"new");var ur=!r.is_read;var addr=getAddr(r);
                  return(
                    <div key={r.id} style={{background:"#fff",borderRadius:18,cursor:"pointer",boxShadow:ur?"0 2px 16px rgba(251,191,36,0.18)":"0 2px 12px rgba(99,102,241,0.07)",border:ur?"2.5px solid #fbbf24":"1.5px solid #eee",overflow:"hidden",position:"relative",transition:"all 0.2s"}}
                      onMouseEnter={function(e){e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 32px rgba(99,102,241,0.16)";}}
                      onMouseLeave={function(e){e.currentTarget.style.transform="";e.currentTarget.style.boxShadow=ur?"0 2px 16px rgba(251,191,36,0.18)":"0 2px 12px rgba(99,102,241,0.07)";}}>
                      <div style={{height:4,background:ur?"linear-gradient(90deg,#fbbf24,#f97316)":"linear-gradient(90deg,"+st.color+","+st.color+"44)"}}/>
                      <div style={{padding:"16px 20px"}} onClick={function(){openModal(r);}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                          <div style={{display:"flex",alignItems:"center",gap:14}}>
                            <div style={{position:"relative",flexShrink:0}}>
                              <div style={{width:48,height:48,borderRadius:"50%",background:ur?"linear-gradient(135deg,#f59e0b,#f97316)":"linear-gradient(135deg,#6366f1,#a78bfa)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,color:"#fff",fontSize:18}}>{(r.candidate_name||r.author_name||"?")[0].toUpperCase()}</div>
                              {ur&&<div style={{position:"absolute",top:-2,right:-2,width:14,height:14,borderRadius:"50%",background:"#ef4444",border:"2px solid #fff"}}/>}
                            </div>
                            <div>
                              <div style={{display:"flex",alignItems:"center",gap:8}}>
                                <span style={{fontWeight:800,fontSize:16,color:"#111"}}>{r.candidate_name||r.author_name||T_NONAME}</span>
                                {ur&&<span style={{fontSize:10,padding:"2px 8px",borderRadius:6,background:"linear-gradient(135deg,#fbbf24,#f97316)",color:"#fff",fontWeight:700}}>NEW</span>}
                              </div>
                              <div style={{fontSize:12,color:"#888",marginTop:2}}>{getVacTitle(r)}</div>
                            </div>
                          </div>
                          <div style={{textAlign:"right",flexShrink:0}}>
                            <div style={{fontSize:12,color:"#aaa",marginBottom:4}}>{fmtDate(r.created_at)}</div>
                            <span style={{padding:"4px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:st.bg,color:st.color}}>{st.icon} {st.label}</span>
                          </div>
                        </div>
                        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
                          {addr&&<span style={{padding:"4px 10px",borderRadius:8,background:"#fef3c7",fontSize:11,fontWeight:600,color:"#92400e"}}>📍 {addr}</span>}
                          {r.candidate_age&&<span style={{padding:"4px 10px",borderRadius:8,background:"#e0f2fe",fontSize:11,fontWeight:600,color:"#0c4a6e"}}>{r.candidate_age} {T_YEARS}</span>}
                          {r.candidate_citizenship&&<span style={{padding:"4px 10px",borderRadius:8,background:"#fce7f3",fontSize:11,fontWeight:600,color:"#9d174d"}}>{r.candidate_citizenship}</span>}
                          {r.phone&&<span style={{padding:"4px 10px",borderRadius:8,background:"#dcfce7",fontSize:11,fontWeight:700,color:"#166534"}}>{r.phone}</span>}
                        </div>
                        {r.message&&<div style={{fontSize:13,color:"#777",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",padding:"6px 10px",background:"#f8fafc",borderRadius:8}}>{r.message.slice(0,150)}</div>}
                      </div>
                      <div style={{display:"flex",justifyContent:"flex-end",alignItems:"center",gap:6,padding:"8px 20px 12px",borderTop:"1px solid #f5f5f5"}}>
                        <span style={{fontSize:11,color:"#bbb",marginRight:"auto"}}>{T_STATUS}:</span>
                        {Object.keys(ST).map(function(key){var s2=ST[key];var isA=(r.status||"new")===key;
                          return(<button key={key} title={s2.label} onClick={function(e){e.stopPropagation();updStatus(r.id,key);}}
                            style={{width:isA?"auto":32,height:32,borderRadius:10,border:isA?"2px solid "+s2.color:"1.5px solid #e5e7eb",background:isA?s2.bg:"#fff",cursor:"pointer",fontSize:isA?11:14,fontWeight:isA?700:400,color:isA?s2.color:"#666",display:"flex",alignItems:"center",justifyContent:"center",gap:4,padding:isA?"0 10px":0}}>{s2.icon}{isA&&" "+s2.label}</button>);
                        })}
                      </div>
                    </div>);
                })}
              </div>)}
          </div>)}

        {/* VACANCIES TAB */}
        {tab==="vacancies"&&(
          <div>
            <div style={{display:"flex",gap:10,marginBottom:14,background:"#fff",padding:"12px 14px",borderRadius:12,alignItems:"center"}}>
              <input placeholder={T_SEARCH} value={vacSearch} onChange={function(e){setVacSearch(e.target.value);}} style={{flex:1,padding:"10px 14px",borderRadius:10,border:"1px solid #e5e7eb",fontSize:13}}/>
              <span style={{fontSize:13,color:"#888"}}>{T_TOTAL}: {vacancies.length}</span>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {vacancies.filter(function(v){if(!vacSearch)return true;var qq=vacSearch.toLowerCase();return(v.title||"").toLowerCase().indexOf(qq)!==-1||(v.city||"").toLowerCase().indexOf(qq)!==-1||String(v.avito_id).indexOf(qq)!==-1;}).map(function(v){
                var rc=v.responses_count||0;
                return(<div key={v.id} onClick={function(){setSelVac(v);setTab("inbox");setSearch("");}}
                  style={{background:"#fff",borderRadius:14,padding:"16px 20px",cursor:"pointer",border:"1px solid #f0f0f0",transition:"all 0.2s"}}
                  onMouseEnter={function(e){e.currentTarget.style.borderColor="#6366f1";}}
                  onMouseLeave={function(e){e.currentTarget.style.borderColor="#f0f0f0";}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:15}}>{v.title}</div>
                      <div style={{display:"flex",gap:12,marginTop:4,fontSize:12,color:"#888",flexWrap:"wrap"}}>
                        <span>{v.address||v.city||"-"}</span>
                        <span>{v.salary_from?fmt(v.salary_from):""}</span>
                        <span>ID: {v.avito_id}</span>
                        {v.url&&<a href={v.url} target="_blank" rel="noreferrer" onClick={function(e){e.stopPropagation();}} style={{color:"#6366f1",textDecoration:"none",fontWeight:600}}>Avito</a>}
                      </div>
                    </div>
                    <span style={{padding:"6px 14px",borderRadius:10,fontWeight:700,fontSize:14,background:rc>0?"#f5f3ff":"#f3f4f6",color:rc>0?"#7c3aed":"#9ca3af"}}>{rc}</span>
                  </div>
                </div>);
              })}
              {vacancies.length===0&&<div style={{textAlign:"center",padding:40,color:"#888",background:"#fff",borderRadius:16}}>{T_NOVAC}</div>}
            </div>
          </div>)}

        {/* ACCOUNTS TAB */}
        {tab==="accounts"&&(
          <div>
            <button onClick={function(){setShowAdd(!showAdd);}} style={Object.assign({},B1,{marginBottom:14,fontSize:13})}>{showAdd?T_CANCEL:T_ADD}</button>
            {showAdd&&(
              <form onSubmit={addAcc} style={{background:"#fff",borderRadius:16,padding:20,marginBottom:16}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:12}}>
                  <div><label style={{fontSize:12,fontWeight:600,display:"block",marginBottom:3}}>{T_NAME}</label><input value={accForm.name} onChange={function(e){setAccForm(Object.assign({},accForm,{name:e.target.value}));}} required style={{width:"100%",padding:"10px 12px",borderRadius:10,border:"1px solid #e5e7eb",fontSize:13,boxSizing:"border-box"}}/></div>
                  <div><label style={{fontSize:12,fontWeight:600,display:"block",marginBottom:3}}>Client ID</label><input value={accForm.client_id} onChange={function(e){setAccForm(Object.assign({},accForm,{client_id:e.target.value}));}} required style={{width:"100%",padding:"10px 12px",borderRadius:10,border:"1px solid #e5e7eb",fontSize:13,boxSizing:"border-box"}}/></div>
                  <div><label style={{fontSize:12,fontWeight:600,display:"block",marginBottom:3}}>Client Secret</label><input value={accForm.client_secret} onChange={function(e){setAccForm(Object.assign({},accForm,{client_secret:e.target.value}));}} type="password" required style={{width:"100%",padding:"10px 12px",borderRadius:10,border:"1px solid #e5e7eb",fontSize:13,boxSizing:"border-box"}}/></div>
                </div>
                <button type="submit" style={{background:"#22c55e",color:"#fff",border:"none",borderRadius:10,padding:"10px 20px",fontWeight:600,cursor:"pointer"}}>{T_SAVE}</button>
              </form>)}
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {accounts.map(function(acc){
                return(<div key={acc.id} style={{background:"#fff",borderRadius:14,padding:"16px 20px",border:"1px solid #f0f0f0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div><div style={{fontWeight:700,fontSize:15}}>{acc.name}</div><div style={{fontSize:12,color:"#888"}}>ID: {(acc.client_id||"").slice(0,8)}... | User: {acc.user_id||"-"}</div></div>
                  <button onClick={function(){delAcc(acc.id);}} style={{background:"#fef2f2",color:"#dc2626",border:"1px solid #fecaca",borderRadius:10,padding:"8px 14px",cursor:"pointer",fontWeight:600,fontSize:12}}>{T_DEL}</button>
                </div>);
              })}
              {accounts.length===0&&<div style={{textAlign:"center",padding:40,color:"#888",background:"#fff",borderRadius:16}}>{T_NOACC}</div>}
            </div>
          </div>)}

        {modalResp&&<CandidateModal resp={modalResp} vacancies={vacancies} onClose={function(){setModalResp(null);}} onUpdate={onModalUpdate} onStatusChange={updStatus}/>}
      </div>
    </DkrsAppShell>
  );
}
