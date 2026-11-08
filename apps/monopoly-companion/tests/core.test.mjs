import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const context = vm.createContext({});
for (const file of ['data.js', 'core.js']) vm.runInContext(readFileSync(new URL('../'+file, import.meta.url), 'utf8'), context);
const C = context.MC, D = context.MC_DATA;
const plain = v => JSON.parse(JSON.stringify(v));
const fresh = (first = 0) => ({ ...C.createSession(['나', '딸'], 30, true, first), screen: 'play', runningSince: 1000 });

test('all presets reserve ten minutes for setup and scoring', () => {
  for (const n of D.durations) assert.equal(C.budget(C.createSession(['A','B'],n,true)), (n-10)*60000);
});
test('cash and granted properties total 1500 for either set; banknote example totals 1500', () => {
  for (const v of Object.values(D.sets)) assert.equal(1500-v.cost+v.cost,1500);
  assert.equal(D.money.reduce((sum,[value,count])=>sum+value*count,0),1500);
});
test('timer uses wall time, survives serialization and does not count a paused break', () => {
  const s = fresh();
  const restored=JSON.parse(JSON.stringify(s));
  assert.equal(C.elapsed(restored,61000),60000);
  const paused=C.pause(restored,61000);
  assert.equal(C.elapsed(paused,900000),60000);
  assert.equal(C.elapsed({...paused,runningSince:900000},960000),120000);
  assert.equal(C.elapsed(s,500),0);
});
test('timeout during first turn preserves current turn and gives second player a final turn', () => {
  let s=fresh(); const afterDeadline=1000+C.budget(s)+1000;
  s=C.requestFinish(s);
  assert.equal(C.shouldFinish(s),false);
  s=C.advance(s,afterDeadline);
  assert.equal(s.screen,'play');assert.equal(C.current(s),1);
  s=C.advance(s,afterDeadline);
  assert.equal(s.screen,'finish');assert.deepEqual(plain(s.turns),[1,1]);assert.equal(s.runningSince,null);
});
test('timeout during second turn ends that round without opening another one', () => {
  let s=C.advance(fresh(),5000);
  s=C.advance(s,1000+C.budget(s)+1000);
  assert.equal(s.screen,'finish');assert.deepEqual(plain(s.turns),[1,1]);
});
test('either person may go first and early finish uses equal turn counts', () => {
  let s=fresh(1);s=C.advance(s,3000);
  assert.equal(C.current(s),0);
  s=C.requestFinish(s);s=C.advance(s,4000);
  assert.equal(s.screen,'finish');assert.deepEqual(plain(s.turns),[1,1]);assert.equal(C.valid(s),true);
});
test('end request during equal-count active first turn targets the NEXT complete pair', () => {
  let s=fresh();s=C.advance(C.advance(s,2000),3000);
  s=C.requestFinish(s);assert.equal(s.targetTurns,2);
  s=C.advance(s,4000);assert.equal(s.screen,'play');
  s=C.advance(s,5000);assert.equal(s.screen,'finish');assert.deepEqual(plain(s.turns),[2,2]);
});
test('late timeout detection in advance uses exactly the same final pair', () => {
  let s=fresh();s=C.advance(s,1000+C.budget(s));
  assert.equal(s.targetTurns,1);assert.equal(s.screen,'play');
  s=C.advance(s,1000+C.budget(s));assert.equal(s.screen,'finish');
});
test('empty, negative, fractional, exponent and invalid scores cannot decide a winner', () => {
  for(const v of ['', ' ', '-1', '1.5', 'NaN', 'Infinity', '1e3', '10000000', null, undefined]) assert.equal(C.amount(v),null);
  assert.equal(C.total(['100','20','','0']),null);
  assert.equal(C.total(['100','20','0']),null);
  assert.equal(C.total(['100','20','0','0']),120);
  assert.equal(C.total(['0','0','0','0']),0);
});
test('scoring supports ties and correct winner on both sides', () => {
  assert.equal(C.winner([100,100]),'tie');assert.equal(C.winner([0,100]),1);assert.equal(C.winner([100,0]),0);
});
test('stored sessions reject malformed clocks, turns, costs, screens and result input', () => {
  const s=fresh();assert.equal(C.valid(s),true);assert.equal(C.valid(null),false);
  for(const bad of [{version:0},{names:['x']},{minutes:25},{elapsed:-1},{runningSince:'today'},{turns:[2,0]},{turns:[0,1]},{screen:'other'},{step:9},{costs:{orange:-1,red:680}},{scores:[{},null]},{ending:true,targetTurns:null},{screen:'result',winner:null},{screen:'result',winner:0,finishReason:'time'}]) assert.equal(C.valid({...s,...bad}),false,JSON.stringify(bad));
  assert.equal(C.valid({...s,screen:'result',winner:0,finishReason:'bankruptcy'}),true);
});
test('valid names remain plain data, are trimmed and limited for safe rendering', () => {
  const s=C.createSession(['  <img src=x>  ','a'.repeat(30)],45,true);
  assert.equal(s.names[0],'<img src=x>');assert.equal(s.names[1].length,16);assert.equal(C.valid(s),true);
});

test('unified presets create unlimited classic or pre-owned timed games',()=>{
  const classic=C.createPreset(D.players,'classic');assert.equal(classic.minutes,null);assert.equal(classic.quick,false);assert.equal(C.budget(classic),Infinity);assert.equal(C.valid(JSON.parse(JSON.stringify(classic))),true);
  for(const minutes of [30,60]){const s=C.createPreset(D.players,String(minutes));assert.equal(s.minutes,minutes);assert.equal(s.quick,true);assert.equal(C.budget(s),(minutes-10)*60000);assert.equal(C.valid(s),true);}
  assert.throws(()=>C.createPreset(D.players,'45'));
});

test('classic never times out but manual finishing still gives both players equal turns',()=>{
  let s={...C.createPreset(D.players,'classic'),screen:'play',runningSince:1000};
  const later=1000+365*24*60*60000;
  s=C.advance(s,later);assert.equal(s.screen,'play');assert.equal(s.ending,false);assert.equal(C.remaining(s,later),Infinity);
  s=C.requestFinish(s);s=C.advance(s,later+1000);assert.equal(s.screen,'finish');assert.deepEqual(plain(s.turns),[1,1]);assert.equal(C.valid(s),true);
});

test('player colors stay distinct by swapping the other color and survive stored sessions',()=>{
  let colors=C.chooseColor(['blue','rose'],0,'teal');assert.deepEqual(plain(colors),['teal','rose']);
  const old=plain(colors);colors=C.chooseColor(colors,1,'teal');assert.deepEqual(plain(colors),['rose','teal']);assert.deepEqual(old,['teal','rose']);
  const s={...fresh(),playerColors:colors};assert.equal(C.valid(JSON.parse(JSON.stringify(s))),true);
  for(const playerColors of [['blue','blue'],['blue','unknown'],['blue'],null,['blue','constructor']])assert.equal(C.valid({...s,playerColors}),false);
  assert.throws(()=>C.chooseColor(colors,0,'constructor'));assert.throws(()=>C.chooseColor(colors,2,'blue'));
});

test('legacy 45-minute and basic saves without colors retain valid clocks and modes',()=>{
  for(const quick of [true,false]){const s={...C.createSession(D.players,45,quick),screen:'play',turns:[2,2],elapsed:120000,playerColors:undefined};assert.equal(C.valid(JSON.parse(JSON.stringify(s))),true);assert.equal(C.remaining(s,0),33*60000);}
  assert.equal(C.valid({...fresh(),minutes:null,quick:true}),false);
});
