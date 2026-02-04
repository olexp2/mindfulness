// Диагностический скрипт для поиска элементов, создающих горизонтальный скролл
(function() {
  console.log('=== ДИАГНОСТИКА OVERFLOW ===');
  console.log('viewport width:', window.innerWidth);
  console.log('body scrollWidth:', document.body.scrollWidth);
  console.log('html scrollWidth:', document.documentElement.scrollWidth);
  console.log('');
  
  const viewportWidth = window.innerWidth;
  const problematicElements = [];
  
  // Проверяем все элементы
  document.querySelectorAll('*').forEach(el => {
    const rect = el.getBoundingClientRect();
    const scrollWidth = el.scrollWidth;
    const offsetWidth = el.offsetWidth;
    
    // Если элемент шире viewport или имеет overflow
    if (rect.width > viewportWidth || scrollWidth > viewportWidth || rect.right > viewportWidth) {
      const computedStyle = window.getComputedStyle(el);
      problematicElements.push({
        element: el,
        tagName: el.tagName,
        className: el.className,
        width: rect.width,
        scrollWidth: scrollWidth,
        offsetWidth: offsetWidth,
        right: rect.right,
        position: computedStyle.position,
        overflow: computedStyle.overflow,
        overflowX: computedStyle.overflowX
      });
    }
  });
  
  console.log('Найдено проблемных элементов:', problematicElements.length);
  console.log('');
  
  // Сортируем по ширине (самые широкие сверху)
  problematicElements.sort((a, b) => b.width - a.width);
  
  // Выводим топ-10
  console.log('ТОП-10 самых широких элементов:');
  problematicElements.slice(0, 10).forEach((item, index) => {
    console.log(`${index + 1}. ${item.tagName}.${item.className}`);
    console.log(`   width: ${item.width}px, scrollWidth: ${item.scrollWidth}px`);
    console.log(`   position: ${item.position}, overflow-x: ${item.overflowX}`);
    console.log(`   element:`, item.element);
    console.log('');
    
    // Подсвечиваем элемент красной рамкой
    item.element.style.outline = `3px solid red`;
  });
  
  // Проверяем fixed/absolute элементы
  console.log('=== FIXED/ABSOLUTE ЭЛЕМЕНТЫ ===');
  document.querySelectorAll('*').forEach(el => {
    const style = window.getComputedStyle(el);
    if (style.position === 'fixed' || style.position === 'absolute') {
      const rect = el.getBoundingClientRect();
      if (rect.right > viewportWidth || rect.width > viewportWidth) {
        console.log(`${el.tagName}.${el.className}`);
        console.log(`  position: ${style.position}, width: ${rect.width}px, right: ${rect.right}px`);
        console.log(`  element:`, el);
        el.style.outline = '3px solid orange';
      }
    }
  });
})();
