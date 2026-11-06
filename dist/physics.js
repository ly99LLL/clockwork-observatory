/* Deterministic arcade mechanics. World units are independent of the camera. */
(() => {
  const TAU=Math.PI*2,DT=1/120,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const wrap=a=>((a+Math.PI)%TAU+TAU)%TAU-Math.PI;
  const SPIRAL_TURNS=1.5,SPIRAL_INNER=27,SPIRAL_OUTER=103;
  function spiralPoint(r,progress=r.progress||0){const p=clamp(progress,0,1),a=r.angle-(1-p)*TAU*SPIRAL_TURNS,radius=SPIRAL_INNER+(SPIRAL_OUTER-SPIRAL_INNER)*p;return {x:r.x+Math.cos(a)*radius,y:r.y+Math.sin(a)*radius};}
  const definitions=[
    {name:'弦月转轮',type:'crescent',subtitle:'将金色缺口转到下方出口',time:7.6,tolerance:.23,base:-1.15},
    {name:'星轨漏斗',type:'dish',subtitle:'漏斗在摆动，跟住下方的光',time:7,tolerance:.24,base:3.75},
    {name:'黄铜闸门',type:'shutter',subtitle:'先对准，再按空格打开闸门',time:7.4,tolerance:.25,base:-.6},
    {name:'螺旋轨道',type:'spiral',subtitle:'按住 D 沿槽送球；到外缘后用 A / D 对准出口',time:8.4,tolerance:.23,base:-1.4},
    {name:'午夜星轮',type:'iris',subtitle:'抵住反转，把最后的缺口送到底部',time:6.5,tolerance:.20,base:3.6}
  ];
  function create(seed=1,practice=false){
    let n=(seed>>>0)||1;
    const random=()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296;};
    return {practice,status:'ready',phase:'fall',active:practice?3:0,cleared:0,time:0,score:0,combo:0,bestCombo:0,lives:3,events:[],trail:[],flight:0,flightDuration:.65,from:{x:300,y:practice?950:40},ball:{x:300,y:practice?950:40},theta:-1.25,omega:2.8,hold:0,rebound:0,stages:definitions.map((d,i)=>({...d,x:300,y:230+i*300,angle:d.base+(random()-.5)*.55,velocity:0,left:d.time,progress:0,trackSpeed:0,done:false})),reason:''};
  }
  function start(s){if(s.status!=='ready')return;s.status='running';s.events=['start'];}
  function target(s){const r=s.stages[s.active];return Math.PI/2+(r.type==='dish'?Math.sin(s.time*1.3)*.17:0);}
  function aligned(s){const r=s.stages[s.active];return Math.abs(wrap(r.angle-target(s)))<r.tolerance;}
  function ready(s){const r=s.stages[s.active];return r.type!=='spiral'||r.progress>=1;}
  function setBall(s){const r=s.stages[s.active];if(r.type==='spiral'){s.ball=spiralPoint(r);return;}const radius=r.type==='dish'?63+8*Math.sin(s.time*3):r.type==='shutter'?62:89;s.ball.x=r.x+Math.cos(s.theta)*radius;s.ball.y=r.y+Math.sin(s.theta)*radius;}
  function rotateBy(s,delta){if(s.status!=='running'||s.phase!=='orbit'||s.rebound)return false;const r=s.stages[s.active];r.angle=wrap(r.angle+delta);r.velocity=0;if(r.type==='spiral'){r.trackSpeed=delta>0?clamp(r.trackSpeed+delta*.8,0,.7):r.trackSpeed*.65;setBall(s);}return true;}
  function release(s){const r=s.stages[s.active];r.done=true;s.cleared++;s.combo++;s.bestCombo=Math.max(s.bestCombo,s.combo);const quick=r.left/r.time>.55;s.score+=Math.round(100+r.left*35+s.combo*70+(quick?150:0));s.events.push({type:'clear',stage:s.active,quick,combo:s.combo});s.phase='fall';s.flight=0;s.flightDuration=Math.max(.42,.76-s.combo*.055);s.from={...s.ball};s.via={x:r.x,y:r.y+148};s.hold=0;s.active++;}
  function strike(s){s.lives--;s.combo=0;s.reason='蒸汽压力耗尽';s.events.push({type:'strike',stage:s.active});if(s.lives<=0){s.status='lost';s.events.push({type:'lost'});return;}const r=s.stages[s.active];r.left=r.time;r.angle=r.base;r.velocity=0;r.progress=0;r.trackSpeed=0;s.rebound=.7;s.theta=-.9;s.omega=3;s.hold=0;}
  function step(s,dt=DT,input={}){
    if(s.status!=='running')return;s.events=[];s.time+=dt;
    if(s.phase==='fall'){
      s.flight+=dt;const t=clamp(s.flight/s.flightDuration,0,1),e=t*t;
      const practiceEnd=s.practice&&s.active===4,arrival=practiceEnd?null:s.stages[s.active],radius=arrival?(arrival.type==='dish'?63+8*Math.sin(s.time*3):arrival.type==='shutter'?62:89):0;
      const dest=practiceEnd?{x:300,y:1365}:arrival?(arrival.type==='spiral'?spiralPoint(arrival,0):{x:300+Math.cos(-1.25)*radius,y:arrival.y+Math.sin(-1.25)*radius}):{x:300,y:1765};
      if(s.via){const first=t<.55,p=first?s.from:s.via,q=first?s.via:dest,u=first?t/.55:(t-.55)/.45;s.ball.x=p.x+(q.x-p.x)*u;s.ball.y=p.y+(q.y-p.y)*Math.pow(u,1.35);}else{s.ball.x=s.from.x+(dest.x-s.from.x)*t+Math.sin(t*Math.PI)*18;s.ball.y=s.from.y+(dest.y-s.from.y)*e;}
      if(t>=1){s.via=null;if(s.active>=5||practiceEnd){s.status='won';s.events.push({type:'win'});return;}s.phase='orbit';s.theta=-1.25;s.omega=2.8;s.hold=0;s.events.push({type:'arrive',stage:s.active});setBall(s);}return;
    }
    const r=s.stages[s.active];if(s.rebound>0){s.rebound=Math.max(0,s.rebound-dt);s.theta+=s.omega*dt;setBall(s);return;}
    r.left=Math.max(0,r.left-dt);if(!r.left){strike(s);return;}
    const turn=clamp(Number(input.turn)||0,-1,1),desired=turn*2.65;
    r.velocity+=(desired-r.velocity)*Math.min(1,dt*10);
    const delta=r.velocity*dt+(r.type==='iris'?-.28*dt:0);r.angle=wrap(r.angle+delta);
    if(r.type==='spiral'){
      // A visible rolling position replaces the hidden winding counter. Positive
      // drum rotation drives the marble outward; reverse rotation brakes it.
      const speed=turn<-.1?.012:.035+Math.max(0,r.velocity)*.17;
      r.trackSpeed+=(speed-r.trackSpeed)*Math.min(1,dt*7);
      r.progress=clamp(r.progress+r.trackSpeed*dt,0,1);setBall(s);
      if(ready(s)&&aligned(s))s.hold+=dt;else s.hold=0;
      if(s.hold>.11)release(s);return;
    }
    // The marble keeps rolling around the bowl instead of stopping for a turn.
    s.omega+=(4.8*Math.cos(s.theta)-s.omega*.17+Math.sin(s.time*2)*.35)*dt;s.theta+=s.omega*dt;setBall(s);
    const ballNearExit=Math.abs(wrap(s.theta-Math.PI/2))<.75;
    if(aligned(s)&&ready(s)){s.hold+=dt;}else s.hold=Math.max(0,s.hold-dt*3);
    if(input.press&&r.type==='shutter'){
      if(aligned(s)&&s.hold>.07){release(s);return;}
      r.left=Math.max(.01,r.left-.65);s.events.push({type:'reject'});
    }
    if(r.type!=='shutter'&&s.hold>.11&&ballNearExit&&ready(s))release(s);
  }
  globalThis.Clockwork={DT,TAU,clamp,wrap,definitions,create,start,target,aligned,ready,step,spiralPoint,rotateBy};
})();
