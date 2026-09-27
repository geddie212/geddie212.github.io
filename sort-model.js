/* Browser adaptations of the six algorithms in geddie212/sort_algorithms.
   Instrumentation snapshots are not part of the auxiliary-space analysis. */
(function(root){
  'use strict';
  const algorithms={
    insertion:{name:'Insertion sort',file:'InsertionSort.java',best:'O(n)',average:'O(n²)',worst:'O(n²)',space:'O(1)',description:'Grow a sorted prefix. Compare the next value with its neighbours, shift larger values right, then insert it in the gap.',note:'Linear on already sorted input; useful for small or nearly sorted arrays.'},
    bubble:{name:'Bubble sort',file:'BubbleSort.java',best:'O(n)',average:'O(n²)',worst:'O(n²)',space:'O(1)',description:'Compare neighbouring values and swap an inverted pair. Each pass places a maximum at the right edge. Stop early when a pass makes no swaps.',note:'The early-exit flag in this version gives a linear best case.'},
    selection:{name:'Selection sort',file:'SelectionSort.java',best:'O(n²)',average:'O(n²)',worst:'O(n²)',space:'O(1)',description:'Scan the remaining suffix for its smallest value, then place it at the next position in the sorted prefix.',note:'Even sorted input requires scanning the remaining values; relatively few swaps.'},
    merge:{name:'Merge sort',file:'MergeSort.java',best:'O(n log n)',average:'O(n log n)',worst:'O(n log n)',space:'O(n)',description:'Split the array into smaller ranges, sort each half, then merge the two ordered halves using an auxiliary buffer.',note:'This standard version merges every level. An O(n) buffer dominates its recursion space.'},
    quick:{name:'Quicksort',file:'QuickSort.java',best:'O(n log n)',average:'O(n log n)',worst:'O(n²)',space:'O(log n) avg · O(n) worst',description:'Choose the last value as a pivot, partition smaller values to its left, then recursively sort the two sides.',note:'A fixed last-element pivot can produce quadratic work and linear recursion depth on sorted input.'},
    custom:{name:'Custom run-merge sort',file:'CustomSort.java',best:'O(n)',average:'O(n log n)',worst:'O(n log n)',space:'O(n)',description:'Discover existing ascending runs, then merge adjacent pairs in balanced rounds. This follows the idea of my custom Java sort.',note:'With r initial runs: O(n + n log r). Already sorted input is one run, so it needs only a linear scan. The average bound assumes no particular input distribution.'}
  };
  function trace(kind,input){
    if(!algorithms[kind])throw new Error('Unknown sorting algorithm');
    if(!Array.isArray(input)||input.some(v=>!Number.isFinite(v)))throw new Error('Expected a finite number array');
    const a=input.slice(),states=[];let comparisons=0,writes=0,swaps=0;
    const emit=(message,active=[],settled=[])=>states.push({values:a.slice(),active,settled,message,comparisons,writes,swaps});
    const swap=(i,j)=>{if(i!==j){[a[i],a[j]]=[a[j],a[i]];swaps++;writes+=2;}};
    emit('Ready. Orange highlights the values being compared or moved.');
    const range=(lo,hi)=>Array.from({length:Math.max(0,hi-lo)},(_,i)=>lo+i);
    if(kind==='insertion'){
      for(let i=1;i<a.length;i++){const key=a[i];let j=i-1;
        while(j>=0){comparisons++;emit(`Compare ${a[j]} with held value ${key}.`,[j,i],range(0,i));if(a[j]<=key)break;a[j+1]=a[j];writes++;emit(`Shift ${a[j]} right to open a space.`,[j,j+1]);j--;}
        a[j+1]=key;writes++;emit(`Insert ${key} at position ${j+1}.`,[j+1],range(0,i+1));
      }
    }else if(kind==='bubble'){
      for(let end=a.length-1;end>0;end--){let changed=false;
        for(let j=0;j<end;j++){comparisons++;emit(`Compare neighbours ${a[j]} and ${a[j+1]}.`,[j,j+1],range(end+1,a.length));if(a[j]>a[j+1]){swap(j,j+1);changed=true;emit('Swap the inverted pair.',[j,j+1],range(end+1,a.length));}}
        emit(changed?'This pass placed its maximum at the right edge.':'No swaps: the remaining range is already sorted.',[],range(end,a.length));if(!changed)break;
      }
    }else if(kind==='selection'){
      for(let i=0;i<a.length-1;i++){let min=i;for(let j=i+1;j<a.length;j++){comparisons++;emit(`Find the minimum: compare ${a[j]} with ${a[min]}.`,[min,j],range(0,i));if(a[j]<a[min])min=j;}swap(i,min);emit(`Place the remaining minimum at position ${i}.`,[i],range(0,i+1));}
    }else if(kind==='quick'){
      const settled=new Set();
      function quick(lo,hi){if(lo>hi)return;if(lo===hi){settled.add(lo);return;}const pivot=a[hi];let store=lo;
        emit(`Partition positions ${lo}–${hi}; pivot = ${pivot}.`,[hi],[...settled]);
        for(let j=lo;j<hi;j++){comparisons++;emit(`Compare ${a[j]} with pivot ${pivot}.`,[j,hi],[...settled]);if(a[j]<pivot){swap(store,j);emit('Move this value into the smaller partition.',[store,j],[...settled]);store++;}}
        swap(store,hi);settled.add(store);emit(`Pivot ${pivot} is now in its final position.`,[store],[...settled]);quick(lo,store-1);quick(store+1,hi);
      }quick(0,a.length-1);
    }else{
      function merge(lo,mid,hi){const left=a.slice(lo,mid),right=a.slice(mid,hi);let l=0,r=0,k=lo;
        emit(`Merge ordered ranges [${lo}, ${mid}) and [${mid}, ${hi}).`,range(lo,hi));
        while(l<left.length&&r<right.length){comparisons++;emit(`Compare buffered heads ${left[l]} and ${right[r]}.`,[lo+l,mid+r]);a[k]=left[l]<=right[r]?left[l++]:right[r++];writes++;emit(`Write ${a[k]} from the merge buffer.`,[k]);k++;}
        while(l<left.length){a[k]=left[l++];writes++;emit('Copy the remaining left-buffer value.',[k++]);}
        while(r<right.length){a[k]=right[r++];writes++;emit('Copy the remaining right-buffer value.',[k++]);}
        emit(`Range [${lo}, ${hi}) is now ordered.`,range(lo,hi));
      }
      if(kind==='merge'){
        function divide(lo,hi){if(hi-lo<=1)return;const mid=Math.floor((lo+hi)/2);emit(`Split range [${lo}, ${hi}) at ${mid}.`,[lo,mid,hi-1]);divide(lo,mid);divide(mid,hi);merge(lo,mid,hi);}divide(0,a.length);
      }else if(a.length){
        let runs=[],start=0;
        for(let i=1;i<a.length;i++){comparisons++;emit(`Check whether ${a[i-1]} → ${a[i]} continues an ascending run.`,[i-1,i]);if(a[i]<a[i-1]){runs.push([start,i]);emit(`Found ascending run [${start}, ${i}).`,range(start,i));start=i;}}
        runs.push([start,a.length]);emit(`Found ${runs.length} ascending run${runs.length===1?'':'s'}.`);
        while(runs.length>1){const next=[];for(let i=0;i<runs.length;i+=2){if(i+1===runs.length)next.push(runs[i]);else{merge(runs[i][0],runs[i][1],runs[i+1][1]);next.push([runs[i][0],runs[i+1][1]]);}}runs=next;}
      }
    }
    emit(`Sorted ${a.length} values.`,[],range(0,a.length));return states;
  }
  const api={algorithms,trace};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SortModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
