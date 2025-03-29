document.addEventListener("DOMContentLoaded", async () => {
  try {
    // 加载主数据
    const data = await fetch('data.json').then(r => r.json());
    document.title = data.meta.title;

    // 生成个人信息标签
    const renderProfile = () => {
      return `
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
    };

    // 生成导航菜单
    const renderNav = () => {
      return data.nav.map(item => `
        <a href="${item.href}" class="nav-link">${item.text}</a>
      `).join('');
    };

    // 生成内容区块
    const renderSection = async (section) => {
      let content = '';
      
      switch(section.type) {
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
          break;

        case 'contact-list':
           content = section.items.map(item => `
             <li>${item.label}: ${
               item.link ? 
                 `<a href="${item.link}" ${item.type === 'email' ? '' : 'target="_blank"'} rel="noopener noreferrer">${item.value}</a>` : 
                 item.value
             }</li>
           `).join('');
           break;

        case 'link-list':
          content = section.items.map(item => `
            <li>${item.text}: <a href="${item.link}" target="_blank" rel="noopener noreferrer">访问资源</a></li>
          `).join('');
          break;

        default:
          content = section.content;
      }

      return `
        <section id="${section.id}">
          <h2>${section.title}</h2>
          ${section.type === 'dynamic' ? `<ul class="skills">${content}</ul>` : content}
        </section>
      `;
    };

    // 渲染页面
    document.getElementById('infoTag').innerHTML = renderProfile();
    document.getElementById('mainHeader').innerHTML = `<h1>${data.profile.name}</h1>`;
    document.getElementById('mainNav').innerHTML = renderNav();
    
    const sections = await Promise.all(data.sections.map(async section => 
      await renderSection(section)
    ));
    document.getElementById('sectionsContainer').innerHTML = sections.join('');

  } catch (error) {
    console.error('初始化失败:', error);
    document.body.innerHTML = `
      <div class="error">
        <h2>⚠️ 页面加载失败</h2>
        <p>请检查网络连接后刷新页面</p>
      </div>
    `;
  }
});