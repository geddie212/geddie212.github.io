'use strict';
(() => {
  const $=id=>document.getElementById(id);
  const element=(tag,text,className)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;};
  const svgElement=(tag,attrs,text)=>{const el=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [key,value] of Object.entries(attrs))el.setAttribute(key,value);if(text!==undefined)el.textContent=text;return el;};
  const signal=BioModel.stream(),turns=BioModel.extrema(signal),unit=690/signal.length;
  const x=i=>35+(i+.5)*unit,y=v=>185-75*v;
  $('bio-path').setAttribute('d',signal.map((v,i)=>`${i?'L':'M'}${x(i)} ${y(v)}`).join(' '));
  for(let i=0;i<4;i++){
    $('bio-segments').append(svgElement('line',{x1:35+i*30*unit,y1:35,x2:35+i*30*unit,y2:275,stroke:'currentColor','stroke-opacity':'.18','stroke-dasharray':'4 5'}));
    $('bio-segments').append(svgElement('text',{x:x(i*30+14.5),y:297,'text-anchor':'middle','font-size':16,'font-family':'monospace',fill:'currentColor'},String(i*30)+'–'+String((i+1)*30-1)));
  }
  const featureLabels={mean:'Mean',std:'Standard deviation',min:'Window minimum',max:'Window maximum',energy:'Energy · Σx²',count:'Sample count'};
  function bio(){
    const width=Number($('bio-width').value);$('bio-position').max=signal.length-width;
    const start=Math.min(Number($('bio-position').value),signal.length-width);$('bio-position').value=start;
    const end=start+width,samples=signal.slice(start,end),f=BioModel.features(samples),result=BioModel.predict(f);
    $('bio-window').setAttribute('x',35+start*unit);$('bio-window').setAttribute('width',width*unit);
    $('bio-position-label').textContent=String(start);$('bio-width-label').textContent=`${width} samples`;
    $('bio-points').replaceChildren(...signal.map((v,i)=>{const point=svgElement('circle',{cx:x(i),cy:y(v),r:i>=start&&i<end?3.3:1.9,fill:i>=start&&i<end?'var(--accent)':'currentColor',opacity:i>=start&&i<end?1:.27});point.append(svgElement('title',{},`Sample ${i}: ${v.toFixed(3)}`));return point;}));
    const activePeaks=turns.peaks.filter(i=>i>=start&&i<end),activeTroughs=turns.troughs.filter(i=>i>=start&&i<end);
    $('bio-turns').replaceChildren(...[...activePeaks.map(i=>({i,peak:true})),...activeTroughs.map(i=>({i,peak:false}))].map(({i,peak})=>{const xx=x(i),yy=y(signal[i])+(peak?-12:12);return svgElement('path',{d:peak?`M${xx} ${yy-5}l-5 8h10Z`:`M${xx} ${yy+5}l-5-8h10Z`,fill:'var(--accent)'});}));
    const maxIndex=start+samples.indexOf(f.max),minIndex=start+samples.indexOf(f.min);
    $('bio-extremes').replaceChildren(...[{i:maxIndex,name:'MAX',value:f.max,offset:-31},{i:minIndex,name:'MIN',value:f.min,offset:35}].map(({i,name,value,offset})=>{
      const group=svgElement('g',{'pointer-events':'none'}),yy=Math.max(50,Math.min(260,y(value)+offset)),xx=Math.max(45,Math.min(555,x(i)+12));
      group.append(svgElement('circle',{cx:x(i),cy:y(value),r:6.5,fill:'var(--card)',stroke:'var(--accent)','stroke-width':2}),svgElement('line',{x1:x(i),y1:y(value),x2:xx,y2:yy-5,stroke:'var(--accent)','stroke-width':1}),svgElement('text',{x:xx,y:yy,'font-size':17,'font-family':'monospace',fill:'var(--accent)','paint-order':'stroke',stroke:'var(--card)','stroke-width':4},`${name} ${value.toFixed(2)}`));return group;
    }));
    const mixed=Math.floor(start/30)!==Math.floor((end-1)/30);
    $('bio-result').textContent=`SAMPLES ${start}–${end-1} · ${width} SELECTED · ${activePeaks.length} LOCAL PEAKS / ${activeTroughs.length} TROUGHS${mixed?' · MIXED ACTIVITY WINDOW':''}`;
    $('bio-features').replaceChildren(...BioModel.keys.map(key=>{const tile=element('div',undefined,'feature-tile');tile.append(element('span',featureLabels[key]),element('output',key==='count'?String(f[key]):f[key].toFixed(3)));tile.dataset.feature=key;return tile;}));
    $('bio-samples').replaceChildren(...samples.map((value,local)=>{const i=local+start,row=element('tr');const annotations=[];if(i===maxIndex)annotations.push('Window max');if(i===minIndex)annotations.push('Window min');if(activePeaks.includes(i))annotations.push('Local peak');if(activeTroughs.includes(i))annotations.push('Local trough');row.append(element('td',String(i)),element('td',value.toFixed(3)),element('td',annotations.join(' · ')||'—'));return row;}));
    const openTrees=[...$('forest-trees').children].map(node=>node.open);
    $('forest-trees').replaceChildren(...result.trees.map((tree,index)=>{
      const card=element('details',undefined,'tree-card');card.open=!!openTrees[index];const summary=element('summary');
      summary.append(element('span',`TREE ${String(index+1).padStart(2,'0')}`));
      const icon=svgElement('svg',{viewBox:'0 0 90 70','aria-hidden':'true'});
      icon.append(svgElement('path',{d:'M45 10L20 35L10 60M20 35L30 60M45 10L70 35L60 60M70 35L80 60',fill:'none',stroke:'currentColor','stroke-opacity':'.25','stroke-width':2}));
      icon.append(svgElement('path',{d:tree.path[0]?.left?'M45 10L20 35':'M45 10L70 35',fill:'none',stroke:'var(--accent)','stroke-width':3}));
      for(const [cx,cy] of [[45,10],[20,35],[70,35],[10,60],[30,60],[60,60],[80,60]])icon.append(svgElement('circle',{cx,cy,r:3.5,fill:'currentColor'}));
      summary.append(icon,element('strong',tree.label),element('small','Follow decisions +'));card.append(summary);
      const list=element('ol');tree.path.forEach(decision=>list.append(element('li',`${decision.feature}: ${decision.value.toFixed(3)} ${decision.left?'≤':'>'} ${decision.threshold.toFixed(3)} → ${decision.left?'left':'right'}`)));
      card.append(list,element('p','Leaf proportions: '+tree.probs.map((v,i)=>`${BioModel.labels[i]} ${(v*100).toFixed(0)}%`).join(' / ')));return card;
    }));
    $('bio-prediction').textContent=result.label;
    $('bio-scores').replaceChildren(...result.scores.map((score,i)=>{const row=element('div',undefined,'score-row'),track=element('span',undefined,'score-track'),fill=element('i');fill.style.width=`${score*100}%`;track.append(fill);row.append(element('span',BioModel.labels[i]),track,element('output',`${(score*100).toFixed(1)}%`));return row;}));
    document.querySelectorAll('[data-activity]').forEach(button=>button.setAttribute('aria-pressed',String(!mixed&&Math.floor(start/30)===Number(button.dataset.activity))));
  }
  $('bio-position').addEventListener('input',bio);$('bio-width').addEventListener('input',bio);
  document.querySelectorAll('[data-activity]').forEach(button=>button.addEventListener('click',()=>{if(Number($('bio-width').value)>30)$('bio-width').value=24;$('bio-position').max=signal.length-Number($('bio-width').value);$('bio-position').value=Number(button.dataset.activity)*30;bio();}));
  let dragId=null,dragOffset=0;
  function point(event){return new DOMPoint(event.clientX,event.clientY).matrixTransform($('biosignal').getScreenCTM().inverse()).x;}
  $('bio-window').addEventListener('pointerdown',event=>{if(dragId!==null||event.button!==0)return;dragId=event.pointerId;dragOffset=point(event)-(35+Number($('bio-position').value)*unit);$('bio-window').setPointerCapture(dragId);});
  $('bio-window').addEventListener('pointermove',event=>{if(event.pointerId!==dragId)return;$('bio-position').value=Math.round((point(event)-35-dragOffset)/unit);bio();});
  for(const name of ['pointerup','pointercancel','lostpointercapture'])$('bio-window').addEventListener(name,event=>{if(event.pointerId===dragId)dragId=null;});
  bio();



  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const SVGNS='http://www.w3.org/2000/svg';
  const MKL_PLOT_W=1000,MKL_PAD_SPREAD=60,MKL_PAD_PACKED=120,MKL_SPLIT_GAP=40,MKL_MERGE_GAP=260;
  const MKL_RX=36,MKL_RY=19,MKL_TOP=42,MKL_BOTTOM=92;
  const MKL_GAP={3:66,2:50,1:42};
  const MKL_BOX_H=26;
  const MKL_SPEED=3;
  let mklLists=[],mklTrace=null,mklPosition=0,mklTimer=null,mklGap=50,mklHeight=400;
  let mklColumnEls=new Map(),mklBoxWidths={},mklBoxSeen=new Set(),mklSplitLineEl=null,mklArrayDecorEl=null;
  function mklStop(){clearTimeout(mklTimer);mklTimer=null;$('mkl-play').classList.remove('is-playing');$('mkl-play').setAttribute('aria-label','Play');$('mkl-play').setAttribute('aria-pressed','false');}
  /* Long chains compress their vertical spacing so the fixed-size board never needs to resize. */
  const mklStrideFor=count=>count>=8?1:(count>=5?2:3);

  /* ---- ASCII panel: only the mergeSort(...) call trace now lives here as plain text ---- */
  const gridNew=()=>({rows:[]});
  function gridPut(grid,x,y,ch,cls){
    if(x<0||y<0)return;
    while(grid.rows.length<=y)grid.rows.push([]);
    const row=grid.rows[y];
    while(row.length<x)row.push(null);
    row[x]={ch,cls:cls||''};
  }
  function gridText(grid,x,y,text,cls){for(let i=0;i<text.length;i++)gridPut(grid,x+i,y,text[i],cls);}
  function gridRender(grid){
    const frag=document.createDocumentFragment();
    grid.rows.forEach((row,index)=>{
      const segments=[];
      for(let x=0;x<row.length;x++){
        const cell=row[x]||{ch:' ',cls:''};
        const last=segments[segments.length-1];
        if(last&&last.cls===cell.cls)last.text+=cell.ch;else segments.push({cls:cell.cls,text:cell.ch});
      }
      for(const segment of segments){
        if(segment.cls)frag.append(element('span',segment.text,segment.cls));
        else frag.append(document.createTextNode(segment.text));
      }
      if(index<grid.rows.length-1)frag.append(document.createTextNode('\n'));
    });
    return frag;
  }
  let mklLastCalls=null,mklLastCurrent=-1;
  function mklPaintCalls(state){
    if(state.calls){mklLastCalls=state.calls;mklLastCurrent=state.current;}
    const grid=gridNew();
    if(mklLastCalls)mklLastCalls.forEach((call,index)=>gridText(grid,0,index,call.text,state.calls&&index===mklLastCurrent?'mkl-x-accent':(call.leaf?'mkl-x-dim':'')));
    else gridText(grid,0,0,'mergeSort(lists, 0, '+(state.k-1)+') has not been called yet.','mkl-x-dim');
    return grid;
  }

  /* ---- SVG board: one persistent <g> per chain key (l-r), reused and re-positioned ----
     ---- every step, so CSS transitions animate the slide/fade instead of a hard jump.  ---- */
  const mklLeafKey=i=>`${i}-${i}`;
  /* Returns a function node -> gap size (0 = still one unsplit group). A node that is
     the one actively merging this exact step reserves extra room: it must fit three
     columns (ls, the growing out chain, rs), not just the usual two-way split. */
  function mklGapForNode(state){
    if(state.phase==='divide'){
      const visited=new Set((state.callKeys||[]).slice(0,(state.current??-1)+1));
      const leafKeys=new Set(Array.from({length:state.k},(_,i)=>mklLeafKey(i)));
      return node=>(visited.has(node.key)&&!leafKeys.has(node.key))?MKL_SPLIT_GAP:0;
    }
    if(state.phase==='lists'||state.phase==='array')return()=>0;
    const mergingKey=state.phase==='merge'&&state.range?`${state.range[0]}-${state.range[1]}`:null;
    return node=>{
      const open=state.chains.some(c=>c.l===node.left.l&&c.r===node.left.r)
        &&state.chains.some(c=>c.l===node.right.l&&c.r===node.right.r);
      if(!open)return 0;
      return node.key===mergingKey?MKL_MERGE_GAP:MKL_SPLIT_GAP;
    };
  }
  function mklLeafCount(node){return node.leaf?1:mklLeafCount(node.left)+mklLeafCount(node.right);}
  function mklLeafPositions(tree,k,gapFor,packed){
    const pad=packed?MKL_PAD_PACKED:MKL_PAD_SPREAD;
    const positions={};
    function assign(node,x0,x1){
      if(node.leaf){positions[node.l]=(x0+x1)/2;return;}
      const gap=gapFor(node);
      const leftLeaves=mklLeafCount(node.left),rightLeaves=mklLeafCount(node.right);
      const leftWidth=(x1-x0-gap)*leftLeaves/(leftLeaves+rightLeaves);
      assign(node.left,x0,x0+leftWidth);
      assign(node.right,x0+leftWidth+gap,x1);
    }
    assign(tree,pad,MKL_PLOT_W-pad);
    return positions;
  }
  function mklArrow(x,yFrom,yTo){
    const g=document.createElementNS(SVGNS,'g');
    g.setAttribute('class','mkl-arrow-g');
    g.append(
      svgElement('line',{x1:x,y1:yFrom,x2:x,y2:yTo+7}),
      svgElement('path',{d:`M${x-5} ${yTo+10}L${x} ${yTo}L${x+5} ${yTo+10}Z`})
    );
    return g;
  }
  function mklNodeShape(x,y,node,opts){
    opts=opts||{};
    const g=document.createElementNS(SVGNS,'g');
    g.setAttribute('class','mkl-node'+(opts.dim?' mkl-node-dim':''));
    g.append(svgElement('ellipse',{cx:x+3,cy:y+3,rx:MKL_RX,ry:MKL_RY,class:'mkl-node-shadow'}));
    if(opts.active)g.append(svgElement('ellipse',{cx:x,cy:y,rx:MKL_RX+5,ry:MKL_RY+5,class:'mkl-node-ring'}));
    g.append(svgElement('ellipse',{cx:x,cy:y,rx:MKL_RX,ry:MKL_RY,class:'mkl-origin-'+node.o}));
    g.append(svgElement('text',{x,y:y+5,'text-anchor':'middle',class:'mkl-node-text'},String(node.v)));
    return g;
  }
  function mklColumnLabel(col){
    if(col.kind==='ls')return'ls = '+col.label;
    if(col.kind==='rs')return'rs = '+col.label;
    if(col.kind==='out')return'out = '+col.label;
    return col.label;
  }
  function mklColumnLabelClass(col){
    if(col.kind==='out')return'mkl-x-accent';
    if(col.kind==='ls'||col.kind==='rs')return'mkl-x-ink';
    return col.l===col.r?'mkl-origin-text-'+col.l:'mkl-x-ink';
  }
  function mklBuildColumnInner(chain,packed){
    const n=chain.values.length,baseY=mklHeight-MKL_BOTTOM;
    const els=[];
    els.push(svgElement('text',{x:0,y:26,'text-anchor':'middle',class:'mkl-col-label '+mklColumnLabelClass(chain)},mklColumnLabel(chain)));
    const topY=n?baseY-mklGap*(n-1):baseY,nullY=topY-MKL_RY-20;
    els.push(svgElement('text',{x:0,y:nullY,'text-anchor':'middle',class:'mkl-null'},'⌀'));
    const pointer=chain.kind==='ls'?'ls':chain.kind==='rs'?'rs':null;
    if(n)els.push(mklArrow(0,topY-MKL_RY-2,nullY+6));
    else if(pointer)els.push(svgElement('text',{x:MKL_RX+16,y:nullY+6,class:'mkl-pointer-label mkl-x-dim'},'◀ '+pointer+' = ⌀'));
    for(let i=0;i<n;i++){
      const y=baseY-mklGap*i;
      const dim=pointer&&i<chain.consumed;
      const active=pointer?i===chain.consumed:(chain.kind==='out'&&i===n-1);
      els.push(mklNodeShape(0,y,chain.values[i],{dim,active}));
      if(i<n-1)els.push(mklArrow(0,y-MKL_RY-2,y-mklGap+MKL_RY+2));
      if(pointer&&i===chain.consumed)els.push(svgElement('text',{x:MKL_RX+16,y:y+5,class:'mkl-pointer-label mkl-x-accent'},'◀ '+pointer));
    }
    if(pointer&&chain.consumed>=n&&n)els.push(svgElement('text',{x:MKL_RX+16,y:nullY+6,class:'mkl-pointer-label mkl-x-dim'},'◀ '+pointer+' = ⌀'));
    if(chain.kind==='out'&&n){
      els.push(svgElement('text',{x:MKL_RX+16,y:topY+5,class:'mkl-pointer-label mkl-x-accent'},'◀ curr'));
      if(n>1)els.push(svgElement('text',{x:MKL_RX+16,y:baseY+5,class:'mkl-pointer-label mkl-x-dim'},'◀ head'));
    }
    if(n){
      els.push(svgElement('text',{x:0,y:baseY+24,'text-anchor':'middle',class:'mkl-head-label'},'▲'));
      if(!packed){
        els.push(svgElement('text',{x:0,y:baseY+40,'text-anchor':'middle',class:'mkl-head-label'},'head'));
      }else if(chain.l===chain.r){
        const boxW=mklBoxWidths[chain.l]||140;
        const fresh=!mklBoxSeen.has(chain.l);mklBoxSeen.add(chain.l);
        const fadeCls=fresh?' mkl-fade-in':'';
        els.push(svgElement('rect',{x:-boxW/2,y:baseY+30,width:boxW,height:MKL_BOX_H,rx:4,class:'mkl-array-box mkl-origin-'+chain.l+fadeCls}));
        els.push(svgElement('text',{x:0,y:baseY+30+MKL_BOX_H+20,'text-anchor':'middle',class:'mkl-array-index mkl-origin-text-'+chain.l+fadeCls},String(chain.l)));
      }
    }
    return els;
  }
  function mklBoundaryNodes(tree){
    const byM={};
    (function walk(node){if(!node.leaf){byM[node.m]=node;walk(node.left);walk(node.right);}})(tree);
    return byM;
  }
  function mklArrayDecor(state,leafPos,gapFor,boundaryNodes){
    if(!state.array||state.phase==='done')return[];
    const k=state.k,baseY=mklHeight-MKL_BOTTOM,y=baseY+30+MKL_BOX_H/2+5;
    const els=[];
    let runStart=0;
    for(let i=0;i<k;i++){
      const boundaryOpen=i<k-1&&boundaryNodes[i]&&gapFor(boundaryNodes[i])>0;
      if(i===runStart)els.push(svgElement('text',{x:leafPos[i]-(mklBoxWidths[i]||140)/2-13,y,'text-anchor':'middle',class:'mkl-array-bracket'},'['));
      if(i<k-1&&!boundaryOpen){
        const midX=(leafPos[i]+leafPos[i+1])/2;
        els.push(svgElement('text',{x:midX,y,'text-anchor':'middle',class:'mkl-array-pipe'},'|'));
      }else{
        els.push(svgElement('text',{x:leafPos[i]+(mklBoxWidths[i]||140)/2+13,y,'text-anchor':'middle',class:'mkl-array-bracket'},']'));
        runStart=i+1;
      }
    }
    return els;
  }
  function mklSplitLine(state,leafPos){
    if(state.splitM==null)return[];
    /* During a merge, align the line to where the growing "out" chain actually sits
       (midpoint of its full l..r range) rather than the raw leaf boundary — with
       leaf-count-proportional spacing those two points coincide only when the two
       sides being merged have an equal number of leaves. */
    const x=state.phase==='merge'&&state.range
      ?(leafPos[state.range[0]]+leafPos[state.range[1]])/2
      :(leafPos[state.splitM]+leafPos[state.splitM+1])/2;
    const els=[svgElement('line',{x1:x,y1:10,x2:x,y2:mklHeight-14,class:'mkl-split-line'})];
    if(state.phase==='divide')els.push(svgElement('text',{x:x+10,y:28,class:'mkl-split-label'},'split'));
    return els;
  }
  /* Two layers: the split line sits behind every column (prepended), the array
     row decorations (brackets/pipes) sit in front of the array boxes (appended) —
     otherwise the box fills paint over the pipe glyphs at the seam. */
  function mklEnsureSplitLineEl(){
    if(!mklSplitLineEl){
      mklSplitLineEl=document.createElementNS(SVGNS,'g');
      mklSplitLineEl.setAttribute('class','mkl-split-line-g');
      $('mkl-board').prepend(mklSplitLineEl);
    }
    return mklSplitLineEl;
  }
  function mklEnsureArrayDecorEl(){
    if(!mklArrayDecorEl){
      mklArrayDecorEl=document.createElementNS(SVGNS,'g');
      mklArrayDecorEl.setAttribute('class','mkl-array-decor-g');
      $('mkl-board').appendChild(mklArrayDecorEl);
    }
    return mklArrayDecorEl;
  }
  function mklEnsureColumn(key){
    let entry=mklColumnEls.get(key);
    if(!entry){
      const g=document.createElementNS(SVGNS,'g');
      g.setAttribute('class','mkl-column');
      g.style.opacity='0';
      $('mkl-board').appendChild(g);
      entry={g,fading:false};
      mklColumnEls.set(key,entry);
    }
    if(entry.fading){clearTimeout(entry.fading);entry.fading=false;}
    return entry;
  }
  function mklSyncBoard(state){
    const packed=!!state.array;
    const gapFor=mklGapForNode(state);
    const leafPos=mklLeafPositions(mklTrace.tree,state.k,gapFor,packed);
    const boundaryNodes=mklBoundaryNodes(mklTrace.tree);
    mklEnsureSplitLineEl().replaceChildren(...mklSplitLine(state,leafPos));
    const seen=new Set();
    for(const chain of state.chains){
      const key=`${chain.l}-${chain.r}`;
      seen.add(key);
      const x=(leafPos[chain.l]+leafPos[chain.r])/2;
      const entry=mklEnsureColumn(key);
      entry.g.style.transform=`translateX(${x}px)`;
      entry.g.style.opacity='1';
      entry.g.replaceChildren(...mklBuildColumnInner(chain,packed));
    }
    for(const[key,entry]of mklColumnEls){
      if(!seen.has(key)&&!entry.fading){
        entry.g.style.opacity='0';
        entry.fading=setTimeout(()=>{entry.g.remove();mklColumnEls.delete(key);},420);
      }
    }
    const arrayDecorEl=mklEnsureArrayDecorEl();
    arrayDecorEl.replaceChildren(...mklArrayDecor(state,leafPos,gapFor,boundaryNodes));
    $('mkl-board').appendChild(arrayDecorEl);
  }
  function mklDraw(){
    const state=mklTrace.states[mklPosition],finished=mklPosition===mklTrace.states.length-1;
    $('mkl-phase').textContent=state.title;
    mklSyncBoard(state);
    $('mkl-canvas').replaceChildren(gridRender(mklPaintCalls(state)));
    $('mkl-board-wrap').setAttribute('aria-label',state.message);
    const stepLabel=`STEP ${mklPosition} / ${mklTrace.states.length-1} · ${state.phase.toUpperCase()}`;
    $('mkl-status').textContent=finished?`${stepLabel} · DONE — ${mklLists.length} LISTS MERGED`:stepLabel;
    $('mkl-explanation').textContent=state.message;
    $('mkl-comparisons').textContent=String(state.comparisons);$('mkl-writes').textContent=String(state.writes);$('mkl-merges').textContent=String(state.merges);
    $('mkl-step').disabled=finished;$('mkl-play').disabled=finished;
    $('mkl-back').disabled=mklPosition===0;
  }
  function mklPrepare(){
    mklStop();mklLists=MergeKListsModel.randomLists();mklTrace=MergeKListsModel.trace(mklLists);mklPosition=0;
    for(const[,entry]of mklColumnEls){clearTimeout(entry.fading);entry.g.remove();}
    mklColumnEls=new Map();mklBoxSeen=new Set();
    mklLastCalls=null;mklLastCurrent=-1;
    const totalNodes=mklTrace.totalNodes;
    mklGap=MKL_GAP[mklStrideFor(totalNodes)];
    mklHeight=MKL_TOP+mklGap*totalNodes+MKL_BOTTOM;
    /* Box width is sized to each leaf's own baseline (no-gap) spacing, not one global
       constant — otherwise a gap opening deep in the tree is too small to ever show
       through boxes sized for the much wider top-level spacing. */
    const basePos=mklLeafPositions(mklTrace.tree,mklTrace.k,()=>0,true);
    mklBoxWidths={};
    for(let i=0;i<mklTrace.k;i++){
      const toLeft=i>0?basePos[i]-basePos[i-1]:Infinity;
      const toRight=i<mklTrace.k-1?basePos[i+1]-basePos[i]:Infinity;
      mklBoxWidths[i]=Math.max(60,Math.min(toLeft,toRight)-28);
    }
    $('mkl-board').setAttribute('viewBox',`0 0 ${MKL_PLOT_W} ${mklHeight}`);
    $('mkl-k-value').textContent=String(mklLists.length);
    $('mkl-levels-value').textContent=String(totalNodes);
    mklDraw();
  }
  function mklReplay(){mklStop();mklPosition=0;mklDraw();}
  function mklAdvance(){if(mklPosition>=mklTrace.states.length-1){mklStop();return false;}mklPosition++;mklDraw();if(mklPosition===mklTrace.states.length-1){mklStop();return false;}return true;}
  function mklBack(){if(mklPosition<=0)return;mklPosition--;mklDraw();}
  function mklTick(){if(mklAdvance())mklTimer=setTimeout(mklTick,900-MKL_SPEED*150);}
  $('mkl-step').addEventListener('click',()=>{mklStop();mklAdvance();});
  $('mkl-back').addEventListener('click',()=>{mklStop();mklBack();});
  $('mkl-replay').addEventListener('click',mklReplay);
  $('mkl-new').addEventListener('click',mklPrepare);
  $('mkl-play').addEventListener('click',()=>{if(mklTimer!==null){mklStop();return;}if(motion.matches){mklPosition=mklTrace.states.length-1;mklDraw();return;}$('mkl-play').classList.add('is-playing');$('mkl-play').setAttribute('aria-label','Pause');$('mkl-play').setAttribute('aria-pressed','true');mklTick();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)mklStop();});motion.addEventListener('change',mklStop);new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)mklStop();}).observe($('mkl-board-wrap'));mklPrepare();
})();
