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
  let input=[],traces={},states=[],position=0,timer=null;
  function stop(){clearTimeout(timer);timer=null;$('sort-play').textContent='Play sort';}
  function draw(){const state=states[position],finished=position===states.length-1;
    $('sort-bars').replaceChildren(...state.values.map((value,i)=>{const bar=element('span');bar.style.height=`${value*1.5}px`;bar.className=state.active.includes(i)?'active':state.settled.includes(i)?'sorted':'';bar.append(element('b',String(value)));return bar;}));
    $('sort-bars').setAttribute('aria-label',`Array: ${state.values.join(', ')}. ${state.message}`);
    $('sort-status').textContent=finished?`SORTED · ${input.length} VALUES`:`STEP ${position} / ${states.length-1}`;
    $('sort-explanation').textContent=state.message;
    $('sort-comparisons').textContent=String(state.comparisons);$('sort-writes').textContent=String(state.writes);$('sort-swaps').textContent=String(state.swaps);
    $('sort-step').disabled=finished;$('sort-play').disabled=finished;
  }
  function select(){stop();position=0;const kind=$('sort-algorithm').value,meta=SortModel.algorithms[kind];states=traces[kind];$('sort-description').textContent=meta.description;$('complexity-name').textContent=meta.name;$('complexity-note').textContent=meta.note;$('sort-source').href=`https://github.com/geddie212/sort_algorithms/blob/main/${meta.file}`;
    $('sort-complexity').replaceChildren(...[['Best time',meta.best],['Average time',meta.average],['Worst time',meta.worst],['Auxiliary space',meta.space]].map(([title,value])=>{const row=element('div');row.append(element('dt',title),element('dd',value));return row;}));
    document.querySelectorAll('#sort-comparison tr').forEach(row=>row.classList.toggle('selected',row.dataset.sort===kind));draw();
  }
  function prepare(){stop();const shape=$('sort-input').value;input=[18,24,31,37,43,49,55,62,69,77,86,96];if(shape==='reverse')input.reverse();if(shape==='duplicates')input=[43,18,69,43,18,69,43,18,69,43,18,69];if(shape==='random'){for(let i=input.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[input[i],input[j]]=[input[j],input[i]];}}
    traces=Object.fromEntries(Object.keys(SortModel.algorithms).map(key=>[key,SortModel.trace(key,input)]));
    $('sort-comparison').replaceChildren(...Object.entries(SortModel.algorithms).map(([key,meta])=>{const row=element('tr');row.dataset.sort=key;[meta.name,meta.best,meta.average,meta.worst,meta.space,traces[key].at(-1).comparisons].forEach(value=>row.append(element('td',String(value))));return row;}));select();
  }
  function advance(){if(position>=states.length-1){stop();return false;}position++;draw();if(position===states.length-1){stop();return false;}return true;}
  function tick(){if(advance())timer=setTimeout(tick,720-Number($('sort-speed').value)*125);}
  $('sort-step').addEventListener('click',()=>{stop();advance();});$('sort-reset').addEventListener('click',prepare);$('sort-replay').addEventListener('click',select);$('sort-algorithm').addEventListener('change',select);$('sort-input').addEventListener('change',prepare);
  $('sort-play').addEventListener('click',()=>{if(timer!==null){stop();return;}if(motion.matches){position=states.length-1;draw();return;}$('sort-play').textContent='Pause';tick();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});motion.addEventListener('change',stop);new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)stop();}).observe($('sort-bars'));prepare();
})();
