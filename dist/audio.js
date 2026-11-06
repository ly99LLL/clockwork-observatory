/* Reward sounds use rising major intervals; warning sounds stay short and soft. */
(() => {
  const hz=midi=>440*Math.pow(2,(midi-69)/12);
  function score(kind,combo=1,perfect=false){
    const notes=[];
    const note=(midi,at,duration,gain=.035,type='sine')=>notes.push({frequency:hz(midi),at,duration,gain,type});
    const bell=(midi,at,duration,gain)=>{note(midi,at,duration,gain);note(midi+12,at,duration*.58,gain*.16);};
    if(kind==='clear'){
      const root=72+[0,2,4,7,9][Math.max(0,Math.min(4,combo-1))];
      [0,4,7,12].forEach((n,i)=>bell(root+n,i*.065,i===3?.38:.19,i===3?.045:.034));
      if(perfect)bell(root+19,.29,.22,.016);
    }else if(kind==='win'){
      [72,76,79,84,88,91].forEach((n,i)=>bell(n,i*.095,.35,.034));
      [84,88,91].forEach(n=>bell(n,.64,.72,.025));
    }else if(kind==='arrive'){
      bell(79,0,.10,.013);
    }else if(kind==='start'){
      [60,67,72].forEach((n,i)=>bell(n,i*.07,.20,.023));
    }else if(kind==='strike'){
      note(55,0,.14,.025,'triangle');note(52,.12,.18,.020,'triangle');
    }else if(kind==='reject'){
      note(60,0,.07,.016,'triangle');
    }else if(kind==='tick'){
      note(67,0,.035,.006,'triangle');
    }
    return notes;
  }
  function create(){
    let ctx=null,master=null,muted=false;const voices=new Set();
    function activate(){
      if(muted)return;
      try{if(!ctx){const Context=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Context)return;ctx=new Context();master=ctx.createGain();master.gain.value=.72;master.connect(ctx.destination);}if(ctx.state==='suspended')ctx.resume().catch(()=>{});}catch{}
    }
    function stop(){for(const voice of voices){try{voice.gain.gain.cancelScheduledValues(ctx.currentTime);voice.gain.gain.setTargetAtTime(.0001,ctx.currentTime,.008);voice.osc.stop(ctx.currentTime+.04);}catch{}}}
    function play(kind,combo=1,perfect=false){
      if(muted||!ctx||ctx.state!=='running')return;
      if(kind==='clear'||kind==='win')stop();
      const now=ctx.currentTime+.005;
      for(const n of score(kind,combo,perfect)){
        const osc=ctx.createOscillator(),gain=ctx.createGain(),voice={osc,gain};
        osc.type=n.type;osc.frequency.setValueAtTime(n.frequency,now+n.at);
        gain.gain.setValueAtTime(.0001,now+n.at);gain.gain.exponentialRampToValueAtTime(n.gain,now+n.at+.008);gain.gain.exponentialRampToValueAtTime(.0001,now+n.at+n.duration);
        osc.connect(gain);gain.connect(master);voices.add(voice);
        osc.onended=()=>{osc.disconnect();gain.disconnect();voices.delete(voice);};osc.start(now+n.at);osc.stop(now+n.at+n.duration+.015);
      }
    }
    return {activate,play,stop,setMuted(value){muted=value;if(value)stop();else activate();}};
  }
  globalThis.ClockworkAudio={score,create};
})();
