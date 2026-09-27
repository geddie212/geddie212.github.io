/* Small deterministic teaching forest trained only on generated examples.
   This is not the BehaviorTrace model or participant data. */
(function(root){
  'use strict';
  const labels=['Sitting','Standing','Walking','Running'];
  function random(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
  function signalFor(label,n,rand){
    const means=[-.57,.02,.15,.26],amplitudes=[.035,.07,.48,.85],freq=[.15,.18,.44,.77];
    const phase=rand()*Math.PI*2,offset=(rand()-.5)*.12,amp=amplitudes[label]*(.8+rand()*.4);
    return Array.from({length:n},(_,i)=>means[label]+offset+amp*Math.sin(i*freq[label]+phase)+(rand()-.5)*.04);
  }
  function features(v){if(!v.length)throw new Error('A window needs samples');const n=v.length,mean=v.reduce((a,b)=>a+b,0)/n;return {mean,std:Math.sqrt(v.reduce((s,x)=>s+(x-mean)**2,0)/n),min:Math.min(...v),max:Math.max(...v),energy:v.reduce((s,x)=>s+x*x,0),count:n};}
  const keys=['mean','std','min','max','energy','count'];
  const vector=f=>keys.map(key=>f[key]);
  function distribution(rows){const counts=[0,0,0,0];rows.forEach(r=>counts[r.y]++);return counts.map(n=>n/rows.length);}
  const impurity=rows=>1-distribution(rows).reduce((sum,p)=>sum+p*p,0);
  function train(rows,rand,depth=0){
    const probs=distribution(rows),leaf={probs};if(depth>=4||rows.length<12||Math.max(...probs)===1)return leaf;
    const candidates=[];while(candidates.length<3){const key=Math.floor(rand()*keys.length);if(!candidates.includes(key))candidates.push(key);}
    let best=null;
    for(const feature of candidates){const vals=rows.map(r=>r.x[feature]).sort((a,b)=>a-b);for(let q=1;q<9;q++){const threshold=vals[Math.floor(vals.length*q/9)];const left=rows.filter(r=>r.x[feature]<=threshold),right=rows.filter(r=>r.x[feature]>threshold);if(left.length<4||right.length<4)continue;const score=(left.length*impurity(left)+right.length*impurity(right))/rows.length;if(!best||score<best.score)best={feature,threshold,left,right,score};}}
    if(!best||best.score>=impurity(rows)-1e-10)return leaf;
    return {feature:best.feature,threshold:best.threshold,probs,left:train(best.left,rand,depth+1),right:train(best.right,rand,depth+1)};
  }
  function makeForest(){const rand=random(81212),rows=[];for(let y=0;y<4;y++)for(let i=0;i<90;i++){const n=12+Math.floor(rand()*25);rows.push({x:vector(features(signalFor(y,n,rand))),y});}return Array.from({length:5},()=>train(Array.from({length:rows.length},()=>rows[Math.floor(rand()*rows.length)]),rand));}
  const forest=makeForest();
  function predict(f){const x=vector(f);const trees=forest.map(tree=>{let node=tree;const path=[];while(node.left){const left=x[node.feature]<=node.threshold;path.push({feature:keys[node.feature],value:x[node.feature],threshold:node.threshold,left});node=left?node.left:node.right;}return {probs:node.probs,path,label:labels[node.probs.indexOf(Math.max(...node.probs))]};});const scores=[0,1,2,3].map(i=>trees.reduce((sum,t)=>sum+t.probs[i],0)/trees.length);return {trees,scores,label:labels[scores.indexOf(Math.max(...scores))]};}
  function stream(){const rand=random(51415);return labels.flatMap((_,i)=>signalFor(i,30,rand));}
  function extrema(values){const peaks=[],troughs=[];for(let i=1;i<values.length-1;i++){if(values[i]>values[i-1]&&values[i]>values[i+1])peaks.push(i);if(values[i]<values[i-1]&&values[i]<values[i+1])troughs.push(i);}return {peaks,troughs};}
  const api={labels,keys,features,predict,stream,extrema};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BioModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
