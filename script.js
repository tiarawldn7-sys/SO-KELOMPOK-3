const initialData = {
  resources: ["A", "B", "C"],
  total: [10, 5, 7],
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
let resourceOrder = [...data.resources];
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const sum = arr => arr.reduce((a,b)=>a+b,0);
const available = () => data.total.map((v,j)=>v-data.processes.reduce((s,p)=>s+p.allocation[j],0));
const fmt = a => `[${a.join(", ")}]`;
function notify(msg){const el=$('#inputFeedback');if(el)el.textContent=msg}
function renderStats(){
  $('#statProcesses').textContent=data.processes.length;
  $('#statResources').textContent=data.resources.length;
  $('#statAvailable').textContent=available().reduce((a,b)=>a+b,0);
  const safe=results.avoidance?.safe;
  $('#statStatus').textContent=safe===false?'Perlu cek':'Aman';
  $('#statStatusNote').textContent=safe===false?'Tidak ditemukan safe sequence':'Berdasarkan pemeriksaan awal';
}
function renderOrderControls(){
  const box=$('#orderInputs'); if(!box)return;
  box.innerHTML=data.resources.map((r,i)=>`<label class="order-chip order-control">${r}
    <select aria-label="Urutan resource ${r}" data-order-resource="${r}">
      ${data.resources.map((_,rank)=>`<option value="${rank+1}" ${resourceOrder[i]===rank+1?'selected':''}>${rank+1}</option>`).join('')}
    </select></label>`).join('');
}
function renderInput(){
  $('#totalInputs').innerHTML=data.resources.map((r,j)=>`<div class="resource-field"><label>Resource ${r}</label><input type="number" min="0" step="1" data-total="${j}" value="${data.total[j]}"></div>`).join('');
  const n=data.resources.length;
  let head=`<thead><tr><th rowspan="2">Process</th><th class="group-head" colspan="${n}">Allocation</th><th class="group-head" colspan="${n}">Maximum</th><th class="group-head" colspan="${n}">Request</th></tr><tr>${[0,1,2].map(()=>data.resources.map(r=>`<th>${r}</th>`).join('')).join('')}</tr></thead>`;
  let body='<tbody>'+data.processes.map((p,i)=>`<tr><td>${p.name}</td>${['allocation','max','request'].map(k=>p[k].map((v,j)=>`<td><input class="cell-input" type="number" min="0" step="1" data-row="${i}" data-kind="${k}" data-col="${j}" value="${v}"></td>`).join('')).join('')}</tr>`).join('')+'</tbody>';
  $('#processTable').innerHTML=head+body;
  renderOrderControls();renderNeedTable();renderDetectionTable();renderStats();
}
function renderNeedTable(){
  const av=available();
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
  const av=available(), n=data.resources.length;
  if(!n||data.total.length!==n)return 'Jumlah total resource tidak sesuai dengan jenis resource.';
  if(data.total.some(v=>!Number.isInteger(v)||v<0))return 'Total resource harus berupa bilangan bulat non-negatif.';
  if(data.processes.some(p=>p.allocation.length!==n||p.max.length!==n||p.request.length!==n))return 'Dimensi matriks Allocation, Maximum, dan Request harus sama dengan jumlah resource.';
  if(data.processes.some(p=>[...p.allocation,...p.max,...p.request].some(v=>!Number.isInteger(v)||v<0)))return 'Matriks harus berisi bilangan bulat non-negatif.';
  if(av.some(v=>v<0))return 'Total resource tidak boleh lebih kecil daripada jumlah Allocation.';
  if(data.processes.some(p=>p.max.some((v,j)=>v<p.allocation[j])))return 'Nilai Maximum harus lebih besar atau sama dengan Allocation.';
  return null;
}
function buildTraceTable(title, rows, headers){
  if(!rows.length)return '';
  return `<div class="sim-trace"><h4>${title}</h4><div class="trace-scroll"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(v=>`<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
}
function safetyCheck(){
  const err=validData();if(err)return {error:err,safe:false,sequence:[],trace:[]};
  const work=available(), finish=data.processes.map(()=>false), sequence=[], trace=[];
  let iteration=0, progress=true;
  while(progress){
    progress=false;
    for(let i=0;i<data.processes.length;i++){
      const p=data.processes[i], need=p.max.map((v,j)=>v-p.allocation[j]);
      if(finish[i])continue;
      const before=[...work], canRun=need.every((v,j)=>v<=work[j]);
      trace.push([`Iterasi ${iteration+1}`,p.name,fmt(need),fmt(before),canRun?'Memenuhi Need ≤ Work':'Belum memenuhi Need ≤ Work',canRun?'—':fmt(before)]);
      if(canRun){
        work.forEach((_,j)=>work[j]+=p.allocation[j]);finish[i]=true;sequence.push(p.name);iteration++;
        trace[trace.length-1][5]=fmt(work);progress=true;
      }
    }
  }
  return {safe:finish.every(Boolean),sequence,unfinished:data.processes.filter((p,i)=>!finish[i]).map(p=>p.name),trace,finalWork:work};
}
function detectionCheck(){
  const err=validData();if(err)return {error:err,deadlocked:[],completed:[],trace:[]};
  const work=available(), finish=data.processes.map(p=>p.allocation.every(v=>v===0)), completed=[],trace=[];
  let iteration=0, progress=true;
  while(progress){
    progress=false;
    for(let i=0;i<data.processes.length;i++){
      const p=data.processes[i];if(finish[i])continue;
      const before=[...work], stepNo=iteration+1, canRun=p.request.every((v,j)=>v<=work[j]);
      if(canRun){
        work.forEach((_,j)=>work[j]+=p.allocation[j]);finish[i]=true;completed.push(p.name);progress=true;iteration++;
      }
      trace.push([`Iterasi ${stepNo}`,p.name,fmt(p.request),fmt(before),canRun?'Request ≤ Work, proses selesai':'Request melebihi Work, menunggu',fmt(work)]);
    }
  }
  return {deadlocked:data.processes.filter((p,i)=>!finish[i]).map(p=>p.name),completed,trace,finalWork:work};
}
function runPrevention(){
  const err=validData();if(err){showResult('#preventionResult',err,'warning');return;}
  const ranks={};$$('[data-order-resource]').forEach(el=>ranks[el.dataset.orderResource]=Number(el.value));
  const rankValues=Object.values(ranks);
  if(rankValues.length!==data.resources.length||new Set(rankValues).size!==data.resources.length){
    showResult('#preventionResult','Urutan resource tidak valid. Setiap resource harus memiliki nomor urutan yang unik.','warning');return;
  }
  resourceOrder=data.resources.map(r=>ranks[r]);
  const trace=[], violations=[];
  data.processes.forEach(p=>{
    const held=data.resources.filter((r,j)=>p.allocation[j]>0), requested=data.resources.filter((r,j)=>p.request[j]>0);
    if(!requested.length){trace.push([p.name,held.join(', ')||'Tidak memegang resource','Tidak ada request aktif','—','Tidak ada request yang perlu diperiksa']);return;}
    requested.forEach(req=>{
      const blocking=held.filter(h=>ranks[h]>ranks[req]);
      const ok=blocking.length===0;
      const reason=ok?'Request mengikuti urutan global yang ditetapkan':`Memegang ${blocking.join(', ')} (urutan lebih tinggi), lalu meminta ${req} (urutan lebih rendah)`;
      trace.push([p.name,held.join(', ')||'—',req,ok?'DITERIMA':'DITOLAK',reason]);
      if(!ok)violations.push({process:p.name,held:blocking,requested:req});
    });
  });
  results.prevention={violations,resourceOrder:{...ranks},trace};
  const summary=violations.length?`<b>Request melanggar resource ordering.</b> ${violations.length} request ditolak karena urutan resource tidak konsisten.`:`<b>Semua request aktif lolos aturan ordering.</b> Ini menguji aturan pencegahan circular wait, bukan membuktikan bebas deadlock untuk semua kondisi.`;
  showResult('#preventionResult',summary+buildTraceTable('Trace pemeriksaan request',trace,['Proses','Resource dipegang','Resource diminta','Keputusan','Alasan']));
  updateComparison();
}
function runAvoidance(){
  const r=safetyCheck();results.avoidance=r;
  if(r.error){showResult('#avoidanceResult',r.error,'warning');return;}
  const summary=r.safe?`<b>SAFE STATE — sistem berada dalam kondisi aman.</b><br>Safe sequence: <b>${r.sequence.join(' → ')}</b><br>Semua proses dapat diselesaikan dalam urutan tersebut.`:`<b>UNSAFE STATE — safe sequence tidak ditemukan.</b><br>Proses yang belum dapat diselesaikan: <b>${r.unfinished.join(', ')}</b><br>Unsafe state tidak otomatis berarti deadlock sedang terjadi.`;
  const traceHtml=buildTraceTable('Trace Bankers Algorithm',r.trace,['Iterasi','Proses','Need','Work sebelum','Pemeriksaan','Work sesudah']);
  showResult('#avoidanceResult', summary + traceHtml, r.safe ? '' : 'warning');
  renderStats();updateComparison();
}
function runDetection(){
  const r=detectionCheck();results.detection=r;
  if(r.error){showResult('#detectionResult',r.error,'warning');return;}
  const summary=r.deadlocked.length?`<b>PROSES TIDAK DAPAT DISELESAIKAN DARI KEADAAN INI.</b><br>Proses tersisa: <b>${r.deadlocked.join(', ')}</b><br>Proses selesai: ${r.completed.join(', ')||'Tidak ada'}. Proses tersisa merupakan kandidat deadlock berdasarkan matriks Request saat ini.`:`<b>TIDAK ADA DEADLOCK TERDETEKSI.</b><br>Semua proses dapat diselesaikan. Urutan penyelesaian: <b>${r.completed.join(' → ')||'Tidak ada proses aktif'}</b>.`;
  const traceHtml=buildTraceTable('Trace Detection Algorithm',r.trace,['Iterasi','Proses','Request','Work sebelum','Evaluasi','Work sesudah']);
  showResult('#detectionResult', summary + traceHtml, r.deadlocked.length ? 'warning' : '');
  updateComparison();
}
function showResult(selector,html,type=''){const el=$(selector);el.className='result-box '+(type||'');el.innerHTML=html;}
function updateComparison(){
  $('#comparePrevention').textContent=results.prevention?(results.prevention.violations.length?'Ada request ditolak':'Request aktif lolos ordering'):'Belum dijalankan';
  $('#compareAvoidance').textContent=results.avoidance?(results.avoidance.error?'Data tidak valid':results.avoidance.safe?'Safe state':'Unsafe state'):'Belum dijalankan';
  $('#compareDetection').textContent=results.detection?(results.detection.error?'Data tidak valid':results.detection.deadlocked.length?'Proses tidak selesai':'Tidak ada deadlock'):'Belum dijalankan';
}
function resetResults(){
  results={prevention:null,avoidance:null,detection:null};
  ['#preventionResult','#avoidanceResult','#detectionResult'].forEach(s=>showResult(s,'Jalankan simulasi untuk melihat hasil.','empty'));
  updateComparison();
}
function applyInputs(){
  $$('[data-total]').forEach(el=>data.total[+el.dataset.total]=Math.max(0,Number(el.value)||0));
  $$('.cell-input').forEach(el=>{const p=data.processes[+el.dataset.row];p[el.dataset.kind][+el.dataset.col]=Math.max(0,Number(el.value)||0)});
  resetResults();renderInput();notify('Data berhasil diterapkan. Jalankan kembali setiap metode untuk melihat trace terbaru.');
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
$('#resetData').addEventListener('click',()=>{data=structuredClone(initialData);resourceOrder=[1,2,3];resetResults();renderInput();notify('Data contoh berhasil dipulihkan.');});
$('#applyData').addEventListener('click',applyInputs);
$('#runPrevention').addEventListener('click',runPrevention);
$('#runAvoidance').addEventListener('click',runAvoidance);
$('#runDetection').addEventListener('click',runDetection);
$('#refreshComparison').addEventListener('click',updateComparison);
renderInput();
