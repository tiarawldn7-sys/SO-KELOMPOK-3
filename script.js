const initialData = {
  resources: ["A","B","C"],
  total: [10,5,7],
  processes: [
    {name:"P1", allocation:[0,1,0], max:[7,5,3], request:[0,0,0]},
    {name:"P2", allocation:[2,0,0], max:[3,2,2], request:[0,0,0]},
    {name:"P3", allocation:[3,0,2], max:[9,0,2], request:[0,0,0]},
    {name:"P4", allocation:[2,1,1], max:[2,2,2], request:[0,0,0]},
    {name:"P5", allocation:[0,0,2], max:[4,3,3], request:[0,0,0]}
  ]
};
let data = structuredClone(initialData);
let results = {prevention:null, avoidance:null, detection:null};
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const sum = arr => arr.reduce((a,b)=>a+b,0);
const available = () => data.total.map((v,j)=>v-data.processes.reduce((s,p)=>s+p.allocation[j],0));
function notify(msg){$('#inputFeedback').textContent=msg}
function renderStats(){
  $('#statProcesses').textContent=data.processes.length;
  $('#statResources').textContent=data.resources.length;
  $('#statAvailable').textContent=available().reduce((a,b)=>a+b,0);
  const safe=results.avoidance?.safe;
  $('#statStatus').textContent=safe===false?'Perlu cek':'Aman';
  $('#statStatusNote').textContent=safe===false?'Tidak ditemukan safe sequence':'Berdasarkan pemeriksaan awal';
}
function renderInput(){
  $('#totalInputs').innerHTML=data.resources.map((r,j)=>`<div class="resource-field"><label>Resource ${r}</label><input type="number" min="0" data-total="${j}" value="${data.total[j]}"></div>`).join('');
  const n=data.resources.length;
  let head=`<thead><tr><th rowspan="2">Process</th><th class="group-head" colspan="${n}">Allocation</th><th class="group-head" colspan="${n}">Maximum</th><th class="group-head" colspan="${n}">Request</th></tr><tr>${[0,1,2].map(()=>data.resources.map(r=>`<th>${r}</th>`).join('')).join('')}</tr></thead>`;
  let body='<tbody>'+data.processes.map((p,i)=>`<tr><td>${p.name}</td>${['allocation','max','request'].map(k=>p[k].map((v,j)=>`<td><input class="cell-input" type="number" min="0" data-row="${i}" data-kind="${k}" data-col="${j}" value="${v}"></td>`).join('')).join('')}</tr>`).join('')+'</tbody>';
  $('#processTable').innerHTML=head+body;
  $('#orderInputs').innerHTML=data.resources.map((r,i)=>`<span class="order-chip">${i+1}. ${r}</span>`).join('');
  renderNeedTable();renderDetectionTable();renderStats();
}
function renderNeedTable(){
  const n=data.resources.length, av=available();
  const head=`<thead><tr><th>Process</th>${data.resources.map(r=>`<th>Need ${r}</th>`).join('')}</tr></thead>`;
  const rows=data.processes.map(p=>`<tr><td>${p.name}</td>${p.max.map((v,j)=>`<td>${v-p.allocation[j]}</td>`).join('')}</tr>`).join('');
  $('#needTable').innerHTML=head+'<tbody>'+rows+'</tbody>';
  $('#bankerSummary').innerHTML=`<div class="summary-pill">Total resource<b>${data.total.join(' · ')}</b></div><div class="summary-pill">Available<b>${av.join(' · ')}</b></div><div class="summary-pill">Jumlah proses<b>${data.processes.length}</b></div>`;
}
function renderDetectionTable(){
  const n=data.resources.length;
  $('#detectionTable').innerHTML=`<thead><tr><th>Process</th><th colspan="${n}" class="group-head">Allocation</th><th colspan="${n}" class="group-head">Request</th></tr><tr>${'<th></th>'}${data.resources.map(r=>`<th>${r}</th>`).join('')}${data.resources.map(r=>`<th>${r}</th>`).join('')}</tr></thead><tbody>${data.processes.map(p=>`<tr><td>${p.name}</td>${p.allocation.map(v=>`<td>${v}</td>`).join('')}${p.request.map(v=>`<td>${v}</td>`).join('')}</tr>`).join('')}</tbody>`;
}
function validData(){
  const av=available();
  if(data.total.some(v=>v<0)||data.processes.some(p=>[...p.allocation,...p.max,...p.request].some(v=>v<0)))return 'Nilai tidak boleh negatif.';
  if(av.some(v=>v<0))return 'Total resource tidak boleh lebih kecil daripada jumlah allocation.';
  if(data.processes.some(p=>p.max.some((v,j)=>v<p.allocation[j])))return 'Nilai Maximum harus lebih besar atau sama dengan Allocation.';
  return null;
}
function safetyCheck(){
  const err=validData();if(err)return {error:err,safe:false,sequence:[]};
  const work=available(), finish=data.processes.map(()=>false), sequence=[];
  let progress=true;
  while(progress){progress=false;data.processes.forEach((p,i)=>{const need=p.max.map((v,j)=>v-p.allocation[j]);if(!finish[i]&&need.every((v,j)=>v<=work[j])){work.forEach((_,j)=>work[j]+=p.allocation[j]);finish[i]=true;sequence.push(p.name);progress=true;}});}
  return {safe:finish.every(Boolean),sequence,unfinished:data.processes.filter((p,i)=>!finish[i]).map(p=>p.name)};
}
function detectionCheck(){
  const err=validData();if(err)return {error:err,deadlocked:[],completed:[]};
  const work=available(), finish=data.processes.map(p=>p.allocation.every(v=>v===0)), completed=[];
  let progress=true;
  while(progress){progress=false;data.processes.forEach((p,i)=>{if(!finish[i]&&p.request.every((v,j)=>v<=work[j])){work.forEach((_,j)=>work[j]+=p.allocation[j]);finish[i]=true;completed.push(p.name);progress=true;}});}
  return {deadlocked:data.processes.filter((p,i)=>!finish[i]).map(p=>p.name),completed};
}
function runPrevention(){
  const err=validData();if(err){showResult('#preventionResult',err,'warning');return;}
  // Resource-ordering policy: reject requests for a lower-ranked resource while holding a higher-ranked one.
  const violations=[];
  data.processes.forEach(p=>{
    const held=data.resources.map((r,j)=>p.allocation[j]>0?j:-1).filter(j=>j>=0);
    const requested=data.resources.map((r,j)=>p.request[j]>0?j:-1).filter(j=>j>=0);
    requested.forEach(req=>{if(held.some(h=>h>req))violations.push(`${p.name} memegang ${data.resources[held.find(h=>h>req)]} lalu meminta ${data.resources[req]}`);});
  });
  results.prevention={violations};
  showResult('#preventionResult',violations.length?`<b>Aturan urutan dilanggar.</b><br>${violations.join('<br>')}<br>Permintaan tersebut perlu ditolak atau diatur ulang.`:'<b>Aturan urutan resource terpenuhi.</b><br>Tidak ditemukan proses yang meminta resource berurutan lebih rendah setelah memegang resource berurutan lebih tinggi. Aturan ini membantu memutus circular wait.','');
  updateComparison();
}
function runAvoidance(){
  const r=safetyCheck();results.avoidance=r;
  if(r.error){showResult('#avoidanceResult',r.error,'warning');return;}
  showResult('#avoidanceResult',r.safe?`<b>SAFE STATE — sistem berada dalam kondisi aman.</b><br>Safe sequence: <b>${r.sequence.join(' → ')}</b><br>Semua proses dapat diselesaikan dengan urutan tersebut.`:`<b>UNSAFE STATE — safe sequence tidak ditemukan.</b><br>Proses yang belum dapat diselesaikan: <b>${r.unfinished.join(', ')}</b><br>Banker's Algorithm tidak dapat menjamin seluruh proses selesai dari keadaan ini.` ,r.safe?'':'warning');
  renderStats();updateComparison();
}
function runDetection(){
  const r=detectionCheck();results.detection=r;
  if(r.error){showResult('#detectionResult',r.error,'warning');return;}
  showResult('#detectionResult',r.deadlocked.length?`<b>DEADLOCK TERDETEKSI.</b><br>Proses yang belum dapat diselesaikan: <b>${r.deadlocked.join(', ')}</b><br>Proses yang dapat diselesaikan: ${r.completed.join(', ')||'Tidak ada'}.`:`<b>TIDAK ADA DEADLOCK.</b><br>Semua proses dapat diselesaikan. Urutan pemeriksaan: <b>${r.completed.join(' → ')||'Tidak ada proses yang perlu menunggu'}</b>.`,r.deadlocked.length?'warning':'');
  updateComparison();
}
function showResult(selector,html,type=''){const el=$(selector);el.className='result-box '+(type||'');el.innerHTML=html;}
function updateComparison(){
  $('#comparePrevention').textContent=results.prevention?(results.prevention.violations.length?'Ada pelanggaran urutan':'Aturan urutan terpenuhi'):'Belum dijalankan';
  $('#compareAvoidance').textContent=results.avoidance?(results.avoidance.error?'Data tidak valid':results.avoidance.safe?'Safe state':'Unsafe state'):'Belum dijalankan';
  $('#compareDetection').textContent=results.detection?(results.detection.error?'Data tidak valid':results.detection.deadlocked.length?'Deadlock terdeteksi':'Tidak ada deadlock'):'Belum dijalankan';
}
function applyInputs(){
  $$('[data-total]').forEach(el=>data.total[+el.dataset.total]=Math.max(0,Number(el.value)||0));
  $$('.cell-input').forEach(el=>{const p=data.processes[+el.dataset.row];p[el.dataset.kind][+el.dataset.col]=Math.max(0,Number(el.value)||0)});
  results={prevention:null,avoidance:null,detection:null};
  renderInput();notify('Data berhasil diterapkan. Jalankan kembali setiap metode untuk melihat hasil terbaru.');
  ['#preventionResult','#avoidanceResult','#detectionResult'].forEach(s=>showResult(s,'Jalankan simulasi untuk melihat hasil.','empty'));
  updateComparison();
}
function go(page){
  $$('.page').forEach(p=>p.classList.toggle('active',p.id===`page-${page}`));
  $$('.nav-link').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
  const label={dashboard:'Dashboard',input:'Input Data',prevention:'Prevention',avoidance:'Avoidance',detection:'Detection',comparison:'Comparison'}[page];
  $('#pageTitle').textContent=label;$('#crumb').textContent=label;
  $('#sidebar').classList.remove('open');window.scrollTo({top:0,behavior:'smooth'});
  if(page==='comparison')updateComparison();
}
document.addEventListener('click',e=>{
  const nav=e.target.closest('[data-page]');if(nav){e.preventDefault();go(nav.dataset.page)}
  const jump=e.target.closest('[data-goto]');if(jump)go(jump.dataset.goto);
});
$('#mobileMenu').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
$('#resetData').addEventListener('click',()=>{data=structuredClone(initialData);results={prevention:null,avoidance:null,detection:null};renderInput();notify('Data contoh berhasil dipulihkan.');updateComparison()});
$('#applyData').addEventListener('click',applyInputs);
$('#runPrevention').addEventListener('click',runPrevention);
$('#runAvoidance').addEventListener('click',runAvoidance);
$('#runDetection').addEventListener('click',runDetection);
$('#refreshComparison').addEventListener('click',updateComparison);
renderInput();
