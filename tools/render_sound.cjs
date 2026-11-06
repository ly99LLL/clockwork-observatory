// Render the same score and envelopes as Web Audio for review and clipping checks.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
vm.runInThisContext(fs.readFileSync(path.join(__dirname,'../dist/audio.js'),'utf8'));
const output=path.join(__dirname,'../artifacts');fs.mkdirSync(output,{recursive:true});
function render(name,events){
  const notes=events.flatMap(e=>ClockworkAudio.score(e.kind,e.combo,e.perfect).map(n=>({...n,at:n.at+e.at}))),rate=44100;
  const seconds=Math.max(...notes.map(n=>n.at+n.duration))+.1,samples=Math.ceil(seconds*rate),buffer=Buffer.alloc(44+samples*2);
  buffer.write('RIFF',0);buffer.writeUInt32LE(buffer.length-8,4);buffer.write('WAVEfmt ',8);buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(1,22);buffer.writeUInt32LE(rate,24);buffer.writeUInt32LE(rate*2,28);buffer.writeUInt16LE(2,32);buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(samples*2,40);
  let peak=0;
  for(let i=0;i<samples;i++){
    const t=i/rate;let value=0;
    for(const n of notes){const u=t-n.at;if(u<0||u>=n.duration)continue;const envelope=u<.008?.0001*Math.pow(n.gain/.0001,u/.008):n.gain*Math.pow(.0001/n.gain,(u-.008)/(n.duration-.008));const sine=Math.sin(2*Math.PI*n.frequency*u);value+=(n.type==='triangle'?2/Math.PI*Math.asin(sine):sine)*envelope*.72;}
    peak=Math.max(peak,Math.abs(value));buffer.writeInt16LE(Math.round(Math.max(-1,Math.min(1,value))*32767),44+i*2);
  }
  if(peak>=.95)throw new Error('Clipping risk');
  const file=path.join(output,name+'.wav');fs.writeFileSync(file,buffer);console.log(JSON.stringify({file,duration:seconds.toFixed(2),peak:peak.toFixed(3)}));
}
render('reward-preview',[{kind:'clear',combo:1,at:0},{kind:'clear',combo:3,perfect:true,at:1},{kind:'win',at:2}]);
render('clear-reward',[{kind:'clear',combo:1,perfect:true,at:0}]);
render('win-reward',[{kind:'win',at:0}]);
