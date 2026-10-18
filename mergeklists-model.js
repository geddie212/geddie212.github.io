/* Step trace for LeetCode 23 "Merge k Sorted Lists", following the divide-and-conquer
   mergeSort(lists, l, r) solution in geddie212/neetcode-submissions.
   Every node is tagged with the index of the input list it was born in (o), and that
   tag rides along through every merge untouched — a node's color never changes, only
   which chain it currently belongs to. merge(ls, rs) relinks existing nodes by
   reassigning curr.next; it never allocates nodes, so nothing here invents a new tag.
   Every emitted state carries a single uniform `chains` array covering everything on
   screen — lists not yet touched this step included — so the renderer never has to
   swap layouts or hide/reposition chains that aren't part of the current step. */
(function(root){
  'use strict';

  const K=5;

  function randomLists(){
    const lists=[];
    for(let i=0;i<K;i++){
      const len=2+Math.floor(Math.random()*2);
      const values=new Set();
      while(values.size<len)values.add(1+Math.floor(Math.random()*40));
      lists.push([...values].sort((a,b)=>a-b));
    }
    return lists;
  }

  function buildTree(l,r){
    if(l===r)return{l,r,leaf:true,key:`${l}-${l}`};
    const m=Math.floor((l+r)/2);
    return{l,r,m,leaf:false,key:`${l}-${r}`,left:buildTree(l,m),right:buildTree(m+1,r)};
  }

  const nodeLabel=node=>node.leaf?`list ${node.l}`:`[${node.l},${node.r}]`;
  const joinNodes=nodes=>nodes.map(n=>n.v).join(' → ');

  function trace(lists){
    const k=lists.length;
    const tree=buildTree(0,k-1);
    const states=[];
    let comparisons=0,writes=0,merges=0;
    const push=view=>states.push(Object.assign({comparisons,writes,merges,k},view));
    const listChains=()=>lists.map((values,i)=>({values:values.map(v=>({v,o:i})),l:i,r:i,label:`list ${i}`,kind:'plain'}));

    push({phase:'lists',title:`${k} SORTED LINKED LISTS`,chains:listChains(),
      message:`${k} separate sorted linked lists. Every node's next pointer goes up, so each head sits at the bottom and the values read upward to ⌀ (null).`});
    push({phase:'array',title:'INTO ListNode[] lists',chains:listChains(),array:true,
      message:`The ${k} head pointers are stored in ListNode[] lists. That array of references is the only thing mergeKLists(lists) actually receives.`});

    const calls=[],callKeys=[];
    (function descend(node,depth,prefix,isLast){
      const branch=depth===0?'':(isLast?'└─ ':'├─ ');
      const call=`${prefix}${branch}mergeSort(lists, ${node.l}, ${node.r})`;
      calls.push({text:node.leaf?`${call}  →  returns lists[${node.l}]`:`${call}   m=${node.m}`,leaf:node.leaf});
      callKeys.push(node.key);
      push({phase:'divide',title:'DIVIDE · SPLIT THE ARRAY BY INDEX',chains:listChains(),array:true,
        range:[node.l,node.r],splitM:node.leaf?null:node.m,calls:calls.slice(),callKeys:callKeys.slice(),current:calls.length-1,
        message:node.leaf
          ?`mergeSort(lists, ${node.l}, ${node.l}): l === r, so the recursion stops here and returns lists[${node.l}] — already a sorted chain of ${lists[node.l].length} node${lists[node.l].length===1?'':'s'}.`
          :`mergeSort(lists, ${node.l}, ${node.r}): m = (${node.l}+${node.r})/2 = ${node.m}. Solve [${node.l},${node.m}] and [${node.m+1},${node.r}] first, then merge the two chains they return.`});
      if(!node.leaf){
        const childPrefix=depth===0?'':prefix+(isLast?'   ':'│  ');
        descend(node.left,depth+1,childPrefix,false);
        descend(node.right,depth+1,childPrefix,true);
      }
    })(tree,0,'',true);

    const live=lists.map((values,i)=>({values:values.map(v=>({v,o:i})),l:i,r:i,label:`list ${i}`}));
    const liveChains=()=>live.map(c=>({values:c.values.slice(),l:c.l,r:c.r,label:c.label,kind:'plain'}));

    (function conquer(node){
      if(node.leaf)return;
      conquer(node.left);conquer(node.right);
      const leftIndex=live.findIndex(c=>c.l===node.left.l&&c.r===node.left.r);
      const rightIndex=live.findIndex(c=>c.l===node.right.l&&c.r===node.right.r);
      const left=live[leftIndex].values.slice(),right=live[rightIndex].values.slice();
      const outLabel=`[${node.l},${node.r}]`;
      let li=0,ri=0;const merged=[];
      const otherChains=()=>live
        .filter((_,idx)=>idx!==leftIndex&&idx!==rightIndex)
        .map(c=>({l:c.l,r:c.r,label:c.label,values:c.values.slice(),kind:'plain'}));
      const emit=(message,extra)=>{
        const chains=[
          ...otherChains(),
          {l:node.left.l,r:node.left.r,label:nodeLabel(node.left),values:left.slice(),kind:'ls',consumed:li},
          {l:node.right.l,r:node.right.r,label:nodeLabel(node.right),values:right.slice(),kind:'rs',consumed:ri},
          {l:node.l,r:node.r,label:outLabel,values:merged.slice(),kind:'out'}
        ];
        push(Object.assign({phase:'merge',title:`CONQUER · merge(ls, rs) → ${outLabel}`,message,range:[node.l,node.r],splitM:node.m,chains},extra||{}));
      };

      emit(`merge(ls, rs): ls is the head of ${nodeLabel(node.left)}, rs is the head of ${nodeLabel(node.right)}. Both chains are already sorted, so one walk up them is enough.`);
      if(!left.length||!right.length){
        const only=left.length?left:right;
        merged.push(...only);writes+=only.length;li=left.length;ri=right.length;
        emit(`ls or rs is null, so merge returns the other chain untouched.`);
      }else{
        comparisons++;writes++;
        if(left[0].v<=right[0].v){merged.push(left[0]);li=1;}else{merged.push(right[0]);ri=1;}
        emit(`Compare the heads ${left[0].v} and ${right[0].v}: ${merged[0].v} is smaller, so that node becomes curr and the head of the merged chain.`);
        while(li<left.length&&ri<right.length){
          comparisons++;
          emit(`Compare ls (${left[li].v}) with rs (${right[ri].v}).`);
          let took;
          if(left[li].v<=right[ri].v){merged.push(left[li]);took='ls';li++;}
          else{merged.push(right[ri]);took='rs';ri++;}
          writes++;
          emit(`curr.next = ${took} hangs node ${merged[merged.length-1].v} on top of the merged chain, then curr and ${took} both step up.`);
        }
        if(li<left.length||ri<right.length){
          const fromLeft=li<left.length;
          const rest=fromLeft?left.slice(li):right.slice(ri);
          merged.push(...rest);writes+=rest.length;
          if(fromLeft)li=left.length;else ri=right.length;
          emit(`${fromLeft?'rs':'ls'} is null now, so curr.next = ${fromLeft?'ls':'rs'} attaches its whole remaining chain (${joinNodes(rest)}) in one assignment — those nodes are already linked in order.`);
        }
      }
      merges++;
      live.splice(Math.min(leftIndex,rightIndex),2,{values:merged.slice(),l:node.l,r:node.r,label:outLabel});
      if(live.length>1)push({phase:'layer',title:`${outLabel} IS ONE CHAIN — ${live.length} LEFT`,chains:liveChains(),array:true,range:[node.l,node.r],
        message:`${outLabel} is now a single sorted chain of ${merged.length} nodes, covering lists[${node.l}..${node.r}]. ${live.length} chains left to merge.`});
    })(tree);

    const final=live[0].values;
    push({phase:'done',title:'SORTED · ONE LINKED LIST',chains:liveChains(),array:true,range:[0,k-1],
      message:`Done. mergeKLists returns one sorted chain of ${final.length} nodes — the same node objects from the ${k} input lists, relinked: ${joinNodes(final)} → ⌀.`});

    const totalNodes=lists.reduce((sum,list)=>sum+list.length,0);
    return{states,k,lists,tree,totalNodes};
  }

  const api={K,randomLists,buildTree,trace};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MergeKListsModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
