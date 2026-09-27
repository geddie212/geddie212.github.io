'use strict';
(() => {
  const {loss, gradient, curvature, tangent, step} = LossMath;
  const $ = id => document.getElementById(id);
  const plot = $('plot'), weight = $('weight'), rate = $('rate');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let w = 2.3, count = 0, timer = null, dragging = null, history = [];
  const px = x => 380 + 105 * x, py = y => 475 - 105 * y;
  const format = (value, digits = 3) => (Math.abs(value) < 0.5 * 10 ** -digits ? 0 : value).toFixed(digits);
  function setStatus(text) { if ($('status').textContent !== text) $('status').textContent = text; }
  function stop() { clearTimeout(timer); timer = null; $('run').textContent = 'Run descent'; }
  function draw() {
    const t = tangent(w), x = px(w), y = py(loss(w));
    $('handle').setAttribute('transform', `translate(${x} ${y})`);
    // Preserve a >=48 CSS-pixel drag target as the SVG scales down on phones.
    $('hit').setAttribute('r', Math.max(25, 24 / Math.max(plot.getScreenCTM()?.a || 1, 0.01)));
    const a = Math.atan(t.m), half = 105;
    $('tangent').setAttribute('d', `M${x-half*Math.cos(a)} ${y+half*Math.sin(a)}L${x+half*Math.cos(a)} ${y-half*Math.sin(a)}`);
    $('baseline').setAttribute('d', `M${x-30} ${y}H${x+105}`);
    const arc = Array.from({length:25}, (_, i) => {const angle=a*i/24;return `${i?'L':'M'}${x+40*Math.cos(angle)} ${y-40*Math.sin(angle)}`;}).join(' ');
    $('angle-arc').setAttribute('d', arc);
    $('slope').textContent = format(t.m);
    $('angle').textContent = `${format(t.angle, 1)}°`;
    $('loss').textContent = format(loss(w));
    $('weight-label').textContent = format(w);
    $('rate-label').textContent = Number(rate.value).toFixed(2);
    $('equation').textContent = `Tangent: y = ${format(t.m)}w ${t.b < 0 ? '−' : '+'} ${format(Math.abs(t.b))}`;
    $('iteration').textContent = `Step ${String(count).padStart(3,'0')}`;
    weight.value = w;
    weight.setAttribute('aria-valuetext', `Weight ${format(w)}, loss ${format(loss(w))}, slope ${format(t.m)}`);
    $('trail').replaceChildren(...history.map(value => {const circle=document.createElementNS('http://www.w3.org/2000/svg','circle');circle.setAttribute('cx',px(value));circle.setAttribute('cy',py(loss(value)));circle.setAttribute('r','4');circle.setAttribute('class','trail-dot');return circle;}));
    document.dispatchEvent(new CustomEvent('gradient-change',{detail:{weight:w,slope:t.m}}));
  }
  function locationStatus() {
    if (Math.abs(gradient(w)) < 0.001) {
      if (curvature(w) < 0) return 'Stationary hilltop: zero slope, but a local maximum. Move the point slightly to either side.';
      return w < 0 ? 'Near the global minimum. The slope is approximately zero.' : 'Near a local minimum. The left valley has a lower loss.';
    }
    return gradient(w) > 0 ? 'Positive slope → the next descent step moves left.' : 'Negative slope → the next descent step moves right.';
  }
  function choose(value) {stop(); w=Math.max(-2.6,Math.min(2.6,value));count=0;history=[];draw();setStatus(locationStatus());}
  function advance() {
    if (Math.abs(gradient(w)) < 0.001) {stop();setStatus(locationStatus());return false;}
    history.push(w);if(history.length>100)history.shift();
    w=step(w,Number(rate.value));count++;draw();
    if(Math.abs(gradient(w))<0.001){stop();setStatus(locationStatus());return false;}
    return true;
  }
  function tick() {if(advance())timer=setTimeout(tick,220);}
  $('run').addEventListener('click',()=>{
    if(timer!==null){stop();setStatus('Paused. '+locationStatus());return;}
    if(reduceMotion.matches){for(let i=0;i<1000;i++){if(!advance())break;}setStatus('Reduced motion: descent computed without timed playback. '+locationStatus());return;}
    $('run').textContent='Pause';setStatus('Following the gradient. Drag the point or press Pause to stop.');tick();
  });
  $('step').addEventListener('click',()=>{stop();advance();setStatus(locationStatus());});
  $('reset').addEventListener('click',()=>choose(2.3));
  weight.addEventListener('input',()=>choose(Number(weight.value)));
  rate.addEventListener('input',()=>{stop();draw();setStatus(`Learning rate set to ${Number(rate.value).toFixed(2)}. `+locationStatus());});
  function drag(event) {
    const matrix=plot.getScreenCTM();if(!matrix)return;
    const point=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());
    choose((point.x-380)/105);
  }
  $('handle').addEventListener('pointerdown',event=>{
    if(dragging!==null||event.button!==0)return;
    dragging=event.pointerId;$('handle').setPointerCapture(event.pointerId);$('handle').classList.add('dragging');drag(event);
  });
  $('handle').addEventListener('pointermove',event=>{if(event.pointerId===dragging)drag(event);});
  function release(event){if(event.pointerId===dragging){dragging=null;$('handle').classList.remove('dragging');}}
  for(const name of ['pointerup','pointercancel','lostpointercapture'])$('handle').addEventListener(name,release);
  function setTheme(dark) {document.body.classList.toggle('dark',dark);$('theme-toggle').setAttribute('aria-pressed',String(dark));$('theme-toggle').textContent=dark?'Light mode':'Dark mode';$('theme-toggle').setAttribute('aria-label',dark?'Switch to light mode':'Switch to dark mode');document.querySelector('meta[name="theme-color"]').content=dark?'#1c231f':'#ebe8de';}
  $('theme-toggle').addEventListener('click',()=>{const dark=!document.body.classList.contains('dark');setTheme(dark);try{localStorage.setItem('portfolio-theme',dark?'dark':'light');}catch{}});
  let savedTheme;try{savedTheme=localStorage.getItem('portfolio-theme');}catch{}
  setTheme(savedTheme?savedTheme==='dark':matchMedia('(prefers-color-scheme: dark)').matches);
  new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)stop();},{threshold:0}).observe(plot);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();setStatus('Paused while the page is hidden.');}});
  reduceMotion.addEventListener('change',()=>{stop();setStatus('Motion preference updated. '+locationStatus());});
  window.addEventListener('resize',draw);
  $('curve').setAttribute('d',Array.from({length:321},(_,i)=>{const value=-2.65+i*5.3/320;return `${i?'L':'M'}${px(value)} ${py(loss(value))}`;}).join(' '));
  draw();setStatus(locationStatus());
})();
