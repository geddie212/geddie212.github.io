'use strict';
(() => {
  const $=id=>document.getElementById(id);
  const filters=[...document.querySelectorAll('[data-filter]')],items=[...document.querySelectorAll('[data-category]')];
  filters.forEach(button=>button.addEventListener('click',()=>{filters.forEach(b=>b.setAttribute('aria-pressed',String(b===button)));items.forEach(item=>{item.hidden=button.dataset.filter!=='all'&&item.dataset.category!==button.dataset.filter;});$('filter-count').textContent=`${items.filter(i=>!i.hidden).length} PROJECTS`;}));

  function setTheme(dark) {
    document.body.classList.toggle('dark',dark);
    const toggle=$('theme-toggle');
    if(toggle){toggle.setAttribute('aria-pressed',String(dark));toggle.textContent=dark?'Light mode':'Dark mode';toggle.setAttribute('aria-label',dark?'Switch to light mode':'Switch to dark mode');}
    const meta=document.querySelector('meta[name="theme-color"]');
    if(meta)meta.content=dark?'#1c231f':'#ebe8de';
    try{localStorage.setItem('portfolio-theme',dark?'dark':'light');}catch{}
  }
  const themeToggle=$('theme-toggle');
  if(themeToggle)themeToggle.addEventListener('click',()=>setTheme(!document.body.classList.contains('dark')));
  let savedTheme;try{savedTheme=localStorage.getItem('portfolio-theme');}catch{}
  setTheme(savedTheme?savedTheme==='dark':matchMedia('(prefers-color-scheme: dark)').matches);
  window.PortfolioTheme={setDark:setTheme,toggle:()=>setTheme(!document.body.classList.contains('dark')),isDark:()=>document.body.classList.contains('dark')};
})();
