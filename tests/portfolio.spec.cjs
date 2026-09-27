const {test,expect}=require('@playwright/test');
test('header, mouse drag, descent, theme and local assets',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1440,height:1100});await page.goto('/');
  await expect(page.getByRole('heading',{name:/I capture\s*human biosignals\./})).toBeVisible();
  expect(await page.locator('.portrait img').evaluate(img=>img.complete&&img.naturalWidth>0)).toBeTruthy();
  const before=await page.locator('#slope').textContent();
  const point=await page.locator('#handle').boundingBox();
  await page.mouse.move(point.x+point.width/2,point.y+point.height/2);await page.mouse.down();await page.mouse.move(point.x+point.width/2-100,point.y+point.height/2,{steps:10});await page.mouse.up();
  expect(await page.locator('#slope').textContent()).not.toBe(before);
  await page.locator('#gradient-controls summary').click();
  await page.locator('#weight').evaluate(el=>{el.value='-2.3';el.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.locator('#run').click();await expect(page.locator('#status')).toContainText('global minimum',{timeout:20000});
  await page.locator('#theme-toggle').click();await expect(page.locator('body')).toHaveClass(/dark/);await page.reload();await expect(page.locator('body')).toHaveClass(/dark/);
  await page.locator('#theme-toggle').click();
  await page.screenshot({path:'test-results/header-desktop.png',fullPage:false});
  expect(errors).toEqual([]);
});
test('phone layout, touch dragging and keyboard alternative',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});const page=await context.newPage();await page.goto('/');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await page.locator('#plot').scrollIntoViewIfNeeded();
  const box=await page.locator('#handle').boundingBox();const before=await page.locator('#slope').textContent();
  const cdp=await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+box.width/2-45,y:box.y+box.height/2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  expect(await page.locator('#slope').textContent()).not.toBe(before);
  await page.locator('#gradient-controls summary').click();await page.locator('#weight').focus();const old=await page.locator('#weight').inputValue();await page.keyboard.press('ArrowLeft');expect(await page.locator('#weight').inputValue()).not.toBe(old);
  await page.locator('#gradient-controls summary').click();await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'test-results/home-mobile.png',fullPage:true});
  for(const width of [360,768,1024]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();}
  await context.close();
});
test('reduced motion, filters, biosignal selection, sorting and resume',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
  await page.locator('#run').click();await expect(page.locator('#status')).toContainText('Reduced motion');
  await page.locator('[data-filter="web"]').click();await expect(page.locator('.archive-list>a:visible')).toHaveCount(3);
  await page.locator('[data-filter="all"]').click();await expect(page.locator('.archive-list>a:visible')).toHaveCount(6);
  const before=await page.locator('#bio-result').textContent();await page.locator('#bio-width').fill('35');expect(await page.locator('#bio-result').textContent()).not.toBe(before);
  await page.locator('#sort-play').click();await expect(page.locator('#sort-status')).toHaveText('SORTED · 12 VALUES');
  const values=await page.locator('#sort-bars b').allTextContents();expect(values.map(Number)).toEqual([...values.map(Number)].sort((a,b)=>a-b));
  await page.goto('/resume.html');await expect(page.getByRole('heading',{name:'Paul Gedrimas'})).toBeVisible();
});
test('the header still works without WebGL',async({page})=>{
  await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl'?null:get.call(this,type,...args);};});
  await page.goto('/');await expect(page.locator('#sculpture')).toBeHidden();await expect(page.locator('#plot')).toBeVisible();await page.locator('#gradient-controls summary').click();const old=await page.locator('#slope').textContent();await page.locator('#step').click();expect(await page.locator('#slope').textContent()).not.toBe(old);
});
test('loss derivative, tangent and both minima are mathematically consistent',()=>{
  const math=require('../loss-math.js');
  for(let w=-2.6;w<=2.6;w+=.07){const d=(math.loss(w+1e-5)-math.loss(w-1e-5))/2e-5;expect(Math.abs(d-math.gradient(w))).toBeLessThan(1e-7);const t=math.tangent(w);expect(Math.abs(t.m*w+t.b-math.loss(w))).toBeLessThan(1e-10);}
  for(const start of [-2.6,-.2,.31,2.6])for(const rate of [.02,.08,.2]){let w=start;for(let i=0;i<1000;i++){const next=math.step(w,rate);expect(math.loss(next)).toBeLessThanOrEqual(math.loss(w)+1e-10);w=next;}expect(Math.abs(w-(start<.3?-1.5:1.5))).toBeLessThan(.001);}
});
