const initialData = {
    resources: ["A", "B", "C"],
    total: [10, 5, 7],
    processes: [
        {
            name: "P0",
            allocation: [0, 0, 0],
            max: [0, 0, 0],
            request: [0, 0, 0]
        }
    ]
};
let data = structuredClone(initialData);
let results = {
    prevention: null,
    avoidance: null,
    detection: null
};
let resourceOrder = [1, 2, 3];
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const fmt = values => `[${values.join(', ')}]`;

function available(state = data) {
    return state.total.map((total, resourceIndex) =>
        total - state.processes.reduce(
            (allocated, process) => allocated + process.allocation[resourceIndex],
            0
        )
    );
}

function notify(msg) {
    $('#inputFeedback').textContent = msg;
}
function renderStats() {
    $('#statProcesses').textContent = data.processes.length;
    $('#statResources').textContent = data.resources.length;
    $('#statAvailable').textContent = available().reduce((total, count) => total + count, 0);

    const avoidance = results.avoidance;
    const status = !avoidance
        ? ['Belum diperiksa', 'Jalankan metode avoidance untuk memeriksa state']
        : avoidance.error
            ? ['Data tidak valid', 'Perbaiki input sebelum menjalankan simulasi']
            : avoidance.safe
                ? ['Aman', 'Safe sequence ditemukan']
                : ['Perlu cek', 'Safe sequence tidak ditemukan'];

    $('#statStatus').textContent = status[0];
    $('#statStatusNote').textContent = status[1];
}

function renderOrderControls() {
    const box = $('#orderInputs');
    if (!box) return;

    box.innerHTML = data.resources.map((resource, index) => `
        <label class="order-chip order-control">
            <span>${escapeHTML(resource)}</span>
            <select aria-label="Urutan resource ${escapeHTML(resource)}" data-order-resource="${index}">
                ${data.resources.map((_, rank) => `
                    <option value="${rank + 1}" ${resourceOrder[index] === rank + 1 ? 'selected' : ''}>
                        ${rank + 1}
                    </option>
                `).join('')}
            </select>
        </label>
    `).join('');
}
function renderInput() {

    $('#processCount').textContent = data.processes.length;
    $('#resourceCount').textContent = data.resources.length;

    // RESOURCE INPUT
    $('#totalInputs').innerHTML = data.resources.map((r, j) => `
        <div class="resource-field">
            <label>
                <input
                    type="text"
                    class="resource-name"
                    data-resource-name="${j}"
                    value="${escapeHTML(r)}"
                    maxlength="8"
                    aria-label="Nama resource ${j + 1}"
                >
            </label>

            <input
                type="number"
                min="0"
                step="1"
                data-total="${j}"
                value="${data.total[j]}"
                aria-label="Total resource ${escapeHTML(r)}"
            >
        </div>
    `).join('');

    const n = data.resources.length;

    // TABLE HEADER
    const head = `
        <thead>
            <tr>
                <th rowspan="2">Process</th>

                <th class="group-head" colspan="${n}">
                    Allocation
                </th>

                <th class="group-head" colspan="${n}">
                    Maximum
                </th>

                <th class="group-head" colspan="${n}">
                    Request
                </th>

                <th rowspan="2">Aksi</th>
            </tr>

            <tr>
                ${[0, 1, 2].map(() =>
                    data.resources.map(r => `
                        <th>${escapeHTML(r)}</th>
                    `).join('')
                ).join('')}
            </tr>
        </thead>
    `;

    // TABLE BODY
    const body = `
        <tbody>
            ${data.processes.map((p, i) => `
                <tr>
                    <td>
                        <input
                            type="text"
                            class="cell-input process-name"
                            data-process-name="${i}"
                            value="${escapeHTML(p.name)}"
                            maxlength="10"
                            aria-label="Nama proses"
                        >
                    </td>

                    ${['allocation', 'max', 'request'].map(k =>
                        p[k].map((v, j) => `
                            <td>
                                <input
                                    class="cell-input"
                                    type="number"
                                    min="0"
                                    step="1"
                                    data-row="${i}"
                                    data-kind="${k}"
                                    data-col="${j}"
                                    value="${v}"
                                >
                            </td>
                        `).join('')
                    ).join('')}

                    <td>
                        <button
                            type="button"
                            class="delete-row-btn"
                            data-delete-process="${i}"
                            ${data.processes.length <= 1 ? 'disabled' : ''}
                        >
                            Hapus
                        </button>
                    </td>
                </tr>
            `).join('')}
        </tbody>
    `;

    $('#processTable').innerHTML = head + body;

    renderOrderControls();
    renderNeedTable();
    renderDetectionTable();
    renderStats();
}
function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    })[char]);
}
function addProcess() {

    if (data.processes.length >= 30) {
        notify('Maksimal 30 proses.');
        return;
    }

    let nextNumber = data.processes.length;
    while (data.processes.some(process => process.name.toLowerCase() === `p${nextNumber}`.toLowerCase())) {
        nextNumber += 1;
    }

    data.processes.push({
        name: `P${nextNumber}`,
        allocation: data.resources.map(() => 0),
        max: data.resources.map(() => 0),
        request: data.resources.map(() => 0)
    });

    resetResults();
    renderInput();

    notify('Proses baru berhasil ditambahkan.');
}
function addResource() {
    let suffix = data.resources.length + 1;
    let name = `R${suffix}`;

    while (data.resources.some(resource => resource.toLowerCase() === name.toLowerCase())) {
        suffix += 1;
        name = `R${suffix}`;
    }

    data.resources.push(name);
    data.total.push(0);
    data.processes.forEach(process => {
        process.allocation.push(0);
        process.max.push(0);
        process.request.push(0);
    });
    resourceOrder.push(resourceOrder.length + 1);

    resetResults();
    renderInput();
    notify('Resource baru berhasil ditambahkan.');
}
function removeResource() {
    if (data.resources.length <= 1) {
        notify('Minimal harus ada satu resource.');
        return;
    }

    data.resources.pop();
    data.total.pop();
    data.processes.forEach(process => {
        process.allocation.pop();
        process.max.pop();
        process.request.pop();
    });
    resourceOrder.pop();
    const resourceIndexes = resourceOrder
        .map((_, index) => index)
        .sort((left, right) => resourceOrder[left] - resourceOrder[right]);
    resourceIndexes.forEach((resourceIndex, rank) => {
        resourceOrder[resourceIndex] = rank + 1;
    });

    resetResults();
    renderInput();
    notify('Resource terakhir berhasil dihapus.');
}
function removeProcess(index) {

    if (data.processes.length <= 1) {
        notify('Minimal harus ada satu proses.');
        return;
    }

    data.processes.splice(index, 1);

    resetResults();
    renderInput();

    notify('Proses berhasil dihapus.');
}
function editResourceName(index, value) {

    const name = value.trim();

    if (!name) {
        notify('Nama resource tidak boleh kosong.');
        renderInput();
        return;
    }

    const duplicate = data.resources.some(
        (r, i) => i !== index &&
        r.toLowerCase() === name.toLowerCase()
    );

    if (duplicate) {
        notify('Nama resource tidak boleh sama.');
        renderInput();
        return;
    }

    data.resources[index] = name;

    resetResults();
    renderInput();

    notify('Nama resource berhasil diperbarui.');
}
function editProcessName(index, value) {

    const name = value.trim();

    if (!name) {
        notify('Nama proses tidak boleh kosong.');
        renderInput();
        return;
    }

    const duplicate = data.processes.some(
        (p, i) => i !== index &&
        p.name.toLowerCase() === name.toLowerCase()
    );

    if (duplicate) {
        notify('Nama proses tidak boleh sama.');
        renderInput();
        return;
    }

    data.processes[index].name = name;

    resetResults();
    renderInput();

    notify('Nama proses berhasil diperbarui.');
}

function renderNeedTable(){
  const av=available();
  const head=`<thead><tr><th>Process</th>${data.resources.map(r=>`<th>Need ${escapeHTML(r)}</th>`).join('')}</tr></thead>`;
  const rows=data.processes.map(p=>`<tr><td>${escapeHTML(p.name)}</td>${p.max.map((v,j)=>`<td>${v-p.allocation[j]}</td>`).join('')}</tr>`).join('');
  $('#needTable').innerHTML=head+'<tbody>'+rows+'</tbody>';
  $('#bankerSummary').innerHTML=`<div class="summary-pill">Total resource<b>${data.total.join(' · ')}</b></div><div class="summary-pill">Available<b>${av.join(' · ')}</b></div><div class="summary-pill">Jumlah proses<b>${data.processes.length}</b></div>`;
}
function renderDetectionTable(){
  const n=data.resources.length;
  $('#detectionTable').innerHTML=`<thead><tr><th>Process</th><th colspan="${n}" class="group-head">Allocation</th><th colspan="${n}" class="group-head">Request</th></tr><tr>${'<th></th>'}${data.resources.map(r=>`<th>${escapeHTML(r)}</th>`).join('')}${data.resources.map(r=>`<th>${escapeHTML(r)}</th>`).join('')}</tr></thead><tbody>${data.processes.map(p=>`<tr><td>${escapeHTML(p.name)}</td>${p.allocation.map(v=>`<td>${v}</td>`).join('')}${p.request.map(v=>`<td>${v}</td>`).join('')}</tr>`).join('')}</tbody>`;
}

function validData(state = data) {
    const resourceCount = state.resources.length;
    if (!resourceCount || state.total.length !== resourceCount) {
        return 'Jumlah total resource tidak sesuai dengan jenis resource.';
    }
    if (!state.processes.length) {
        return 'Minimal harus ada satu proses.';
    }

    const namesAreValid = names => {
        const normalized = names.map(name => name.trim().toLocaleLowerCase());
        return normalized.every(Boolean) && new Set(normalized).size === normalized.length;
    };
    if (!namesAreValid(state.resources)) {
        return 'Nama resource harus diisi dan tidak boleh sama.';
    }
    if (!namesAreValid(state.processes.map(process => process.name))) {
        return 'Nama proses harus diisi dan tidak boleh sama.';
    }

    const isNonNegativeInteger = value => Number.isSafeInteger(value) && value >= 0;
    if (state.total.some(value => !isNonNegativeInteger(value))) {
        return 'Total resource harus berupa bilangan bulat non-negatif.';
    }
    if (state.processes.some(process =>
        process.allocation.length !== resourceCount ||
        process.max.length !== resourceCount ||
        process.request.length !== resourceCount
    )) {
        return 'Dimensi matriks Allocation, Maximum, dan Request harus sama dengan jumlah resource.';
    }
    if (state.processes.some(process =>
        [...process.allocation, ...process.max, ...process.request].some(value => !isNonNegativeInteger(value))
    )) {
        return 'Matriks harus berisi bilangan bulat non-negatif.';
    }
    if (available(state).some(value => value < 0)) {
        return 'Total resource tidak boleh lebih kecil daripada jumlah Allocation.';
    }
    if (state.processes.some(process =>
        process.max.some((value, index) => value < process.allocation[index])
    )) {
        return 'Nilai Maximum harus lebih besar atau sama dengan Allocation.';
    }
    return null;
}
function buildTraceTable(title, rows, headers){
  if(!rows.length)return '';
  return `<div class="sim-trace"><h4>${escapeHTML(title)}</h4><div class="trace-scroll"><table><thead><tr>${headers.map(h=>`<th>${escapeHTML(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(v=>`<td>${escapeHTML(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
}
function safetyCheck() {
    const error = validData();
    if (error) return { error, safe: false, sequence: [], trace: [] };

    const work = available();
    const finish = data.processes.map(() => false);
    const sequence = [];
    const trace = [];
    let iteration = 0;
    let progress = true;

    while (progress) {
        progress = false;
        data.processes.forEach((process, index) => {
            if (finish[index]) return;

            const need = process.max.map((maximum, resourceIndex) =>
                maximum - process.allocation[resourceIndex]
            );
            const before = [...work];
            const canFinish = need.every((value, resourceIndex) => value <= work[resourceIndex]);
            const traceRow = [
                `Iterasi ${iteration + 1}`,
                process.name,
                fmt(need),
                fmt(before),
                canFinish ? 'Memenuhi Need ≤ Work' : 'Belum memenuhi Need ≤ Work',
                fmt(before)
            ];

            if (canFinish) {
                process.allocation.forEach((value, resourceIndex) => {
                    work[resourceIndex] += value;
                });
                finish[index] = true;
                sequence.push(process.name);
                iteration += 1;
                traceRow[5] = fmt(work);
                progress = true;
            }
            trace.push(traceRow);
        });
    }

    return {
        safe: finish.every(Boolean),
        sequence,
        unfinished: data.processes.filter((_, index) => !finish[index]).map(process => process.name),
        trace,
        finalWork: work
    };
}

function detectionCheck() {
    const error = validData();
    if (error) return { error, deadlocked: [], completed: [], trace: [] };

    const work = available();
    const finish = data.processes.map(process =>
        process.allocation.every(value => value === 0)
    );
    const completed = [];
    const trace = [];
    let iteration = 0;
    let progress = true;

    while (progress) {
        progress = false;
        data.processes.forEach((process, index) => {
            if (finish[index]) return;

            const before = [...work];
            const stepNumber = iteration + 1;
            const canFinish = process.request.every((value, resourceIndex) => value <= work[resourceIndex]);
            if (canFinish) {
                process.allocation.forEach((value, resourceIndex) => {
                    work[resourceIndex] += value;
                });
                finish[index] = true;
                completed.push(process.name);
                progress = true;
                iteration += 1;
            }
            trace.push([
                `Iterasi ${stepNumber}`,
                process.name,
                fmt(process.request),
                fmt(before),
                canFinish ? 'Request ≤ Work, proses selesai' : 'Request melebihi Work, menunggu',
                fmt(work)
            ]);
        });
    }

    return {
        deadlocked: data.processes.filter((_, index) => !finish[index]).map(process => process.name),
        completed,
        trace,
        finalWork: work
    };
}

function runPrevention() {
    const error = validData();
    if (error) {
        results.prevention = { error, violations: [] };
        showResult('#preventionResult', escapeHTML(error), 'warning');
        updateComparison();
        return;
    }

    const ranks = Array(data.resources.length).fill(NaN);
    $$('[data-order-resource]').forEach(element => {
        const index = Number(element.dataset.orderResource);
        if (Number.isInteger(index) && index >= 0 && index < ranks.length) {
            ranks[index] = Number(element.value);
        }
    });

    const expectedRanks = Array.from({ length: data.resources.length }, (_, index) => index + 1);
    if (
        ranks.some(rank => !Number.isInteger(rank)) ||
        new Set(ranks).size !== ranks.length ||
        !expectedRanks.every(rank => ranks.includes(rank))
    ) {
        const message = 'Urutan resource tidak valid. Setiap resource harus memiliki nomor urutan yang unik.';
        results.prevention = { error: message, violations: [] };
        showResult('#preventionResult', message, 'warning');
        updateComparison();
        return;
    }

    resourceOrder = [...ranks];
    const trace = [];
    const violations = [];

    data.processes.forEach(process => {
        const held = data.resources
            .map((resource, index) => process.allocation[index] > 0 ? index : -1)
            .filter(index => index !== -1);
        const requested = data.resources
            .map((resource, index) => process.request[index] > 0 ? index : -1)
            .filter(index => index !== -1);

        if (!requested.length) {
            trace.push([
                process.name,
                held.map(index => data.resources[index]).join(', ') || 'Tidak memegang resource',
                'Tidak ada request aktif',
                '—',
                'Tidak ada request yang perlu diperiksa'
            ]);
            return;
        }

        requested.forEach(requestedIndex => {
            const blocking = held.filter(index => ranks[index] > ranks[requestedIndex]);
            const requestedResource = data.resources[requestedIndex];
            const blockingResources = blocking.map(index => data.resources[index]);
            const accepted = blocking.length === 0;
            const reason = accepted
                ? 'Request mengikuti urutan global yang ditetapkan'
                : `Memegang ${blockingResources.join(', ')} (urutan lebih tinggi), lalu meminta ${requestedResource} (urutan lebih rendah)`;

            trace.push([
                process.name,
                held.map(index => data.resources[index]).join(', ') || '—',
                requestedResource,
                accepted ? 'DITERIMA' : 'DITOLAK',
                reason
            ]);
            if (!accepted) {
                violations.push({
                    process: process.name,
                    held: blockingResources,
                    requested: requestedResource
                });
            }
        });
    });

    results.prevention = { violations, resourceOrder: [...ranks], trace };
    const summary = violations.length
        ? `<b>Request melanggar resource ordering.</b> ${violations.length} request ditolak karena urutan resource tidak konsisten.`
        : '<b>Semua request aktif lolos aturan ordering.</b> Ini menguji aturan pencegahan circular wait, bukan membuktikan bebas deadlock untuk semua kondisi.';
    showResult(
        '#preventionResult',
        summary + buildTraceTable('Trace pemeriksaan request', trace, [
            'Proses', 'Resource dipegang', 'Resource diminta', 'Keputusan', 'Alasan'
        ]),
        violations.length ? 'warning' : ''
    );
    updateComparison();
}

function runAvoidance() {
    const result = safetyCheck();
    results.avoidance = result;
    if (result.error) {
        showResult('#avoidanceResult', escapeHTML(result.error), 'warning');
        renderStats();
        updateComparison();
        return;
    }

    const summary = result.safe
        ? `<b>SAFE STATE — sistem berada dalam kondisi aman.</b><br>Safe sequence: <b>${escapeHTML(result.sequence.join(' → '))}</b><br>Semua proses dapat diselesaikan dalam urutan tersebut.`
        : `<b>UNSAFE STATE — safe sequence tidak ditemukan.</b><br>Proses yang belum dapat diselesaikan: <b>${escapeHTML(result.unfinished.join(', '))}</b><br>Unsafe state tidak otomatis berarti deadlock sedang terjadi.`;
    const traceHtml = buildTraceTable("Trace Banker's Algorithm", result.trace, [
        'Iterasi', 'Proses', 'Need', 'Work sebelum', 'Pemeriksaan', 'Work sesudah'
    ]);
    showResult('#avoidanceResult', summary + traceHtml, result.safe ? '' : 'warning');
    renderStats();
    updateComparison();
}

function runDetection() {
    const result = detectionCheck();
    results.detection = result;
    if (result.error) {
        showResult('#detectionResult', escapeHTML(result.error), 'warning');
        updateComparison();
        return;
    }

    const summary = result.deadlocked.length
        ? `<b>PROSES TIDAK DAPAT DISELESAIKAN DARI KEADAAN INI.</b><br>Proses tersisa: <b>${escapeHTML(result.deadlocked.join(', '))}</b><br>Proses selesai: ${escapeHTML(result.completed.join(', ') || 'Tidak ada')}. Proses tersisa merupakan kandidat deadlock berdasarkan matriks Request saat ini.`
        : `<b>TIDAK ADA DEADLOCK TERDETEKSI.</b><br>Semua proses dapat diselesaikan. Urutan penyelesaian: <b>${escapeHTML(result.completed.join(' → ') || 'Tidak ada proses aktif')}</b>.`;
    const traceHtml = buildTraceTable('Trace Detection Algorithm', result.trace, [
        'Iterasi', 'Proses', 'Request', 'Work sebelum', 'Evaluasi', 'Work sesudah'
    ]);
    showResult('#detectionResult', summary + traceHtml, result.deadlocked.length ? 'warning' : '');
    updateComparison();
}

function showResult(selector, html, type = '') {
    const element = $(selector);
    element.className = `result-box ${type || ''}`.trim();
    element.innerHTML = html;
}

function updateComparison() {
    $('#comparePrevention').textContent = !results.prevention
        ? 'Belum dijalankan'
        : results.prevention.error
            ? 'Data tidak valid'
            : results.prevention.violations.length
                ? 'Ada request ditolak'
                : 'Request aktif lolos ordering';
    $('#compareAvoidance').textContent = !results.avoidance
        ? 'Belum dijalankan'
        : results.avoidance.error
            ? 'Data tidak valid'
            : results.avoidance.safe
                ? 'Safe state'
                : 'Unsafe state';
    $('#compareDetection').textContent = !results.detection
        ? 'Belum dijalankan'
        : results.detection.error
            ? 'Data tidak valid'
            : results.detection.deadlocked.length
                ? 'Proses tidak selesai'
                : 'Tidak ada deadlock';
}
function resetResults() {

    results = {
        prevention: null,
        avoidance: null,
        detection: null
    };

    if ($('#preventionResult')) {
        showResult(
            '#preventionResult',
            'Jalankan simulasi untuk melihat hasil.',
            'empty'
        );

        showResult(
            '#avoidanceResult',
            'Jalankan simulasi untuk melihat hasil.',
            'empty'
        );

        showResult(
            '#detectionResult',
            'Jalankan simulasi untuk melihat hasil.',
            'empty'
        );
    }

    if ($('#comparePrevention')) {
        updateComparison();
    }
}

function applyInputs() {
    const nextData = structuredClone(data);
    $$('[data-total]').forEach(el => {
        const index = Number(el.dataset.total);
        nextData.total[index] = el.value.trim() === '' ? NaN : Number(el.value);
    });
    $$('.cell-input[data-row]').forEach(el => {
        const row = Number(el.dataset.row);
        const col = Number(el.dataset.col);
        const kind = el.dataset.kind;
        nextData.processes[row][kind][col] = el.value.trim() === '' ? NaN : Number(el.value);
    });
    $$('[data-resource-name]').forEach(el => {
        nextData.resources[Number(el.dataset.resourceName)] = el.value.trim();
    });
    $$('[data-process-name]').forEach(el => {
        nextData.processes[Number(el.dataset.processName)].name = el.value.trim();
    });

    const error = validData(nextData);
    if (error) {
        notify(`Data belum diterapkan: ${error}`);
        return;
    }

    data = nextData;
    resetResults();
    renderInput();
    notify('Data berhasil diterapkan. Jalankan kembali metode simulasi.');
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
$('#addProcess').addEventListener('click', addProcess);
$('#removeProcess').addEventListener('click', () => {
    removeProcess(data.processes.length - 1);
});
$('#addResource').addEventListener('click', addResource);

$('#removeResource').addEventListener('click', removeResource);

// Hapus proses melalui tombol pada tabel
$('#processTable').addEventListener('click', e => {

    const button = e.target.closest('[data-delete-process]');

    if (!button) return;

    removeProcess(+button.dataset.deleteProcess);
});

$('#totalInputs').addEventListener('change', e => {
    if (e.target.matches('[data-resource-name]')) {
        editResourceName(Number(e.target.dataset.resourceName), e.target.value);
    }
});

$('#processTable').addEventListener('change', e => {
    if (e.target.matches('[data-process-name]')) {
        editProcessName(Number(e.target.dataset.processName), e.target.value);
    }
});

$('#orderInputs').addEventListener('change', e => {
    if (e.target.matches('[data-order-resource]')) {
        const index = Number(e.target.dataset.orderResource);
        resourceOrder[index] = Number(e.target.value);
        results.prevention = null;
        showResult(
            '#preventionResult',
            'Jalankan simulasi untuk melihat hasil pemeriksaan aturan.',
            'empty'
        );
        updateComparison();
    }
});

$('#mobileMenu').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
$('#resetData').addEventListener('click',()=>{data=structuredClone(initialData);resourceOrder=[1,2,3];resetResults();renderInput();notify('Data contoh berhasil dipulihkan.');});
$('#applyData').addEventListener('click',applyInputs);
$('#runPrevention').addEventListener('click',runPrevention);
$('#runAvoidance').addEventListener('click',runAvoidance);
$('#runDetection').addEventListener('click',runDetection);
$('#refreshComparison').addEventListener('click',updateComparison);
renderInput();
