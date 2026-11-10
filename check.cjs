const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8'), data=fs.readFileSync('lessons.js','utf8');
const lessons=JSON.parse(JSON.stringify(vm.runInNewContext(data+';lessons')));
assert(lessons.length>0);let previous=0;const keys=new Set();
for(const row of lessons){assert(Array.isArray(row)&&row.length===4,'教材は4項目');assert(Number.isInteger(row[0])&&row[0]>0&&row[0]>=previous,'課番号は正整数・昇順');previous=row[0];assert(row.slice(1).every(v=>typeof v==='string'&&v.trim()),'空欄不可');const key=row[0]+':'+row[1];assert(!keys.has(key),'同じ課内の重複');keys.add(key)}
const baseline=JSON.parse(fs.readFileSync('baseline.json','utf8')).lessons;
assert.deepEqual(lessons.slice(0,baseline.length),baseline,'既存17文の内容・順序を保持');
const original=JSON.parse(fs.readFileSync('baseline.json','utf8')).html;
assert.equal(html.match(/<style>[\s\S]*?<\/style>/)[0],original.match(/<style>[\s\S]*?<\/style>/)[0]);
assert.equal(html.match(/<link rel="apple-touch-icon"[^>]+>/)[0],original.match(/<link rel="apple-touch-icon"[^>]+>/)[0]);
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const oldScript=original.match(/<script>([\s\S]*?)<\/script>/)[1];
assert.equal(script.slice(script.indexOf('let filter='),script.indexOf('function render()')),oldScript.slice(oldScript.indexOf('let filter='),oldScript.indexOf('function render()')),'音声処理保持');
assert.equal(script.slice(script.indexOf("$('test').onclick"),script.indexOf('const lessonNumbers=')),oldScript.slice(oldScript.indexOf("$('test').onclick"),oldScript.indexOf('render();voiceList();')),'再生・聞き流し操作保持');
function run(rows,withSpeech=false){const elements=new Map();function el(){return {children:[],value:'0',textContent:'',set innerHTML(v){this.children=[]},style:{},classList:{add(){},remove(){}},append(...v){this.children.push(...v)},get options(){return this.children},add(v){this.children.push(v)},scrollIntoView(){}}}const document={getElementById(id){if(!elements.has(id))elements.set(id,el());return elements.get(id)},createElement:el,querySelectorAll(){return []}};const played=[];const synth={getVoices(){return [{name:'Test Chinese',lang:'zh-CN'}]},cancel(){},speak(u){played.push(u.text);queueMicrotask(()=>u.onend())},addEventListener(){}};const ctx={document,window:withSpeech?{speechSynthesis:synth}:{},SpeechSynthesisUtterance:function(text){this.text=text},Option:function(text,value){this.text=text;this.value=value},setTimeout(fn,ms){if(ms===0)queueMicrotask(fn);return 1},clearTimeout(){},encodeURIComponent,console};vm.runInNewContext('const lessons='+JSON.stringify(rows)+';'+script,ctx);document.getElementById('twice');elements.played=played;return elements}
let ui=run(lessons);assert.equal(ui.get('list').children.length,lessons.length);assert.equal(ui.get('filters').children.length,new Set(lessons.map(p=>p[0])).size+1);
for(const n of new Set(lessons.map(p=>p[0]))){ui.get('filters').children.find(b=>b.textContent==='第'+n+'課').onclick();const count=lessons.filter(p=>p[0]===n).length;assert.equal(ui.get('list').children.length,count)}
const next=lessons.at(-1)[0]+1;
ui=run([...lessons,[next,'测试。','Cèshì.','テスト']]);assert.equal(ui.get('filters').children.at(-1).textContent,'第'+next+'課');assert.equal(ui.get('list').children.length,lessons.length+1);assert(ui.get('lessonSummary').textContent.endsWith('第1〜'+next+'課'));
console.log('PASS: 教材形式・既存17文・CSS・アイコン参照・音声/聞き流し処理・課別表示・新課自動表示');

(async()=>{const ui=run(lessons,true);ui.get('rate').value='0.85';ui.get('gap').value='0';ui.get('twice').checked=true;await ui.get('test').onclick();assert.equal(ui.played.pop(),'你好，我在学中文。');await ui.get('list').children[0].children[1].children[0].onclick();assert.equal(ui.played.pop(),lessons[0][1]);await ui.get('start').onclick();assert.equal(ui.played.length,lessons.length*2);assert.deepEqual(ui.played,lessons.flatMap(p=>[p[1],p[1]]));assert.equal(ui.get('status').textContent,'聞き流しが終わったよ♡');ui.get('stop').onclick();assert.equal(ui.get('status').textContent,'停止しました');console.log('PASS: 模擬音声で試聴・個別再生・全17文の順番/2回読み・完了・停止');})().catch(e=>{console.error(e);process.exitCode=1});
