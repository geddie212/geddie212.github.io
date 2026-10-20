const {test,expect}=require('@playwright/test');
test('header, chat assistant, theme and local assets',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1440,height:1100});await page.goto('/');
  await expect(page.getByRole('heading',{name:/I build\s*software for people and for agents\./})).toBeVisible();
  expect(await page.locator('.portrait img').evaluate(img=>img.complete&&img.naturalWidth>0)).toBeTruthy();
  await expect(page.locator('#chat-messages .chat-msg-row')).toHaveCount(1);
  await page.getByRole('button',{name:"What's his tech stack?"}).click();
  await expect(page.locator('#chat-messages .is-user').last()).toContainText("stack?");
  await expect(page.locator('#chat-messages .is-assistant').last()).toContainText('Python',{timeout:45000});
  await page.locator('#theme-toggle').click();await expect(page.locator('body')).toHaveClass(/dark/);await page.reload();await expect(page.locator('body')).toHaveClass(/dark/);
  await page.locator('#theme-toggle').click();
  await page.screenshot({path:'test-results/header-desktop.png',fullPage:false});
  expect(errors).toEqual([]);
});
test('phone layout and chat via keyboard',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});const page=await context.newPage();await page.goto('/');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await page.locator('#chat-input').scrollIntoViewIfNeeded();
  await page.locator('#chat-input').fill('How do I contact him?');
  await page.locator('#chat-input').press('Enter');
  await expect(page.locator('#chat-messages .is-assistant').last()).toContainText('LinkedIn',{timeout:45000});
  await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'test-results/home-mobile.png',fullPage:true});
  for(const width of [360,768,1024]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();}
  await context.close();
});
test('reduced motion, dark-mode chat command, filters, biosignal, sorting and resume',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
  await page.locator('#chat-input').fill('change the website to dark mode');
  await page.locator('#chat-input').press('Enter');
  await expect(page.locator('body')).toHaveClass(/dark/);
  await expect(page.locator('#chat-messages .is-assistant').last()).toContainText('dark mode');
  await page.locator('[data-filter="web"]').click();await expect(page.locator('.archive-list>a:visible')).toHaveCount(3);
  await page.locator('[data-filter="all"]').click();await expect(page.locator('.archive-list>a:visible')).toHaveCount(6);
  const before=await page.locator('#bio-result').textContent();await page.locator('#bio-width').fill('35');expect(await page.locator('#bio-result').textContent()).not.toBe(before);
  await page.locator('#mkl-play').click();await expect(page.locator('#mkl-status')).toContainText('DONE');
  await page.goto('/resume.html');await expect(page.getByRole('heading',{name:'Paul Gedrimas'})).toBeVisible();
});
