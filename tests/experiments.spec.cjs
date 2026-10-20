const {test,expect}=require('@playwright/test');
const MergeKLists=require('../mergeklists-model.js');
const Bio=require('../bio-model.js');

test('merge-k-lists trace always reaches one correctly sorted chain',()=>{
  const cases=[[[3]],[[1,5],[2,6]],[[1],[2],[3],[4],[5]],[[],[1,2,3]],[[7,7],[7],[7,7,7]],[[-3,0,2],[-7,2],[1]],Array.from({length:5},(_,i)=>[i,i+10,i+20])];
  for(const lists of cases){
    const label=JSON.stringify(lists),expected=[...lists.flat()].sort((a,b)=>a-b);
    const{states}=MergeKLists.trace(lists);
    const last=states[states.length-1];
    expect(states[0].phase,label).toBe('lists');
    expect(last.phase,label).toBe('done');
    expect(last.chains,label).toHaveLength(1);
    expect(last.chains[0].values.map(n=>n.v),label).toEqual(expected);
    for(const node of last.chains[0].values)expect(lists[node.o],label).toContain(node.v);
    expect(states.filter(state=>state.phase==='divide'),label).toHaveLength(2*lists.length-1);
    for(let i=1;i<states.length;i++){
      expect(states[i].comparisons).toBeGreaterThanOrEqual(states[i-1].comparisons);
      expect(states[i].writes).toBeGreaterThanOrEqual(states[i-1].writes);
    }
  }
});

test('window features and probability aggregation are correct',()=>{
  const features=Bio.features([1,2,3,4]);expect(features.mean).toBe(2.5);expect(features.std).toBeCloseTo(Math.sqrt(1.25));expect(features.min).toBe(1);expect(features.max).toBe(4);expect(features.energy).toBe(30);expect(features.count).toBe(4);
  expect(Bio.extrema([0,2,1,-1,3,0])).toEqual({peaks:[1,4],troughs:[3]});
  const signal=Bio.stream();expect(signal).toHaveLength(120);
  for(let start=0;start<=84;start+=3){const f=Bio.features(signal.slice(start,start+36)),prediction=Bio.predict(f);expect(prediction.scores.reduce((a,b)=>a+b,0)).toBeCloseTo(1);expect(prediction.trees).toHaveLength(5);prediction.scores.forEach((score,i)=>{expect(score).toBeGreaterThanOrEqual(0);expect(score).toBeLessThanOrEqual(1);expect(score).toBeCloseTo(prediction.trees.reduce((s,t)=>s+t.probs[i],0)/5);});}
  for(let i=0;i<4;i++)expect(Bio.predict(Bio.features(signal.slice(i*30,i*30+24))).label).toBe(Bio.labels[i]);
});

test('requested copy, live Queue destination and model annotation',async({page})=>{
  await page.goto('/');
  await expect(page.locator('#hero-heading')).toContainText('I build');await expect(page.locator('#hero-heading')).toContainText('software for people and for agents.');
  await expect(page.locator('.chat-label')).toContainText("ASK AI ABOUT PAUL'S PORTFOLIO");
  await expect(page.locator('.intro-detail')).toContainText('lab-based testing');
  await expect(page.locator('.project-featured')).toContainText('predict running, walking, sitting and standing');
  await expect(page.locator('#contact h2')).toContainText('Want to connect?');
  await expect(page.getByRole('link',{name:'Browse the collection'})).toHaveAttribute('href','https://geddie212.github.io/my_queue/');
  await expect(page.locator('#bio-points circle')).toHaveCount(120);await expect(page.locator('#forest-trees details')).toHaveCount(5);
  for(let i=0;i<4;i++){await page.locator(`[data-activity="${i}"]`).click();await expect(page.locator('#bio-prediction')).toHaveText(Bio.labels[i]);}
  await page.locator('#bio-width').fill('36');await page.locator('#bio-position').fill('20');await expect(page.locator('#bio-result')).toContainText('SAMPLES 20–55 · 36 SELECTED');await expect(page.locator('#bio-result')).toContainText('MIXED');
  await expect(page.locator('[data-feature="count"] output')).toHaveText('36');
  const expected=Bio.features(Bio.stream().slice(20,56));await expect(page.locator('[data-feature="mean"] output')).toHaveText(expected.mean.toFixed(3));
  await page.locator('.sample-details summary').click();await expect(page.locator('#bio-samples tr')).toHaveCount(36);
  await page.locator('#forest-trees summary').first().click();await expect(page.locator('#forest-trees details').first().locator('ol')).toBeVisible();
  await page.locator('#biosignal').scrollIntoViewIfNeeded();
  const window=await page.locator('#bio-window').boundingBox();const old=await page.locator('#bio-position').inputValue();await page.mouse.move(window.x+window.width/2,window.y+window.height/2);await page.mouse.down();await page.mouse.move(window.x+window.width/2+50,window.y+window.height/2);await page.mouse.up();expect(await page.locator('#bio-position').inputValue()).not.toBe(old);
  await page.locator('[data-activity="3"]').click();await expect(page.locator('#bio-position')).toHaveValue('90');await expect(page.locator('#bio-width')).toHaveValue('24');await expect(page.locator('#bio-prediction')).toHaveText('Running');
});

test('merge-k-lists animation shows 5 colored linked lists moving through the array, the split and the merges',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
  expect(Number(await page.locator('#mkl-k-value').textContent())).toBe(5);
  await expect(page.locator('#mkl-phase')).toHaveText('5 SORTED LINKED LISTS');
  await expect(page.locator('#mkl-board')).toContainText('head');
  await expect(page.locator('#mkl-board')).toContainText('⌀');
  for(let origin=0;origin<5;origin++)expect(await page.locator(`#mkl-board .mkl-origin-${origin}`).count(),`origin ${origin} should be visible`).toBeGreaterThan(0);
  await page.locator('#mkl-step').click();
  await expect(page.locator('#mkl-board .mkl-array-index')).toHaveText(['0','1','2','3','4']);
  await expect(page.locator('#mkl-board .mkl-array-pipe')).toHaveCount(4);
  await expect(page.locator('#mkl-board .mkl-array-bracket')).toHaveCount(2);
  for(let i=0;i<9;i++)await page.locator('#mkl-step').click();
  await expect(page.locator('#mkl-phase')).toContainText('DIVIDE');
  await expect(page.locator('#mkl-canvas')).toContainText('mergeSort(lists, 0, 4)');
  await expect(page.locator('#mkl-canvas')).toContainText('returns lists[4]');
  await page.locator('#mkl-play').click();await expect(page.locator('#mkl-status')).toContainText('DONE');
  await expect(page.locator('#mkl-phase')).toContainText('SORTED');
  const originsOnFinalChain=new Set();
  for(let origin=0;origin<5;origin++)if(await page.locator(`#mkl-board .mkl-origin-${origin}`).count())originsOnFinalChain.add(origin);
  expect(originsOnFinalChain.size,'final chain should keep nodes of multiple colors').toBeGreaterThan(1);
  const summary=await page.locator('#mkl-explanation').textContent();
  const chain=summary.split('relinked: ')[1].replace(' → ⌀.','').split(' → ').map(Number);
  expect(chain).toEqual([...chain].sort((a,b)=>a-b));
  expect(chain).toHaveLength(Number(await page.locator('#mkl-levels-value').textContent()));
  await page.locator('#mkl-replay').click();await expect(page.locator('#mkl-comparisons')).toHaveText('0');await page.locator('#mkl-step').click();await expect(page.locator('#mkl-status')).toContainText('STEP 1');
  await page.locator('#mkl-new').click();await expect(page.locator('#mkl-comparisons')).toHaveText('0');
  await page.locator('.mkl-code summary').click();await expect(page.locator('.mkl-code pre')).toContainText('mergeKLists');
});

test('lists compress into the array, then splits visibly separate into gaps',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
  const getTransform=async nth=>page.locator('#mkl-board > .mkl-column').nth(nth).evaluate(el=>el.style.transform);
  const listsPhaseX=[];
  for(let i=0;i<5;i++)listsPhaseX.push(await getTransform(i));
  await page.locator('#mkl-step').click(); // array phase: should compress (x values change)
  const arrayPhaseX=[];
  for(let i=0;i<5;i++)arrayPhaseX.push(await getTransform(i));
  expect(arrayPhaseX).not.toEqual(listsPhaseX);
  const beforeGapX=arrayPhaseX;
  await page.locator('#mkl-step').click(); // first divide step: root split opens a gap at the middle boundary
  const afterGapX=[];
  for(let i=0;i<5;i++)afterGapX.push(await getTransform(i));
  expect(afterGapX).not.toEqual(beforeGapX);
  await expect(page.locator('.mkl-split-line')).toHaveCount(1);
  await expect(page.locator('.mkl-split-label')).toHaveText('split');
  for(let i=0;i<9;i++)await page.locator('#mkl-step').click(); // walk into the first merge
  await expect(page.locator('#mkl-phase')).toContainText('CONQUER');
  await expect(page.locator('.mkl-split-line')).toHaveCount(1); // split line persists through the merge
});

test('the split line stays centred on the merging "out" column, even for lopsided leaf counts',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
  const getOutLineDiff=async()=>page.evaluate(()=>{
    const line=document.querySelector('.mkl-split-line');
    const outCol=[...document.querySelectorAll('#mkl-board > .mkl-column')].find(c=>c.querySelector('.mkl-col-label')?.textContent.startsWith('out'));
    if(!line||!outCol)return null;
    const outX=parseFloat(outCol.style.transform.match(/[\d.]+/)[0]);
    return Math.abs(parseFloat(line.getAttribute('x1'))-outX);
  });
  let maxDiff=0;
  for(let i=0;i<61;i++){
    if(await page.locator('#mkl-step').isDisabled())break;
    await page.locator('#mkl-step').click();
    const diff=await getOutLineDiff();
    if(diff!==null)maxDiff=Math.max(maxDiff,diff);
  }
  expect(maxDiff,'split line must stay aligned to the out column for every merge, including 3-vs-2-leaf merges').toBeLessThan(1);
});

test('the done step has no leftover array row underneath the final chain',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
  await page.locator('#mkl-play').click();
  await expect(page.locator('#mkl-status')).toContainText('DONE',{timeout:20000});
  await expect(page.locator('.mkl-array-bracket')).toHaveCount(0);
  await expect(page.locator('.mkl-array-pipe')).toHaveCount(0);
  await expect(page.locator('.mkl-array-box')).toHaveCount(0);
});

test('stepping backward retraces the forward sequence exactly, with a clear step + phase label',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
  await expect(page.locator('#mkl-back')).toBeDisabled();
  await expect(page.locator('#mkl-status')).toContainText('STEP 0 / ');
  await expect(page.locator('#mkl-status')).toContainText('LISTS');
  const forwardMessages=[await page.locator('#mkl-explanation').textContent()];
  for(let i=0;i<8;i++){
    await page.locator('#mkl-step').click();
    forwardMessages.push(await page.locator('#mkl-explanation').textContent());
  }
  await expect(page.locator('#mkl-status')).toContainText('STEP 8 / ');
  await expect(page.locator('#mkl-back')).toBeEnabled();
  for(let i=8;i>0;i--){
    await expect(page.locator('#mkl-explanation')).toHaveText(forwardMessages[i]);
    await expect(page.locator('#mkl-status')).toContainText(`STEP ${i} / `);
    await page.locator('#mkl-back').click();
  }
  await expect(page.locator('#mkl-explanation')).toHaveText(forwardMessages[0]);
  await expect(page.locator('#mkl-status')).toContainText('STEP 0 / ');
  await expect(page.locator('#mkl-back')).toBeDisabled();
});

test('expanded workbench fits phone layouts and supports touch window dragging',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
  await page.locator('#biosignal').scrollIntoViewIfNeeded();const box=await page.locator('#bio-window').boundingBox(),before=await page.locator('#bio-position').inputValue();const cdp=await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+box.width/2-25,y:box.y+box.height/2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});expect(await page.locator('#bio-position').inputValue()).not.toBe(before);
  await page.locator('.sample-details summary').click();await page.locator('#forest-trees summary').first().click();await page.locator('.mkl-code summary').click();
  for(const width of [360,390,768,1024]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();}
  expect(errors).toEqual([]);await context.close();
});
