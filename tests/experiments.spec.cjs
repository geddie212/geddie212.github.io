const {test,expect}=require('@playwright/test');
const Sort=require('../sort-model.js');
const Bio=require('../bio-model.js');

test('all six algorithms preserve and order edge-case inputs',()=>{
  const cases=[[],[3],[2,1],[4,1,3],[5,4,3,2,1],[1,2,3,4,5],[2,2,2,2],[3,1,3,1,2,1],[-3,0,2,-7,2],Array.from({length:31},(_,i)=>(i*17)%11)];
  for(const key of Object.keys(Sort.algorithms))for(const values of cases){const original=values.slice();const trace=Sort.trace(key,values),last=trace.at(-1);expect(last.values,`${key}: ${values}`).toEqual([...values].sort((a,b)=>a-b));expect(values).toEqual(original);for(let i=1;i<trace.length;i++){expect(trace[i].comparisons).toBeGreaterThanOrEqual(trace[i-1].comparisons);expect(trace[i].writes).toBeGreaterThanOrEqual(trace[i-1].writes);}}
  const sorted=Array.from({length:12},(_,i)=>i);
  for(const key of ['bubble','insertion','custom'])expect(Sort.trace(key,sorted).at(-1).comparisons).toBe(11);
  expect(Sort.trace('selection',sorted).at(-1).comparisons).toBe(66);
  expect(Sort.trace('quick',sorted).at(-1).comparisons).toBe(66);
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
  await expect(page.locator('#hero-heading')).toContainText('I capture');await expect(page.locator('#hero-heading')).toContainText('human biosignals.');
  await expect(page.getByRole('heading',{name:'Reduce the loss function.'})).toBeVisible();
  await expect(page.locator('.intro-detail')).toContainText('lab-based testing');
  await expect(page.locator('.project-featured')).toContainText('predict running, walking, sitting and standing');
  await expect(page.locator('#contact h2')).toContainText('Have an interesting problem?');
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

test('algorithm switching keeps the input; every algorithm completes in the UI',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
  const initial=await page.locator('#sort-bars b').allTextContents();
  for(const key of Object.keys(Sort.algorithms)){await page.locator('#sort-algorithm').selectOption(key);expect(await page.locator('#sort-bars b').allTextContents()).toEqual(initial);await expect(page.locator('#complexity-name')).toHaveText(Sort.algorithms[key].name);await expect(page.locator('#sort-complexity')).toContainText(Sort.algorithms[key].worst);await page.locator('#sort-play').click();await expect(page.locator('#sort-status')).toHaveText('SORTED · 12 VALUES');expect((await page.locator('#sort-bars b').allTextContents()).map(Number)).toEqual(initial.map(Number).sort((a,b)=>a-b));}
  await page.locator('#sort-input').selectOption('duplicates');await page.locator('#sort-algorithm').selectOption('quick');await page.locator('#sort-play').click();await expect(page.locator('#sort-status')).toContainText('SORTED');
  await page.locator('#sort-replay').click();await expect(page.locator('#sort-comparisons')).toHaveText('0');await page.locator('#sort-step').click();await expect(page.locator('#sort-status')).toContainText('STEP 1');
  await page.locator('.complexity-comparison summary').click();await expect(page.locator('#sort-comparison tr')).toHaveCount(6);
});

test('expanded workbench fits phone layouts and supports touch window dragging',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
  await page.locator('#biosignal').scrollIntoViewIfNeeded();const box=await page.locator('#bio-window').boundingBox(),before=await page.locator('#bio-position').inputValue();const cdp=await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+box.width/2-25,y:box.y+box.height/2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});expect(await page.locator('#bio-position').inputValue()).not.toBe(before);
  await page.locator('.sample-details summary').click();await page.locator('#forest-trees summary').first().click();await page.locator('.complexity-comparison summary').click();
  for(const width of [360,390,768,1024]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();}
  expect(errors).toEqual([]);await context.close();
});
