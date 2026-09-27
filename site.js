'use strict';
(() => {
  const $=id=>document.getElementById(id);
  const filters=[...document.querySelectorAll('[data-filter]')],items=[...document.querySelectorAll('[data-category]')];
  filters.forEach(button=>button.addEventListener('click',()=>{filters.forEach(b=>b.setAttribute('aria-pressed',String(b===button)));items.forEach(item=>{item.hidden=button.dataset.filter!=='all'&&item.dataset.category!==button.dataset.filter;});$('filter-count').textContent=`${items.filter(i=>!i.hidden).length} PROJECTS`;}));
})();
