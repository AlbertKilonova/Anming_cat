// script.js
document.addEventListener("DOMContentLoaded", async () => {
  const safeParse = (str) => {
    try {
      return JSON.parse(str);
    } catch (e) {
      console.error('JSON解析失败:', e);
      return [];
    }
  };

  // 新增：防抖函数
  const debounce = (func, delay = 300) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  };

  try {
    const data = await fetch('data.json').then(r => r.json());
    document.title = data.meta.title;

    // 个人信息标签
    const renderProfile = () => `
      <div class="info-tag">
        <div class="avatar" style="background-image: url('${data.profile.avatar}')"></div>
        <div class="separator"></div>
        <div class="info-content">
          <div class="basic-info">
            <h3>${data.profile.name}</h3>
            <p>${data.profile.title}</p>
          </div>
          <div class="contact-info">
            <p>${data.profile.location}</p>
            <p>邮箱: ${data.profile.contacts.email}</p>
            <p>QQ: ${data.profile.contacts.qq}</p>
          </div>
        </div>
      </div>
    `;

    // 导航菜单
    const renderNav = () => data.nav.map(item => `
      <a href="${item.href}" class="nav-link">${item.text}</a>
    `).join('');

    // 播放器生成（新增：添加data-src属性）
    const createPlayerIframe = (songId) => `
      <iframe 
        data-src="//music.163.com/outchain/player?type=2&id=${songId}&auto=0&height=66"
        width="100%"
        height="85"
        frameborder="no"
        class="music-iframe"
        loading="lazy"
      ></iframe>
    `;

    // 内容区块渲染
    const renderSection = async (section) => {
      let content = '';
      
      switch(section.type) {
        case 'compound':
          const blocks = await Promise.all(section.blocks.map(block => {
            if (block.type === 'music') {
              const songs = block.songs;
              const initialSong = songs[Math.floor(Math.random() * songs.length)];
              return `
                <div class="music-container">
                  <div class="music-header">
                    <div class="now-playing">🎶 ${initialSong.title}</div>
                    <button class="shuffle-btn">🔄 换一曲</button>
                  </div>
                  <div class="player-wrapper" 
                       data-songs='${JSON.stringify(songs)}' 
                       data-current="${initialSong.id}">
                    ${createPlayerIframe(initialSong.id)}
                  </div>
                </div>
                ${block.content || ''}
              `;
            }
            return block.content;
          }));
          content = blocks.join('');
          break;

        case 'dynamic':
          const works = await fetch(section.dataSource).then(r => r.json());
          content = works.works.map(work => `
            <li class="work-item">
              <h3>${work.title}</h3>
              <iframe src="//player.bilibili.com/player.html?isOutside=true&aid=${work.videoId}&bvid=${work.bvid}&cid=${work.cid}&p=1&high_quality=1&autoplay=0"
                width="100%" height="315" frameborder="0" allowfullscreen></iframe>
              <a href="${work.link}" target="_blank" rel="noopener noreferrer">查看更多</a>
            </li>
          `).join('');
          content = `<ul class="works-list">${content}</ul>`;
          break;

        case 'link-list':
          content = section.items.map(item => `
            <li class="resource-item">
              <div class="link-decoration"></div>
              <a href="${item.link}" target="_blank" rel="noopener noreferrer">
                <span class="link-icon">📁</span>
                <span class="link-text">${item.text}</span>
              </a>
            </li>
          `).join('');
          content = `<ul class="resource-list">${content}</ul>`;
          break;

        case 'contact-list':
          content = section.items.map(item => `
            <li class="contact-item">
              ${item.label}: ${
                item.link ? 
                  `<a href="${item.link}" ${item.type === 'email' ? '' : 'target="_blank"'} rel="noopener noreferrer">${item.value}</a>` : 
                  item.value
              }
            </li>
          `).join('');
          content = `<ul class="contact-list">${content}</ul>`;
          break;

        default:
          content = section.content;
      }

      return `
        <section id="${section.id}">
          <h2>${section.title}</h2>
          ${content}
        </section>
      `;
    };

    // 页面初始化
    document.getElementById('infoTag').innerHTML = renderProfile();
    document.getElementById('mainHeader').innerHTML = `<h1>${data.profile.name}</h1>`;
    document.getElementById('mainNav').innerHTML = renderNav();
    
    const sections = await Promise.all(data.sections.map(section => renderSection(section)));
    document.getElementById('sectionsContainer').innerHTML = sections.join('');

    // 修复的切歌功能（新增防抖处理）
    document.querySelectorAll('.shuffle-btn').forEach(btn => {
      const handler = debounce(async () => {
        const wrapper = btn.closest('.music-container').querySelector('.player-wrapper');
        const songs = safeParse(wrapper.dataset.songs);
        const currentId = wrapper.dataset.current;
        const nowPlaying = wrapper.previousElementSibling.querySelector('.now-playing');

        // 允许单曲循环
        const availableSongs = songs.length > 1 ? 
          songs.filter(song => song.id !== currentId) : 
          songs;

        if (availableSongs.length === 0) return;

        try {
          // 添加加载状态
          wrapper.innerHTML = '<div class="loading-state">加载中...</div>';
          wrapper.style.opacity = '1';

          // 随机选择新歌曲
          const newSong = availableSongs[Math.floor(Math.random() * availableSongs.length)];
          
          // 创建新iframe
          const newIframe = createPlayerIframe(newSong.id);
          
          // 淡出动画
          wrapper.style.opacity = '0';
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // 更新内容
          wrapper.innerHTML = newIframe;
          wrapper.dataset.current = newSong.id;
          nowPlaying.textContent = `🎶 ${newSong.title}`;

          // 触发懒加载
          const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
              if (entry.isIntersecting) {
                const iframe = entry.target.querySelector('iframe');
                if (iframe && iframe.dataset.src) {
                  iframe.src = iframe.dataset.src;
                }
                observer.unobserve(entry.target);
              }
            });
          });
          observer.observe(wrapper);

          // 淡入动画
          await new Promise(resolve => setTimeout(resolve, 50));
          wrapper.style.opacity = '1';

        } catch (error) {
          console.error('切换失败:', error);
          wrapper.style.opacity = '1';
        }
      }, 300);

      btn.addEventListener('click', handler);
    });

    // 初始化懒加载
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const iframes = entry.target.querySelectorAll('iframe[data-src]');
          iframes.forEach(iframe => {
            iframe.src = iframe.dataset.src;
            iframe.removeAttribute('data-src');
          });
          observer.unobserve(entry.target);
        }
      });
    });

    document.querySelectorAll('section').forEach(section => observer.observe(section));

  } catch (error) {
    console.error('初始化失败:', error);
    document.body.innerHTML = `
      <div class="error">
        <h2>⚠️ 页面加载失败</h2>
        <p>${error.message || '请检查网络连接后刷新页面'}</p>
      </div>
    `;
  }
});