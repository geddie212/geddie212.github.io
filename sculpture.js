'use strict';
(() => {
  const canvas = document.getElementById('sculpture');
  const button = document.getElementById('motion');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let gl;
  try { gl = canvas.getContext('webgl', {alpha:true, antialias:false, powerPreference:'low-power'}); } catch {}
  if (!gl) {canvas.hidden=true;button.hidden=true;return;}
  let frame=0, last=0, visible=true, paused=false, weight=2.3, lost=false;
  const vertexSource = `attribute vec2 p; uniform float time; uniform float weight; varying float depth;
    void main(){float w=p.x; float row=p.y; float w2=w*w; float y=.45*(w2*w2/4.-.1*w2*w-1.125*w2+.675*w)+2.;
    float offset=row*.031; float ripple=sin(w*2.5+row*.3+time*.3)*.008;
    gl_Position=vec4(w/3.05+offset*.34,(2.-y)/2.75-offset+ripple,0.,1.);
    depth=(1.-row/19.)*.17+exp(-pow(w-weight,2.)*2.)*.07;}`;
  const fragmentSource = `precision mediump float; varying float depth; void main(){gl_FragColor=vec4(.63,.76,.56,depth);}`;
  function shader(kind, source) {const s=gl.createShader(kind);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error('Shader compilation failed');return s;}
  let program, buffer, vertices, timeUniform, weightUniform;
  try {
    program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertexSource));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragmentSource));gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Program link failed');
    gl.useProgram(program);buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    vertices=[];for(let row=1;row<=18;row++){for(let i=0;i<130;i++){vertices.push(-2.65+i*5.3/130,row,-2.65+(i+1)*5.3/130,row);}}
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
    const location=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,2,gl.FLOAT,false,0,0);
    timeUniform=gl.getUniformLocation(program,'time');weightUniform=gl.getUniformLocation(program,'weight');gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  } catch {canvas.hidden=true;button.hidden=true;return;}
  function render(time=0) {
    if(lost)return;
    const size=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,1.5);
    const width=Math.max(1,Math.round(size.width*dpr)),height=Math.max(1,Math.round(size.height*dpr));
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;gl.viewport(0,0,width,height);}
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.uniform1f(timeUniform,time/1000);gl.uniform1f(weightUniform,weight);gl.drawArrays(gl.LINES,0,vertices.length/2);
  }
  function animate(time){frame=0;if(time-last>=40){render(time);last=time;}if(visible&&!document.hidden&&!paused&&!reduced.matches&&!lost)frame=requestAnimationFrame(animate);}
  function sync(){cancelAnimationFrame(frame);frame=0;render(last);if(visible&&!document.hidden&&!paused&&!reduced.matches&&!lost)frame=requestAnimationFrame(animate);button.textContent=paused||reduced.matches?'Resume ambience':'Pause ambience';button.setAttribute('aria-pressed',String(paused||reduced.matches));button.disabled=reduced.matches;button.title=reduced.matches?'Animation is paused by your reduced-motion preference':'';}
  button.addEventListener('click',()=>{paused=!paused;sync();});
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();}).observe(canvas);
  document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);
  document.addEventListener('gradient-change',event=>{weight=event.detail.weight;if(!frame)render(last);});
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;cancelAnimationFrame(frame);canvas.hidden=true;button.hidden=true;});
  window.addEventListener('resize',()=>render(last));sync();
})();
