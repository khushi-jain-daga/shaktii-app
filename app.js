const steps = [
  ['edge','Edge telemetry','Router firmware sends DNS, port, auth and traffic signals.'],
  ['alert','Threat alert','App forces acknowledgement instead of passive dashboard checking.'],
  ['investigate','Investigation','Correlate IP, session, asset, API key and C2 lookup.'],
  ['chain','Blockchain trace','Open only when wallet/payment evidence is part of the incident.'],
  ['ai','AI recommendation','Explain the next attack stage and safest response.'],
  ['contain','Containment','Push reversible policy when approved or SLA is missed.']
];

const state = { step:0, acknowledged:false, contained:false, backend:false, risk:18, confidence:0, events:[] };
const $ = (id)=>document.getElementById(id);

const bootLines = [
  'loading SHAKTII mobile command...',
  'checking router firmware channel...',
  'backend adapter: docker endpoint not attached',
  'starting local fallback event bus...',
  'registering incident workflow handlers...',
  'ready. operator action required.'
];

function addBootLines(){
  const box=$('bootLog');
  bootLines.forEach((text,i)=>setTimeout(()=>{
    const div=document.createElement('div');
    div.className='line';
    div.textContent=text;
    box.appendChild(div);
    if(i===bootLines.length-1){
      const c=document.createElement('span');
      c.className='cursor';
      box.appendChild(c);
      setTimeout(()=>$('boot').classList.add('done'),950);
    }
  },420*i));
}

function now(){return new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'});}
function toast(text){const t=$('toast');t.textContent=text;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2100)}
function log(text,type='cmd'){state.events.unshift({time:now(),text,type});renderLogs();}
function renderLogs(){
  $('runtimeLog').innerHTML = state.events.slice(0,16).map(e=>`<div class="logline ${e.type}" data-time="${e.time}">${e.text}</div>`).join('');
}

function renderFlow(){
  $('flowBox').innerHTML = steps.map((s,i)=>`<div class="flow-row ${i<state.step?'done':''} ${i===state.step?'active':''}"><div class="rail"><div class="step">${i<state.step?'✓':String(i+1).padStart(2,'0')}</div></div><div><div class="step-title"><b>${s[1]}</b><span>${i===state.step?'active':i<state.step?'done':'locked'}</span></div><p class="step-copy">${s[2]}</p></div></div>`).join('');
}

function render(){
  renderFlow();
  $('riskScore').textContent = state.risk;
  $('riskText').textContent = state.risk>85?'critical incident':state.risk>50?'needs review':'baseline clean';
  $('signalText').textContent = state.step>=1?'attack chain forming':'learning normal traffic';
  $('mainTitle').textContent = ['Waiting for edge telemetry','Critical alert requires acknowledgement','Correlating attack path','Tracing related wallet evidence','Decision recommendation ready','Containment workflow active'][state.step];
  $('mainSub').textContent = ['Start the flow when the router/backend sends telemetry. Until then, the app runs a realistic mock bus.','A high-risk chain is detected. Operator must acknowledge before investigation continues.','Evidence is connected into one readable attack story instead of separate static screens.','Blockchain opens only if the incident has wallet or transaction context.','SHAKTII converts technical evidence into an action that a human can approve.','Containment uses reversible actions first: temporary block, session freeze, rate-limit, rollback.'][state.step];
  $('backendBadge').textContent = state.backend?'connected':'fallback';
  $('backendBadge').className = `badge ${state.backend?'safe':'info'}`;
  $('backendTitle').textContent = state.backend?'Backend: connected':'Backend: waiting';
  $('backendSub').textContent = state.backend?'Using API data source':'Using mock bus until Docker backend is integrated';
  $('liveMode').textContent = state.backend?'api live':'mock bus';

  $('alertPanel').classList.remove('hidden');
  $('investigationPanel').classList.toggle('hidden', state.step<2);
  $('chainPanel').classList.toggle('hidden', state.step<3);
  $('aiPanel').classList.toggle('hidden', state.step<4);

  if(state.step===0){
    $('severityBadge').textContent='secure'; $('severityBadge').className='badge safe'; $('incidentTitle').textContent='No active incident'; $('incidentBody').textContent='Start edge sync to simulate incoming router telemetry. Backend can later replace this data through APIs.'; $('incidentRisk').textContent='00'; $('incidentMeta').textContent='confidence 0%'; $('incidentTime').textContent='not started';
  }else{
    $('severityBadge').textContent=state.step>=5?'contained':'critical'; $('severityBadge').className='badge '+(state.step>=5?'safe':'danger'); $('incidentTitle').textContent=state.step>=5?'Threat contained with rollback':'Admin credential compromise chain'; $('incidentBody').textContent='Repeated failed auth attempts followed by admin success, API key creation, sensitive endpoint access and suspicious outbound lookup.'; $('incidentRisk').textContent=state.step>=5?'41':'94'; $('incidentMeta').textContent='confidence 87%'; $('incidentTime').textContent='live now';
  }

  if(state.step===0){$('primaryBtn').textContent='Start edge sync';$('secondaryBtn').textContent='Check backend'}
  if(state.step===1){$('primaryBtn').textContent=state.acknowledged?'Start investigation':'Acknowledge alert';$('secondaryBtn').textContent='Escalate'}
  if(state.step===2){$('primaryBtn').textContent='Run investigation';$('secondaryBtn').textContent='Ask AI early'}
  if(state.step===3){$('primaryBtn').textContent='Trace wallet';$('secondaryBtn').textContent='Skip trace'}
  if(state.step===4){$('primaryBtn').textContent='Ask SHAKTII';$('secondaryBtn').textContent='Generate report'}
  if(state.step===5){$('primaryBtn').textContent=state.contained?'Rollback available':'Approve containment';$('secondaryBtn').textContent='Create ticket'}
}

async function checkBackend(){
  const base = localStorage.getItem('SHAKTII_API_BASE') || window.SHAKTII_API_BASE || '';
  if(!base){log('backend probe skipped: set localStorage SHAKTII_API_BASE after Docker API is ready','warnl');toast('Backend hook ready, API URL not set yet');return;}
  try{const res=await fetch(base.replace(/\/$/,'')+'/health');state.backend=res.ok;log(res.ok?'backend /health ok':'backend replied but unhealthy',res.ok?'good':'warnl');}
  catch(e){state.backend=false;log('backend offline: continuing with mock event bus','warnl')}
  render();
}

function next(){
  if(state.step===0){state.step=1;state.risk=94;state.confidence=87;log('edge telemetry received: failed_login_burst → admin_success → key_created','bad');log('incident INC-0906-001 created with risk=94 confidence=87','bad');toast('Critical incident created');}
  else if(state.step===1){
    if(!state.acknowledged){state.acknowledged=true;log('operator acknowledged critical incident inside SLA','good');toast('Acknowledged');}
    else{state.step=2;log('investigation workspace opened for INC-0906-001','cmd');}
  }
  else if(state.step===2){state.step=3;log('relationship graph built: ip → session → api-key → web-02 → c2-dns','cmd');toast('Investigation graph ready');}
  else if(state.step===3){state.step=4;log('wallet correlation found: 0x7a3f...9d2e linked to suspicious transfer trail','warnl');toast('Blockchain trace attached');}
  else if(state.step===4){state.step=5;log('AI recommendation: use reversible containment first','cmd');toast('Recommendation ready');}
  else if(state.step===5){state.contained=true;state.risk=41;log('policy pushed: temporary_ip_block=30m, session_freeze=true, rollback=true','good');toast('Safe containment executed');}
  render();
}

function secondary(){
  if(state.step===0) return checkBackend();
  if(state.step===1){log('escalation sent to backup SOC: no dashboard dependency','warnl');toast('Escalated to backup SOC');return;}
  if(state.step===2){state.step=4;log('AI early analysis requested before blockchain trace','cmd');toast('AI analysis opened');render();return;}
  if(state.step===3){state.step=4;log('blockchain trace skipped by operator, evidence retained','warnl');render();return;}
  if(state.step===4){log('report generated: incident timeline + forecast + response plan','good');toast('Report generated');return;}
  if(state.step===5){log('ticket created: SOC-INC-0906-001 assigned to primary admin','good');toast('Ticket created');return;}
}

function reset(){state.step=0;state.acknowledged=false;state.contained=false;state.risk=18;state.confidence=0;state.events=[];log('flow reset. waiting for router/backend telemetry.','cmd');render();}

$('primaryBtn').addEventListener('click',next);
$('secondaryBtn').addEventListener('click',secondary);
$('resetBtn').addEventListener('click',reset);
addBootLines();
log('app booted in mock bus mode. backend can be attached later.','cmd');
render();
setInterval(()=>{
  const base = state.step>=1 ? 42.8 + Math.random()*3 : 38 + Math.random()*2;
  $('packets').textContent = base.toFixed(1)+'M';
  $('latency').textContent = (0.018+Math.random()*0.008).toFixed(3)+'ms';
},1800);

if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js?v=4').catch(()=>{}));}
