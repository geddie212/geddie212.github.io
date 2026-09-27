const {chromium} = require('@playwright/test');
(async()=>{
  const browser=await chromium.launch({channel:'chrome'});
  const page=await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'reduce'});
  await page.goto('http://127.0.0.1:4173/');
  await page.screenshot({path:'test-results/header-desktop.png'});
  await page.locator('#biosignal-experiment').screenshot({path:'test-results/biosignal-desktop.png'});
  await page.locator('#sorting-experiment').screenshot({path:'test-results/sorting-desktop.png'});
  await page.evaluate(()=>scrollTo(0,0));
  await page.locator('#theme-toggle').click();
  await page.screenshot({path:'test-results/header-dark.png'});
  await page.locator('#theme-toggle').click();
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'test-results/header-mobile.png'});
  await page.locator('.instrument').screenshot({path:'test-results/instrument-mobile.png'});
  await page.locator('#biosignal-experiment').screenshot({path:'test-results/biosignal-mobile.png'});
  await page.locator('#sorting-experiment').screenshot({path:'test-results/sorting-mobile.png'});
  const gpu=await page.locator('#sculpture').evaluate(c=>({hidden:c.hidden,width:c.width,height:c.height,error:c.getContext('webgl')?.getError()}));
  console.log('WebGL:',JSON.stringify(gpu));
  const links=await page.locator('a[href]').evaluateAll(as=>[...new Set(as.map(a=>a.getAttribute('href')).filter(h=>!h.startsWith('http')&&!h.startsWith('mailto:')&&!h.startsWith('#')))]);
  for(const link of links){const response=await page.request.get('http://127.0.0.1:4173/'+link);if(!response.ok())throw new Error('Broken local link: '+link);}
  console.log('Local page links: OK');
  await browser.close();
})();
